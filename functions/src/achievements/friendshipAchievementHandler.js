function validUid(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
  )
}

function snapshotMembers(snapshot) {
  const data = snapshot?.data?.()

  if (
    !data
    || !Array.isArray(data.members)
    || data.members.length !== 2
    || !data.members.every(validUid)
    || data.members[0] === data.members[1]
  ) {
    return []
  }

  return data.members
}

export function affectedFriendshipMembers(event) {
  return [
    ...new Set([
      ...snapshotMembers(event?.data?.before),
      ...snapshotMembers(event?.data?.after),
    ]),
  ].sort()
}

export function createFriendshipAchievementHandler({
  userExists,
  recalculate,
}) {
  return async function friendshipAchievementWrite(event) {
    const members = affectedFriendshipMembers(event)

    if (!members.length) {
      return {
        status: 'ignored',
        users: {},
      }
    }

    const entries = await Promise.all(
      members.map(async uid => {
        if (!(await userExists(uid))) {
          return [
            uid,
            {
              status: 'account-deleted',
            },
          ]
        }

        return [
          uid,
          await recalculate(uid),
        ]
      }),
    )

    return {
      status: 'processed',
      users: Object.fromEntries(entries),
    }
  }
}
