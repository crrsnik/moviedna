function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function snapshotData(snapshot) {
  if (!snapshot?.exists) return null

  const data = snapshot.data?.()

  return data && typeof data === 'object'
    ? data
    : null
}

function validFriendship(data) {
  return (
    data
    && Array.isArray(data.members)
    && data.members.length === 2
    && data.members.every(validUid)
    && data.members[0] !== data.members[1]
    && validUid(data.requestedBy)
    && data.members.includes(data.requestedBy)
  )
}

function sameIdentity(before, after) {
  return (
    before.requestedBy === after.requestedBy
    && before.members.length === after.members.length
    && before.members.every(
      member => after.members.includes(member),
    )
  )
}

function otherMember(data, uid) {
  return data.members.find(
    member => member !== uid,
  )
}

export function friendshipNotificationForEvent(event) {
  const friendshipId = event?.params?.friendshipId

  if (!validUid(friendshipId)) return null

  const before = snapshotData(event?.data?.before)
  const after = snapshotData(event?.data?.after)

  if (
    !before
    && validFriendship(after)
    && after.status === 'pending'
  ) {
    const recipient = otherMember(
      after,
      after.requestedBy,
    )

    if (!validUid(recipient)) return null

    return {
      uid: recipient,
      type: 'friend_request',
      actorUid: after.requestedBy,
      entityId: friendshipId,
      metadata: {},
    }
  }

  if (
    validFriendship(before)
    && validFriendship(after)
    && sameIdentity(before, after)
    && before.status === 'pending'
    && after.status === 'accepted'
  ) {
    const actorUid = otherMember(
      after,
      after.requestedBy,
    )

    if (!validUid(actorUid)) return null

    return {
      uid: after.requestedBy,
      type: 'friend_accepted',
      actorUid,
      entityId: friendshipId,
      metadata: {},
    }
  }

  return null
}

export function createFriendshipNotificationHandler({
  notify,
}) {
  if (typeof notify !== 'function') {
    throw new TypeError('notify must be a function')
  }

  return async function friendshipNotificationWrite(
    event,
  ) {
    const notification =
      friendshipNotificationForEvent(event)

    if (!notification) {
      return {
        status: 'ignored',
      }
    }

    return {
      status: 'processed',
      result: await notify(notification),
    }
  }
}
