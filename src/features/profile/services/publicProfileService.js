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

  if (error?.code === 'unavailable') {
    return new PublicProfileLookupError('public-profile/unavailable')
  }

  return new PublicProfileLookupError('public-profile/unknown')
}

export async function getPublicProfileByUsername(value) {
  const username = normalizeUsername(value)

  let usernameSnapshot

  try {
    usernameSnapshot = await getDoc(
      doc(db, 'usernames', username),
    )
  } catch (error) {
    /*
     * For an unauthenticated visitor, Firestore deliberately makes a
     * private username unreadable. Do not reveal whether that username
     * exists or not.
     */
    if (error?.code === 'permission-denied') {
      return {
        kind: 'private-or-not-found',
        username,
        profile: null,
      }
    }

    throw mapError(error)
  }

  if (!usernameSnapshot.exists()) {
    return {
      kind: 'not-found',
      username,
      profile: null,
    }
  }

  const reservation = usernameSnapshot.data()
  const userId = reservation?.userId

  if (!validUid(userId)) {
    throw new PublicProfileLookupError('public-profile/invalid')
  }

  let profileSnapshot

  try {
    profileSnapshot = await getDoc(
      doc(db, 'publicProfiles', userId),
    )
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return {
        kind: 'private',
        username,
        profile: null,
      }
    }

    throw mapError(error)
  }

  const profile = normalizePublicProfile(profileSnapshot)

  if (profile.username !== username) {
    throw new PublicProfileLookupError('public-profile/inconsistent')
  }

  /*
   * Owners can read their own mirror even when it is private.
   * Do not accidentally classify that document as publicly visible.
   */
  if (profile.profileVisibility !== 'public') {
    return {
      kind: 'private',
      username,
      profile: null,
    }
  }

  return {
    kind: 'public',
    username,
    profile,
  }
}
