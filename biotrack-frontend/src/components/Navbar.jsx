import { useAuth } from '../context/AuthContext'
import { useMobileMenu } from '../context/MobileMenuContext'

export default function Navbar({ title }) {
  const { user } = useAuth()
  const { toggle } = useMobileMenu()

  const roleLabel = {
    ADMIN: 'Admin',
    CLINICAL_TRIAL_MANAGER: 'CTM',
    LAB_TECHNICIAN: 'Lab Tech',
    RESEARCH_SCIENTIST: 'Researcher',
    REGULATORY_OFFICER: 'Reg. Officer',
    DATA_MANAGER: 'Data Manager',
  }

  return (
    <header className="navbar">
      {/* Hamburger — only visible on mobile via CSS */}
      <button
        className="hamburger-btn"
        onClick={toggle}
        aria-label="Toggle navigation menu"
        title="Menu"
      >
        ☰
      </button>
      <span className="navbar-title">{title}</span>
      {user && (
        <span className="navbar-badge">
          {roleLabel[user.role] || user.role} · {user.name}
        </span>
      )}
    </header>
  )
}
