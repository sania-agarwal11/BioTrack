import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useRef, useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { MobileMenuProvider, useMobileMenu } from './context/MobileMenuContext'
import Sidebar from './components/Sidebar'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Visits from './pages/Visits'
import Protocols from './pages/Protocols'
import ProtocolDetail from './pages/ProtocolDetail'
import Sites from './pages/Sites'
import SiteDetail from './pages/SiteDetail'
import Samples from './pages/Samples'
import LabResults from './pages/LabResults'
import Notifications from './pages/Notifications'
import Analytics from './pages/Analytics'
import AuditLogs from './pages/AuditLogs'
import ComplianceReports from './pages/ComplianceReports'
import UserProfile from './pages/UserProfile'

// Route guard — redirect to /login if not authenticated
function PrivateRoute({ children, roles }) {
  const { user, loading, hasRole } = useAuth()
  if (loading) return <div className="loading" style={{ height: '100vh' }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !hasRole(...roles)) return <Navigate to="/dashboard" replace />
  return children
}

// Layout wrapper with sidebar + drag-to-resize handle
const MIN_SIDEBAR = 180
const MAX_SIDEBAR = 400
const DEFAULT_SIDEBAR = 260

function AppLayoutInner({ children }) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const isResizing = useRef(false)
  const { isOpen, close } = useMobileMenu()

  const startResize = useCallback((e) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e) => {
      if (!isResizing.current) return
      const w = Math.min(Math.max(e.clientX, MIN_SIDEBAR), MAX_SIDEBAR)
      setSidebarWidth(w)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <div className="app-layout" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      {/* Mobile overlay — clicking it closes the drawer */}
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <Sidebar />
      {/* Drag handle — sits on the right edge of the sidebar (hidden on mobile via CSS) */}
      <div
        className="resize-handle"
        onMouseDown={startResize}
        title="Drag to resize sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: sidebarWidth - 3,
          width: 6,
          height: '100vh',
          cursor: 'col-resize',
          zIndex: 200,
          background: 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,160,250,0.35)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      />
      <main className="main-content">{children}</main>
    </div>
  )
}

function AppLayout({ children }) {
  return (
    <MobileMenuProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </MobileMenuProvider>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading" style={{ height: '100vh' }}><div className="spinner" /></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />} />

      <Route path="/dashboard" element={
        <PrivateRoute>
          <AppLayout><Dashboard /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/users" element={
        <PrivateRoute roles={['ADMIN']}>
          <AppLayout><Users /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/patients" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER']}>
          <AppLayout><Patients /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/patients/:id" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST']}>
          <AppLayout><PatientDetail /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/visits" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER']}>
          <AppLayout><Visits /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/protocols" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST']}>
          <AppLayout><Protocols /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/protocols/:id" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST']}>
          <AppLayout><ProtocolDetail /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/sites" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST']}>
          <AppLayout><Sites /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/sites/:id" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST']}>
          <AppLayout><SiteDetail /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/samples" element={
        <PrivateRoute roles={['ADMIN', 'LAB_TECHNICIAN']}>
          <AppLayout><Samples /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/lab-results" element={
        <PrivateRoute roles={['ADMIN', 'LAB_TECHNICIAN']}>
          <AppLayout><LabResults /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/notifications" element={
        <PrivateRoute roles={['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'LAB_TECHNICIAN', 'RESEARCH_SCIENTIST', 'REGULATORY_OFFICER', 'DATA_MANAGER', 'INVESTIGATOR']}>
          <AppLayout><Notifications /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/analytics" element={
        <PrivateRoute roles={['ADMIN', 'DATA_MANAGER']}>
          <AppLayout><Analytics /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/audit-logs" element={
        <PrivateRoute roles={['ADMIN', 'REGULATORY_OFFICER']}>
          <AppLayout><AuditLogs /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/compliance-reports" element={
        <PrivateRoute roles={['ADMIN', 'REGULATORY_OFFICER']}>
          <AppLayout><ComplianceReports /></AppLayout>
        </PrivateRoute>
      } />

      {/* User profile — accessible by every authenticated role */}
      <Route path="/profile" element={
        <PrivateRoute>
          <AppLayout><UserProfile /></AppLayout>
        </PrivateRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
