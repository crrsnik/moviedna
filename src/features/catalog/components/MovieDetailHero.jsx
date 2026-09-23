import DetailHero from './DetailHero.jsx'
import { formatRuntime } from '../services/detailHelpers.js'
export default function MovieDetailHero({ movie }) {
  return <DetailHero media={movie} metadata={[movie.releaseYear, formatRuntime(movie.runtime), movie.certification]} backTo="/movies" backLabel="Back to Movies" />
}
