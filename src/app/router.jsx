import MovieDetailPage from '../pages/MovieDetailPage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import { createBrowserRouter } from 'react-router-dom'
import GuestOnlyRoute from '../features/auth/components/GuestOnlyRoute.jsx'
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx'
import OnboardingRoute from '../features/profile/components/OnboardingRoute.jsx'
import OnboardingPage from '../pages/OnboardingPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import MoviesPage from '../pages/MoviesPage.jsx'
import TvShowsPage from '../pages/TvShowsPage.jsx'
import ActorsPage from '../pages/ActorsPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import AppLayout from '../shared/components/layout/AppLayout.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'movies', element: <MoviesPage /> },
      { path: 'movies/:movieId', element: <MovieDetailPage /> },
      { path: 'tv', element: <TvShowsPage /> },
      { path: 'actors', element: <ActorsPage /> },
      {
        element: <GuestOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [{
          element: <OnboardingRoute />,
          children: [{ path: 'onboarding', element: <OnboardingPage /> }],
        }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default router
