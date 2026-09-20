import { RouterProvider } from 'react-router-dom'
import AppProviders from './app/providers/AppProviders.jsx'
import router from './app/router.jsx'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
