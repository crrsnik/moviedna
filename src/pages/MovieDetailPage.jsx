import { useParams } from 'react-router-dom'

import MediaComments from '../features/comments/components/MediaComments.jsx'
import MediaRatingControl from '../features/ratings/components/MediaRatingControl.jsx'
import MediaViewingHistoryAction from '../features/viewingHistory/components/MediaViewingHistoryAction.jsx'
import MediaLibraryActions from '../features/library/components/MediaLibraryActions.jsx'
import DetailStatus from '../features/catalog/components/DetailStatus.jsx'
import MovieDetailHero from '../features/catalog/components/MovieDetailHero.jsx'
import MovieFacts from '../features/catalog/components/MovieFacts.jsx'
import MovieCredits from '../features/catalog/components/MovieCredits.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'

import { useDetailPageMetadata } from '../features/catalog/hooks/useDetailPageMetadata.js'
import { useMovieDetails } from '../features/catalog/hooks/useMovieDetails.js'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

export default function MovieDetailPage() {
  const { t } = useTranslation()
  const { movieId } = useParams()

  const {
    data,
    loading,
    notFound,
    retry,
  } = useMovieDetails(movieId)

  useDetailPageMetadata(
    movieId,
    data?.title,
    t('catalog.detail.movieMetadataTitle'),
  )

  if (!data) {
    return (
      <DetailStatus
        loading={loading}
        notFound={notFound}
        retry={retry}
        kind="movie"
        backTo="/movies"
      />
    )
  }

  return (
    <div className="w-full min-w-0 self-start space-y-10">
      <MovieDetailHero movie={data} />

      <MediaLibraryActions
        mediaType="movie"
        detail={data}
      />

      <MediaViewingHistoryAction
        mediaType="movie"
        detail={data}
      />

      <MediaRatingControl
        mediaType="movie"
        detail={data}
      />

      <MovieFacts movie={data} />
      <MovieCredits cast={data.cast} />

      {!!data.recommendations.length && (
        <section
          aria-labelledby="movie-recommendations"
          className="min-w-0 space-y-5"
        >
          <h2
            id="movie-recommendations"
            className="text-2xl font-semibold"
          >
            {t('catalog.detail.recommendations')}
          </h2>

          <MediaRow
            items={data.recommendations}
            labelledBy="movie-recommendations"
          />
        </section>
      )}

      <MediaComments
        mediaType="movie"
        tmdbId={data.id}
      />
    </div>
  )
}
