import MediaCard from '../../catalog/components/MediaCard.jsx'
import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'


function RecommendationCard({
  recommendation,
  onHide,
}) {
  const { t } = useTranslation()

  const matchScore = Math.round(
    recommendation.score,
  )

  const reasons = (
    recommendation.reasons.slice(0, 2)
  )

  const hide = event => {
    event.preventDefault()
    event.stopPropagation()

    onHide?.(recommendation)
  }

  return (
    <div className="w-52 space-y-3 sm:w-56">
      <div className="relative">
        <MediaCard
          media={recommendation}
          fluid
          showType
        />

        <button
          type="button"
          onClick={hide}
          aria-label={t(
            'recommendationCard.hide',
          )}
          title={t(
            'recommendationCard.hide',
          )}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/65 text-xl font-light leading-none text-white opacity-70 shadow-sm backdrop-blur-sm transition hover:scale-105 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">
            ×
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-accent">
          <span
            aria-label={t(
              'recommendationCard.matchAria',
              { score: matchScore },
            )}
          >
            {t(
              'recommendationCard.match',
              { score: matchScore },
            )}
          </span>
        </p>

        <ul className="space-y-1 text-xs leading-relaxed text-secondary">
          {reasons.map(reason => (
            <li key={reason}>
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}


export default RecommendationCard
