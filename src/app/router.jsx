import { createBrowserRouter } from 'react-router-dom'
import GuestOnlyRoute from '../features/auth/components/GuestOnlyRoute.jsx'
import HomePage from '../pages/HomePage.jsx'
import MoviesPage from '../pages/MoviesPage.jsx'
import TvShowsPage from '../pages/TvShowsPage.jsx'
import ActorsPage from '../pages/ActorsPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import AppLayout from '../shared/components/layout/AppLayout.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'movies', element: <MoviesPage /> },
      { path: 'tv', element: <TvShowsPage /> },
      { path: 'actors', element: <ActorsPage /> },
      {
        element: <GuestOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default router
