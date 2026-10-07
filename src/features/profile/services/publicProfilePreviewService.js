import {
  doc,
  getDoc,
} from 'firebase/firestore'

import { db } from '../../../shared/config/firebase.js'
import { resolveGenreIdLabel } from '../../dna/services/dimensionLabels.js'
import {
  TASTE_TITLE_COMBINATIONS,
  TASTE_TITLE_IDS,
} from '../../dna/utils/selectTasteTitle.js'

const PUBLIC_TASTE_TITLE_IDS = new Set([
  ...Object.values(TASTE_TITLE_IDS),
  ...Object.values(TASTE_TITLE_COMBINATIONS),
])

export class PublicProfilePreviewError extends Error {
  constructor(code) {
    super(code)
    this.name = 'PublicProfilePreviewError'
    this.code = code
  }
}

function validUid(uid) {
  return (
    typeof uid === 'string'
    && uid.length > 0
    && !uid.includes('/')
  )
}

function plain(value) {
  return (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function normalizePublicAchievement(value) {
  if (
    !plain(value)
    || typeof value.id !== 'string'
    || !/^[a-z][a-z0-9_]*$/.test(value.id)
    || typeof value.category !== 'string'
    || !value.category
    || !nonNegativeInteger(value.displayOrder)
    || !nonNegativeInteger(value.current)
    || !Number.isSafeInteger(value.target)
    || value.target <= 0
    || value.current > value.target
    || typeof value.unlocked !== 'boolean'
  ) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  let unlockedAt = null

  if (value.unlocked) {
    if (
      typeof value.unlockedAt?.toDate
        !== 'function'
    ) {
      throw new PublicProfilePreviewError(
        'public-profile-preview/invalid',
      )
    }

    unlockedAt = value.unlockedAt.toDate()

    if (
      !(unlockedAt instanceof Date)
      || Number.isNaN(
        unlockedAt.getTime(),
      )
    ) {
      throw new PublicProfilePreviewError(
        'public-profile-preview/invalid',
      )
    }
  } else if (value.unlockedAt !== null) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  return {
    id: value.id,
    category: value.category,
    displayOrder: value.displayOrder,
    current: value.current,
    target: value.target,
    unlocked: value.unlocked,
    unlockedAt,
  }
}

function normalizePublicAchievements(value) {
  if (value == null) {
    return {
      completedCount: 0,
      totalCount: 0,
      achievements: [],
    }
  }

  if (
    !plain(value)
    || !nonNegativeInteger(
      value.completedCount,
    )
    || !nonNegativeInteger(
      value.totalCount,
    )
    || !Array.isArray(value.achievements)
  ) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  const achievements =
    value.achievements.map(
      normalizePublicAchievement,
    )

  achievements.sort((a, b) => (
    a.displayOrder - b.displayOrder
    || a.id.localeCompare(b.id)
  ))

  if (
    achievements.length
      !== value.totalCount
    || achievements.filter(
      item => item.unlocked,
    ).length !== value.completedCount
  ) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  return {
    completedCount:
      value.completedCount,

    totalCount:
      value.totalCount,

    achievements,
  }
}

function normalizeTasteTitle(value) {
  if (value == null) return null

  if (
    !plain(value)
    || Object.keys(value).length !== 1
    || typeof value.id !== 'string'
    || !PUBLIC_TASTE_TITLE_IDS.has(
      value.id,
    )
  ) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  return {
    id: value.id,
  }
}

function normalizeGenre(value) {
  if (
    !plain(value)
    || typeof value.label !== 'string'
    || !value.label.trim()
    || typeof value.score !== 'number'
    || !Number.isFinite(value.score)
    || value.score <= 0
    || value.score > 1
  ) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  const storedLabel = value.label.trim()

  const label = /^\d+$/.test(storedLabel)
    ? resolveGenreIdLabel(storedLabel)
    : storedLabel

  if (!label) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  return {
    label,
    score: value.score,
  }
}

function normalizePreview(snapshot) {
  if (!snapshot.exists()) return null

  const data = snapshot.data()

  if (
    !plain(data)
    || data.schemaVersion !== 1
    || !plain(data.dna)
    || !Array.isArray(data.dna.genres)
    || data.dna.genres.length > 4
    || !plain(data.statistics)
    || !nonNegativeInteger(data.statistics.totalViewings)
    || !nonNegativeInteger(data.statistics.movieCount)
    || !nonNegativeInteger(data.statistics.tvCount)
    || data.statistics.totalViewings
      !== data.statistics.movieCount + data.statistics.tvCount
    || typeof data.updatedAt?.toDate !== 'function'
  ) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  const date = data.updatedAt.toDate()

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid',
    )
  }

  const tasteTitle =
    normalizeTasteTitle(
      data.dna.tasteTitle,
    )

  return {
    dna: {
      genres:
        data.dna.genres.map(
          normalizeGenre,
        ),

      ...(tasteTitle
        ? { tasteTitle }
        : {}),
    },

    statistics: {
      totalViewings: data.statistics.totalViewings,
      movieCount: data.statistics.movieCount,
      tvCount: data.statistics.tvCount,
    },

    achievements:
      normalizePublicAchievements(
        data.achievements,
      ),

    updatedAt: date.toISOString(),
  }
}

function mapError(error) {
  if (error instanceof PublicProfilePreviewError) return error

  if (error?.code === 'permission-denied') {
    return new PublicProfilePreviewError(
      'public-profile-preview/permission-denied',
    )
  }

  if (error?.code === 'unavailable') {
    return new PublicProfilePreviewError(
      'public-profile-preview/unavailable',
    )
  }

  return new PublicProfilePreviewError(
    'public-profile-preview/unknown',
  )
}

export async function getPublicProfilePreview(uid) {
  if (!validUid(uid)) {
    throw new PublicProfilePreviewError(
      'public-profile-preview/invalid-user',
    )
  }

  try {
    const snapshot = await getDoc(
      doc(db, 'publicProfilePreviews', uid),
    )

    return normalizePreview(snapshot)
  } catch (error) {
    throw mapError(error)
  }
}
