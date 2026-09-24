import MediaLibraryActions from '../features/library/components/MediaLibraryActions.jsx'
import { useParams } from 'react-router-dom'
import { useTvShowDetails } from '../features/catalog/hooks/useTvShowDetails.js'
import { useDetailPageMetadata } from '../features/catalog/hooks/useDetailPageMetadata.js'
import DetailStatus from '../features/catalog/components/DetailStatus.jsx'
import DetailCredits from '../features/catalog/components/DetailCredits.jsx'
import TvShowDetailHero from '../features/catalog/components/TvShowDetailHero.jsx'
import TvShowFacts from '../features/catalog/components/TvShowFacts.jsx'
import TvShowEpisodes from '../features/catalog/components/TvShowEpisodes.jsx'
import TvShowSeasons from '../features/catalog/components/TvShowSeasons.jsx'
import MediaRow from '../features/catalog/components/MediaRow.jsx'
export default function TvShowDetailPage() {
  const { seriesId } = useParams()
  const { data, loading, notFound, error, retry } = useTvShowDetails(seriesId)
  useDetailPageMetadata(seriesId, data?.name, 'TV show details — MovieDNA')
  if (!data) return <DetailStatus loading={loading} notFound={notFound} error={error} retry={retry} noun="TV show" backTo="/tv" backLabel="Back to TV Shows" />
  return <div className="w-full min-w-0 self-start space-y-10">
    <TvShowDetailHero series={data} />
    <MediaLibraryActions mediaType="tv" detail={data} />
    <TvShowFacts series={data} />
    <TvShowEpisodes lastEpisode={data.lastEpisode} nextEpisode={data.nextEpisode} />
    <DetailCredits cast={data.cast} headingId="tv-cast" />
    <TvShowSeasons seasons={data.seasons} />
    {!!data.recommendations.length && <section aria-labelledby="tv-recommendations" className="min-w-0 space-y-5"><h2 id="tv-recommendations" className="text-2xl font-semibold">You may also like</h2><MediaRow items={data.recommendations} labelledBy="tv-recommendations" /></section>}
  </div>
}
