import {
  collection,
  doc,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../../../shared/config/firebase.js'

import {
  normalizeSavedMedia,
} from '../../library/services/normalizeSavedMedia.js'

import {
  getMediaKey,
  normalizeMediaSnapshot,
} from '../../library/validation/libraryValidation.js'

import {
  getOnboardingMediaKey,
  normalizeResponse,
  validateUid,
} from '../../onboarding/validation/onboardingValidation.js'

import {
  OnboardingError,
  toOnboardingError,
} from '../../onboarding/services/onboardingErrors.js'

import {
  MAX_DNA_REFINEMENT_RESPONSES,
} from '../constants/dnaRefinement.js'


function requireOwner(uid) {
  validateUid(uid)

  if (
    !auth.currentUser
    || auth.currentUser.uid !== uid
  ) {
    throw new OnboardingError('unauthenticated')
  }
}


function requireCompletedProfile(snapshot) {
  if (
    !snapshot.exists()
    || typeof snapshot.data().onboardingCompleted !== 'boolean'
  ) {
    throw new OnboardingError('invalid-data')
  }

  if (!snapshot.data().onboardingCompleted) {
    throw new OnboardingError('failed-precondition')
  }
}


function normalizeDocument(snapshot) {
  try {
    const data = snapshot.data()

    const fields = [
      'tmdbId',
      'mediaType',
      'reaction',
      'genreIds',
      'createdAt',
      'updatedAt',
    ]

    if (
      !data
      || Object.keys(data).length !== fields.length
      || !fields.every(key => Object.hasOwn(data, key))
      || !(data.createdAt instanceof Timestamp)
      || !(data.updatedAt instanceof Timestamp)
    ) {
      throw new OnboardingError('invalid-data')
    }

    const response = normalizeResponse(data)

    const canonicalId = getOnboardingMediaKey(
      response.mediaType,
      response.tmdbId,
    )

    if (snapshot.id !== canonicalId) {
      throw new OnboardingError('invalid-data')
    }

    return {
      id: snapshot.id,
      ...response,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  } catch {
    throw new OnboardingError('invalid-data')
  }
}


function refinementMediaSnapshot(movie) {
  try {
    const yearText = typeof movie?.releaseDate === 'string'
      ? movie.releaseDate.slice(0, 4)
      : null

    const releaseYear = (
      yearText
      && /^\d{4}$/.test(yearText)
    )
      ? Number(yearText)
      : null

    return normalizeMediaSnapshot({
      tmdbId: movie?.id,
      mediaType: movie?.mediaType,
      title: movie?.title,
      posterPath: movie?.posterPath ?? null,
      releaseYear,
    })
  } catch {
    throw new OnboardingError('invalid-input')
  }
}


export async function loadDnaRefinementResponses({
  uid,
}) {
  try {
    requireOwner(uid)

    const snapshot = await getDocsFromServer(
      collection(
        db,
        'users',
        uid,
        'dnaRefinementResponses',
      ),
    )

    requireOwner(uid)

    return snapshot.docs.map(normalizeDocument)
  } catch (error) {
    throw toOnboardingError(error)
  }
}


export async function saveDnaRefinementResponse({
  uid,
  movie,
  reaction,
}) {
  try {
    requireOwner(uid)

    const response = normalizeResponse({
      tmdbId: movie?.id,
      mediaType: movie?.mediaType,
      reaction,
      genreIds: movie?.genreIds,
    })

    const mediaKey = getOnboardingMediaKey(
      response.mediaType,
      response.tmdbId,
    )

    const responseCollection = collection(
      db,
      'users',
      uid,
      'dnaRefinementResponses',
    )

    const existingResponses = await getDocsFromServer(
      responseCollection,
    )

    requireOwner(uid)

    const alreadyExists = existingResponses.docs.some(
      snapshot => snapshot.id === mediaKey,
    )

    if (
      !alreadyExists
      && existingResponses.size
        >= MAX_DNA_REFINEMENT_RESPONSES
    ) {
      throw new OnboardingError('invalid-input')
    }

    const media = response.reaction === 'skip'
      ? null
      : refinementMediaSnapshot(movie)

    const responseRef = doc(
      db,
      'users',
      uid,
      'dnaRefinementResponses',
      mediaKey,
    )

    const baseCanonicalRef = doc(
      db,
      'users',
      uid,
      'onboardingResponses',
      mediaKey,
    )

    const baseLegacyRef = response.mediaType === 'movie'
      ? doc(
          db,
          'users',
          uid,
          'onboardingResponses',
          String(response.tmdbId),
        )
      : null

    const savedMediaRef = media
      ? doc(
          db,
          'users',
          uid,
          'savedMedia',
          getMediaKey(
            media.mediaType,
            media.tmdbId,
          ),
        )
      : null

    await runTransaction(
      db,
      async transaction => {
        requireOwner(uid)

        const profileRef = doc(
          db,
          'users',
          uid,
        )

        const profile = await transaction.get(
          profileRef,
        )

        requireCompletedProfile(profile)

        const [
          existing,
          baseCanonical,
          baseLegacy,
        ] = await Promise.all([
          transaction.get(responseRef),
          transaction.get(baseCanonicalRef),
          baseLegacyRef
            ? transaction.get(baseLegacyRef)
            : Promise.resolve(null),
        ])

        requireOwner(uid)

        if (
          baseCanonical.exists()
          || baseLegacy?.exists()
        ) {
          throw new OnboardingError('invalid-input')
        }

        let savedMediaSnapshot = null

        if (savedMediaRef) {
          savedMediaSnapshot = await transaction.get(
            savedMediaRef,
          )

          requireOwner(uid)
        }

        let savedMedia = null

        if (savedMediaSnapshot?.exists()) {
          try {
            savedMedia = normalizeSavedMedia(
              savedMediaSnapshot,
            )
          } catch {
            throw new OnboardingError('invalid-data')
          }
        }

        if (existing.exists()) {
          normalizeDocument(existing)

          transaction.update(responseRef, {
            reaction: response.reaction,
            genreIds: response.genreIds,
            updatedAt: serverTimestamp(),
          })
        } else {
          transaction.set(responseRef, {
            ...response,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }

        if (savedMediaRef) {
          if (savedMedia) {
            transaction.update(savedMediaRef, {
              title: media.title,
              posterPath: media.posterPath,
              releaseYear: media.releaseYear,
              watched: true,
              updatedAt: serverTimestamp(),
            })
          } else {
            transaction.set(savedMediaRef, {
              ...media,
              favorite: false,
              watchlist: false,
              watched: true,
              listIds: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }
        }
      },
    )

    return {
      id: mediaKey,
      ...response,
    }
  } catch (error) {
    throw toOnboardingError(error)
  }
}
