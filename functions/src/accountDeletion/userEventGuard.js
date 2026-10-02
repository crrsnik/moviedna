export function createUserEventGuard(db) {
  return async function runForActiveUser(
    event,
    operation,
  ) {
    const uid = event?.params?.uid

    if (
      typeof uid !== 'string'
      || !uid
      || uid.includes('/')
    ) {
      return {
        status: 'ignored',
      }
    }

    const profile = await db
      .collection('users')
      .doc(uid)
      .get()

    if (!profile.exists) {
      return {
        status: 'account-deleted',
      }
    }

    return operation()
  }
}
