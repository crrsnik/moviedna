export const PROFILE_AVATAR_IDS = Object.freeze([
  'avatar_01',
  'avatar_02',
  'avatar_03',
  'avatar_04',
  'avatar_05',
  'avatar_06',
  'avatar_07',
  'avatar_08',
])

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
