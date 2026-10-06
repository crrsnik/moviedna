const KEY = 'moviedna:onboarding-result'

function storage() {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

export function markOnboardingResultPending() {
  storage()?.setItem(KEY, '1')
}

export function clearOnboardingResultPending() {
  storage()?.removeItem(KEY)
}

export function hasOnboardingResultPending() {
  return storage()?.getItem(KEY) === '1'
}
