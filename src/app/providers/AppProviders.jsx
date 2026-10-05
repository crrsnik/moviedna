import { LanguageProvider } from '../../features/localization/context/LanguageContext.jsx'
import { AuthProvider } from '../../features/auth/context/AuthContext.jsx'
import { UserProfileProvider } from '../../features/profile/context/UserProfileContext.jsx'
import { ThemeProvider } from '../../features/theme/context/ThemeContext.jsx'

function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <UserProfileProvider>
            {children}
          </UserProfileProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default AppProviders
