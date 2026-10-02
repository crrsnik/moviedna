import {
  AccountDeletionError,
  toAccountDeletionError,
} from './accountDeletionErrors.js'

export function createAccountDeletionService({
  auth,
  functions,
  credential,
  reauthenticate,
  createCallable,
  signOutUser,
}) {
  return {
    async deleteAccount(password) {
      if (
        typeof password !== 'string'
        || !password
      ) {
        throw new AccountDeletionError(
          'password-required',
        )
      }

      const user = auth.currentUser

      if (
        !user
        || typeof user.uid !== 'string'
        || !user.uid
        || typeof user.email !== 'string'
        || !user.email
      ) {
        throw new AccountDeletionError(
          'unauthenticated',
        )
      }

      try {
        await reauthenticate(
          user,
          credential(
            user.email,
            password,
          ),
        )

        /*
         * Force a fresh ID token so the callable receives
         * the new auth_time produced by reauthentication.
         */
        await user.getIdToken(true)
      } catch (error) {
        throw toAccountDeletionError(error)
      }

      try {
        const invoke = createCallable(
          functions,
          'deleteAccount',
        )

        const result = await invoke({
          confirm: true,
        })

        if (result?.data?.deleted !== true) {
          throw new AccountDeletionError(
            'unknown',
          )
        }
      } catch (error) {
        throw toAccountDeletionError(error)
      }

      /*
       * Server-side deletion has already succeeded here.
       * Local sign-out is cleanup only and must not turn
       * a successful deletion into an error.
       */
      try {
        await signOutUser(auth)
      } catch {}

      return true
    },
  }
}
