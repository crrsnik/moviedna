import DnaDimensionSection from '../features/dna/components/DnaDimensionSection.jsx'
import DnaStatePanel from '../features/dna/components/DnaStatePanel.jsx'
import { useMovieDna } from '../features/dna/hooks/useMovieDna.js'
import {
  useTranslation,
} from '../features/localization/hooks/useTranslation.js'

const dimensions = [
  'genres',
  'mediaTypes',
  'decades',
  'countries',
  'directors',
  'actors',
]

export default function DnaPage() {
  const { t } = useTranslation()
  const state = useMovieDna()

  if (
    !state.current
    && state.kind !== 'failed'
  ) {
    return (
      <DnaStatePanel kind={state.kind} />
    )
  }

  if (
    state.kind === 'failed'
    && !state.current
  ) {
    return <DnaStatePanel kind="error" />
  }

  const dna = state.current

  return (
    <div className="w-full min-w-0 self-start space-y-6">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('dnaUi.title')}
        </h1>

        <p className="text-zinc-300">
          {t('dnaUi.description')}
        </p>
      </header>

      {(state.kind === 'stale'
        || state.kind === 'failed') && (
        <div
          role={
            state.kind === 'failed'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
          className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-amber-100"
        >
          {state.kind === 'stale'
            ? t('dnaUi.stale')
            : t('dnaUi.failed')}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {dimensions.map(id => (
          <DnaDimensionSection
            key={id}
            id={id}
            title={t(
              `dnaUi.dimensions.${id}`,
            )}
            entries={dna.dimensions[id]}
          />
        ))}
      </div>
    </div>
  )
}
