# MovieDNA v1 — specification and architecture

Status: Stage 9.4.1 private My DNA read model and local UI. Functions orchestration
and enrichment are verified locally; production deployment remains deferred.

The `/dna` frontend is a read-only projection of the two owner-readable MovieDNA
documents. Local development uses only `demo-moviedna` with explicit Auth, Firestore
and Functions Emulator endpoints. A deterministic seed supplies synthetic metadata,
so neither the seed nor local Functions integration contacts TMDB. The server core in
`functions/src/dna/core` remains the only authoritative calculation implementation;
recommendations and personal statistics remain later stages.

## Approved v1 decisions

- Signal priority is `rating > onboarding > Favorite`; one canonical media item is
  counted once. Watchlist, custom lists, comments and skip do not influence taste.
- The weights in this document are approved, including neutral rating 5,
  onboarding `+0.35 / -0.35` and fallback Favorite `+0.20`.
- v1 dimensions are genres, media type, decades, original languages, production or
  origin countries, movie directors, TV creators, and at most three top-billed actors
  per media with reduced influence and a repeated-evidence threshold.
- Keywords and mainstream/niche are deferred. DNA is private by default.
- Recalculation will be event-driven, with callable manual Refresh as a fallback;
  both paths require cooldown, deduplication and idempotency.
- The future authoritative backend is Firebase Functions 2nd gen in `europe-west6`.
  Production deployment waits for Blaze and budget protection.
- Complete account deletion must remove all private DNA documents before production.
  Keeping both private documents below one user subcollection makes bounded server
  cleanup explicit; any future public projection must be deleted separately.

## 1. Goals and non-goals

MovieDNA v1 is a private, deterministic taste profile derived from explicit user
actions. It must produce the same result for the same normalized inputs and
algorithm version, explain its strongest positive and negative affinities, and be
fully recalculable. It is a transparent weighted algorithm, not AI or machine
learning.

The first version will describe preferences; it will not infer sensitive traits,
train across users, publish a profile, moderate comments, or calculate a public
MovieDNA score. Comments, Watchlist, and custom-list membership are not evidence
that a user likes a title.

## 2. Audit of data already available

### Current signals

| Signal | Path and fields | Reliability | Usable without new TMDB calls | Missing information |
| --- | --- | --- | --- | --- |
| Onboarding response | `users/{uid}/onboardingResponses/{tmdbId}`: `tmdbId`, fixed `mediaType: movie`, `reaction` (`like`, `dislike`, `skip`), `genreIds`, timestamps | Medium. It is explicit and server-confirmed, but comes from a small, trending-only starter deck. Client validation checks genre IDs, while current Rules guarantee only a list of at most 10 and do not verify the IDs against TMDB. Responses cannot be changed after completion. | Genre and movie-format scoring can use it immediately. | Title, year, language, countries, cast, directors, keywords, popularity and vote count are absent. TV never appears in onboarding. |
| Onboarding summary | `users/{uid}/onboarding/summary`: version, status, total/like/dislike/skip counts and timestamps | High for the stored aggregate shape; low as evidence for individual tastes because Rules do not prove the counts against response documents. | Useful only as a completion/audit marker. | No media IDs, genres, or per-item reactions. DNA must read responses, not reconstruct them from the summary. |
| Personal rating | `users/{uid}/ratings/{mediaKey}`: `tmdbId`, `mediaType`, title, poster path, release year, integer score 1–10, timestamps | Highest available taste signal. Owner-only, completed-profile-gated on create/update, exact schema, identity and timestamps checked by Rules. Title/poster/year remain user-client snapshots rather than authoritative TMDB metadata. | Media type, release decade when `releaseYear` exists, and score are immediately usable. | No genres, original language, countries, cast, directors/creators, keywords, popularity or vote count. |
| Favorite | `users/{uid}/savedMedia/{mediaKey}`: media identity/display snapshot plus `favorite`, `watchlist`, `listIds`, timestamps | Medium-low as taste evidence. Explicit positive action, but its meaning is less calibrated than a rating and clients can change it. | Media type and optional release decade are available. | The same metadata fields missing from ratings are missing here. |
| Watchlist | Same saved-media document, `watchlist: true` | Reliable as an intent-to-watch signal, not as evidence of taste. | It can be identified without TMDB. | It does not establish that the user watched or liked the title. Excluded from v1 scoring. |
| Custom lists | `users/{uid}/lists` and `savedMedia.listIds` | Semantics are unknown because list names are free text. Membership cleanup also has a documented cross-tab race boundary. | Membership is available locally. | No machine-readable meaning such as “liked”, “avoid”, or “family”. Excluded from v1. |
| Comments | Public `mediaComments/{mediaKey}/comments/{uid}` | Text is an expression but has no structured sentiment and may discuss any aspect of a title. | Available, but deliberately excluded. | Safe sentiment extraction and consent; outside deterministic v1. |

`mediaKey = mediaType + "_" + tmdbId` is already the canonical identity for
ratings and saved media. Onboarding uses the numeric movie ID as its document ID,
so its canonical DNA key is `movie_{tmdbId}`. This key is the deduplication boundary.

### Existing TMDB data

Catalog normalizers provide media identity, title, dates, genre IDs, TMDB vote data
and volatile `popularity`. Those values exist only in browser memory and are not
persisted with ratings. Movie detail normalization additionally exposes genres,
original language, production countries, up to 12 cast members and directors.
TV detail normalization exposes genres, original language, origin countries, up to
12 aggregate-cast members and creators. Current detail requests do not request or
normalize keywords.

The current client can fetch details only through `/api/tmdb`. Its Vite proxy reads
`TMDB_READ_ACCESS_TOKEN` on the development server, adds the Authorization header
server-side, strips cookies and allowlists paths and parameters. Static production
still has no equivalent backend. DNA processing must never put the token in a
`VITE_*` variable, browser bundle, Firestore document, log, or callable response.

`tmdbId + mediaType` is sufficient to request `/movie/{id}` or `/tv/{id}` and
rebuild available metadata. It does not guarantee the item still exists. Deleted,
region-restricted, merged, or temporarily unavailable items must remain valid user
signals with `metadataStatus`, but contribute only to dimensions supported by their
stored fields until enrichment succeeds.

### Data availability by dimension

| Dimension | Current local source | Enrichment source | Minimum for publication in DNA | v1 decision and limits |
| --- | --- | --- | --- | --- |
| Genres | Onboarding `genreIds`; detail `genres` when open in browser | Movie/TV detail genre IDs and names | 3 non-zero unique media with valid genres | Include. Onboarding is immediately useful; server enrichment fills ratings/favorites. Genre names are display labels, IDs are identity. |
| Movie vs TV | Every canonical media identity | None | 3 non-zero signals | Include. Onboarding initially biases sample volume toward movies, so expose source counts alongside the result. |
| Decades | Rating/Favorite `releaseYear` when present | Movie release date / TV first-air date | 3 media with a valid year | Include. Unknown years do not enter the denominator. Use floor(year / 10) × 10. |
| Original languages | None in persisted signals | `original_language` from detail | 5 enriched, non-zero media | Include. ISO-like two-letter code is identity; labels are presentation data. A language is not a country or ethnicity. |
| Production/origin countries | None | Movie `production_countries[].iso_3166_1`; TV `origin_country[]` | 5 enriched, non-zero media | Include with an explicit movie/TV semantic difference. Split one title's contribution across its countries. |
| Actors | None | Detail credits, capped deterministically to the first 3 normalized top-billed cast | 5 enriched media; an actor needs support from at least 2 distinct media | Include with a `0.5` dimension multiplier. The cap and reduced weight prevent ensemble titles dominating. |
| Directors | None | Movie credits where job is Director | 5 enriched movies; person support at least 2 | Include for movies. Multiple directors split the title contribution. |
| TV creators | None | TV `created_by` | 5 enriched TV titles; creator support at least 2 | Include separately from directors; do not merge the roles in storage. |
| Keywords | None; current detail append lists omit them | Would require movie/TV keyword responses and new validation | Not applicable yet | Defer. Adding it solely for dimension count would expand proxy/server contracts and request payloads without existing evidence. |

The private DNA read UI resolves compact dimension identities without another TMDB
request. Movie and TV genre IDs use the fixed TMDB genre taxonomy already supported
by the catalog, ISO language and region codes use deterministic English
`Intl.DisplayNames` labels with neutral fallbacks, and media types and decades use
fixed product labels. Director, creator and actor names come from the existing
validated metadata cache and DNA output; a missing numeric fallback is presented as
an unknown role rather than as a person ID. These presentation rules do not change
scoring, the fingerprint, algorithm version `1.0.0`, or document schema version 1.
| Mainstream vs niche | Browser catalog has volatile TMDB `popularity` and vote count; neither is persisted authoritatively | Enrichment could snapshot popularity/vote count | No stable threshold currently exists | Defer. Popularity changes over time and is not comparable across snapshots; vote count grows and differs between movie/TV. Introduce only with a dated percentile baseline. |

## 3. Canonical signal set and deduplication

Build one record per canonical `mediaKey`, never one record per source:

1. If a valid rating exists, its weight is authoritative. Ignore onboarding and
   Favorite weights for that media.
2. Otherwise, use onboarding `like` or `dislike` and ignore Favorite for that media.
3. An onboarding `skip` is neutral and does not block a later Favorite; otherwise,
   use Favorite as a weak positive signal.
4. Watchlist, custom-list membership, comments, and a skip without Favorite contribute zero.
5. Malformed documents are excluded and counted in `discardedSourceCount`; they do
   not partially contribute.

The source snapshot is sorted by `mediaKey` before hashing or calculation. Timestamps
do not affect weights. The input fingerprint covers algorithm version and the
canonical normalized signal/enrichment fields, so retry order cannot change output.

## 4. Deterministic weighting formula

### Per-media weight

| Source/value | Weight |
| --- | ---: |
| Rating 1 | -1.00 |
| Rating 2 | -0.75 |
| Rating 3 | -0.50 |
| Rating 4 | -0.25 |
| Rating 5 | 0.00 |
| Rating 6 | +0.20 |
| Rating 7 | +0.40 |
| Rating 8 | +0.60 |
| Rating 9 | +0.80 |
| Rating 10 | +1.00 |
| Onboarding dislike | -0.35 |
| Onboarding skip | 0.00 |
| Onboarding like | +0.35 |
| Favorite with neither rating nor onboarding response | +0.20 |

Ratings 1–4 are negative, 5 neutral and 6–10 positive. The asymmetric 5/6 boundary
matches an explicit 1–10 choice while treating a middling 5 as no evidence. Neutral
and skipped items remain in audit counts but not affinity denominators.

### Dimension aggregation

For each non-zero media weight `w` and dimension with `k` valid distinct values,
add `w / k` to each value. Actors instead add `(w × 0.5) / k`, with `k <= 3`.
Thus titles with multiple genres, countries or people do not gain influence merely
from having longer metadata arrays, and actors remain weaker than direct attributes.

For value `v`:

```text
signedContribution(v) = sum(media contribution to v)
absoluteEvidenceWeight(v) = sum(abs(media contribution to v))
normalizer(dimension) = sum(abs(all media contributions in that dimension))
score(v) = signedContribution(v) / normalizer(dimension) # [-1, +1]
evidenceCount(v) = number of distinct media contributing to v
confidence(v) = min(1, absoluteEvidenceWeight(v) / 2)
                * min(1, evidenceCount(v) / 3)
```

Round calculated decimals to six decimal places only after all sums. Sort
dimension entries by descending score, then descending evidence count, then stable key.
Store at most 20 entries per dimension; this truncation occurs after normalization.
An item is displayed only when its dimension meets the minimum above, and people
entries additionally require support from two titles. Negative entries are retained
for explanation and recommendation avoidance.

### Confidence

Confidence describes evidence coverage, not prediction accuracy:

```text
N = number of unique non-zero canonical media signals
D = distinct valid genres with absolute raw support >= 0.20
C = covered applicable metadata slots / all applicable slots # 0 when N = 0
overallConfidence = round6(
  0.60 * min(1, N / 20) +
  0.25 * min(1, D / 8) +
  0.15 * C
)
```

Overall confidence is 0 when `N = 0`. For every meaningful media, the six applicable
coverage slots are genres, release year, original language, countries, the applicable
director/creator role, and actors. The shared `people` completeness flag covers the
last two slots. A known-valid empty array is covered; missing or corrupt metadata is
not. TV directors and movie creators are inapplicable and never reduce coverage.
Missing metadata lowers coverage but does not erase a rating.
More signals from the same title never increase `N`; broad genre evidence increases
confidence only up to eight genres.

### Numerical examples

These compact examples assume one listed genre per title; production calculation
splits contributions when a title has multiple values.

1. **New user after onboarding.** Ten responses contain three Action likes, one
   Comedy like, two Drama dislikes and four skips. Canonical non-zero weight is
   `6 × 0.35 = 2.10`. Genre scores are Action `1.05 / 2.10 = +0.500000`, Comedy
   `0.35 / 2.10 = +0.166667`, Drama `-0.70 / 2.10 = -0.333333`. With `N=6`, `D=3`,
   and complete onboarding genre metadata `C=1`, confidence is
   `0.60×0.30 + 0.25×0.375 + 0.15 = 0.423750`.

2. **Mixed source priority.** An onboarding Action movie later rated 9 contributes
   `+0.80`, replacing rather than adding its onboarding `+0.35`. A Sci-Fi rating 8
   contributes `+0.60`, a Drama rating 3 contributes `-0.50`, and an otherwise
   unsignalled Favorite Comedy contributes `+0.20`. Four canonical media yield
   genre contributions `+0.80`, `+0.60`, `-0.50`, `+0.20`; no source is double counted.

3. **Contradictory preferences.** Four Horror ratings have weights `+1.00`, `+0.60`,
   `-0.75`, `-0.50`; two other Horror onboarding likes add `+0.70`. Horror signed
   contribution is `+1.05`, absolute evidence is `3.55`, so its score is only
   `+0.295775`, with evidence count 6. The algorithm reports a
   mixed, weakly positive preference rather than hiding disagreement. If these are
   ten total non-zero signals over five supported genres with full enrichment,
   confidence is `0.6063`; confidence can be substantial while one affinity remains
   conflicted.

## 5. Calculation architecture

| Option | Security and tampering | Cost and complexity | Testing, recalculation and migration |
| --- | --- | --- | --- |
| Browser only | The client must read all private sources and could forge authoritative DNA writes. Calling TMDB directly would expose the token; using the current Vite proxy is development-only. | Cheapest initial code, but requires a production proxy and duplicates trust logic in UI. | Pure math is testable, but authoritative history and reliable migrations are weak. Offline/cache state can produce inconsistent snapshots. |
| Cloud Function only | Auth/Admin SDK and secret-managed TMDB token provide a trusted boundary. | Adds Functions deployment, billing configuration, emulator setup and operational monitoring. Mixing network/database orchestration with math makes tests slower. | Server can recalculate and migrate, but a monolithic function is harder to test deterministically. |
| Pure shared calculation library plus authoritative server runner | Pure library accepts normalized immutable inputs and has no Firebase, network, clock or environment access. A callable/background server validates Auth, reads sources, enriches metadata and alone writes DNA/state/cache. | Slightly more structure, but clean ownership and reusable fixtures. TMDB/Firestore reads can be cached and bounded. | Best option: exhaustive unit tests for math, integration tests for orchestration, explicit algorithm version/fingerprint, safe backfills and migrations. |

**Recommendation:** use the third option. The browser may run the pure function for
a non-authoritative preview only, but must never write calculated DNA. The server is
the sole writer of DNA, recalculation state, and media-signal cache.

The local runner is Firebase Functions 2nd gen in `europe-west6`. Deploying Cloud Functions for Firebase requires the Blaze plan; local Functions
emulation does not. Stage 9.1–9.3 and local 9.4 development can proceed without an
upgrade. Before production deployment in 9.4, the user must link billing, configure
budget alerts/spend caps, and approve the region and limits. Firebase currently
documents the deployment requirement here:
https://firebase.google.com/docs/functions/get-started

### Stage 9.3 calculation-core contract

The sole authoritative pure core lives in `functions/src/dna/core/` and exports the asynchronous
`calculateMovieDna({ algorithmVersion, items })` function. Its only asynchronous
operation is standard Web Crypto SHA-256. It imports no React, Firebase, TMDB client,
storage, environment, clock or random source. The supported version constant is
`MOVIEDNA_ALGORITHM_VERSION = "1.0.0"`.

Each normalized item supplies canonical `mediaKey`, `tmdbId`, `mediaType`, optional
rating/reaction/Favorite and optional normalized metadata. Arrays and items are
canonicalized before calculation. Duplicate source entries, identity mismatches,
invalid signals and corrupt metadata produce safe coded `MovieDnaError` values.

The returned plain JSON object contains `algorithmVersion`, `inputFingerprint`,
`sourceCounts`, `metadataCoverage`, `overallConfidence` and all eight `dimensions`.
The Stage 9.4a runner adds status/timestamps/schema version and maps
`overallConfidence` to persisted `confidence`. It must persist the two evidence
fields in each dimension entry or apply an explicitly versioned projection.

The fingerprint is SHA-256 of a canonical JSON payload containing algorithm version,
sorted identities, signals and logical metadata IDs/codes/completeness. Input order,
metadata-array order, timestamps and display labels do not affect it. It is a change
detector and idempotency input, not an authentication or integrity primitive.

## 6. Proposed data model

### Authoritative private DNA

Path: `users/{uid}/movieDna/current`.

Only the following top-level fields are allowed in the server schema:

| Field | Type and constraint |
| --- | --- |
| schemaVersion | integer, exactly `1` |
| algorithmVersion | non-empty version string; v1 is `1.0.0` |
| status | `ready` or `insufficient-data` |
| inputFingerprint | `sha256:` followed by 64 lowercase hexadecimal characters |
| sourceCounts | fixed map of the twelve non-negative integer counters shown below |
| metadataCoverage | finite number from 0 through 1 |
| confidence | finite number from 0 through 1 |
| dimensions | fixed map containing exactly the eight dimension arrays shown below |
| calculatedAt | server timestamp for this completed calculation |
| updatedAt | server timestamp, not earlier than `calculatedAt` |

`sourceCounts` contains exactly `ratingsRead`, `onboardingRead`, `favoritesRead`,
`uniqueNonZeroUsed`, `ratingUsed`, `onboardingUsed`, `favoriteUsed`,
`neutralOrSkipped`, `shadowedByHigherPriority`, `discardedSourceCount`,
`enrichedUsed`, and `unavailableMetadata`. Every value is a non-negative integer;
`ratingUsed + onboardingUsed + favoriteUsed == uniqueNonZeroUsed`.

`dimensions` contains exactly `genres`, `mediaTypes`, `decades`, `languages`,
`countries`, `directors`, `creators`, and `actors`. Each array has no duplicate key
and is capped at 20 entries; `mediaTypes` is capped at 2. The Stage 9.3 core entry is:

```js
{
  key: "stable namespaced key", // non-empty, at most 80 characters
  label: "display snapshot",    // non-empty, at most 100 characters
  signedContribution: 1.05,     // signed sum before normalization
  absoluteEvidenceWeight: 3.55, // absolute evidence, never negative
  score: 0.378,                 // finite number in [-1, 1]
  evidenceCount: 3,             // positive integer, distinct media count
  confidence: 0.6               // finite number in [0, 1]
}
```

Stable keys use `genre:{positiveTmdbGenreId}`, `media:movie`, `media:tv`,
`decade:{fourDigitDecade}`, `language:{lowercaseTwoLetterCode}`,
`country:{uppercaseTwoLetterCode}`, or `person:{positiveTmdbPersonId}`. Labels are
non-authoritative snapshots. Contributions, scores and confidence are rounded to six decimals.
People entries require at least two distinct media; actors come from at most three
top-billed people per media and use the approved `0.5` contribution multiplier.

```js
{
  schemaVersion: 1,
  algorithmVersion: "1.0.0",
  status: "ready",
  inputFingerprint: "sha256:<hex>",
  confidence: 0.545,
  metadataCoverage: 1.0,
  sourceCounts: {
    ratingsRead: 3,
    onboardingRead: 10,
    favoritesRead: 1,
    uniqueNonZeroUsed: 9,
    ratingUsed: 3,
    onboardingUsed: 5,
    favoriteUsed: 1,
    neutralOrSkipped: 4,
    shadowedByHigherPriority: 1,
    discardedSourceCount: 0,
    enrichedUsed: 9,
    unavailableMetadata: 0
  },
  dimensions: {
    genres: [{ key: "genre:28", label: "Action", score: 0.378, evidenceCount: 3, confidence: 0.6 }],
    mediaTypes: [{ key: "media:movie", label: "Movies", score: 0.4, evidenceCount: 7, confidence: 0.8 }],
    decades: [{ key: "decade:2010", label: "2010s", score: 0.22, evidenceCount: 4, confidence: 0.7 }],
    languages: [{ key: "language:en", label: "English", score: 0.3, evidenceCount: 6, confidence: 0.8 }],
    countries: [{ key: "country:US", label: "United States", score: 0.25, evidenceCount: 5, confidence: 0.7 }],
    directors: [], creators: [],
    actors: [{ key: "person:123", label: "Example Name", score: 0.18, evidenceCount: 2, confidence: 0.4 }]
  },
  calculatedAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

All fields are private by default and owner-readable. The client must have no
create/update/delete permission; Admin SDK/server service account bypasses client
Rules and is the only writer. A future public profile must use a separate explicitly
opted-in projection such as `publicMovieDna/{uid}` with a reduced schema; it must not
make this private document public.

### Recalculation state

Path: `users/{uid}/movieDna/recalculation`.

The exact fields are `schemaVersion` (integer `1`), `status` (`queued`, `running`,
`succeeded`, or `failed`), `requestedAt` (timestamp), `startedAt` and `completedAt`
(timestamp or null), `nextEligibleAt` (timestamp), `algorithmVersion` (non-empty
version string), `inputFingerprint` (valid SHA-256 fingerprint or null before input
normalization), `errorCode` (null or an allowlisted safe code such as
`tmdb-unavailable`, `rate-limited`, `invalid-source`, or `internal`), and `runToken`
(an opaque server-generated UUID used only to reject stale completion).

`queued` has null start/completion; `running` has a start and null completion;
terminal states have both timestamps, and only `failed` has an error code. Event
triggers and callable manual Refresh converge on the same fingerprint/job, allow one
active job per UID, and honor `nextEligibleAt`. Direct Firestore writes never enqueue.

```js
{
  schemaVersion: 1,
  algorithmVersion: "1.0.0",
  status: "queued" | "running" | "succeeded" | "failed",
  requestedAt: timestamp,
  startedAt: timestamp | null,
  completedAt: timestamp | null,
  nextEligibleAt: timestamp,
  inputFingerprint: "sha256:<hex>" | null,
  errorCode: string | null,
  runToken: "opaque server UUID"
}
```

This document is private, owner-readable and server-write-only. Error codes are
allowlisted and contain no token, upstream body, UID, or raw exception. A callable
request should not rely on a client-written queue document: it verifies Auth and
profile, rate-limits by UID/state and enqueues or executes server-side.

### Shared normalized media cache

Path: `mediaSignals/{mediaKey}`. This is not user data and is deduplicated globally.

`mediaKey` exactly equals `mediaType + "_" + tmdbId` and matches
`^(movie|tv)_[1-9][0-9]{0,11}$`. The exact fields are:

- `schemaVersion`: integer `1`;
- canonical `tmdbId` and `mediaType`;
- `genreIds`: unique positive integer array, at most 20;
- `releaseYear`: null or integer 1800–2200, used to derive decade;
- `originalLanguage`: null or lowercase two-letter code;
- `countryCodes`: unique uppercase two-letter array, at most 20; movie production
  countries and TV origin countries retain their documented semantic difference;
- `directors` and `creators`: unique `{ id, name }` arrays, at most 10; the
  non-applicable array is empty;
- `actors`: at most three unique top-billed `{ id, name, billingOrder }` entries in
  order; `billingOrder` is integer 0–2;
- `fetchedAt` and `expiresAt` timestamps, with expiry later than fetch;
- `metadataStatus`: `ready`, `partial`, `missing`, or `temporary-error`;
- `metadataCompleteness`: exact boolean map `genres`, `releaseYear`,
  `originalLanguage`, `countries`, `people`.

Person IDs are positive TMDB integers; names are trimmed snapshots up to 100
characters. Missing/error cache entries retain identity and timestamps with empty
arrays/null scalars so retry policy remains deterministic.

```js
{
  schemaVersion: 1,
  tmdbId: 123,
  mediaType: "movie" | "tv",
  releaseYear: 2020 | null,
  genreIds: [28, 12],
  originalLanguage: "en" | null,
  countryCodes: ["US"],
  directors: [{ id: 20, name: "Example" }],
  creators: [],
  actors: [{ id: 10, name: "Example", billingOrder: 0 }],
  metadataStatus: "ready" | "partial" | "missing" | "temporary-error",
  metadataCompleteness: {
    genres: true, releaseYear: true, originalLanguage: true,
    countries: true, people: true
  },
  fetchedAt: timestamp,
  expiresAt: timestamp
}
```

The server alone writes this cache. The browser has no access; DNA returns only
aggregates. Do not store popularity, vote count, keywords, overview, biographies,
videos, images, full credits, or raw TMDB responses. Before Stage 9.4 production
implementation, re-check current TMDB API terms, attribution requirements, and
conditions for persistent metadata caching; this design does not itself establish
permission to retain a particular field or TTL.

No composite index is required for direct DNA/state documents or direct cache gets.
A future server backfill may query `expiresAt`/`metadataStatus`; add only the exact
single/composite index required by its final query in Stage 9.4. Do not predeclare
unused indexes. Stage 9.2 adds no index: its client reads are concrete document gets.

For a new algorithm, write `algorithmVersion`, recalculate from original sources and
the versioned cache, then atomically replace `current`. The fingerprint prevents a
no-op rewrite. Retain no old version in v1 unless product analytics explicitly needs
history; otherwise old profiles can be queued lazily on read or eagerly in bounded
admin batches.

## 7. Secure metadata enrichment pipeline

1. The authenticated callable/background runner reads the user's ratings,
   onboarding responses and favorite saved-media documents with Admin SDK. It
   validates them independently of client Rules and canonicalizes `mediaKey`.
2. Deduplicate keys before any network call. Load `mediaSignals/{mediaKey}` with
   batched/direct reads. Reuse `ready` entries until `expiresAt`; cache `missing`
   responses longer than temporary failures.
3. For cache misses, a future `europe-west6` Functions 2nd gen runner uses a
   server-only TMDB client and reads the token from Secret Manager
   or a Functions secret. It calls only fixed `/movie/{id}` and `/tv/{id}` endpoints
   with fixed language/append parameters and bounded concurrency. It never accepts
   an arbitrary client URL, header, query, or TMDB token.
4. Normalize and size-limit the response before writing the shared cache. Use a
   per-media lease/idempotency key or transaction so concurrent users do not fetch
   the same media repeatedly. Apply exponential backoff with jitter for 429/5xx,
   honor a per-run request ceiling, and leave partial enrichment resumable.
5. A 404/removed item gets `metadataStatus: missing` and still contributes media type,
   rating and any stored release year/genre IDs. A timeout/429/5xx gets
   `temporary-error`; keep the previous good cache if one exists and retry later.
6. Once inputs are normalized, invoke the pure calculation library, check session/job
   ownership and algorithm version, then atomically write DNA plus recalculation state.

Backfill existing users by collecting canonical keys from ratings and onboarding,
deduplicating globally, enriching the shared cache in bounded batches, and queuing
per-user recalculation only after required cache entries settle. Checkpoint cursors
and idempotent fingerprints make retries safe. Never run an unbounded scan inside a
single function invocation.

Event-driven recalculation is the primary path; a callable manual Refresh is a
fallback and never writes a queue document from the client. Request controls for v1:
one active recalculation per UID, a cooldown such as 15 minutes for manual requests,
a maximum unique-media count per run, bounded TMDB
concurrency, global retry/backoff, and logs containing counts/status codes rather
than user content or credentials. Exact limits belong in Stage 9.4 tests/config.

### Stage 9.4a local server runner

Deployable JavaScript lives in `functions/` as an ESM Node.js 22 package. Its entry
file initializes Admin SDK and wires adapters only. Source collection, normalized
TMDB metadata, cache policy, calculation orchestration, safe errors and handlers are
separate dependency-injected layers. The frontend has no import or bundled copy of
the calculation core.

The runner reads only the target UID's profile, ratings, onboarding responses and
summary, plus Favorite saved-media memberships. It caps one snapshot at 500 source
documents, sorts canonical media keys, enriches at most four media concurrently and
then calls algorithm `1.0.0`. It re-reads the complete source snapshot before commit.
Every invocation installs an opaque `runToken`; only the latest token may atomically
replace `current` and finish `recalculation`. Matching algorithm version plus input
fingerprint is a no-op. Failures update only the safe recalculation status and retain
the previous valid DNA.

The TMDB boundary accepts only movie/TV IDs and constructs URLs against the fixed
`https://api.themoviedb.org` origin. It uses an eight-second timeout and at most two
bounded transient retries, honors capped `Retry-After`, and never persists payloads,
images, descriptions or credentials. `mediaSignals` has a conservative 24-hour TTL.
A fresh compatible entry avoids the request; a missing, malformed, identity-mismatched
or expired entry is a cache miss. An expired entry is never returned when refresh
fails. Writes set server-controlled `fetchedAt` and `expiresAt` exactly 24 hours apart.
The Firestore TTL policy targets `mediaSignals.expiresAt`; physical deletion is
asynchronous and normally occurs within 24 hours after expiry.

Runtime options are fixed at `europe-west6`, 512 MiB, 120 seconds, zero minimum and
four maximum instances, concurrency 10, with automatic event retry explicitly off.
The callable declares `enforceAppCheck: true` and also rejects a missing verified App
Check context at the application boundary; event handlers do not require App Check.
Auth and App Check are both mandatory for manual Refresh. Frontend App Check uses
reCAPTCHA Enterprise, one-hour token TTL, automatic refresh and the public site key.
Production domains must be allowlisted. Console-wide enforcement remains off until
manual verification of every Firebase flow and a documented rollback decision.

The 24-hour cache TTL is a provisional engineering value, not a statement that TMDB
requires that retention period. The currently reviewed TMDB API Terms allow cached
content for no longer than six months; 24 hours is intentionally far shorter. Only normalized genre IDs, year, language,
country codes and bounded people references are retained; the full response is never
stored, clients cannot read `mediaSignals`, and the existing application attribution
remains visible. Production deployment is blocked until the current official TMDB
API terms are manually reviewed. That review may require changing the TTL or removing
persistent Firestore metadata caching before deploy. A pre-deploy purge must remove
already-expired cache documents; enabling TTL is not an immediate purge mechanism.
MovieDNA is noncommercial, and commercial use requires a fresh licensing review and
any required TMDB permission.

If TMDB use or licensing ends, operators must first stop every MovieDNA cache writer,
then remove every document in `mediaSignals` with an administrative batch/bulk-delete
process and verify that the collection is empty. The asynchronous TTL policy is not a
substitute for this full purge.

Dependency review uses `firebase-admin@14.5.0` and `firebase-functions@7.4.0` and
currently records `GHSA-w5hq-g745-h8pq` / `CVE-2026-41907` through the optional
production path `firebase-admin@14.5.0 -> @google-cloud/storage@8.2.0 ->
gaxios@6.7.1 -> uuid@9.0.1`. The vulnerable UUID v3/v5/v6 caller-buffer API is not
used by MovieDNA handlers; this gaxios version calls UUID v4 only for multipart
boundaries, while MovieDNA uses Admin Firestore and native `fetch` against a fixed
TMDB host. The package is still present in the deployable dependency tree. No newer
compatible Firebase release currently removes it, and a forced UUID 14 override is a
major-module change, so no override, downgrade, or `npm audit fix` is applied. The
user explicitly accepts this residual risk only for a limited noncommercial MVP
deployment. That acceptance does not automatically cover commercial use or a fully
public production launch. Run the dependency audit before every Functions deploy;
when an official compatible Firebase update removes the vulnerable chain, install it
and repeat the full verification. A separately reviewed major migration remains the
fallback if no compatible fix becomes available.

The complete 9.4b deployment gate is: Blaze plan, budget alert, spend cap where the
Firebase/Google Cloud account supports one, production `TMDB_READ_ACCESS_TOKEN`, App
Check configuration and callable enforcement, resolution or explicit re-approval of
dependency advisories, final TMDB cache decision, confirmed runtime limits, and a
separate user authorization for deployment.

### Production catalog transport (Stage 9.4c)

Production catalog traffic remains same-origin: Firebase Hosting rewrites
`/api/tmdb` and `/api/tmdb/**` to the `tmdbProxy` Functions v2 HTTPS handler in
`europe-west6`, before the final SPA fallback. The rewrite has no `pinTag`, and a
Hosting-only deployment must never deploy or update the Function implicitly.

`tmdbProxy` is public catalog infrastructure, so Firebase Auth is intentionally not
required. App Check is mandatory: the frontend obtains a current modular App Check
token for every production request and sends it only in `X-Firebase-AppCheck`; the
handler verifies that token with Firebase Admin before reading its bound
`TMDB_READ_ACCESS_TOKEN` or contacting TMDB. Replay consumption is deferred because
the proxy is read-only. No CORS response is added: browser access is intended through
the same-origin Hosting rewrite, while the direct Function URL still requires App
Check.

The proxy is not an open forwarder. It accepts only GET and an exact static inventory:
movie/TV daily trending; multi/movie/TV/person search; the supported movie, TV and
person browse views; movie/TV genre lists and discover filters; and canonical
movie/TV/person detail requests. Language is `en-US`, page is 1–500, search is 2–100
normalized characters, adult content is always false, IDs/genres are positive safe
integers, and every endpoint has an exact parameter set. User hosts, full URLs,
unknown paths, duplicate/unknown parameters and forwarded headers are rejected.
The backend uses a fixed TMDB origin, an eight-second upstream timeout, JSON shape
checks, a two-megabyte response limit, non-forwarded upstream headers, a private
`no-store` response policy and stable sanitized errors. It does not add a Firestore
proxy cache. App Check reduces casual abuse but is not authentication, a quota or a
reliable per-user rate limiter; authenticated and guest clients share the same
bounded Function capacity and TMDB quota. Per-IP or account-aware throttling remains
an operational follow-up if observed traffic requires it.
The current `maxInstances: 4` bounds concurrent infrastructure but is not a spend
cap. A budget alert only sends notifications and does not stop charges. Production
deployment therefore remains gated on a separate decision accepting the operational
cost exposure of shared public guest traffic.

Development retains the fixed-host Vite proxy with the same allowlist and a local
server-only token. Production uses the Function and never a Vite proxy or browser
TMDB credential. DEV App Check debug activation lives in a development-only module
selected through a build-time alias. Production contains neither MovieDNA's
`VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` reference nor its debug-global assignment; an
internal `FIREBASE_APPCHECK_DEBUG_TOKEN` identifier remains in the official Firebase
App Check SDK and is not activated by MovieDNA production code.

The Functions API is currently disabled and no deployment has occurred. Console-wide
App Check enforcement remains off. `refreshMovieDna` uses callable
`enforceAppCheck: true`; `tmdbProxy` uses the custom-backend header verification flow.
The future deployment sequence is: explicitly approve API enablement; deploy only
`tmdbProxy`; verify Function metadata; deploy only Hosting; verify production App
Check and `/api/tmdb`; deploy the other four named Functions; run an explicitly
approved smoke test; inspect production indexes; then deploy indexes/TTL without
Rules. This prevents Hosting from targeting a missing Function and prevents the
App-Check-enforced callable from preceding its client.

Hosting rollback selects a previous live release. Functions rollback redeploys the
last known-good commit with an explicit Function allowlist. TTL/index rollback is a
separate operation and must account for documents that may already have been deleted.

## 8. Future personalized recommendations

The recommendation pipeline should be a separate consumer of DNA:

1. Fetch bounded candidate pools from fixed TMDB discover/trending/recommendation
   endpoints for Movies and TV separately. Cache candidate metadata server-side.
2. Exclude canonical keys already rated, answered in onboarding, or optionally
   already saved. Always deduplicate candidates by mediaKey.
3. Calculate a versioned match score from positive/negative DNA dimensions. Cap each
   dimension's contribution and apply quality/availability safeguards; do not let
   TMDB popularity replace taste affinity.
4. Sort deterministically by match score, then stable quality and media key. Keep
   Movie and TV lists separate so movie-heavy onboarding does not suppress TV.
5. Return explanation codes and labels such as “matches your Science Fiction and
   1990s preferences”; never expose raw private source documents.
6. Recalculate or invalidate recommendations when the DNA fingerprint changes after
   new ratings. Temporary TMDB failure should serve a recent cache with a stale label
   or a safe unavailable state.

Stage 9 should first ship DNA calculation, secure persistence and a My DNA page.
Candidate generation and explanations belong in 9.6. Collaborative filtering,
cross-user learning, embeddings, online learning and social recommendations are
explicitly deferred beyond v1.

### Deterministic recommendation ranking core v1

Checkpoint 9.5.1 defines a pure ranking consumer with recommendation algorithm
version `1.0.0`, independent of MovieDNA algorithm `1.0.0`. It performs no network,
Firebase, storage, clock or random operation. Candidate metadata uses the compact
server shape: `genreIds`, `releaseYear`, `originalLanguage`, `countryCodes`, and
director/creator/actor identities. Malformed and duplicate candidate identities are
rejected; unknown but well-formed identifiers remain neutral.

For a DNA entry `e`, its effective affinity is:

```text
effective(e) = DNA score(e) * DNA confidence(e)       # [-1, +1]
dimensionMatch = sum(effective(matched candidate values))
                 / number of distinct candidate values
dimensionContribution = dimensionWeight * dimensionMatch
matchScore = clamp(0, 100, round2(50 + 50 * sum(dimensionContribution)))
```

An unknown candidate value contributes zero while remaining in the denominator.
An absent or known-empty value contributes zero. No missing or neutral feature is
converted into positive evidence. Averaging values and capping each dimension by its
weight prevents a single genre or person from dominating the result.

| Applicable dimension | Weight |
| --- | ---: |
| Genres | 0.30 |
| Movie/TV type | 0.15 |
| Release decade | 0.12 |
| Original language | 0.10 |
| Production/origin countries | 0.10 |
| Actors | 0.08 |
| Movie directors | 0.15 for movies only |
| TV creators | 0.15 for TV only |

The six shared dimensions plus the applicable director/creator dimension sum to
exactly `1.00`. The result reports four separate concepts:

- `metadataCoverage` is in `[0, 1]` and sums the applicable weights whose candidate
  metadata presence is known, including known-valid empty arrays. Media type is
  always known. It says nothing about whether the profile knows those values.
- `profileEvidenceCoverage` is in `[0, 1]`. For each dimension it multiplies the
  dimension weight by the fraction of distinct candidate values that have a valid,
  comparable DNA entry, then sums those products. Missing metadata, unknown
  identifiers and absent profile entries contribute zero. A valid neutral or
  negative entry still counts as evidence.
- `hasPersonalizationEvidence` is true only when at least one candidate value has a
  matching valid DNA entry. It is false for an empty DNA, unknown identifiers and no
  overlap, even when candidate metadata coverage is `1`.
- `matchScore` is the formula result in `[0, 100]`; `50` is its mathematical neutral
  point. Consumers must not present `50` as a personal match when
  `hasPersonalizationEvidence` is false.

Candidate metadata coverage affects the tie-breaker. Neither coverage value
artificially increases the match score. Candidate quality and eligibility thresholds
will be defined by candidate preparation checkpoint 9.5.2. Structurally malformed
individual DNA entries are ignored and cannot create profile evidence; an invalid DNA
document envelope, schema/version or duplicate valid key is still rejected.

Results sort by match score descending, metadata coverage descending, optional TMDB
popularity descending, then canonical `mediaKey` ascending. Popularity never changes
the match score. Explanation reasons use the one to three largest absolute dimension
contributions, with stable dimension order for ties. When all contributions are
neutral, the core returns a single limited-evidence explanation.

Examples: a genre with DNA score `+1` and confidence `0.8` contributes
`0.30 × 0.8 = +0.24`, moving a metadata-limited neutral result from `50` to `62`.
The same genre with confidence `0.2` moves it only to `53`. If a candidate has two
genres and only one has effective affinity `+1`, the genre match is `0.5`, the capped
genre contribution is `+0.15`, and the score change is `+7.5`. Fully matched,
fully-confident applicable dimensions reach `100`; fully negative ones reach `0`.

Rated and explicitly hidden/not-interested media are excluded before ranking by the
canonical `movie_{tmdbId}` or `tv_{tmdbId}` identity. Candidate fetching, bounded
pools, persistence, freshness, quality thresholds, hidden-state product storage and
UI remain outside ranking core v1 and are deferred to a later checkpoint.

## 9. Privacy and operations

- DNA and recalculation state are private by default. Publication requires a later,
  separate, revocable opt-in and a separate reduced public document.
- Store aggregate evidence and a minimal normalized media cache, not raw comments,
  profile biography, email, full TMDB payloads, or per-user browsing history.
- A transparent weighted profile is still personalization: it changes results using
  an individual's explicit ratings and reactions. It simply remains explainable and
  reproducible instead of using an opaque learned model.
- Firestore cost scales with source reads, cache reads/writes, DNA writes and triggers.
  TMDB cost/rate pressure scales with unique stale media, not users, because the cache
  is global. Fingerprints avoid unnecessary rewrites and recalculations.
- Use Auth/App Check where applicable, per-UID cooldowns, one active job, bounded
  batches, server quotas and monitoring. App Check is defense-in-depth, not Auth.
- When TMDB is unavailable, preserve the last confirmed DNA, mark recalculation state
  safely, and retry later. Never replace a good result with a partial empty profile.
- Full recalculation must be possible from source documents and cache for every
  algorithm version; derived DNA is disposable.
- Account deletion must delete private DNA/state with the user's other subcollections.
  Shared media cache contains no UID and need not be deleted for one account. Any
  future public projection must be explicitly deleted too.
- Cloud Functions production deployment requires Blaze. Configure billing alerts,
  spend caps where available, conservative max instances/concurrency, and no minimum
  instances for v1 unless latency requirements justify idle cost.

## 10. Implementation plan

| Stage | Deliverable | Dependencies and risks | Manual verification | User action / Blaze |
| --- | --- | --- | --- | --- |
| 9.2 — data model, Rules, Emulator tests | Add private server-write-only DNA/state paths and cache policy; exact schemas and regression tests. | Finalize public/private boundary and whether clients may read cache (recommend no). Preserve all existing Rules. | Emulator ownership/read/write matrix; confirm documents remain absent in production until deployment. | Rules deployment approval; Blaze not required. |
| 9.3 — calculation library | Pure normalization, priority dedupe, weighting, dimensions, confidence, fingerprint and exhaustive fixtures/property boundaries. | Product approval of weights, minimums and included dimensions. Avoid floating-point/order drift with sorted inputs and round-at-end. | Review numerical fixtures and explanations; no Firebase/TMDB access. | No Blaze; no console action. |
| 9.4 — secure recalculation pipeline | Functions project, secret-backed TMDB client, cache, rate limiting, backfill tooling, authoritative writes and Emulator integration tests. | Billing, secret lifecycle, function region, TMDB rate limits, retries, account deletion and operational alerts. | First use Emulator/synthetic data; then explicitly approved production smoke test and backfill. | **Blaze required before deployment**; choose region, add TMDB secret, budget alerts/spend cap and approve deploy. |
| 9.5 — My DNA page | Private `/dna` experience with confidence, positive/negative dimensions, loading/stale/error states and explicit recalculation control. | Stable server API/schema; accessible charts must have text equivalents. | Real account result, mobile/desktop, logout/privacy, failure/retry and no token/client writes. | No new plan beyond deployed 9.4. |
| 9.6 — personalized recommendations | Separate Movie/TV candidates, exclusions, match scoring, deterministic explanations and caching. | Candidate endpoint contract, quality guardrails, TMDB request budget and stale behavior. | Relevance/explanations, exclusions, refresh after rating, empty/error/mobile states. | Existing Blaze backend; approve any new TMDB endpoints and limits. |
| 9.7 — personal statistics and refinement | Carefully chosen private statistics, algorithm evaluation fixtures, weight/version review and migration tooling. | Avoid misleading metrics and sensitive inference; require enough evidence. | Compare known fixtures and real account expectations; accessibility and deletion. | Product decisions on metrics/public sharing; Blaze only for server migrations already in use. |

## 11. Decisions fixed and operational values remaining

The source priority, weights, dimensions, three-actor cap/reduced actor weight,
deferred dimensions, private default, event-driven/manual fallback strategy,
Functions 2nd gen platform, `europe-west6` region, Blaze deployment gate and account
deletion requirement are approved product decisions.

Stage 9.3 must encode these constants without reopening product scope. Stage 9.4
still needs concrete operational values for the manual cooldown, maximum media per
run, concurrency/retry limits, cache TTL by status, budget alerts and spend cap.
Those choices affect cost and reliability rather than the DNA formula.
