import { useOnboarding } from '../hooks/useOnboarding.js'
import { MAX_RESPONSES } from '../validation/onboardingValidation.js'
import SwipeMovieCard from './SwipeMovieCard.jsx'
import OnboardingActions from './OnboardingActions.jsx'

function OnboardingExperience() {
  const { currentMovie, progress, isLoading, isSaving, isCompleting, loadError, actionError, retry, reactToMovie, complete } = useOnboarding()
  const busy = isSaving || isCompleting
  const reachedLimit = progress.responseCount >= MAX_RESPONSES
  const noCards = !currentMovie || reachedLimit
  return (
    <section className="w-full min-w-0 max-w-2xl space-y-6" aria-labelledby="onboarding-title">
      <div className="space-y-3 text-center">
        <h1 id="onboarding-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Teach MovieDNA your taste</h1>
        <p className="text-sm leading-relaxed text-zinc-400">Your reactions will help shape future recommendations. Like, dislike, or skip a movie.</p>
      </div>
      {isLoading ? <p role="status" className="py-12 text-center text-zinc-400">Loading your movies and saved progress…</p> : (
        <>
          <div className="space-y-2 text-center text-sm text-zinc-300">
            <p>{progress.responseCount} total responses · {progress.opinionatedCount} likes/dislikes</p>
            <p className="text-xs text-zinc-500">Minimum 10 responses and 5 likes/dislikes. Up to 30 responses.</p>
          </div>
          {loadError ? (
            <div className="space-y-3 text-center">
              <p role="alert" className="text-sm text-amber-200">{loadError}</p>
              <button type="button" onClick={retry} disabled={busy} className="rounded px-4 py-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-zinc-100 disabled:opacity-40">Retry</button>
            </div>
          ) : noCards ? (
            <div className="space-y-3 py-6 text-center">
              <p>{progress.canFinish ? "You're ready to finish onboarding." : 'No more movies in this deck. Retry to look for new movies.'}</p>
              {!progress.canFinish && <button type="button" onClick={retry} disabled={busy} className="rounded px-4 py-2 underline focus-visible:outline-2 focus-visible:outline-zinc-100 disabled:opacity-40">Retry</button>}
            </div>
          ) : (
            <>
              <div className="px-3 py-2"><SwipeMovieCard movie={currentMovie} disabled={busy} onReact={reactToMovie} /></div>
              <OnboardingActions disabled={busy} onReact={reactToMovie} />
              <p id="onboarding-controls-help" className="text-center text-xs text-zinc-500">Swipe left to dislike, right to like. Focus the card to use ← / → / ↓, or use the buttons.</p>
            </>
          )}
          <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-zinc-400">{isSaving ? 'Saving reaction…' : isCompleting ? 'Finishing…' : ''}</p>
          {actionError && <p role="alert" className="text-center text-sm text-rose-200">{actionError}</p>}
          <div className="space-y-3 border-t border-zinc-800 pt-6 text-center">
            <button type="button" onClick={complete} disabled={busy || !progress.canFinish} aria-describedby="finish-requirements" className="rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">{isCompleting ? 'Finishing…' : 'Finish onboarding'}</button>
            <p id="finish-requirements" className="text-xs text-zinc-400">
              {progress.canFinish ? 'Your progress is saved. Finish whenever you are ready.' : `Still needed: ${progress.missingResponses} responses and ${progress.missingOpinions} likes/dislikes.${progress.responseCount > MAX_RESPONSES ? ' Too many saved responses; please refresh and check your progress.' : ''}`}
            </p>
          </div>
        </>
      )}
    </section>
  )
}

export default OnboardingExperience
