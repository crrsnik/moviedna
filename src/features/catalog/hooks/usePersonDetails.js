import { useDetailRequest } from './useDetailRequest.js'
import { getPersonDetails } from '../services/personDetailsService.js'
const load = (personId, signal) => getPersonDetails({ personId, signal })
export function usePersonDetails(personId) { return useDetailRequest(personId, load) }
