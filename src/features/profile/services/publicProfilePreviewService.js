import {
  doc,
  getDoc,
} from 'firebase/firestore'

import { db } from '../../../shared/config/firebase.js'

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

  return {
    label: value.label.trim(),
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

  return {
    dna: {
      genres: data.dna.genres.map(normalizeGenre),
    },

    statistics: {
      totalViewings: data.statistics.totalViewings,
      movieCount: data.statistics.movieCount,
      tvCount: data.statistics.tvCount,
    },

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
