import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from 'firebase/auth'
import {
  httpsCallable,
} from 'firebase/functions'

import {
  auth,
  functions,
} from '../../../shared/config/firebase.js'

import {
  createAccountDeletionService,
} from './createAccountDeletionService.js'

export const accountDeletionService = (
  createAccountDeletionService({
    auth,
    functions,

    credential: (
      email,
      password,
    ) => (
      EmailAuthProvider.credential(
        email,
        password,
      )
    ),

    reauthenticate:
      reauthenticateWithCredential,

    createCallable: httpsCallable,

    signOutUser: signOut,
  })
)
