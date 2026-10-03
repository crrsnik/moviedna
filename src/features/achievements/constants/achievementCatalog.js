const achievement = (
  id,
  symbol,
  tone,
) => Object.freeze({
  id,
  symbol,
  tone,
  titleKey: `achievementsUi.items.${id}.title`,
  descriptionKey:
    `achievementsUi.items.${id}.description`,
})

export const ACHIEVEMENT_CATALOG = Object.freeze([
  achievement(
    'onboarding_complete',
    '✓',
    'bg-violet-600',
  ),
  achievement(
    'dna_ready',
    'DNA',
    'bg-fuchsia-600',
  ),

  achievement('rating_1', '★', 'bg-amber-500'),
  achievement('rating_10', '★', 'bg-amber-500'),
  achievement('rating_25', '★', 'bg-amber-500'),
  achievement('rating_50', '★', 'bg-orange-500'),
  achievement('rating_100', '★', 'bg-orange-600'),

  achievement('watched_1', '▶', 'bg-sky-500'),
  achievement('watched_10', '▶', 'bg-sky-500'),
  achievement('watched_25', '▶', 'bg-blue-500'),
  achievement('watched_50', '▶', 'bg-blue-600'),
  achievement('watched_100', '▶', 'bg-indigo-600'),

  achievement('movies_10', 'M', 'bg-red-500'),
  achievement('movies_50', 'M', 'bg-red-600'),
  achievement('tv_10', 'TV', 'bg-cyan-500'),
  achievement('tv_50', 'TV', 'bg-cyan-600'),

  achievement('favorite_1', '♥', 'bg-pink-500'),
  achievement('favorite_10', '♥', 'bg-rose-500'),
  achievement('favorite_25', '♥', 'bg-rose-600'),

  achievement('genres_5', '✦', 'bg-emerald-500'),
  achievement('genres_10', '✦', 'bg-emerald-600'),

  achievement('decades_3', '⌛', 'bg-teal-500'),
  achievement('decades_5', '⌛', 'bg-teal-600'),

  achievement('countries_3', '◎', 'bg-lime-600'),
  achievement('countries_5', '◎', 'bg-green-600'),

  achievement('horror_10', '☾', 'bg-purple-700'),
  achievement('comedy_10', '☺', 'bg-yellow-500'),
  achievement('scifi_10', '∞', 'bg-indigo-500'),
  achievement('romance_10', '♥', 'bg-pink-600'),

  achievement('friend_1', '♣', 'bg-violet-500'),
  achievement('friends_5', '♣', 'bg-violet-600'),
  achievement('friends_10', '♣', 'bg-violet-700'),
])

export const ACHIEVEMENT_CATALOG_BY_ID =
  Object.freeze(
    Object.fromEntries(
      ACHIEVEMENT_CATALOG.map(
        item => [item.id, item],
      ),
    ),
  )
