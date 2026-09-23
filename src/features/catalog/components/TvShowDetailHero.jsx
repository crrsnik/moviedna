import DetailHero from './DetailHero.jsx'
import { formatRuntime } from '../services/detailHelpers.js'
export default function TvShowDetailHero({ series }) {
  return <DetailHero media={{ ...series, title: series.name }} metadata={[series.yearRange, formatRuntime(series.episodeRuntime), series.contentRating]} backTo="/tv" backLabel="Back to TV Shows" />
}
