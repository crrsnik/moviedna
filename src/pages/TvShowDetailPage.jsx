import { useParams } from 'react-router-dom'

import MediaComments from '../features/comments/components/MediaComments.jsx'
import MediaRatingControl from '../features/ratings/components/MediaRatingControl.jsx'
import MediaViewingHistoryAction from '../features/viewingHistory/components/MediaViewingHistoryAction.jsx'
import MediaLibraryActions from '../features/library/components/MediaLibraryActions.jsx'

import { useTvShowDetails } from '../features/catalog/hooks/useTvShowDetails.js'
import { useDetailPageMetadata } from '../features/catalog/hooks/useDetailPageMetadata.js'

import DetailStatus from '../features/catalog/components/DetailStatus.jsx'
import DetailCredits from '../features/catalog/components/DetailCredits.jsx'
import TvShowDetailHero from '../features/catalog/components/TvShowDetailHero.jsx'
import TvShowFacts from '../features/catalog/components/TvShowFacts.jsx'
import TvShowEpisodes from '../features/catalog/components/TvShowEpisodes.jsx'
import TvShowSeasons from '../features/catalog/components/TvShowSeasons.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'

import { useTranslation } from '../features/localization/hooks/useTranslation.js'

export default function TvShowDetailPage() {
  const { t } = useTranslation()
  const { seriesId } = useParams()

  const {
    data,
    loading,
    notFound,
    retry,
  } = useTvShowDetails(seriesId)

  useDetailPageMetadata(
    seriesId,
    data?.name,
    t('catalog.detail.tvMetadataTitle'),
  )

  if (!data) {
    return (
      <DetailStatus
        loading={loading}
        notFound={notFound}
        retry={retry}
        kind="tv"
        backTo="/tv"
      />
    )
  }

  return (
    <div className="w-full min-w-0 self-start space-y-10">
      <div className="space-y-3">
        <TvShowDetailHero series={data} />

      <section
        className="
          flex flex-col gap-4
          border-y border-border py-4
          md:flex-row md:items-start md:justify-between
        "
      >
        <div className="min-w-0">
          <MediaLibraryActions
            mediaType="tv"
            detail={data}
          />
        </div>

        <div className="min-w-0 md:ml-auto">
          <MediaViewingHistoryAction
            mediaType="tv"
            detail={data}
          />
        </div>
      </section>
      </div>

      <MediaRatingControl
        mediaType="tv"
        detail={data}
      />

      <TvShowFacts series={data} />

      <TvShowEpisodes
        lastEpisode={data.lastEpisode}
        nextEpisode={data.nextEpisode}
      />

      <DetailCredits
        cast={data.cast}
        headingId="tv-cast"
      />

      <TvShowSeasons seasons={data.seasons} />

      {!!data.recommendations.length && (
        <section
          aria-labelledby="tv-recommendations"
          className="min-w-0 space-y-5"
        >
          <h2
            id="tv-recommendations"
            className="text-2xl font-semibold"
          >
            {t('catalog.detail.recommendations')}
          </h2>

          <MediaRow
            items={data.recommendations}
            labelledBy="tv-recommendations"
          />
        </section>
      )}

      <MediaComments
        mediaType="tv"
        tmdbId={data.id}
      />
    </div>
  )
}
