import ProfileSettingsForm from '../features/profile/components/ProfileSettingsForm.jsx'

function ProfileSettingsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">
          Profile settings
        </h2>

        <p className="mt-2 text-zinc-400">
          Manage your MovieDNA identity, avatar, and profile privacy.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
        <ProfileSettingsForm />
      </div>
    </section>
  )
}

export default ProfileSettingsPage
