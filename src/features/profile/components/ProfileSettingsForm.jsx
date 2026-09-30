import { useEffect, useRef, useState } from 'react'

import { useAuth } from '../../auth/hooks/useAuth.js'
import {
  PROFILE_AVATARS,
} from '../constants/profileSettings.js'
import { useUserProfile } from '../hooks/useUserProfile.js'
import { getProfileSettingsErrorMessage } from '../services/profileSettingsErrors.js'
import { updateProfileSettings } from '../services/profileSettingsService.js'

function valuesFromProfile(profile) {
  return {
    displayName: profile?.displayName ?? '',
    avatarId: profile?.avatarId ?? 'avatar_01',
    profileVisibility: profile?.profileVisibility ?? 'private',
  }
}

function ProfileSettingsForm() {
  const { user } = useAuth()
  const {
    profile,
    isProfileLoading,
    profileError,
  } = useUserProfile()

  const [values, setValues] = useState(() => valuesFromProfile(profile))
  const [displayNameError, setDisplayNameError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    if (!profile || pending.current) return
    setValues(valuesFromProfile(profile))
  }, [
    profile,
    profile?.displayName,
    profile?.avatarId,
    profile?.profileVisibility,
  ])

  if (isProfileLoading) {
    return <p role="status" className="text-zinc-400">Loading profile settings…</p>
  }

  if (profileError || !profile) {
    return (
      <p role="alert" className="text-red-300">
        We couldn't load your profile settings.
      </p>
    )
  }

  const currentValues = valuesFromProfile(profile)

  const isDirty = (
    values.displayName !== currentValues.displayName
    || values.avatarId !== currentValues.avatarId
    || values.profileVisibility !== currentValues.profileVisibility
  )

  function handleDisplayNameChange(event) {
    setValues((current) => ({
      ...current,
      displayName: event.target.value,
    }))
    setDisplayNameError(null)
    setServerError(null)
    setSuccessMessage(null)
  }

  function selectAvatar(avatarId) {
    setValues((current) => ({
      ...current,
      avatarId,
    }))
    setServerError(null)
    setSuccessMessage(null)
  }

  function selectVisibility(profileVisibility) {
    setValues((current) => ({
      ...current,
      profileVisibility,
    }))
    setServerError(null)
    setSuccessMessage(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (pending.current || isSaving || !isDirty) return

    const trimmedDisplayName = values.displayName.trim()

    if (!trimmedDisplayName || trimmedDisplayName.length > 50) {
      setDisplayNameError('Display name must contain 1–50 characters.')
      return
    }

    pending.current = true
    setIsSaving(true)
    setDisplayNameError(null)
    setServerError(null)
    setSuccessMessage(null)

    try {
      await updateProfileSettings(user?.uid, {
        displayName: trimmedDisplayName,
        avatarId: values.avatarId,
        profileVisibility: values.profileVisibility,
      })

      setValues((current) => ({
        ...current,
        displayName: trimmedDisplayName,
      }))

      setSuccessMessage('Profile settings saved.')
    } catch (error) {
      setServerError(getProfileSettingsErrorMessage(error))
    } finally {
      pending.current = false
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isSaving}
      className="space-y-8"
      noValidate
    >
      <fieldset disabled={isSaving} className="space-y-8 disabled:opacity-70">
        <legend className="sr-only">Profile settings</legend>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Profile identity</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Choose how your name appears across MovieDNA.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-username"
              className="block text-sm font-medium text-zinc-200"
            >
              Username
            </label>

            <input
              id="profile-username"
              type="text"
              value={profile.username}
              disabled
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-500 disabled:cursor-not-allowed"
            />

            <p className="text-sm text-zinc-500">
              Usernames cannot be changed yet.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-display-name"
              className="block text-sm font-medium text-zinc-200"
            >
              Display name
            </label>

            <input
              id="profile-display-name"
              name="displayName"
              type="text"
              autoComplete="name"
              maxLength={50}
              required
              value={values.displayName}
              onChange={handleDisplayNameChange}
              aria-invalid={Boolean(displayNameError)}
              aria-describedby={displayNameError ? 'profile-display-name-error' : undefined}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 aria-invalid:border-red-400"
            />

            {displayNameError && (
              <p
                id="profile-display-name-error"
                role="alert"
                className="text-sm text-red-300"
              >
                {displayNameError}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Avatar</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Pick a built-in MovieDNA avatar.
            </p>
          </div>

          <div
            className="grid grid-cols-4 gap-3 sm:grid-cols-8"
            role="radiogroup"
            aria-label="Profile avatar"
          >
            {PROFILE_AVATARS.map((avatar) => {
              const selected = values.avatarId === avatar.id

              return (
                <label
                  key={avatar.id}
                  className={[
                    'cursor-pointer rounded-xl border p-2 text-center transition',
                    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zinc-100',
                    selected
                      ? 'border-zinc-100 bg-zinc-800'
                      : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="avatarId"
                    value={avatar.id}
                    checked={selected}
                    onChange={() => selectAvatar(avatar.id)}
                    className="sr-only"
                  />

                  <span
                    aria-hidden="true"
                    className="flex aspect-square items-center justify-center text-3xl"
                  >
                    {avatar.symbol}
                  </span>

                  <span className="mt-1 block truncate text-xs text-zinc-300">
                    {avatar.label}
                  </span>
                </label>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Profile privacy</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Control whether other people can view your public MovieDNA profile.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={[
                'cursor-pointer rounded-lg border p-4',
                values.profileVisibility === 'public'
                  ? 'border-zinc-100 bg-zinc-800'
                  : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500',
              ].join(' ')}
            >
              <input
                type="radio"
                name="profileVisibility"
                value="public"
                checked={values.profileVisibility === 'public'}
                onChange={() => selectVisibility('public')}
                className="sr-only"
              />

              <span className="block font-medium text-zinc-100">Public</span>
              <span className="mt-1 block text-sm text-zinc-400">
                Other people can open your public profile.
              </span>
            </label>

            <label
              className={[
                'cursor-pointer rounded-lg border p-4',
                values.profileVisibility === 'private'
                  ? 'border-zinc-100 bg-zinc-800'
                  : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500',
              ].join(' ')}
            >
              <input
                type="radio"
                name="profileVisibility"
                value="private"
                checked={values.profileVisibility === 'private'}
                onChange={() => selectVisibility('private')}
                className="sr-only"
              />

              <span className="block font-medium text-zinc-100">Private</span>
              <span className="mt-1 block text-sm text-zinc-400">
                Your public profile is hidden from other people.
              </span>
            </label>
          </div>
        </section>
      </fieldset>

      {serverError && (
        <p role="alert" className="text-sm text-red-300">
          {serverError}
        </p>
      )}

      {successMessage && (
        <p role="status" className="text-sm text-zinc-300">
          {successMessage}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSaving || !isDirty}
          className="rounded-md bg-zinc-100 px-5 py-3 font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default ProfileSettingsForm
