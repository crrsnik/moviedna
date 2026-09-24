import MediaLibraryActions from '../features/library/components/MediaLibraryActions.jsx'
import DetailStatus from '../features/catalog/components/DetailStatus.jsx'
import { useDetailPageMetadata } from '../features/catalog/hooks/useDetailPageMetadata.js'
import { useParams } from 'react-router-dom'
import { useMovieDetails } from '../features/catalog/hooks/useMovieDetails.js'
import MovieDetailHero from '../features/catalog/components/MovieDetailHero.jsx'
import MovieFacts from '../features/catalog/components/MovieFacts.jsx'
import MovieCredits from '../features/catalog/components/MovieCredits.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'

export default function MovieDetailPage() {
  const { movieId } = useParams()
  const { data, loading, notFound, error, retry } = useMovieDetails(movieId)
  useDetailPageMetadata(movieId, data?.title, 'Movie details — MovieDNA')
  if (!data) return <DetailStatus loading={loading} notFound={notFound} error={error} retry={retry} noun="Movie" backTo="/movies" backLabel="Back to Movies" />
  return <div className="w-full min-w-0 self-start space-y-10">
    <MovieDetailHero movie={data} />
    <MediaLibraryActions mediaType="movie" detail={data} />
    <MovieFacts movie={data} />
    <MovieCredits cast={data.cast} />
    {!!data.recommendations.length && <section aria-labelledby="movie-recommendations" className="min-w-0 space-y-5"><h2 id="movie-recommendations" className="text-2xl font-semibold">You may also like</h2><MediaRow items={data.recommendations} labelledBy="movie-recommendations" /></section>}
  </div>
}
