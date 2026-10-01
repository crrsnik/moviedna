export class FriendshipServiceError extends Error {
  constructor(code) {
    super(code)
    this.name = 'FriendshipServiceError'
    this.code = code
  }
}

function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function validateUid(value) {
  if (!validUid(value)) {
    throw new FriendshipServiceError('friendship/invalid-user')
  }

  return value
}

function canonicalMembers(first, second) {
  const firstUid = validateUid(first)
  const secondUid = validateUid(second)

  if (firstUid === secondUid) {
    throw new FriendshipServiceError('friendship/self-request')
  }

  return firstUid < secondUid
    ? [firstUid, secondUid]
    : [secondUid, firstUid]
}

function bytesToHex(bytes) {
  return Array.from(
    new Uint8Array(bytes),
    (value) => value.toString(16).padStart(2, '0'),
  ).join('').toUpperCase()
}

function normalizeFriendshipSnapshot(snapshot) {
  if (!snapshot.exists()) return null

  const data = snapshot.data()

  if (
    !data
    || !Array.isArray(data.members)
    || data.members.length !== 2
    || !validUid(data.members[0])
    || !validUid(data.members[1])
    || !(data.members[0] < data.members[1])
    || !validUid(data.requestedBy)
    || !data.members.includes(data.requestedBy)
    || !['pending', 'accepted'].includes(data.status)
    || !data.createdAt
    || !data.updatedAt
    || (
      data.status === 'pending'
      && data.acceptedAt !== null
    )
    || (
      data.status === 'accepted'
      && !data.acceptedAt
    )
  ) {
    throw new FriendshipServiceError('friendship/invalid-data')
  }

  return {
    id: snapshot.id,
    members: [...data.members],
    requestedBy: data.requestedBy,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    acceptedAt: data.acceptedAt,
  }
}

function mapError(error) {
  if (error instanceof FriendshipServiceError) {
    return error
  }

  if (error?.code === 'permission-denied') {
    return new FriendshipServiceError(
      'friendship/permission-denied',
    )
  }

  if (error?.code === 'unavailable') {
    return new FriendshipServiceError(
      'friendship/unavailable',
    )
  }

  return new FriendshipServiceError('friendship/unknown')
}

export function createFriendshipService({
  auth,
  db,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  cryptoImpl = globalThis.crypto,
  TextEncoderImpl = globalThis.TextEncoder,
}) {
  function currentUid() {
    const uid = auth.currentUser?.uid

    if (!validUid(uid)) {
      throw new FriendshipServiceError(
        'friendship/unauthenticated',
      )
    }

    return uid
  }

  async function getFriendshipId(first, second) {
    const [memberA, memberB] = canonicalMembers(
      first,
      second,
    )

    if (
      !cryptoImpl?.subtle
      || typeof TextEncoderImpl !== 'function'
    ) {
      throw new FriendshipServiceError(
        'friendship/crypto-unavailable',
      )
    }

    const encoded = new TextEncoderImpl().encode(
      `${memberA}:${memberB}`,
    )

    const digest = await cryptoImpl.subtle.digest(
      'SHA-256',
      encoded,
    )

    return bytesToHex(digest)
  }

  async function getRef(otherUserId) {
    const uid = currentUid()
    const otherUid = validateUid(otherUserId)
    const friendshipId = await getFriendshipId(
      uid,
      otherUid,
    )

    return doc(
      db,
      'friendships',
      friendshipId,
    )
  }

  async function createFriendRequest(otherUserId) {
    try {
      const uid = currentUid()
      const otherUid = validateUid(otherUserId)
      const members = canonicalMembers(uid, otherUid)
      const friendshipId = await getFriendshipId(
        uid,
        otherUid,
      )

      await setDoc(
        doc(db, 'friendships', friendshipId),
        {
          members,
          requestedBy: uid,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          acceptedAt: null,
        },
      )

      return friendshipId
    } catch (error) {
      throw mapError(error)
    }
  }

  async function acceptFriendRequest(otherUserId) {
    try {
      const ref = await getRef(otherUserId)

      await updateDoc(
        ref,
        {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      )
    } catch (error) {
      throw mapError(error)
    }
  }

  async function deleteFriendship(otherUserId) {
    try {
      const ref = await getRef(otherUserId)
      await deleteDoc(ref)
    } catch (error) {
      throw mapError(error)
    }
  }

  async function getFriendship(otherUserId) {
    try {
      const ref = await getRef(otherUserId)
      const snapshot = await getDoc(ref)

      return normalizeFriendshipSnapshot(snapshot)
    } catch (error) {
      throw mapError(error)
    }
  }

  function subscribeToFriendships(onValue, onError) {
    try {
      const uid = currentUid()

      if (typeof onValue !== 'function') {
        throw new FriendshipServiceError(
          'friendship/invalid-listener',
        )
      }

      const friendshipQuery = query(
        collection(db, 'friendships'),
        where('members', 'array-contains', uid),
      )

      return onSnapshot(
        friendshipQuery,
        (snapshot) => {
          try {
            onValue(
              snapshot.docs.map(
                normalizeFriendshipSnapshot,
              ),
            )
          } catch (error) {
            onError?.(mapError(error))
          }
        },
        (error) => {
          onError?.(mapError(error))
        },
      )
    } catch (error) {
      throw mapError(error)
    }
  }

  return {
    getFriendshipId,
    createFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest: deleteFriendship,
    declineFriendRequest: deleteFriendship,
    removeFriend: deleteFriendship,
    getFriendship,
    subscribeToFriendships,
  }
}
