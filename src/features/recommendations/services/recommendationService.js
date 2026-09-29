import { httpsCallable } from 'firebase/functions'
import { functions } from '../../../shared/config/firebase.js'
import { createRecommendationService } from './createRecommendationService.js'

const callable = httpsCallable(
  functions,
  'getRecommendations',
)

export const recommendationService = createRecommendationService({
  callRecommendations: () => callable(),
})
