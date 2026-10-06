import {
  useAuth,
} from '../features/auth/hooks/useAuth.js'

import DnaRefinementExperience from '../features/dna/components/DnaRefinementExperience.jsx'


export default function DnaRefinementPage() {
  const { user } = useAuth()

  return (
    <DnaRefinementExperience
      key={user?.uid}
    />
  )
}
