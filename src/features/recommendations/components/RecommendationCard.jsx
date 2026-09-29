import MediaCard from '../../catalog/components/MediaCard.jsx'

function RecommendationCard({ recommendation }) {
  const matchScore = Math.round(recommendation.score)
  const reasons = recommendation.reasons.slice(0, 2)

  return (
    <div className="w-52 space-y-3 sm:w-56">
      <MediaCard
        media={recommendation}
        fluid
        showType
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-100">
          <span aria-label={`MovieDNA match ${matchScore} percent`}>
            {matchScore}% match
          </span>
        </p>

        <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
          {reasons.map((reason) => (
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
