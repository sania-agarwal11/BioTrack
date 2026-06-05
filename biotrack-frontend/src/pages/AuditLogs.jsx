import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getAuditLogs } from '../api/compliance'
import { useAuth } from '../context/AuthContext'

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'RESTORE']
const ROLES   = [
  'ADMIN', 'CLINICAL_TRIAL_MANAGER', 'LAB_TECHNICIAN',
  'RESEARCH_SCIENTIST', 'REGULATORY_OFFICER', 'DATA_MANAGER', 'INVESTIGATOR',
]

export default function AuditLogs() {
  const { hasRole } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search,       setSearch]       = useState('')   // filter by username
  const [filterAction, setFilterAction] = useState('')
  const [filterRole,   setFilterRole]   = useState('')

  const load = () => {
    setLoading(true)
    getAuditLogs().then(r => setLogs(r.data || [])).catch(() => setLogs([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const clearFilters = () => { setSearch(''); setFilterAction(''); setFilterRole('') }
  const hasFilters   = search || filterAction || filterRole

  // All filtering is client-side — no extra API calls needed
  const filtered = logs.filter(l => {
    const nameMatch   = !search       || (l.userName || '').toLowerCase().includes(search.toLowerCase())
    const actionMatch = !filterAction || l.action === filterAction
    const roleMatch   = !filterRole   || l.userRole === filterRole
    return nameMatch && actionMatch && roleMatch
  })

  const actionBadge = (a) => {
    const map = { CREATE: 'badge-success', UPDATE: 'badge-primary', DELETE: 'badge-danger', LOGIN: 'badge-secondary', LOGOUT: 'badge-secondary', VIEW: 'badge-secondary' }
    return <span className={`badge ${map[a] || 'badge-secondary'}`}>{a}</span>
  }

  const roleBadge = (r) => {
    const map = {
      ADMIN:                 'badge-danger',
      CLINICAL_TRIAL_MANAGER:'badge-primary',
      LAB_TECHNICIAN:        'badge-success',
      RESEARCH_SCIENTIST:    'badge-warning',
      REGULATORY_OFFICER:    'badge-primary',
      DATA_MANAGER:          'badge-secondary',
      INVESTIGATOR:          'badge-success',
    }
    return r ? <span className={`badge ${map[r] || 'badge-secondary'}`}>{r.replace(/_/g, ' ')}</span> : <span style={{ color: '#94a3b8' }}>—</span>
  }

  // Builds a human-readable "Resource" label from resourceType + optional ID
  // e.g.  PROTOCOL + 3  →  "Protocol #3"
  //       SITE           →  "Site"
  //       AUTH           →  "Authentication"
  const resourceLabel = (type, id) => {
    if (!type) return <span style={{ color: '#94a3b8' }}>—</span>
    const labelMap = {
      PROTOCOL:   { text: 'Protocol',       color: '#6366f1' },
      SITE:       { text: 'Site',           color: '#0ea5e9' },
      PATIENT:    { text: 'Patient',        color: '#10b981' },
      VISIT:      { text: 'Visit',          color: '#14b8a6' },
      SAMPLE:     { text: 'Sample',         color: '#f59e0b' },
      LAB_RESULT: { text: 'Lab Result',     color: '#f97316' },
      USER:       { text: 'User',           color: '#8b5cf6' },
      AUTH:       { text: 'Authentication', color: '#64748b' },
    }
    const entry = labelMap[type] || { text: type, color: '#64748b' }
    return (
      <span style={{ color: entry.color, fontWeight: 500 }}>
        {entry.text}{id ? ` #${id}` : ''}
      </span>
    )
  }

  return (
    <>
      <Navbar title="Audit Logs" />
      <div className="page-content">
        <div className="page-header">
          <h2>Audit Logs</h2>
          <p>Complete trail of all platform activities and data changes</p>
        </div>
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
              {/* Search by username */}
              <input
                className="search-input"
                placeholder="🔍 Search by username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 200 }}
              />

              {/* Filter by action */}
              <select
                className="search-input"
                style={{ minWidth: 150 }}
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
              >
                <option value="">All Actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {/* Filter by role */}
              <select
                className="search-input"
                style={{ minWidth: 200 }}
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>

              {hasFilters && (
                <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear</button>
              )}
            </div>
            <span style={{ color: '#64748b', fontSize: '13px' }}>{filtered.length} entries</span>
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🗒️</div>
                <h3>No audit logs found</h3>
                <p>Audit logs are automatically created when platform operations are performed.</p>
              </div>
            ) :
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Email</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, idx) => (
                    <tr key={l.auditId}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}.</td>
                      <td><strong>{l.userName || '—'}</strong></td>
                      <td>{roleBadge(l.userRole)}</td>
                      <td>{actionBadge(l.action)}</td>
                      <td>{resourceLabel(l.resourceType, l.entityId)}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{l.performedBy || '—'}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </>
  )
}
