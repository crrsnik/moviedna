import { Navigate, createBrowserRouter } from 'react-router-dom'

import GuestOnlyRoute from '../features/auth/components/GuestOnlyRoute.jsx'
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx'
import OnboardingRoute from '../features/profile/components/OnboardingRoute.jsx'
import ProfileLayout from '../features/profile/components/ProfileLayout.jsx'

import AppLayout from '../shared/components/layout/AppLayout.jsx'

import ActorsPage from '../pages/ActorsPage.jsx'
import DnaPage from '../pages/DnaPage.jsx'
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx'
import FriendsPage from '../pages/FriendsPage.jsx'
import HistoryPage from '../pages/HistoryPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import LibraryPage from '../pages/LibraryPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import MovieDetailPage from '../pages/MovieDetailPage.jsx'
import NotificationsPage from '../pages/NotificationsPage.jsx'
import MoviesPage from '../pages/MoviesPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import OnboardingPage from '../pages/OnboardingPage.jsx'
import PersonDetailPage from '../pages/PersonDetailPage.jsx'
import ProfileOverviewPage from '../pages/ProfileOverviewPage.jsx'
import ProfileRatingsPage from '../pages/ProfileRatingsPage.jsx'
import PublicProfilePage from '../pages/PublicProfilePage.jsx'
import PublicBoardPage from '../pages/PublicBoardPage.jsx'
import ProfileSettingsPage from '../pages/ProfileSettingsPage.jsx'
import AccountSettingsPage from '../pages/AccountSettingsPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import StatisticsPage from '../pages/StatisticsPage.jsx'
import TvShowDetailPage from '../pages/TvShowDetailPage.jsx'
import TvShowsPage from '../pages/TvShowsPage.jsx'

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
      { path: 'tv/:seriesId', element: <TvShowDetailPage /> },
      { path: 'actors', element: <ActorsPage /> },
      { path: 'actors/:personId', element: <PersonDetailPage /> },

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
        children: [
          {
            path: 'users/search',
            element: <Navigate to="/friends" replace />,
          },
          { path: 'friends', element: <FriendsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'users/:username', element: <PublicProfilePage /> },
          {
            path: 'users/:username/boards/:boardId',
            element: <PublicBoardPage />,
          },
          {
            element: <OnboardingRoute />,
            children: [
              { path: 'onboarding', element: <OnboardingPage /> },
            ],
          },

          {
            element: <OnboardingRoute requireCompleted />,
            children: [
              {
                path: 'profile',
                element: <ProfileLayout />,
                children: [
                  { index: true, element: <ProfileOverviewPage /> },
                  { path: 'library', element: <LibraryPage /> },
                  { path: 'dna', element: <DnaPage /> },
                  { path: 'history', element: <HistoryPage /> },
                  { path: 'ratings', element: <ProfileRatingsPage /> },
                  { path: 'stats', element: <StatisticsPage /> },
                  { path: 'settings', element: <ProfileSettingsPage /> },
                  { path: 'account', element: <AccountSettingsPage /> },
                ],
              },

              {
                path: 'library',
                element: <Navigate to="/profile/library" replace />,
              },
              {
                path: 'dna',
                element: <Navigate to="/profile/dna" replace />,
              },
              {
                path: 'history',
                element: <Navigate to="/profile/history" replace />,
              },
              {
                path: 'stats',
                element: <Navigate to="/profile/stats" replace />,
              },
              {
                path: 'settings/profile',
                element: <Navigate to="/profile/settings" replace />,
              },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default router
