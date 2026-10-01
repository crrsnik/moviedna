import {
  doc,
  getDoc,
} from 'firebase/firestore'

import { db } from '../../../shared/config/firebase.js'
import {
  isValidProfileAvatarId,
  isValidProfileVisibility,
} from '../constants/profileSettings.js'

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export class PublicProfileLookupError extends Error {
  constructor(code) {
    super(code)
    this.name = 'PublicProfileLookupError'
    this.code = code
  }
}

function normalizeUsername(value) {
  if (typeof value !== 'string') {
    throw new PublicProfileLookupError('public-profile/invalid-username')
  }

  const username = value.trim().toLowerCase()

  if (!USERNAME_PATTERN.test(username)) {
    throw new PublicProfileLookupError('public-profile/invalid-username')
  }

  return username
}

function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function normalizeUserId(value) {
  if (!validUid(value)) {
    throw new PublicProfileLookupError(
      'public-profile/invalid-user-id',
    )
  }

  return value
}

function normalizePublicProfile(snapshot) {
  if (!snapshot.exists()) {
    throw new PublicProfileLookupError('public-profile/inconsistent')
  }

  const data = snapshot.data()

  if (
    !data
    || !validUid(data.userId)
    || data.userId !== snapshot.id
    || typeof data.username !== 'string'
    || !USERNAME_PATTERN.test(data.username)
    || typeof data.displayName !== 'string'
    || !data.displayName.trim()
    || data.displayName.length > 50
    || !isValidProfileAvatarId(data.avatarId)
    || !isValidProfileVisibility(data.profileVisibility)
    || !data.createdAt
    || !data.updatedAt
  ) {
    throw new PublicProfileLookupError('public-profile/invalid')
  }

  return {
    id: snapshot.id,
    userId: data.userId,
    username: data.username,
    displayName: data.displayName,
    avatarId: data.avatarId,
    profileVisibility: data.profileVisibility,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapError(error) {
  if (error instanceof PublicProfileLookupError) return error

  if (error?.code === 'permission-denied') {
    return new PublicProfileLookupError('public-profile/permission-denied')
  }

  if (error?.code === 'unavailable') {
    return new PublicProfileLookupError('public-profile/unavailable')
  }

  return new PublicProfileLookupError('public-profile/unknown')
}


export async function getPublicProfileByUserId(value) {
  try {
    const userId = normalizeUserId(value)

    const profileSnapshot = await getDoc(
      doc(db, 'publicProfiles', userId),
    )

    return normalizePublicProfile(profileSnapshot)
  } catch (error) {
    throw mapError(error)
  }
}

export async function getPublicProfileByUsername(value) {
  try {
    const username = normalizeUsername(value)

    const usernameSnapshot = await getDoc(
      doc(db, 'usernames', username),
    )

    if (!usernameSnapshot.exists()) {
      return {
        kind: 'not-found',
        username,
        profile: null,
      }
    }

    const userId = usernameSnapshot.data()?.userId

    if (!validUid(userId)) {
      throw new PublicProfileLookupError('public-profile/invalid')
    }

    const profileSnapshot = await getDoc(
      doc(db, 'publicProfiles', userId),
    )

    const profile = normalizePublicProfile(profileSnapshot)

    if (profile.username !== username) {
      throw new PublicProfileLookupError('public-profile/inconsistent')
    }

    return {
      kind: profile.profileVisibility === 'public'
        ? 'public'
        : 'private',
      username,
      profile,
    }
  } catch (error) {
    throw mapError(error)
  }
}
