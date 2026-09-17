import { NavLink } from 'react-router-dom'

function Header() {
  return (
    <header className="site-header">
      <div className="header-container">
        <NavLink className="brand" to="/" end>
          MovieDNA
        </NavLink>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavLink to="/movies">Movies</NavLink>
          <NavLink to="/tv">TV Shows</NavLink>
          <NavLink to="/actors">Actors</NavLink>
        </nav>
        <nav className="account-nav" aria-label="Account">
          <NavLink to="/login">Log in</NavLink>
          <NavLink to="/register">Register</NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Header
