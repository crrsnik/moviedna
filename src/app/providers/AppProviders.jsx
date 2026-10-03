import { LanguageProvider } from '../../features/localization/context/LanguageContext.jsx'
import { AuthProvider } from '../../features/auth/context/AuthContext.jsx'
import { UserProfileProvider } from '../../features/profile/context/UserProfileContext.jsx'

function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UserProfileProvider>
          {children}
        </UserProfileProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default AppProviders
