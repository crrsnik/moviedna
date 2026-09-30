const messages = Object.freeze({
  'profile-settings/invalid-input': 'Check your profile settings and try again.',
  'profile-settings/invalid-user': 'Your account could not be identified.',
  'profile-settings/missing-profile': 'Your profile could not be found.',
  'profile-settings/invalid-profile': 'Your profile data could not be loaded safely.',
  'profile-settings/permission-denied': 'You do not have permission to update this profile.',
  'profile-settings/unavailable': 'Profile settings are temporarily unavailable. Please try again.',
  'profile-settings/unknown': 'We could not save your profile settings. Please try again.',
})

export function getProfileSettingsErrorMessage(error) {
  return messages[error?.code] ?? messages['profile-settings/unknown']
}
