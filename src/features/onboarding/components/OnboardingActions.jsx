const button = 'rounded-lg border px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100 disabled:cursor-not-allowed disabled:opacity-40'

function OnboardingActions({ disabled, onReact }) {
  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3" aria-label="Movie reactions">
      <button type="button" aria-label="Dislike this movie" disabled={disabled} onClick={() => onReact('dislike')} className={`${button} border-rose-900 bg-rose-950 text-rose-200 hover:bg-rose-900`}>Dislike</button>
      <button type="button" aria-label="Skip this movie" disabled={disabled} onClick={() => onReact('skip')} className={`${button} border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700`}>Skip</button>
      <button type="button" aria-label="Like this movie" disabled={disabled} onClick={() => onReact('like')} className={`${button} border-emerald-900 bg-emerald-950 text-emerald-200 hover:bg-emerald-900`}>Like</button>
    </div>
  )
}

export default OnboardingActions
