import { AuthProvider } from '../../features/auth/context/AuthContext.jsx'

function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}

export default AppProviders
