import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import TmdbCredits from './TmdbCredits.jsx'

function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Header />
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Outlet />
      </main>
      <TmdbCredits />
    </div>
  )
}

export default AppLayout
