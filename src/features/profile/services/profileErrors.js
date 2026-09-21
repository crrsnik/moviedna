const messages = {
  missing: "Your profile isn't available. Please refresh the page.",
  invalid: "We couldn't load your profile. Please refresh the page.",
  'permission-denied': "We couldn't access your profile. Please refresh the page.",
  unavailable: 'Your profile is temporarily unavailable. Please refresh the page to try again.',
  unknown: "We couldn't load your profile. Please refresh the page.",
}

export function getProfileErrorMessage(code) {
  return Object.hasOwn(messages, code) ? messages[code] : messages.unknown
}
