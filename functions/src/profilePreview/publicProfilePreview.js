import { resolvePublicGenreLabel } from './genreLabels.js'

const PROFILE_PREVIEW_SCHEMA_VERSION = 1
const MAX_GENRES = 4
const MEDIA_TYPES = new Set(['movie', 'tv'])

function validUid(uid) {
  return typeof uid === 'string' && uid.length > 0 && !uid.includes('/')
}

function eventUid(event) {
  const uid = event?.params?.uid

  if (!validUid(uid)) {
    throw new TypeError('Invalid profile preview UID.')
  }

  return uid
}

function snapshotData(snapshot) {
  if (!snapshot?.exists) return null
  return typeof snapshot.data === 'function' ? snapshot.data() : null
}

export function buildPublicDnaPreview(movieDna) {
  const source = Array.isArray(movieDna?.dimensions?.genres)
    ? movieDna.dimensions.genres
    : []

  const seen = new Set()

  const genres = source
    .map((entry) => ({
      entry,
      label: resolvePublicGenreLabel(entry),
    }))
    .filter(({ entry, label }) => (
      label
      && typeof entry?.score === 'number'
      && Number.isFinite(entry.score)
      && entry.score > 0
      && entry.score <= 1
    ))
    .sort((a, b) => (
      b.entry.score - a.entry.score
      || a.label.localeCompare(b.label)
    ))
    .filter(({ label }) => {
      const canonical = label.toLocaleLowerCase()

      if (seen.has(canonical)) return false

      seen.add(canonical)
      return true
    })
    .slice(0, MAX_GENRES)
    .map(({ entry, label }) => ({
      label,
      score: entry.score,
    }))

  return {
    genres,
  }
}

export function buildPublicStatisticsPreview(events) {
  const counts = {
    movie: 0,
    tv: 0,
  }

  for (const event of Array.isArray(events) ? events : []) {
    if (
      !event
      || typeof event !== 'object'
      || event.schemaVersion !== 1
      || !MEDIA_TYPES.has(event.mediaType)
      || typeof event.watchedDate !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(event.watchedDate)
    ) {
      continue
    }

    counts[event.mediaType] += 1
  }

  return {
    totalViewings: counts.movie + counts.tv,
    movieCount: counts.movie,
    tvCount: counts.tv,
  }
}

export function createPublicProfilePreviewHandlers(store) {
  async function movieDnaWrite(event) {
    const uid = eventUid(event)
    const movieDna = snapshotData(event?.data?.after)

    await store.mergePreview(uid, {
      dna: buildPublicDnaPreview(movieDna),
    })

    return { status: 'updated' }
  }

  async function viewingHistoryWrite(event) {
    const uid = eventUid(event)
    const events = await store.loadViewingHistory(uid)

    await store.mergePreview(uid, {
      statistics: buildPublicStatisticsPreview(events),
    })

    return { status: 'updated' }
  }

  async function publicProfileWrite(event) {
    const uid = eventUid(event)

    const before = snapshotData(event?.data?.before)
    const after = snapshotData(event?.data?.after)

    if (!after) {
      await store.deletePreview(uid)
      return { status: 'deleted' }
    }

    const profileCreated = !before

    const visibilityChanged = (
      before
      && before.profileVisibility
        !== after.profileVisibility
    )

    if (profileCreated || visibilityChanged) {
      const [movieDna, viewingHistory] = await Promise.all([
        store.loadMovieDna(uid),
        store.loadViewingHistory(uid),
      ])

      await store.writePreview(uid, {
        schemaVersion: PROFILE_PREVIEW_SCHEMA_VERSION,
        dna: buildPublicDnaPreview(movieDna),
        statistics: buildPublicStatisticsPreview(viewingHistory),
      })

      return { status: 'rebuilt' }
    }

    return { status: 'unchanged' }
  }

  return {
    movieDnaWrite,
    viewingHistoryWrite,
    publicProfileWrite,
  }
}

export {
  PROFILE_PREVIEW_SCHEMA_VERSION,
}
