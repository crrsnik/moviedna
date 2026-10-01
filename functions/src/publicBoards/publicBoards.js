const PUBLIC_BOARD_SCHEMA_VERSION = 1
const PUBLIC_BOARD_ITEM_SCHEMA_VERSION = 1

const LIST_ID_PATTERN = /^[A-Za-z0-9]{20}$/
const MEDIA_KEY_PATTERN = /^(movie|tv)_([1-9][0-9]{0,11})$/

function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function eventUid(event) {
  const uid = event?.params?.uid

  if (!validUid(uid)) {
    throw new TypeError('Invalid public board UID.')
  }

  return uid
}

function eventListId(event) {
  const listId = event?.params?.listId

  if (
    typeof listId !== 'string'
    || !LIST_ID_PATTERN.test(listId)
  ) {
    throw new TypeError('Invalid public board list ID.')
  }

  return listId
}

function eventMediaKey(event) {
  const mediaKey = event?.params?.mediaKey

  if (
    typeof mediaKey !== 'string'
    || !MEDIA_KEY_PATTERN.test(mediaKey)
  ) {
    throw new TypeError('Invalid public board media key.')
  }

  return mediaKey
}

function validText(value, maximum, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > maximum) {
    return false
  }

  return allowEmpty || value.trim().length > 0
}

function normalizeListIds(value) {
  if (!Array.isArray(value)) return []

  return [...new Set(
    value.filter(id => (
      typeof id === 'string'
      && LIST_ID_PATTERN.test(id)
    )),
  )]
}

export function buildPublicBoard(uid, listId, source) {
  if (
    !validUid(uid)
    || !LIST_ID_PATTERN.test(listId)
    || !source
    || typeof source !== 'object'
    || source.visibility !== 'public'
    || !validText(source.name, 60)
    || !validText(source.description, 300, true)
    || !source.createdAt
  ) {
    throw new TypeError('Invalid public board source.')
  }

  return {
    schemaVersion: PUBLIC_BOARD_SCHEMA_VERSION,
    ownerId: uid,
    listId,
    name: source.name.trim(),
    description: source.description.trim(),
    createdAt: source.createdAt,
  }
}

export function buildPublicBoardItem(mediaKey, source) {
  const match = (
    typeof mediaKey === 'string'
    && MEDIA_KEY_PATTERN.exec(mediaKey)
  )

  if (
    !match
    || !source
    || typeof source !== 'object'
    || !Number.isSafeInteger(source.tmdbId)
    || source.tmdbId < 1
    || source.tmdbId > 999999999999
    || !['movie', 'tv'].includes(source.mediaType)
    || `${source.mediaType}_${source.tmdbId}` !== mediaKey
    || !validText(source.title, 200)
    || !(
      source.posterPath === null
      || (
        typeof source.posterPath === 'string'
        && source.posterPath.length <= 200
        && /^\/[A-Za-z0-9_./-]+$/.test(source.posterPath)
        && !source.posterPath.includes('..')
      )
    )
    || !(
      source.releaseYear === null
      || (
        Number.isSafeInteger(source.releaseYear)
        && source.releaseYear >= 1800
        && source.releaseYear <= 2200
      )
    )
  ) {
    throw new TypeError('Invalid public board media source.')
  }

  return {
    schemaVersion: PUBLIC_BOARD_ITEM_SCHEMA_VERSION,
    tmdbId: source.tmdbId,
    mediaType: source.mediaType,
    title: source.title.trim(),
    posterPath: source.posterPath,
    releaseYear: source.releaseYear,
  }
}

export function createPublicBoardHandlers(store) {
  async function customListWrite(event) {
    const uid = eventUid(event)
    const listId = eventListId(event)

    const current = await store.loadList(uid, listId)

    if (!current || current.visibility !== 'public') {
      await store.deleteBoard(uid, listId)

      return {
        status: 'private',
      }
    }

    const items = await store.loadListItems(uid, listId)

    await store.replaceBoard(
      uid,
      listId,
      buildPublicBoard(uid, listId, current),
      items.map(item => ({
        mediaKey: item.id,
        value: buildPublicBoardItem(item.id, item),
      })),
    )

    return {
      status: 'published',
      itemCount: items.length,
    }
  }

  async function savedMediaWrite(event) {
    const uid = eventUid(event)
    const mediaKey = eventMediaKey(event)

    const before = event?.data?.before?.data?.() ?? null
    const after = event?.data?.after?.data?.() ?? null

    const affectedListIds = [...new Set([
      ...normalizeListIds(before?.listIds),
      ...normalizeListIds(after?.listIds),
    ])]

    if (!affectedListIds.length) {
      return {
        status: 'unchanged',
      }
    }

    // Always use the current document, not the event snapshot.
    // This makes delayed/out-of-order events converge on current state.
    const current = await store.loadSavedMedia(uid, mediaKey)
    const currentListIds = new Set(
      normalizeListIds(current?.listIds),
    )

    let updates = 0

    for (const listId of affectedListIds) {
      const list = await store.loadList(uid, listId)

      if (!list || list.visibility !== 'public') {
        continue
      }

      if (current && currentListIds.has(listId)) {
        await store.writeItem(
          uid,
          listId,
          mediaKey,
          buildPublicBoardItem(mediaKey, current),
        )
      } else {
        await store.deleteItem(
          uid,
          listId,
          mediaKey,
        )
      }

      updates += 1
    }

    return {
      status: updates ? 'updated' : 'unchanged',
      updates,
    }
  }

  return {
    customListWrite,
    savedMediaWrite,
  }
}

export {
  PUBLIC_BOARD_ITEM_SCHEMA_VERSION,
  PUBLIC_BOARD_SCHEMA_VERSION,
}
