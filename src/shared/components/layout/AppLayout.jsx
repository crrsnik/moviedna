import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
