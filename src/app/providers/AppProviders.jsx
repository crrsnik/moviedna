import { AuthProvider } from '../../features/auth/context/AuthContext.jsx'
import { UserProfileProvider } from '../../features/profile/context/UserProfileContext.jsx'

function AppProviders({ children }) {
  return <AuthProvider><UserProfileProvider>{children}</UserProfileProvider></AuthProvider>
}

export default AppProviders
