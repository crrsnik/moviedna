# MovieDNA

**Discover your movie identity.**

MovieDNA is a full-stack movie and TV discovery application that builds a personalized taste profile from the way a user interacts with films and series.

Instead of relying only on ratings or generic popularity, MovieDNA combines multiple preference signals into an evolving **Movie DNA** and uses it to generate personalized recommendations, viewing statistics, achievements, and social profile features.

> MovieDNA is an educational and portfolio project focused on product design, recommendation systems, Firebase architecture, security, testing, and modern React development.

---

## Features

### Personalized Movie DNA

MovieDNA builds a user taste profile from signals such as:

- onboarding reactions;
- ratings;
- likes and dislikes;
- favorites;
- watched titles;
- viewing history;
- optional DNA refinement responses.

The resulting profile represents preferences across:

- Genres
- Movies vs TV
- Decades
- Countries
- Actors
- Directors

The profile evolves as the user interacts with the application.

---

### Personalized recommendations

Recommendations are generated through a server-side pipeline.

MovieDNA gathers candidate titles from several TMDB sources, including:

- trending titles;
- popular titles;
- top-rated titles;
- preferred genres;
- recommendations related to positively rated or liked titles.

Titles already known by the user are excluded before ranking.

Candidates are then compared with the user's Movie DNA and additional preference signals to generate a personalized recommendation set.

Recommendation logic and TMDB credentials remain on the server through Firebase Cloud Functions.

---

### Movie and TV discovery

Users can:

- browse trending movies and TV shows;
- search movies, series, and people;
- open detailed title and person pages;
- rate titles;
- like or dislike titles;
- add favorites;
- maintain a watchlist;
- mark titles as watched;
- hide unwanted recommendations.

---

### Viewing history

MovieDNA stores individual viewing events rather than only a simple watched flag.

Users can:

- record when a title was watched;
- edit viewing dates;
- remove viewing events;
- record repeated viewings of the same title.

Viewing history is also used for statistics and recommendation filtering.

---

### Statistics

Personal statistics are calculated from viewing activity and include insights such as:

- total viewing activity;
- movies vs TV;
- favorite genres;
- decades;
- countries;
- other viewing patterns.

---

### Library and collections

Users can organize movies and TV shows through:

- favorites;
- watchlist;
- watched titles;
- custom collections;
- public or private collections.

Selected collections can also appear on public profiles.

---

### Profiles and social features

MovieDNA includes:

- customizable user profiles;
- profile avatars;
- privacy settings;
- public Movie DNA previews;
- achievements;
- public collections;
- friendship requests;
- accepted friendships;
- blocking;
- friend-only content.

---

### Achievements

Users can unlock achievements through viewing activity and profile progress.

Achievement categories include milestones related to:

- watched titles;
- genres;
- decades;
- countries;
- social activity;
- profile development.

Unlocked achievements are displayed on user profiles.

---

### Notifications

The notification system supports events such as:

- friend requests;
- accepted friendships;
- newly unlocked achievements.

Notifications can be marked as read or unread and are also available through a complete notification history.

---

### Localization

MovieDNA currently supports:

- English
- French
- Russian

---

### Responsive UI and themes

The application supports:

- desktop and mobile layouts;
- light mode;
- dark mode;
- responsive navigation;
- responsive media cards and profile pages.

The interface intentionally uses a minimal visual style so that movie artwork and user content remain the main focus.

---

## Tech stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- Tailwind CSS

### Backend

- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Firebase Hosting
- Firebase App Check
- reCAPTCHA Enterprise

### External data

- TMDB API

---

## Architecture

MovieDNA uses a feature-based frontend structure.

src/
├── features/
│   ├── achievements/
│   ├── auth/
│   ├── catalog/
│   ├── comments/
│   ├── dna/
│   ├── friends/
│   ├── library/
│   ├── localization/
│   ├── notifications/
│   ├── profile/
│   ├── ratings/
│   ├── recommendations/
│   ├── statistics/
│   └── viewingHistory/
│
├── pages/
├── router/
└── shared/

Server-side functionality is separated into Firebase Functions responsible for areas such as:

functions/src/
├── achievements/
├── accountDeletion/
├── adapters/
├── dna/
├── metadata/
├── notifications/
├── profilePreview/
├── publicBoards/
└── recommendations/

This structure separates interface code, domain logic, persistence, recommendation processing, and server-side operations.

## Security

Security is handled at multiple levels.

MovieDNA uses:

- Firebase Authentication;
- Firestore Security Rules;
- Firebase App Check;
- reCAPTCHA Enterprise;
- protected Cloud Functions;
- ownership checks;
- friendship-based access control;
- dedicated public profile projections;
- server-side account deletion;
- server-side TMDB access.

Private user documents are not used directly as public profiles.

TMDB credentials are stored server-side and are not exposed to the browser.

---

## Performance

MovieDNA includes several optimizations to reduce repeated loading and unnecessary network requests:

- in-memory Movie DNA snapshot caching;
- confirmed viewing-history snapshot reuse;
- short-lived trending catalog caching;
- recommendation caching based on profile revisions;
- concurrent recommendation source requests;
- server-side metadata caching.

Cached content can still be refreshed in the background when appropriate.

---

## Testing

The project includes automated tests for both frontend and backend behavior.

Coverage includes areas such as:

- authentication;
- Movie DNA;
- recommendations;
- viewing history;
- statistics;
- profiles;
- friendships;
- collections;
- achievements;
- notifications;
- Firestore Security Rules.

Firestore rules are tested using Firebase emulators.

Common validation commands include:

npm run test:unit
npm run test:rules
npm run build

## Local development

Install dependencies:
npm install

Start the Vite development server:
npm run dev

To expose the local development server on the local network:
npm run dev -- --host

Create a production build:
npm run build

Full functionality requires Firebase configuration and access to TMDB services.
Production API access is protected through Firebase App Check and server-side Cloud Functions.

## Deployment

MovieDNA is deployed with Firebase.
Frontend:
firebase deploy --only hosting

Firestore Security Rules:
firebase deploy --only firestore:rules

Cloud Functions can be deployed separately when backend changes are required.

## Project status

MovieDNA is a completed educational and portfolio project.
The project was developed as a complete application rather than a minimal prototype and includes:

- authentication;
- personalized recommendation logic;
- persistent user data;
- social functionality;
- privacy controls;
- serverless backend processing;
- database security rules;
- automated testing;
- responsive design;
- localization;
- production deployment.
- 
Future development is expected to focus mainly on refinement, experimentation, and maintenance rather than expanding the core feature set.
TMDB attribution
Movie and TV metadata and artwork are provided by TMDB.
This product uses the TMDB API but is not endorsed or certified by TMDB.

## About MovieDNA

MovieDNA explores how different user preference signals can be transformed into an interpretable movie and TV taste profile.
The project combines product design, frontend development, backend architecture, recommendation logic, database security, automated testing, and deployment in a single full-stack application.
  
