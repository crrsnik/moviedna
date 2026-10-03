import MediaCard from '../../catalog/components/MediaCard.jsx'
import {
  useTranslation,
} from '../../localization/hooks/useTranslation.js'

function RecommendationCard({
  recommendation,
}) {
  const { t } = useTranslation()

  const matchScore = Math.round(
    recommendation.score,
  )

  const reasons = (
    recommendation.reasons.slice(0, 2)
  )

  return (
    <div className="w-52 space-y-3 sm:w-56">
      <MediaCard
        media={recommendation}
        fluid
        showType
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-100">
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

        <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
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
