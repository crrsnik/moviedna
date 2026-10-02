import { useAuth } from '../features/auth/hooks/useAuth.js'
import UserRatings from '../features/ratings/components/UserRatings.jsx'

export default function ProfileRatingsPage() {
  const { user } = useAuth()

  return (
    <UserRatings
      key={user.uid}
      uid={user.uid}
    />
  )
}
