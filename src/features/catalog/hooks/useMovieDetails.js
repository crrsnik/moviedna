import { useDetailRequest } from './useDetailRequest.js'
import { getMovieDetails } from '../services/movieDetailsService.js'
const load = (movieId, signal) => getMovieDetails({ movieId, signal })
export function useMovieDetails(movieId) { return useDetailRequest(movieId, load) }
