import { useDetailRequest } from './useDetailRequest.js'
import { getTvShowDetails } from '../services/tvShowDetailsService.js'
const load = (seriesId, signal) => getTvShowDetails({ seriesId, signal })
export function useTvShowDetails(seriesId) { return useDetailRequest(seriesId, load) }
