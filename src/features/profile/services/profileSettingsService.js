import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from '../../../shared/config/firebase.js'
import {
  isValidProfileAvatarId,
  isValidProfileVisibility,
} from '../constants/profileSettings.js'

export class ProfileSettingsError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ProfileSettingsError'
    this.code = code
  }
}

function normalizeInput({ displayName, avatarId, profileVisibility } = {}) {
  if (typeof displayName !== 'string') {
    throw new ProfileSettingsError('profile-settings/invalid-input')
  }

  const trimmedDisplayName = displayName.trim()

  if (trimmedDisplayName.length < 1 || trimmedDisplayName.length > 50
    || !isValidProfileAvatarId(avatarId)
    || !isValidProfileVisibility(profileVisibility)) {
    throw new ProfileSettingsError('profile-settings/invalid-input')
  }

  return {
    displayName: trimmedDisplayName,
    avatarId,
    profileVisibility,
  }
}

function normalizeUid(uid) {
  if (typeof uid !== 'string' || !uid || uid.includes('/')) {
    throw new ProfileSettingsError('profile-settings/invalid-user')
  }

  return uid
}

function mapError(error) {
  if (error instanceof ProfileSettingsError) return error

  if (error?.code === 'permission-denied') {
    return new ProfileSettingsError('profile-settings/permission-denied')
  }

  if (error?.code === 'unavailable') {
    return new ProfileSettingsError('profile-settings/unavailable')
  }

  return new ProfileSettingsError('profile-settings/unknown')
}

export async function updateProfileSettings(uid, input) {
  try {
    const safeUid = normalizeUid(uid)
    const settings = normalizeInput(input)

    const profileRef = doc(db, 'users', safeUid)
    const publicProfileRef = doc(db, 'publicProfiles', safeUid)

    await runTransaction(db, async (transaction) => {
      const profileSnapshot = await transaction.get(profileRef)

      if (!profileSnapshot.exists()) {
        throw new ProfileSettingsError('profile-settings/missing-profile')
      }

      const current = profileSnapshot.data()

      if (!current
        || typeof current.username !== 'string'
        || !current.username
        || !current.createdAt) {
        throw new ProfileSettingsError('profile-settings/invalid-profile')
      }

      transaction.update(profileRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      })

      transaction.set(publicProfileRef, {
        userId: safeUid,
        username: current.username,
        displayName: settings.displayName,
        avatarId: settings.avatarId,
        profileVisibility: settings.profileVisibility,
        createdAt: current.createdAt,
        updatedAt: serverTimestamp(),
      })
    })

    return settings
  } catch (error) {
    throw mapError(error)
  }
}
