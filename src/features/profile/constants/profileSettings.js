export const PROFILE_AVATARS = Object.freeze([
  { id: 'avatar_01', label: 'Director', symbol: '🎬' },
  { id: 'avatar_02', label: 'Popcorn', symbol: '🍿' },
  { id: 'avatar_03', label: 'Film', symbol: '🎞️' },
  { id: 'avatar_04', label: 'Cinema', symbol: '📽️' },
  { id: 'avatar_05', label: 'Star', symbol: '⭐' },
  { id: 'avatar_06', label: 'Night', symbol: '🌙' },
  { id: 'avatar_07', label: 'Space', symbol: '🚀' },
  { id: 'avatar_08', label: 'DNA', symbol: '🧬' },
])

export const PROFILE_AVATAR_IDS = Object.freeze(
  PROFILE_AVATARS.map(({ id }) => id),
)

export const PROFILE_VISIBILITIES = Object.freeze([
  'public',
  'private',
])

export const DEFAULT_PROFILE_AVATAR_ID = 'avatar_01'
export const DEFAULT_PROFILE_VISIBILITY = 'private'

export function isValidProfileAvatarId(value) {
  return typeof value === 'string' && PROFILE_AVATAR_IDS.includes(value)
}

export function isValidProfileVisibility(value) {
  return typeof value === 'string' && PROFILE_VISIBILITIES.includes(value)
}
