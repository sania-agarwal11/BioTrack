import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useMobileMenu } from '../context/MobileMenuContext'

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'LAB_TECHNICIAN', 'RESEARCH_SCIENTIST', 'REGULATORY_OFFICER', 'DATA_MANAGER'] },
    ]
  },
  {
    section: 'User Management',
    items: [
      { path: '/users', label: 'Users', icon: '👥', roles: ['ADMIN'] },
    ]
  },
  {
    section: 'Clinical',
    items: [
      { path: '/patients', label: 'Patients', icon: '🏥', roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER'] },
      { path: '/visits', label: 'Visits', icon: '📅', roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER'] },
      { path: '/protocols', label: 'Protocols', icon: '📋', roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST'] },
      { path: '/sites', label: 'Sites', icon: '🏛️', roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST'] },
    ]
  },
  {
    section: 'Laboratory',
    items: [
      { path: '/samples', label: 'Samples', icon: '🧪', roles: ['ADMIN', 'LAB_TECHNICIAN'] },
      { path: '/lab-results', label: 'Lab Results', icon: '🔬', roles: ['ADMIN', 'LAB_TECHNICIAN'] },
    ]
  },
  {
    section: 'Communication',
    items: [
      { path: '/notifications', label: 'Notifications', icon: '🔔', roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'LAB_TECHNICIAN', 'RESEARCH_SCIENTIST', 'REGULATORY_OFFICER', 'DATA_MANAGER', 'INVESTIGATOR'] },
    ]
  },
  {
    section: 'Analytics',
    items: [
      { path: '/analytics', label: 'Analytics & KPI', icon: '📈', roles: ['ADMIN', 'DATA_MANAGER'] },
    ]
  },
  {
    section: 'Compliance',
    items: [
      { path: '/audit-logs', label: 'Audit Logs', icon: '🗒️', roles: ['ADMIN', 'REGULATORY_OFFICER'] },
      { path: '/compliance-reports', label: 'Compliance Reports', icon: '📑', roles: ['ADMIN', 'REGULATORY_OFFICER'] },
    ]
  },
]

export default function Sidebar() {
  const { user, signOut, hasRole } = useAuth()
  const { unreadCount } = useNotifications()
  const { isOpen, close } = useMobileMenu()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  const roleLabel = {
    ADMIN: 'Administrator',
    CLINICAL_TRIAL_MANAGER: 'Clinical Trial Manager',
    LAB_TECHNICIAN: 'Lab Technician',
    RESEARCH_SCIENTIST: 'Research Scientist',
    REGULATORY_OFFICER: 'Regulatory Officer',
    DATA_MANAGER: 'Data Manager',
  }

  const handleNav = (path) => {
    navigate(path)
    close() // close drawer on mobile after navigating
  }

  return (
    <aside className={`sidebar${isOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <h2>Bio<span>Track</span></h2>
        <p>Clinical Research Platform</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            hasRole(...item.roles)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {visibleItems.map((item) => {
                const isNotifications = item.path === '/notifications'
                const showDot = isNotifications && unreadCount > 0
                return (
                  <button
                    key={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => handleNav(item.path)}
                    style={{ position: 'relative' }}
                  >
                    <span className="icon">{item.icon}</span>
                    {item.label}
                    {showDot && (
                      <span style={{
                        marginLeft: 'auto',
                        minWidth: unreadCount > 9 ? 20 : 18,
                        height: 18,
                        borderRadius: 9,
                        background: '#1a56db',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        lineHeight: 1,
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div
            className="user-info"
            onClick={() => handleNav('/profile')}
            title="View / edit your profile"
            style={{ cursor: 'pointer', borderRadius: '10px', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h4>{user.name}</h4>
              <p>{roleLabel[user.role] || user.role}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.45, paddingRight: 4 }}>✏️</span>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  )
}
