export function getProfileContextValue(uid, state) {
  if (!uid) {
    return { profile: null, isProfileLoading: false, profileError: null, hasCompletedOnboarding: false }
  }
  if (state.uid !== uid) {
    return { profile: null, isProfileLoading: true, profileError: null, hasCompletedOnboarding: false }
  }
  const { profile, isProfileLoading, profileError } = state
  return {
    profile,
    isProfileLoading,
    profileError,
    hasCompletedOnboarding: !isProfileLoading && !profileError && profile?.onboardingCompleted === true,
  }
}
