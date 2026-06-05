import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getPatients } from '../api/patients'
import { getProtocols, updateProtocol } from '../api/protocols'
import { getSamples } from '../api/samples'
import { getLabResults } from '../api/labResults'
import { getSites, updateSiteStatus } from '../api/sites'
import { getKpiReports } from '../api/analytics'
import { getAuditLogs, getComplianceReports } from '../api/compliance'
import { createNotification, getNotificationsByUser, markAsRead } from '../api/notifications'

/* ─── small helpers ─────────────────────────────── */
const phaseColor = { PHASE_I: '#6366f1', PHASE_II: '#0891b2', PHASE_III: '#7c3aed', PHASE_IV: '#16a34a' }
const protoStatusColor  = { ACTIVE: '#16a34a', DRAFT: '#d97706', INACTIVE: '#94a3b8', CLOSED: '#ef4444' }
const siteStatusColor   = { ACTIVE: '#16a34a', INACTIVE: '#94a3b8', PENDING_APPROVAL: '#d97706' }
const enrollStatusColor = { ENROLLED: '#16a34a', ANALYZING: '#1a56db', SCREENING: '#d97706', COMPLETED: '#059669', WITHDRAWN: '#ef4444', CANCELLED: '#94a3b8' }

function SmallBadge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
      background: `${color}18`, color, fontSize: 11, fontWeight: 700,
      border: `1px solid ${color}33`, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function SectionCard({ title, icon, count, color, onViewAll, children, empty }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
        background: `linear-gradient(135deg, ${color}08 0%, #fff 100%)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${color}18`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</div>
            {count !== undefined && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                {count} total
              </div>
            )}
          </div>
        </div>
        {onViewAll && (
          <button onClick={onViewAll} style={{
            padding: '5px 14px', borderRadius: 8, border: `1.5px solid ${color}`,
            background: 'transparent', color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>View All →</button>
        )}
      </div>

      {/* body */}
      <div style={{ padding: '4px 0' }}>
        {empty ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No data available yet.
          </div>
        ) : children}
      </div>
    </div>
  )
}

function ListRow({ onClick, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 18px', cursor: 'pointer',
        background: hovered ? '#f8fafc' : 'transparent',
        borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s',
      }}
    >{children}</div>
  )
}

/* ─── main component ─────────────────────────────── */
export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()

  const [stats,      setStats]      = useState({})
  const [rawData,    setRawData]    = useState({})
  const [statErrors, setStatErrors] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [rsApprovalBanners,   setRsApprovalBanners]   = useState([])
  const [ctmActivityBanners, setCtmActivityBanners] = useState([])

  useEffect(() => {
    const fetches = []
    const results    = {}
    const rawResults = {}
    const errors     = {}

    const safe = (key, promise) => {
      fetches.push(
        promise
          .then(r => {
            if (Array.isArray(r.data)) {
              results[key]    = r.data.length
              rawResults[key] = r.data
            } else {
              results[key] = r.data ?? 0
            }
          })
          .catch(err => {
            const status = err.response?.status
            if (status === 503 || !err.response) errors[key] = 'Service offline'
            else if (status === 403)              errors[key] = 'No access'
            else if (status === 500)              errors[key] = 'Server error'
            else                                  errors[key] = `Error ${status || '?'}`
          })
      )
    }

    if (hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')) {
      safe('patients', getPatients())
    }
    if (hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST')) {
      safe('protocols', getProtocols())
      safe('sites',     getSites())
    }
    // Researcher sees patient enrollments on dashboard (read-only)
    if (hasRole('RESEARCH_SCIENTIST')) {
      safe('rsPatients', getPatients())
    }
    if (hasRole('ADMIN', 'LAB_TECHNICIAN')) {
      safe('samples',    getSamples())
      safe('labResults', getLabResults())
    }
    if (hasRole('ADMIN', 'DATA_MANAGER')) {
      safe('kpis', getKpiReports())
    }
    if (hasRole('ADMIN', 'REGULATORY_OFFICER')) {
      safe('auditLogs', getAuditLogs())
      safe('complianceReports', getComplianceReports())
    }

    Promise.all(fetches).then(() => {
      setStats(results)
      setRawData(rawResults)
      setStatErrors(errors)
      setLoading(false)
    })
  }, [])

  // For researchers: fetch unread approval/rejection notifications to show as banners
  useEffect(() => {
    if (!user?.userId || !hasRole('RESEARCH_SCIENTIST') || hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')) return
    getNotificationsByUser(user.userId)
      .then(r => {
        const banners = (r.data || []).filter(n =>
          n.status === 'UNREAD' &&
          (n.title === 'Protocol Approved' || n.title === 'Protocol Rejected' ||
           n.title === 'Site Approved'     || n.title === 'Site Rejected')
        )
        setRsApprovalBanners(banners)
      })
      .catch(() => {})
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissApprovalBanner = async (notifId) => {
    await markAsRead(notifId).catch(() => {})
    setRsApprovalBanners(prev => prev.filter(n => n.notificationId !== notifId))
  }

  // CTM: fetch unread admin activity notifications (new patient / new visit)
  useEffect(() => {
    if (!user?.userId || !hasRole('CLINICAL_TRIAL_MANAGER') || hasRole('ADMIN')) return
    getNotificationsByUser(user.userId)
      .then(r => {
        const banners = (r.data || []).filter(n =>
          n.status === 'UNREAD' &&
          (n.title === 'New Patient Enrolled' || n.title === 'New Visit Scheduled') &&
          (n.senderUserId == null || Number(n.senderUserId) !== Number(user.userId))
        )
        setCtmActivityBanners(banners)
      })
      .catch(() => {})
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissCtmBanner = async (notifId) => {
    await markAsRead(notifId).catch(() => {})
    setCtmActivityBanners(prev => prev.filter(n => n.notificationId !== notifId))
  }

  /* ── stat cards ── */
  const statCards = [
    { key: 'patients',  label: 'Total Patients', icon: '🏥', color: '#1a56db', bg: '#dbeafe', path: '/patients',   roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER'] },
    { key: 'protocols', label: 'Protocols',       icon: '📋', color: '#7c3aed', bg: '#ede9fe', path: '/protocols',  roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST'] },
    { key: 'sites',     label: 'Total Sites',     icon: '🏛️', color: '#0891b2', bg: '#ccfbf1', path: '/sites',      roles: ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST'] },
    { key: 'samples',    label: 'Samples',         icon: '🧪', color: '#16a34a', bg: '#d1fae5', path: '/samples',     roles: ['ADMIN', 'LAB_TECHNICIAN'] },
    { key: 'labResults', label: 'Lab Results',    icon: '🔬', color: '#9333ea', bg: '#f3e8ff', path: '/lab-results', roles: ['ADMIN', 'LAB_TECHNICIAN'] },
    { key: 'kpis',      label: 'KPI Reports',     icon: '📈', color: '#d97706', bg: '#ffedd5', path: '/analytics',  roles: ['ADMIN', 'DATA_MANAGER'] },
    { key: 'auditLogs',         label: 'Audit Logs',          icon: '🗒️', color: '#dc2626', bg: '#fee2e2', path: '/audit-logs',          roles: ['ADMIN', 'REGULATORY_OFFICER'] },
    { key: 'complianceReports', label: 'Compliance Reports',  icon: '📄', color: '#475569', bg: '#f1f5f9', path: '/compliance-reports',  roles: ['ADMIN', 'REGULATORY_OFFICER'] },
  ]
  const visibleCards = statCards.filter(c => hasRole(...c.roles))

  const roleWelcome = {
    ADMIN:                  'Full platform access enabled.',
    CLINICAL_TRIAL_MANAGER: 'Manage patients, visits, protocols and sites.',
    LAB_TECHNICIAN:         'Manage samples and lab results.',
    RESEARCH_SCIENTIST:     'Access protocols and notifications.',
    REGULATORY_OFFICER:     'Review compliance reports and audit logs.',
    DATA_MANAGER:           'Monitor analytics and KPI metrics.',
  }

  /* ── admin: approve / reject helpers ── */
  const reload = () => {
    setLoading(true)
    const fetches2 = []
    const results2    = {}
    const rawResults2 = {}
    const errors2     = {}
    const safe2 = (key, promise) => {
      fetches2.push(
        promise
          .then(r => { if (Array.isArray(r.data)) { results2[key] = r.data.length; rawResults2[key] = r.data } else { results2[key] = r.data ?? 0 } })
          .catch(err => { const s = err.response?.status; errors2[key] = s === 503 || !err.response ? 'Service offline' : s === 403 ? 'No access' : `Error ${s || '?'}` })
      )
    }
    if (hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')) { safe2('patients', getPatients()) }
    if (hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST')) { safe2('protocols', getProtocols()); safe2('sites', getSites()) }
    if (hasRole('RESEARCH_SCIENTIST')) safe2('rsPatients', getPatients())
    if (hasRole('ADMIN', 'LAB_TECHNICIAN')) { safe2('samples', getSamples()); safe2('labResults', getLabResults()) }
    if (hasRole('ADMIN', 'DATA_MANAGER')) safe2('kpis', getKpiReports())
    if (hasRole('ADMIN', 'REGULATORY_OFFICER')) { safe2('auditLogs', getAuditLogs()); safe2('complianceReports', getComplianceReports()) }
    Promise.all(fetches2).then(() => { setStats(results2); setRawData(rawResults2); setStatErrors(errors2); setLoading(false) })
  }

  const approveProtocol = async (p) => {
    await updateProtocol(p.protocolId, { title: p.title, phase: p.phase, startDate: p.startDate, endDate: p.endDate, status: 'ACTIVE', targetPatients: p.targetPatients }).catch(() => {})
    if (p.submittedByUserId) {
      await createNotification({
        userId: Number(p.submittedByUserId),
        senderUserId: user?.userId ? Number(user.userId) : null,
        title: 'Protocol Approved',
        message: `Your protocol "${p.title}" has been reviewed and approved. It is now ACTIVE.`,
        type: 'INFO',
      }).catch(() => {})
    }
    reload()
  }
  const rejectProtocol = async (p) => {
    await updateProtocol(p.protocolId, { title: p.title, phase: p.phase, startDate: p.startDate, endDate: p.endDate, status: 'INACTIVE', targetPatients: p.targetPatients }).catch(() => {})
    if (p.submittedByUserId) {
      await createNotification({
        userId: Number(p.submittedByUserId),
        senderUserId: user?.userId ? Number(user.userId) : null,
        title: 'Protocol Rejected',
        message: `Your protocol "${p.title}" has been reviewed and was not approved at this time. Please contact the admin for more details.`,
        type: 'WARNING',
      }).catch(() => {})
    }
    reload()
  }
  const approveSite = async (s) => {
    await updateSiteStatus(s.siteId, 'ACTIVE').catch(() => {})
    if (s.submittedByUserId) {
      await createNotification({
        userId: Number(s.submittedByUserId),
        senderUserId: user?.userId ? Number(user.userId) : null,
        title: 'Site Approved',
        message: `Your site "${s.name}" has been reviewed and approved. It is now ACTIVE.`,
        type: 'INFO',
      }).catch(() => {})
    }
    reload()
  }
  const rejectSite = async (s) => {
    await updateSiteStatus(s.siteId, 'INACTIVE').catch(() => {})
    if (s.submittedByUserId) {
      await createNotification({
        userId: Number(s.submittedByUserId),
        senderUserId: user?.userId ? Number(user.userId) : null,
        title: 'Site Rejected',
        message: `Your site "${s.name}" has been reviewed and was not approved at this time. Please contact the admin for more details.`,
        type: 'WARNING',
      }).catch(() => {})
    }
    reload()
  }

  /* ── admin activity data ── */
  const sampleStatusColor   = { COLLECTED: '#1a56db', IN_STORAGE: '#d97706', ANALYZED: '#16a34a', DISPOSED: '#ef4444' }
  const labResultStatusColor = { PENDING: '#d97706', COMPLETED: '#1a56db', REVIEWED: '#16a34a', REJECTED: '#ef4444' }
  const adminRecentPatients   = (rawData.patients   || []).slice(-5).reverse()
  const adminRecentProtocols  = (rawData.protocols  || []).slice(-5).reverse()
  const adminRecentSites      = (rawData.sites      || []).slice(-5).reverse()
  const adminRecentSamples    = (rawData.samples    || []).slice(-5).reverse()
  const adminRecentLabResults = (rawData.labResults || []).slice(-5).reverse()

  // enrollment breakdown for admin
  const enrollSummary = (rawData.patients || []).reduce((acc, p) => {
    acc[p.enrollmentStatus] = (acc[p.enrollmentStatus] || 0) + 1
    return acc
  }, {})

  /* ── researcher activity data ── */
  const recentProtocols = (rawData.protocols || []).slice(-5).reverse()
  const recentSites     = (rawData.sites     || []).slice(-5).reverse()
  const activePatients  = (rawData.rsPatients || [])
    .filter(p => ['ENROLLED', 'ANALYZING', 'SCREENING'].includes(p.enrollmentStatus))
    .slice(-6).reverse()

  // protocol status summary for researcher
  const protoSummary = (rawData.protocols || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})
  const siteSummary = (rawData.sites || []).reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})

  const isResearcher       = hasRole('RESEARCH_SCIENTIST') && !hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')
  const isCTM              = hasRole('CLINICAL_TRIAL_MANAGER') && !hasRole('ADMIN')
  const isLabTech          = hasRole('LAB_TECHNICIAN') && !hasRole('ADMIN')
  const isRegulatoryOfficer = hasRole('REGULATORY_OFFICER') && !hasRole('ADMIN')

  /* ── lab tech activity data ── */
  const ltRecentSamples    = (rawData.samples    || []).slice(-5).reverse()
  const ltRecentLabResults = (rawData.labResults || []).slice(-5).reverse()

  /* ── regulatory officer activity data ── */
  const roRecentAuditLogs         = (rawData.auditLogs         || []).slice(-5).reverse()
  const roRecentComplianceReports = (rawData.complianceReports || []).slice(-5).reverse()

  const REPORT_TYPE_MAP = {
    AUDIT_TRAIL:           { icon: '📋', title: 'Audit Trail Report',           color: '#1a56db' },
    DATA_CHANGE:           { icon: '🔄', title: 'Data Change History',           color: '#7c3aed' },
    PROTOCOL_COMPLIANCE:   { icon: '📊', title: 'Protocol Compliance',           color: '#059669' },
    PATIENT_CONSENT:       { icon: '👥', title: 'Patient Consent & Eligibility', color: '#d97706' },
    SAMPLE_CUSTODY:        { icon: '🧪', title: 'Sample Chain-of-Custody',       color: '#0891b2' },
    LAB_VALIDATION:        { icon: '🔬', title: 'Lab Result Validation',         color: '#9333ea' },
    SECURITY_ACCESS:       { icon: '🔐', title: 'Security & Access Compliance',  color: '#dc2626' },
    REGULATORY_SUBMISSION: { icon: '📄', title: 'Regulatory Submission Report',  color: '#475569' },
  }
  const auditActionColor = { CREATE: '#16a34a', UPDATE: '#1a56db', DELETE: '#ef4444', LOGIN: '#64748b', LOGOUT: '#64748b', VIEW: '#64748b', RESTORE: '#d97706' }

  /* ── CTM activity data ── */
  const ctmRecentPatients  = (rawData.patients  || []).slice(-5).reverse()
  const ctmRecentProtocols = (rawData.protocols || []).slice(-5).reverse()
  const ctmRecentSites     = (rawData.sites     || []).slice(-5).reverse()

  return (
    <>
      <Navbar title="Dashboard" />
      <div className="page-content">

        {/* ── Welcome Banner ── */}
        <div className="welcome-card">
          <h2>Welcome back, {user?.name}</h2>
          <p>{roleWelcome[user?.role] || 'Welcome to BioTrack.'}</p>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading data...</div>
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div className="stats-grid">
              {visibleCards.map(card => (
                <div
                  key={card.key}
                  onClick={() => navigate(card.path)}
                  style={{
                    background: '#fff',
                    border: `2px solid ${card.color}33`,
                    borderLeft: `4px solid ${card.color}`,
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${card.color}33`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: card.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {card.icon}
                  </div>
                  <div>
                    {statErrors[card.key] ? (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>—</div>
                        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{statErrors[card.key]}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>
                          {stats[card.key] ?? '—'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 4 }}>
                          {card.label}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Admin / CTM: Pending Approval Requests ── */}
            {hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER') && (() => {
              const pendingProtocols = (rawData.protocols || []).filter(p => p.status === 'DRAFT')
              const pendingSites     = (rawData.sites     || []).filter(s => s.status === 'PENDING_APPROVAL')
              if (pendingProtocols.length === 0 && pendingSites.length === 0) return null
              return (
                <div style={{
                  background: '#fff', borderRadius: 14,
                  border: '2px solid #f59e0b', borderLeft: '5px solid #f59e0b',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.12)', overflow: 'hidden',
                }}>
                  {/* header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                    <span style={{ fontSize: 20 }}>⏳</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e' }}>
                        Pending Requests
                        <span style={{ marginLeft: 8, background: '#f59e0b', color: '#fff', borderRadius: 10, padding: '1px 9px', fontSize: 12, fontWeight: 700 }}>
                          {pendingProtocols.length + pendingSites.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#b45309', marginTop: 1 }}>Researcher submissions awaiting your approval</div>
                    </div>
                  </div>
                  {/* items */}
                  <div style={{ padding: '8px 0' }}>
                    {pendingProtocols.map(p => (
                      <div key={`rp-${p.protocolId}`} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 20px', borderBottom: '1px solid #fef9c3',
                      }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>📋</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            Protocol · {p.phase?.replace('_', ' ')} · {p.startDate} → {p.endDate}
                          </div>
                          {p.submittedByName && (
                            <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 3, fontWeight: 600 }}>
                              👤 Submitted by {p.submittedByName}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                          <button onClick={() => approveProtocol(p)}
                            style={{ padding: '5px 14px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => rejectProtocol(p)}
                            style={{ padding: '5px 14px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            ✗ Reject
                          </button>
                          <button onClick={() => navigate('/protocols')}
                            style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingSites.map(s => (
                      <div key={`rs-${s.siteId}`} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 20px', borderBottom: '1px solid #fef9c3',
                      }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>🏛️</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            Site · 📍 {s.location}
                          </div>
                          {s.submittedByName && (
                            <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 3, fontWeight: 600 }}>
                              👤 Submitted by {s.submittedByName}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                          <button onClick={() => approveSite(s)}
                            style={{ padding: '5px 14px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => rejectSite(s)}
                            style={{ padding: '5px 14px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            ✗ Reject
                          </button>
                          <button onClick={() => navigate('/sites')}
                            style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Researcher: Approval / Rejection Banners ── */}
            {isResearcher && rsApprovalBanners.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rsApprovalBanners.map(n => {
                  const approved = n.title?.includes('Approved')
                  return (
                    <div key={n.notificationId} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 20px', borderRadius: 12,
                      background: approved ? '#f0fdf4' : '#fff7ed',
                      border: `2px solid ${approved ? '#bbf7d0' : '#fed7aa'}`,
                      borderLeft: `5px solid ${approved ? '#16a34a' : '#f59e0b'}`,
                      boxShadow: `0 2px 8px ${approved ? 'rgba(22,163,74,0.10)' : 'rgba(245,158,11,0.10)'}`,
                    }}>
                      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>
                        {approved ? '✅' : '⚠️'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: approved ? '#15803d' : '#92400e', marginBottom: 3 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 13, color: approved ? '#166534' : '#78350f', lineHeight: 1.5 }}>
                          {n.message}
                        </div>
                      </div>
                      <button
                        onClick={() => dismissApprovalBanner(n.notificationId)}
                        style={{
                          padding: '6px 18px', borderRadius: 8, flexShrink: 0,
                          border: `1.5px solid ${approved ? '#86efac' : '#fcd34d'}`,
                          background: approved ? '#dcfce7' : '#fef9c3',
                          color: approved ? '#15803d' : '#92400e',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        OK
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div className="card">
              <div className="card-header"><h3>Quick Actions</h3></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>

                {/* ADMIN / CLINICAL_TRIAL_MANAGER */}
                {hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER') && (<>
                  <button onClick={() => navigate('/patients')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#1a56db', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    + Enroll Patient
                  </button>
                  <button onClick={() => navigate('/protocols')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#7c3aed', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    + Create Protocol
                  </button>
                  <button onClick={() => navigate('/visits')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#0891b2', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    View Visits
                  </button>
                  <button onClick={() => navigate('/sites')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#0284c7', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    View Sites
                  </button>
                </>)}

                {/* LAB_TECHNICIAN */}
                {hasRole('ADMIN', 'LAB_TECHNICIAN') && (<>
                  <button onClick={() => navigate('/samples')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#16a34a', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    + Add Sample
                  </button>
                  <button onClick={() => navigate('/lab-results')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#9333ea', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    View Lab Results
                  </button>
                </>)}

                {/* RESEARCH_SCIENTIST */}
                {hasRole('RESEARCH_SCIENTIST') && (<>
                  <button onClick={() => navigate('/protocols')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#7c3aed', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    View Protocols
                  </button>
                  <button onClick={() => navigate('/sites')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#0284c7', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    View Sites
                  </button>
                </>)}

                {/* DATA_MANAGER */}
                {hasRole('ADMIN', 'DATA_MANAGER') && (
                  <button onClick={() => navigate('/analytics')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#d97706', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    View Analytics
                  </button>
                )}

                {/* REGULATORY_OFFICER */}
                {hasRole('ADMIN', 'REGULATORY_OFFICER') && (<>
                  <button onClick={() => navigate('/compliance-reports')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#475569', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    Generate Report
                  </button>
                  <button onClick={() => navigate('/audit-logs')}
                    style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                    Audit Logs
                  </button>
                </>)}

                {/* All roles */}
                <button onClick={() => navigate('/notifications')}
                  style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                  Notifications
                </button>
              </div>
            </div>

            {/* ════════════════════════════════════════
                ADMIN ACTIVITY SECTIONS
            ════════════════════════════════════════ */}
            {hasRole('ADMIN') && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>

                  {/* ── Recent Patients ── */}
                  <SectionCard
                    title="Recent Patients"
                    icon="🏥"
                    color="#1a56db"
                    count={stats.patients}
                    onViewAll={() => navigate('/patients')}
                    empty={adminRecentPatients.length === 0}
                  >
                    {adminRecentPatients.map(p => {
                      const name = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || `Patient #${p.patientId}`
                      return (
                        <ListRow key={p.patientId} onClick={() => navigate(`/patients/${p.patientId}`)}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: `${enrollStatusColor[p.enrollmentStatus] || '#1a56db'}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 14,
                            color: enrollStatusColor[p.enrollmentStatus] || '#1a56db',
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {name}
                            </div>
                            {p.protocolId && (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Protocol #{p.protocolId}</div>
                            )}
                          </div>
                          {p.enrollmentStatus && (
                            <SmallBadge label={p.enrollmentStatus} color={enrollStatusColor[p.enrollmentStatus] || '#1a56db'} />
                          )}
                        </ListRow>
                      )
                    })}
                  </SectionCard>

                  {/* ── Recent Protocols ── */}
                  <SectionCard
                    title="Recent Protocols"
                    icon="📋"
                    color="#7c3aed"
                    count={stats.protocols}
                    onViewAll={() => navigate('/protocols')}
                    empty={adminRecentProtocols.length === 0}
                  >
                    {adminRecentProtocols.map(p => (
                      <ListRow key={p.protocolId} onClick={() => navigate(`/protocols/${p.protocolId}`)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${phaseColor[p.phase] || '#7c3aed'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>📋</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title}
                          </div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                            {p.phase && <SmallBadge label={p.phase.replace('_', ' ')} color={phaseColor[p.phase] || '#6366f1'} />}
                            {p.status && <SmallBadge label={p.status} color={protoStatusColor[p.status] || '#94a3b8'} />}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                          {p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </div>
                      </ListRow>
                    ))}
                  </SectionCard>

                  {/* ── Recent Sites ── */}
                  <SectionCard
                    title="Recent Sites"
                    icon="🏛️"
                    color="#0891b2"
                    count={stats.sites}
                    onViewAll={() => navigate('/sites')}
                    empty={adminRecentSites.length === 0}
                  >
                    {adminRecentSites.map(s => (
                      <ListRow key={s.siteId} onClick={() => navigate(`/sites/${s.siteId}`)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${siteStatusColor[s.status] || '#0891b2'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>🏛️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            📍 {s.location || 'Location not set'}
                          </div>
                        </div>
                        {s.status && <SmallBadge label={s.status.replace('_', ' ')} color={siteStatusColor[s.status] || '#94a3b8'} />}
                      </ListRow>
                    ))}
                  </SectionCard>

                  {/* ── Recent Samples ── */}
                  <SectionCard
                    title="Recent Samples"
                    icon="🧪"
                    color="#16a34a"
                    count={stats.samples}
                    onViewAll={() => navigate('/samples')}
                    empty={adminRecentSamples.length === 0}
                  >
                    {adminRecentSamples.map(s => (
                      <ListRow key={s.sampleId} onClick={() => navigate('/samples')}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${sampleStatusColor[s.status] || '#16a34a'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                          color: sampleStatusColor[s.status] || '#16a34a',
                        }}>
                          {s.sampleType?.charAt(0) || 'S'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                            {s.sampleType || 'Sample'} <span style={{ color: '#94a3b8', fontSize: 11 }}>#{s.sampleId}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {s.collectionDate
                              ? new Date(s.collectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                              : 'Date not set'}
                            {s.patientId ? ` · Patient #${s.patientId}` : ''}
                          </div>
                        </div>
                        {s.status && <SmallBadge label={s.status.replace('_', ' ')} color={sampleStatusColor[s.status] || '#16a34a'} />}
                      </ListRow>
                    ))}
                  </SectionCard>

                  {/* ── Recent Lab Results ── */}
                  <SectionCard
                    title="Recent Lab Results"
                    icon="🔬"
                    color="#9333ea"
                    count={stats.labResults}
                    onViewAll={() => navigate('/lab-results')}
                    empty={adminRecentLabResults.length === 0}
                  >
                    {adminRecentLabResults.map(r => (
                      <ListRow key={r.labResultId} onClick={() => navigate('/lab-results')}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${labResultStatusColor[r.status] || '#9333ea'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                        }}>🔬</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.testName || 'Lab Test'} <span style={{ color: '#94a3b8', fontSize: 11 }}>#{r.labResultId}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {r.performedDate
                              ? new Date(r.performedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                              : 'Date not set'}
                            {r.sampleId ? ` · Sample #${r.sampleId}` : ''}
                            {r.result ? ` · ${r.result}${r.unit ? ' ' + r.unit : ''}` : ''}
                          </div>
                        </div>
                        {r.status && <SmallBadge label={r.status} color={labResultStatusColor[r.status] || '#9333ea'} />}
                      </ListRow>
                    ))}
                  </SectionCard>

                </div>
              </>
            )}

            {/* ════════════════════════════════════════
                RESEARCHER ACTIVITY SECTIONS
            ════════════════════════════════════════ */}
            {isResearcher && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18, marginTop: 4 }}>

                {/* ── Recent Protocols ── */}
                <SectionCard
                  title="Recent Protocols"
                  icon="📋"
                  color="#7c3aed"
                  count={stats.protocols}
                  onViewAll={() => navigate('/protocols')}
                  empty={recentProtocols.length === 0}
                >
                  {recentProtocols.map(p => (
                    <ListRow key={p.protocolId} onClick={() => navigate(`/protocols/${p.protocolId}`)}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: `${phaseColor[p.phase] || '#7c3aed'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>📋</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {p.phase && <SmallBadge label={p.phase.replace('_', ' ')} color={phaseColor[p.phase] || '#6366f1'} />}
                          {p.status && <SmallBadge label={p.status} color={protoStatusColor[p.status] || '#94a3b8'} />}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                        {p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) : '—'}
                      </div>
                    </ListRow>
                  ))}
                </SectionCard>

                {/* ── Recent Sites ── */}
                <SectionCard
                  title="Recent Sites"
                  icon="🏛️"
                  color="#0891b2"
                  count={stats.sites}
                  onViewAll={() => navigate('/sites')}
                  empty={recentSites.length === 0}
                >
                  {recentSites.map(s => (
                    <ListRow key={s.siteId} onClick={() => navigate('/sites')}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: `${siteStatusColor[s.status] || '#0891b2'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>🏛️</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          📍 {s.location || 'Location not set'}
                        </div>
                      </div>
                      {s.status && <SmallBadge label={s.status.replace('_', ' ')} color={siteStatusColor[s.status] || '#94a3b8'} />}
                    </ListRow>
                  ))}
                </SectionCard>

                {/* ── Active Patient Enrollments ── */}
                <SectionCard
                  title="Active Enrollments"
                  icon="🏥"
                  color="#16a34a"
                  count={activePatients.length}
                  empty={activePatients.length === 0}
                >
                  {activePatients.map(p => {
                    const name = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || `Patient #${p.patientId}`
                    return (
                      <ListRow key={p.patientId} onClick={() => navigate(`/patients/${p.patientId}`)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: `${enrollStatusColor[p.enrollmentStatus] || '#16a34a'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14,
                          color: enrollStatusColor[p.enrollmentStatus] || '#16a34a',
                        }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                          {p.protocolId && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              Protocol #{p.protocolId}
                            </div>
                          )}
                        </div>
                        {p.enrollmentStatus && (
                          <SmallBadge label={p.enrollmentStatus} color={enrollStatusColor[p.enrollmentStatus] || '#16a34a'} />
                        )}
                      </ListRow>
                    )
                  })}
                </SectionCard>

              </div>
            )}

            {/* ════════════════════════════════════════
                LAB TECHNICIAN ACTIVITY SECTIONS
            ════════════════════════════════════════ */}
            {isLabTech && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18, marginTop: 4 }}>

                {/* ── Recent Samples ── */}
                <SectionCard
                  title="Recent Samples"
                  icon="🧪"
                  color="#16a34a"
                  count={stats.samples}
                  onViewAll={() => navigate('/samples')}
                  empty={ltRecentSamples.length === 0}
                >
                  {ltRecentSamples.map(s => (
                    <ListRow key={s.sampleId} onClick={() => navigate('/samples')}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: `${sampleStatusColor[s.status] || '#16a34a'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13,
                        color: sampleStatusColor[s.status] || '#16a34a',
                      }}>
                        {s.sampleType?.charAt(0) || 'S'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {s.sampleType || 'Sample'} <span style={{ color: '#94a3b8', fontSize: 11 }}>#{s.sampleId}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {s.collectionDate
                            ? new Date(s.collectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                            : 'Date not set'}
                          {s.patientId ? ` · Patient #${s.patientId}` : ''}
                        </div>
                      </div>
                      {s.status && <SmallBadge label={s.status.replace('_', ' ')} color={sampleStatusColor[s.status] || '#16a34a'} />}
                    </ListRow>
                  ))}
                </SectionCard>

                {/* ── Recent Lab Results ── */}
                <SectionCard
                  title="Recent Lab Results"
                  icon="🔬"
                  color="#9333ea"
                  count={stats.labResults}
                  onViewAll={() => navigate('/lab-results')}
                  empty={ltRecentLabResults.length === 0}
                >
                  {ltRecentLabResults.map(r => (
                    <ListRow key={r.resultId} onClick={() => navigate('/lab-results')}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: `${labResultStatusColor[r.status] || '#9333ea'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>🔬</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.testName || 'Lab Test'} <span style={{ color: '#94a3b8', fontSize: 11 }}>#{r.resultId}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {r.performedDate
                            ? new Date(r.performedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                            : 'Date not set'}
                          {r.sampleId ? ` · Sample #${r.sampleId}` : ''}
                          {r.result ? ` · ${r.result}${r.unit ? ' ' + r.unit : ''}` : ''}
                        </div>
                      </div>
                      {r.status && <SmallBadge label={r.status} color={labResultStatusColor[r.status] || '#9333ea'} />}
                    </ListRow>
                  ))}
                </SectionCard>

              </div>
            )}

            {/* ════════════════════════════════════════
                REGULATORY OFFICER ACTIVITY SECTIONS
            ════════════════════════════════════════ */}
            {isRegulatoryOfficer && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18, marginTop: 4 }}>

                {/* ── Recent Audit Logs ── */}
                <SectionCard
                  title="Recent Audit Logs"
                  icon="🗒️"
                  color="#dc2626"
                  count={stats.auditLogs}
                  onViewAll={() => navigate('/audit-logs')}
                  empty={roRecentAuditLogs.length === 0}
                >
                  {roRecentAuditLogs.map(l => (
                    <ListRow key={l.logId} onClick={() => navigate('/audit-logs')}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: `${auditActionColor[l.action] || '#64748b'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>🗒️</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.userName || 'Unknown User'}
                          {l.userRole && <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>{l.userRole.replace(/_/g, ' ')}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {l.resourceType ? `${l.resourceType}${l.resourceId ? ` #${l.resourceId}` : ''}` : ''}
                          {l.timestamp ? ` · ${new Date(l.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}` : ''}
                        </div>
                      </div>
                      {l.action && (
                        <SmallBadge label={l.action} color={auditActionColor[l.action] || '#64748b'} />
                      )}
                    </ListRow>
                  ))}
                </SectionCard>

                {/* ── Recent Compliance Reports ── */}
                <SectionCard
                  title="Recent Compliance Reports"
                  icon="📄"
                  color="#475569"
                  count={stats.complianceReports}
                  onViewAll={() => navigate('/compliance-reports')}
                  empty={roRecentComplianceReports.length === 0}
                >
                  {roRecentComplianceReports.map(r => {
                    const rt = REPORT_TYPE_MAP[r.scope] || { icon: '📄', title: r.scope || 'Report', color: '#475569' }
                    return (
                      <ListRow key={r.reportId} onClick={() => navigate('/compliance-reports')}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${rt.color}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                        }}>{rt.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: rt.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rt.title}
                            <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
                              RPT-{String(r.reportId).padStart(4, '0')}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {r.generatedBy ? `By ${r.generatedBy}` : ''}
                            {r.generatedDate ? ` · ${r.generatedDate}` : ''}
                          </div>
                        </div>
                      </ListRow>
                    )
                  })}
                </SectionCard>

              </div>
            )}

            {/* ════════════════════════════════════════
                CTM ACTIVITY SECTIONS
            ════════════════════════════════════════ */}
            {isCTM && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 }}>

                {/* ── Activity banners: admin enrolled a patient / scheduled a visit ── */}
                {ctmActivityBanners.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ctmActivityBanners.map(n => {
                      const isPatient = n.title === 'New Patient Enrolled'
                      return (
                        <div key={n.notificationId} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          padding: '14px 20px', borderRadius: 12,
                          background: isPatient ? '#eff6ff' : '#f0fdf4',
                          border: `2px solid ${isPatient ? '#bfdbfe' : '#bbf7d0'}`,
                          borderLeft: `5px solid ${isPatient ? '#1a56db' : '#16a34a'}`,
                          boxShadow: `0 2px 8px ${isPatient ? 'rgba(26,86,219,0.08)' : 'rgba(22,163,74,0.08)'}`,
                        }}>
                          <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>
                            {isPatient ? '🏥' : '📅'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: isPatient ? '#1e40af' : '#15803d', marginBottom: 3 }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: 13, color: isPatient ? '#1e3a8a' : '#166534', lineHeight: 1.5 }}>
                              {n.message}
                            </div>
                          </div>
                          <button
                            onClick={() => dismissCtmBanner(n.notificationId)}
                            style={{
                              padding: '6px 18px', borderRadius: 8, flexShrink: 0,
                              border: `1.5px solid ${isPatient ? '#93c5fd' : '#86efac'}`,
                              background: isPatient ? '#dbeafe' : '#dcfce7',
                              color: isPatient ? '#1d4ed8' : '#15803d',
                              fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            OK
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Recent Patients · Recent Protocols · Recent Sites ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>

                  {/* Recent Patients */}
                  <SectionCard
                    title="Recent Patients"
                    icon="🏥"
                    color="#1a56db"
                    count={stats.patients}
                    onViewAll={() => navigate('/patients')}
                    empty={ctmRecentPatients.length === 0}
                  >
                    {ctmRecentPatients.map(p => {
                      const name = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || `Patient #${p.patientId}`
                      return (
                        <ListRow key={p.patientId} onClick={() => navigate(`/patients/${p.patientId}`)}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: `${enrollStatusColor[p.enrollmentStatus] || '#1a56db'}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 14,
                            color: enrollStatusColor[p.enrollmentStatus] || '#1a56db',
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            {p.protocolId && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Protocol #{p.protocolId}</div>}
                          </div>
                          {p.enrollmentStatus && <SmallBadge label={p.enrollmentStatus} color={enrollStatusColor[p.enrollmentStatus] || '#1a56db'} />}
                        </ListRow>
                      )
                    })}
                  </SectionCard>

                  {/* Recent Protocols */}
                  <SectionCard
                    title="Recent Protocols"
                    icon="📋"
                    color="#7c3aed"
                    count={stats.protocols}
                    onViewAll={() => navigate('/protocols')}
                    empty={ctmRecentProtocols.length === 0}
                  >
                    {ctmRecentProtocols.map(p => (
                      <ListRow key={p.protocolId} onClick={() => navigate(`/protocols/${p.protocolId}`)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${phaseColor[p.phase] || '#7c3aed'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>📋</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                            {p.phase  && <SmallBadge label={p.phase.replace('_', ' ')} color={phaseColor[p.phase] || '#6366f1'} />}
                            {p.status && <SmallBadge label={p.status} color={protoStatusColor[p.status] || '#94a3b8'} />}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                          {p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </div>
                      </ListRow>
                    ))}
                  </SectionCard>

                  {/* Recent Sites */}
                  <SectionCard
                    title="Recent Sites"
                    icon="🏛️"
                    color="#0891b2"
                    count={stats.sites}
                    onViewAll={() => navigate('/sites')}
                    empty={ctmRecentSites.length === 0}
                  >
                    {ctmRecentSites.map(s => (
                      <ListRow key={s.siteId} onClick={() => navigate(`/sites/${s.siteId}`)}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: `${siteStatusColor[s.status] || '#0891b2'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        }}>🏛️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {s.location || 'Location not set'}</div>
                        </div>
                        {s.status && <SmallBadge label={s.status.replace('_', ' ')} color={siteStatusColor[s.status] || '#94a3b8'} />}
                      </ListRow>
                    ))}
                  </SectionCard>

                </div>

              </div>
            )}

          </>
        )}
      </div>
    </>
  )
}
