const achievement = id => Object.freeze({
  id,
  image: `/achievements/${id}.svg`,
  titleKey: `achievementsUi.items.${id}.title`,
  descriptionKey:
    `achievementsUi.items.${id}.description`,
})

export const ACHIEVEMENT_CATALOG = Object.freeze([
  achievement('onboarding_complete'),
  achievement('dna_ready'),

  achievement('rating_1'),
  achievement('rating_10'),
  achievement('rating_25'),
  achievement('rating_50'),
  achievement('rating_100'),

  achievement('watched_1'),
  achievement('watched_10'),
  achievement('watched_25'),
  achievement('watched_50'),
  achievement('watched_100'),

  achievement('movies_10'),
  achievement('movies_50'),
  achievement('tv_10'),
  achievement('tv_50'),

  achievement('favorite_1'),
  achievement('favorite_10'),
  achievement('favorite_25'),

  achievement('genres_5'),
  achievement('genres_10'),

  achievement('decades_3'),
  achievement('decades_5'),

  achievement('countries_3'),
  achievement('countries_5'),

  achievement('horror_10'),
  achievement('comedy_10'),
  achievement('scifi_10'),
  achievement('romance_10'),

  achievement('friend_1'),
  achievement('friends_5'),
  achievement('friends_10'),
])

export const ACHIEVEMENT_CATALOG_BY_ID =
  Object.freeze(
    Object.fromEntries(
      ACHIEVEMENT_CATALOG.map(
        item => [item.id, item],
      ),
    ),
  )
