import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

function AppLayout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
