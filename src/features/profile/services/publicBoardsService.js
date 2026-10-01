import {
  collection,
  getDocs,
} from 'firebase/firestore'

import { db } from '../../../shared/config/firebase.js'

import {
  normalizePublicBoardItems,
  normalizePublicBoards,
} from './normalizePublicBoards.js'

export class PublicBoardsError extends Error {
  constructor(code) {
    super(code)
    this.name = 'PublicBoardsError'
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

function mapError(error) {
  if (error instanceof PublicBoardsError) {
    return error
  }

  if (error?.code === 'permission-denied') {
    return new PublicBoardsError(
      'public-boards/permission-denied',
    )
  }

  if (error?.code === 'unavailable') {
    return new PublicBoardsError(
      'public-boards/unavailable',
    )
  }

  if (
    error?.message === 'invalid-public-board'
    || error?.message === 'invalid-public-board-item'
    || error?.message === 'invalid-timestamp'
  ) {
    return new PublicBoardsError(
      'public-boards/invalid',
    )
  }

  return new PublicBoardsError(
    'public-boards/unknown',
  )
}

export async function getPublicBoards(uid) {
  if (!validUid(uid)) {
    throw new PublicBoardsError(
      'public-boards/invalid-user',
    )
  }

  try {
    const boardSnapshot = await getDocs(
      collection(
        db,
        'publicBoards',
        uid,
        'boards',
      ),
    )

    const boards = normalizePublicBoards(
      boardSnapshot,
      uid,
    )

    return Promise.all(
      boards.map(async board => {
        const itemSnapshot = await getDocs(
          collection(
            db,
            'publicBoards',
            uid,
            'boards',
            board.id,
            'items',
          ),
        )

        return {
          ...board,
          items: normalizePublicBoardItems(
            itemSnapshot,
          ),
        }
      }),
    )
  } catch (error) {
    throw mapError(error)
  }
}
