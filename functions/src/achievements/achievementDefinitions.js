export const ACHIEVEMENT_SCHEMA_VERSION = 1

const definitions = [
  // Foundation
  {
    id: 'onboarding_complete',
    category: 'foundation',
    displayOrder: 10,
    metric: 'profile.onboardingCompleted',
    target: 1,
  },
  {
    id: 'dna_ready',
    category: 'foundation',
    displayOrder: 20,
    metric: 'dna.ready',
    target: 1,
  },

  // Ratings
  {
    id: 'rating_1',
    category: 'ratings',
    displayOrder: 100,
    metric: 'ratings.total',
    target: 1,
  },
  {
    id: 'rating_10',
    category: 'ratings',
    displayOrder: 110,
    metric: 'ratings.total',
    target: 10,
  },
  {
    id: 'rating_25',
    category: 'ratings',
    displayOrder: 120,
    metric: 'ratings.total',
    target: 25,
  },
  {
    id: 'rating_50',
    category: 'ratings',
    displayOrder: 130,
    metric: 'ratings.total',
    target: 50,
  },
  {
    id: 'rating_100',
    category: 'ratings',
    displayOrder: 140,
    metric: 'ratings.total',
    target: 100,
  },

  // Watched
  {
    id: 'watched_1',
    category: 'watched',
    displayOrder: 200,
    metric: 'watched.total',
    target: 1,
  },
  {
    id: 'watched_10',
    category: 'watched',
    displayOrder: 210,
    metric: 'watched.total',
    target: 10,
  },
  {
    id: 'watched_25',
    category: 'watched',
    displayOrder: 220,
    metric: 'watched.total',
    target: 25,
  },
  {
    id: 'watched_50',
    category: 'watched',
    displayOrder: 230,
    metric: 'watched.total',
    target: 50,
  },
  {
    id: 'watched_100',
    category: 'watched',
    displayOrder: 240,
    metric: 'watched.total',
    target: 100,
  },

  // Movies / TV
  {
    id: 'movies_10',
    category: 'watched',
    displayOrder: 300,
    metric: 'watched.movies',
    target: 10,
  },
  {
    id: 'movies_50',
    category: 'watched',
    displayOrder: 310,
    metric: 'watched.movies',
    target: 50,
  },
  {
    id: 'tv_10',
    category: 'watched',
    displayOrder: 320,
    metric: 'watched.tv',
    target: 10,
  },
  {
    id: 'tv_50',
    category: 'watched',
    displayOrder: 330,
    metric: 'watched.tv',
    target: 50,
  },

  // Favorites
  {
    id: 'favorite_1',
    category: 'favorites',
    displayOrder: 400,
    metric: 'favorites.total',
    target: 1,
  },
  {
    id: 'favorite_10',
    category: 'favorites',
    displayOrder: 410,
    metric: 'favorites.total',
    target: 10,
  },
  {
    id: 'favorite_25',
    category: 'favorites',
    displayOrder: 420,
    metric: 'favorites.total',
    target: 25,
  },

  // Variety
  {
    id: 'genres_5',
    category: 'variety',
    displayOrder: 500,
    metric: 'watched.distinctGenres',
    target: 5,
  },
  {
    id: 'genres_10',
    category: 'variety',
    displayOrder: 510,
    metric: 'watched.distinctGenres',
    target: 10,
  },
  {
    id: 'decades_3',
    category: 'variety',
    displayOrder: 520,
    metric: 'watched.distinctDecades',
    target: 3,
  },
  {
    id: 'decades_5',
    category: 'variety',
    displayOrder: 530,
    metric: 'watched.distinctDecades',
    target: 5,
  },
  {
    id: 'countries_3',
    category: 'variety',
    displayOrder: 540,
    metric: 'watched.distinctCountries',
    target: 3,
  },
  {
    id: 'countries_5',
    category: 'variety',
    displayOrder: 550,
    metric: 'watched.distinctCountries',
    target: 5,
  },

  // Genre specialists
  {
    id: 'horror_10',
    category: 'genres',
    displayOrder: 600,
    metric: 'watched.byGenre.27',
    target: 10,
  },
  {
    id: 'comedy_10',
    category: 'genres',
    displayOrder: 610,
    metric: 'watched.byGenre.35',
    target: 10,
  },
  {
    id: 'scifi_10',
    category: 'genres',
    displayOrder: 620,
    metric: 'watched.byGenre.878',
    target: 10,
  },
  {
    id: 'romance_10',
    category: 'genres',
    displayOrder: 630,
    metric: 'watched.byGenre.10749',
    target: 10,
  },

  // Social
  {
    id: 'friend_1',
    category: 'social',
    displayOrder: 700,
    metric: 'friends.accepted',
    target: 1,
  },
  {
    id: 'friends_5',
    category: 'social',
    displayOrder: 710,
    metric: 'friends.accepted',
    target: 5,
  },
  {
    id: 'friends_10',
    category: 'social',
    displayOrder: 720,
    metric: 'friends.accepted',
    target: 10,
  },
]

export const ACHIEVEMENT_DEFINITIONS = Object.freeze(
  definitions.map((definition) => Object.freeze({ ...definition })),
)

export const ACHIEVEMENT_DEFINITION_BY_ID = Object.freeze(
  Object.fromEntries(
    ACHIEVEMENT_DEFINITIONS.map((definition) => [
      definition.id,
      definition,
    ]),
  ),
)
