import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import {
  getDashboard, getKpiReports, getReportsByScope, createKpiReport, updateKpiReport,
  deleteKpiReport, autoGenerateKpiReportsByScope, getStudyProgressReport
} from '../api/analytics'
import { useAuth } from '../context/AuthContext'
import ProtocolCharts from './ProtocolCharts'
import ModuleCharts from './ModuleCharts'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getLabResults as fetchAllLabResults } from '../api/labResults'

const SCOPES = ['GLOBAL', 'PROTOCOL', 'SITE', 'PATIENT', 'SAMPLE', 'VISIT', 'LAB_RESULT', 'NOTIFICATION']
const empty = { reportName: '', scope: 'GLOBAL', metricName: '', metricValue: '', unit: '', generatedDate: '' }

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'PATIENT', label: 'Patients', icon: '👥', color: '#1a56db', light: '#eff6ff',
    getTotal: d => d?.totalPatients,
    getStats: d => [
      { label: 'Enrolled',  value: d?.enrolledPatients,  color: '#16a34a', bg: '#dcfce7' },
      { label: 'Screening', value: d?.screeningPatients, color: '#d97706', bg: '#fef3c7' },
      { label: 'Completed', value: d?.completedPatients, color: '#1a56db', bg: '#dbeafe' },
      { label: 'Withdrawn', value: d?.withdrawnPatients, color: '#ef4444', bg: '#fee2e2' },
    ]
  },
  {
    key: 'VISIT', label: 'Visits', icon: '📅', color: '#7c3aed', light: '#f5f3ff',
    getTotal: d => d?.totalVisits,
    getStats: d => [
      { label: 'Completed', value: d?.completedVisits,              color: '#059669', bg: '#d1fae5' },
      { label: 'Scheduled', value: d?.scheduledVisits,              color: '#1a56db', bg: '#dbeafe' },
      { label: 'Missed',    value: d?.missedVisits ?? Math.max(0, (d?.totalVisits ?? 0) - (d?.completedVisits ?? 0) - (d?.scheduledVisits ?? 0) - (d?.cancelledVisits ?? 0)), color: '#ef4444', bg: '#fee2e2' },
      { label: 'Cancelled', value: d?.cancelledVisits ?? 0,         color: '#94a3b8', bg: '#f1f5f9' },
    ]
  },
  {
    key: 'SAMPLE', label: 'Samples', icon: '🧪', color: '#0891b2', light: '#ecfeff',
    getTotal: d => d?.totalSamples,
    getStats: d => [
      { label: 'Collected',  value: d?.collectedSamples ?? 0,  color: '#0891b2', bg: '#ecfeff' },
      { label: 'In Storage', value: d?.pendingSamples,         color: '#7c3aed', bg: '#f5f3ff' },
      { label: 'Analyzed',   value: d?.analyzedSamples,        color: '#16a34a', bg: '#dcfce7' },
      { label: 'Disposed',   value: Math.max(0, (d?.totalSamples ?? 0) - (d?.collectedSamples ?? 0) - (d?.analyzedSamples ?? 0) - (d?.pendingSamples ?? 0)), color: '#64748b', bg: '#f1f5f9' },
    ]
  },
  {
    key: 'LAB_RESULT', label: 'Lab Results', icon: '🔬', color: '#9333ea', light: '#faf5ff',
    getTotal: d => d?.totalLabResults,
    getStats: d => [
      { label: 'Completed', value: d?.completedLabResults,     color: '#16a34a', bg: '#dcfce7' },
      { label: 'Reviewed',  value: d?.reviewedLabResults ?? 0, color: '#7c3aed', bg: '#f5f3ff' },
      { label: 'Pending',   value: d?.pendingLabResults  ?? 0, color: '#d97706', bg: '#fef3c7' },
      { label: 'Rejected',  value: d?.rejectedLabResults ?? 0, color: '#ef4444', bg: '#fee2e2' },
    ]
  },
  {
    key: 'PROTOCOL', label: 'Protocols', icon: '📋', color: '#059669', light: '#ecfdf5',
    getTotal: d => d?.totalProtocols,
    getStats: d => [
      { label: 'Active',   value: d?.activeProtocols,  color: '#16a34a', bg: '#dcfce7' },
      { label: 'Inactive', value: Math.max(0, (d?.totalProtocols ?? 0) - (d?.activeProtocols ?? 0)), color: '#94a3b8', bg: '#f1f5f9' },
    ]
  },
  {
    key: 'SITE', label: 'Sites', icon: '🏥', color: '#0284c7', light: '#f0f9ff',
    getTotal: d => d?.totalSites,
    getStats: d => [
      { label: 'Active',   value: d?.activeSites,  color: '#16a34a', bg: '#dcfce7' },
      { label: 'Inactive', value: Math.max(0, (d?.totalSites ?? 0) - (d?.activeSites ?? 0)), color: '#94a3b8', bg: '#f1f5f9' },
    ]
  },
  {
    key: 'NOTIFICATION', label: 'Notifications', icon: '🔔', color: '#6366f1', light: '#eef2ff',
    getTotal: d => d?.totalNotifications,
    getStats: d => [
      { label: 'Unread', value: d?.unreadNotifications, color: '#dc2626', bg: '#fee2e2' },
      { label: 'Read',   value: Math.max(0, (d?.totalNotifications ?? 0) - (d?.unreadNotifications ?? 0)), color: '#16a34a', bg: '#dcfce7' },
    ]
  },
]

// ── Icons ─────────────────────────────────────────────────────────────────────
function EditIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIcon({ size = 15, color = '#ef4444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('ADMIN', 'DATA_MANAGER')

  const [dashboard, setDashboard] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Study Progress Report (loaded lazily when Protocol category is selected)
  const [studyProgress, setStudyProgress] = useState([])
  const [studyLoading, setStudyLoading] = useState(false)

  // Extra computed counts merged into dashboard for modules where backend aggregates are incomplete
  const [moduleExtraData, setModuleExtraData] = useState({})

  // Selected category for drill-down
  const [activeCategory, setActiveCategory] = useState(null)
  const [generating, setGenerating] = useState(false)

  // Protocol chart drill-down
  const [selectedProtocol, setSelectedProtocol] = useState(null)

  // CRUD modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      getDashboard().then(r => setDashboard(r.data)).catch(() => {}),
      getKpiReports().then(r => setReports(r.data)).catch(() => setReports([]))
    ]).finally(() => setLoading(false))
  }

  const loadStudyProgress = () => {
    setStudyLoading(true)
    getStudyProgressReport().then(r => setStudyProgress(r.data || [])).catch(() => setStudyProgress([])).finally(() => setStudyLoading(false))
  }

  const loadLabResultCounts = () => {
    fetchAllLabResults().then(r => {
      const items = Array.isArray(r.data) ? r.data : []
      const counts = items.reduce((acc, item) => {
        const s = item.status || 'UNKNOWN'
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
      setModuleExtraData(prev => ({
        ...prev,
        reviewedLabResults:  counts['REVIEWED']  || 0,
        completedLabResults: counts['COMPLETED']  || 0,
        pendingLabResults:   counts['PENDING']    || 0,
        rejectedLabResults:  counts['REJECTED']   || 0,
      }))
    }).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const loadForScope = (cat) => {
    if (!cat) {
      getKpiReports().then(r => setReports(r.data)).catch(() => setReports([]))
    } else {
      getReportsByScope(cat.key).then(r => setReports(r.data)).catch(() => setReports([]))
    }
  }

  const selectCategory = (cat) => {
    const next = activeCategory?.key === cat.key ? null : cat
    setActiveCategory(next)
    setSearch('')
    setSelectedProtocol(null)
    loadForScope(next)
    if (next?.key === 'PROTOCOL') {
      loadStudyProgress()
    }
    if (next?.key === 'LAB_RESULT') {
      loadLabResultCounts()
    }
  }

  const handleGenerateForScope = async () => {
    if (!activeCategory) return
    setGenerating(true)
    try {
      await autoGenerateKpiReportsByScope(activeCategory.key)
      getDashboard().then(r => setDashboard(r.data)).catch(() => {})
      loadForScope(activeCategory)
    } catch (err) {
      alert('Failed to generate KPIs: ' + (err.response?.data?.message || err.message))
    } finally { setGenerating(false) }
  }

  // CRUD handlers
  const openCreate = () => {
    setEditing(null)
    setForm({ ...empty, scope: activeCategory?.key || 'GLOBAL' })
    setError('')
    setShowModal(true)
  }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      reportName: r.reportName || '', scope: r.scope || 'GLOBAL',
      metricName: r.metricName || '', metricValue: r.metricValue || '',
      unit: r.unit || '', generatedDate: r.generatedDate || ''
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      const payload = { ...form, generatedDate: form.generatedDate || new Date().toISOString().split('T')[0] }
      if (editing) await updateKpiReport(editing.reportId, payload)
      else await createKpiReport(payload)
      setShowModal(false)
      loadForScope(activeCategory)
      getDashboard().then(r => setDashboard(r.data)).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save KPI report.')
    } finally { setSaving(false) }
  }

  const handleDeleteConfirmed = async () => {
    setDeleting(true)
    try {
      await deleteKpiReport(confirmDelete.reportId)
      setConfirmDelete(null)
      loadForScope(activeCategory)
    } catch { setConfirmDelete(null) }
    finally { setDeleting(false) }
  }

  const filtered = reports.filter(r =>
    r.reportName?.toLowerCase().includes(search.toLowerCase()) ||
    r.metricName?.toLowerCase().includes(search.toLowerCase())
  )

  const scopeBadge = (s) => {
    const cat = CATEGORIES.find(c => c.key === s)
    if (!cat) return <span className="badge badge-secondary">{s}</span>
    return (
      <span style={{ background: cat.light, color: cat.color, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
        {cat.icon} {cat.label}
      </span>
    )
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar title="Analytics & KPI" />
      <div className="page-content">
        <div className="page-header">
          <h2>Analytics & KPI Reports</h2>
          <p>Select a module to view its metrics and generate targeted KPI reports</p>
        </div>

        {/* ── Category Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 14, marginBottom: 24 }}>
          {CATEGORIES.map(cat => {
            const total = dashboard ? (cat.getTotal(dashboard) ?? '—') : '—'
            const isActive = activeCategory?.key === cat.key
            return (
              <div
                key={cat.key}
                onClick={() => selectCategory(cat)}
                style={{
                  background: isActive ? cat.color : '#fff',
                  border: `2px solid ${isActive ? cat.color : '#e2e8f0'}`,
                  borderRadius: 14,
                  padding: '18px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  boxShadow: isActive ? `0 4px 20px ${cat.color}44` : '0 1px 4px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  userSelect: 'none',
                }}
              >
                <div style={{ fontSize: 28 }}>{cat.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: isActive ? '#fff' : cat.color, lineHeight: 1 }}>
                  {dashboard ? total : <span style={{ fontSize: 14, color: isActive ? 'rgba(255,255,255,0.6)' : '#cbd5e1' }}>...</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b', textAlign: 'center' }}>{cat.label}</div>
              </div>
            )
          })}
        </div>

        {/* ── Expanded Detail Panel ── */}
        {activeCategory && (
          <div style={{
            background: activeCategory.light,
            border: `1.5px solid ${activeCategory.color}33`,
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{activeCategory.icon}</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: activeCategory.color }}>{activeCategory.label} Overview</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {canWrite && (
                  <button
                    onClick={handleGenerateForScope}
                    disabled={generating}
                    style={{
                      background: activeCategory.color, color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700,
                      cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {generating ? '⏳ Generating...' : `⚡ Generate ${activeCategory.label} KPIs`}
                  </button>
                )}
                {canWrite && (
                  <button
                    onClick={openCreate}
                    style={{
                      background: '#fff', color: activeCategory.color,
                      border: `1.5px solid ${activeCategory.color}`,
                      borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    + New Report
                  </button>
                )}
              </div>
            </div>

            {/* Breakdown stat chips */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', border: `1px solid ${activeCategory.color}44`, borderRadius: 10, padding: '12px 22px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: activeCategory.color }}>{dashboard ? (activeCategory.getTotal(dashboard) ?? '—') : '—'}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>TOTAL</div>
              </div>
              {dashboard && activeCategory.getStats({ ...dashboard, ...moduleExtraData }).map(stat => (
                <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}33`, borderRadius: 10, padding: '12px 22px', textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value ?? '—'}</div>
                  <div style={{ fontSize: 11, color: stat.color, fontWeight: 600, marginTop: 2 }}>{stat.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* ── Module-level visualisations for non-Protocol categories ── */}
            <ModuleCharts category={activeCategory} />

            {/* ── Protocol Status Distribution (only for Protocol category, overview level) ── */}
            {activeCategory.key === 'PROTOCOL' && !selectedProtocol && studyProgress.length > 0 && (() => {
              const PCOL = {
                'Completed': '#16a34a', 'Ahead of Target': '#0891b2', 'On Track': '#1a56db',
                'In Progress': '#d97706', 'Behind Target': '#ef4444', 'Overdue': '#dc2626', 'Active': '#7c3aed',
              }
              const counts = studyProgress.reduce((acc, p) => {
                const s = p.progressStatus || 'Unknown'
                acc[s] = (acc[s] || 0) + 1
                return acc
              }, {})
              const pieData = Object.entries(counts)
                .map(([name, value]) => ({ name, value, color: PCOL[name] || '#94a3b8' }))
                .sort((a, b) => b.value - a.value)

              return (
                <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, padding: '18px 22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>Protocol Status Distribution</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{studyProgress.length} protocols across all statuses</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ flexShrink: 0 }}>
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={70}
                            dataKey="value" strokeWidth={2}>
                            {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip formatter={(val, name) => [val, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pieData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#374151' }}>{d.name}</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: d.color }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Study Progress Report (only for Protocol category) ── */}
            {activeCategory.key === 'PROTOCOL' && (
              <div style={{ marginTop: 24 }}>

                {/* If a protocol is selected → show full chart drill-down */}
                {selectedProtocol ? (
                  <ProtocolCharts
                    protocol={selectedProtocol}
                    allProtocols={studyProgress}
                    onBack={() => setSelectedProtocol(null)}
                  />
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 18 }}>📊</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Study Progress Report</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Click a protocol card to view detailed charts</div>
                      </div>
                      {studyProgress.length > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{studyProgress.length} protocol{studyProgress.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {studyLoading ? (
                      <div className="loading"><div className="spinner" />Loading study progress...</div>
                    ) : studyProgress.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 14, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        No protocols found. Add protocols in the Protocols module.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                        {studyProgress.map(p => {
                          const progressColor = {
                            'Completed':       '#16a34a',
                            'Ahead of Target': '#0891b2',
                            'On Track':        '#1a56db',
                            'In Progress':     '#d97706',
                            'Behind Target':   '#ef4444',
                            'Overdue':         '#dc2626',
                            'Active':          '#7c3aed',
                          }[p.progressStatus] || '#64748b'

                          const phaseBadgeColor = {
                            PHASE_I: '#dbeafe', PHASE_II: '#fef3c7',
                            PHASE_III: '#dcfce7', PHASE_IV: '#fee2e2',
                          }

                          const hasTarget = p.targetPatients && p.targetPatients > 0
                          const totalPat  = p.totalPatients ?? 0
                          const enrollPct = hasTarget ? Math.min(Math.round((totalPat / p.targetPatients) * 100), 100) : 0
                          const barColor  = enrollPct >= 80 ? '#16a34a' : enrollPct >= 50 ? '#d97706' : '#ef4444'

                          return (
                            <div
                              key={p.protocolId}
                              onClick={() => setSelectedProtocol(p)}
                              style={{
                                border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
                                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(5,150,105,0.15)'; e.currentTarget.style.borderColor = '#059669' }}
                              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                            >
                              {/* Card Header */}
                              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                    <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>#{p.protocolId}</span>
                                    {p.phase && (
                                      <span style={{ background: phaseBadgeColor[p.phase] || '#f1f5f9', color: '#374151', borderRadius: 5, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                                        {p.phase?.replace('_', ' ')}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {p.title || 'Untitled Protocol'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                  <span style={{ background: progressColor + '18', color: progressColor, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {p.progressStatus}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>View Charts →</span>
                                </div>
                              </div>

                              {/* Card Body */}
                              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                                    <span style={{ fontWeight: 600, color: '#374151' }}>
                                      👥 Total Patients: <strong>{totalPat}</strong>
                                      {hasTarget && <> / {p.targetPatients} target</>}
                                    </span>
                                    {hasTarget && <span style={{ fontWeight: 700, color: barColor }}>{enrollPct}%</span>}
                                  </div>
                                  {hasTarget ? (
                                    <div style={{ height: 7, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                                      <div style={{ width: `${enrollPct}%`, height: '100%', background: barColor, borderRadius: 10, transition: 'width 0.4s ease' }} />
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                      No target set — {totalPat} patient{totalPat !== 1 ? 's' : ''} linked
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '6px 12px', fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                                    🏥 <strong>{p.siteCount}</strong> site{p.siteCount !== 1 ? 's' : ''}
                                  </div>
                                  {(p.totalVisits > 0) && (
                                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '6px 12px', fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                                      📅 <strong>{p.completedVisits}</strong>/<strong>{p.totalVisits}</strong> visits done
                                    </div>
                                  )}
                                  {p.missedVisits > 0 && (
                                    <div style={{ background: '#fef2f2', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#dc2626', display: 'flex', gap: 4, alignItems: 'center' }}>
                                      ⚠️ <strong>{p.missedVisits}</strong> missed
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                                  <span>📆 Start: <strong style={{ color: '#374151' }}>{p.startDate || '—'}</strong></span>
                                  <span>🏁 End: <strong style={{ color: '#374151' }}>{p.endDate || '—'}</strong></span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── KPI Reports Table ── */}
        <div className="card">
          <div className="card-header">
            <div className="toolbar">
              <input
                className="search-input"
                placeholder={activeCategory ? `Search ${activeCategory.label} reports...` : 'Search all KPI reports...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span style={{ color: '#64748b', fontSize: '13px' }}>
                {filtered.length} reports{activeCategory ? ` · ${activeCategory.icon} ${activeCategory.label}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {activeCategory && (
                <button
                  style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', cursor: 'pointer', color: '#64748b' }}
                  onClick={() => { setActiveCategory(null); loadForScope(null) }}
                >
                  ✕ Show all
                </button>
              )}
              {!activeCategory && canWrite && (
                <button className="btn btn-primary" onClick={openCreate}>+ New KPI Report</button>
              )}
            </div>
          </div>

          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📈</div>
                <h3>No KPI reports found</h3>
                <p>{activeCategory
                  ? `Click "⚡ Generate ${activeCategory.label} KPIs" above to create reports from live data.`
                  : 'Select a module above and click Generate KPIs, or create one manually.'}</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Report Name</th><th>Scope</th><th>Metric</th><th>Value</th><th>Unit</th><th>Generated Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.reportId}>
                        <td><strong>{r.reportName || '—'}</strong></td>
                        <td>{scopeBadge(r.scope)}</td>
                        <td>{r.metricName || '—'}</td>
                        <td style={{ fontWeight: 700, color: '#1a56db' }}>{r.metricValue || '—'}</td>
                        <td>{r.unit || '—'}</td>
                        <td>{r.generatedDate || '—'}</td>
                        <td>
                          <div className="actions">
                            {canWrite && <button className="btn btn-icon btn-sm" onClick={() => openEdit(r)}><EditIcon /></button>}
                            {hasRole('ADMIN') && <button className="btn btn-icon btn-sm" onClick={() => setConfirmDelete(r)}><TrashIcon /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {/* ── Edit / Create Modal ── */}
      {showModal && (
        <Modal title={editing ? 'Edit KPI Report' : 'New KPI Report'} onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group"><label>Report Name *</label><input className="form-control" value={form.reportName} onChange={f('reportName')} placeholder="Q1 Patient Enrollment" /></div>
            <div className="form-group"><label>Scope *</label>
              <select className="form-control" value={form.scope} onChange={f('scope')}>
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Metric Name *</label><input className="form-control" value={form.metricName} onChange={f('metricName')} placeholder="Enrollment Rate" /></div>
            <div className="form-group"><label>Metric Value *</label><input className="form-control" value={form.metricValue} onChange={f('metricValue')} placeholder="87.5" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Unit</label><input className="form-control" value={form.unit} onChange={f('unit')} placeholder="%" /></div>
            <div className="form-group"><label>Generated Date</label><input className="form-control" type="date" value={form.generatedDate} onChange={f('generatedDate')} /></div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', padding: '24px 28px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><TrashIcon size={18} color="#fff" /> Delete KPI Report</h3>
              <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>This action cannot be undone.</p>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{confirmDelete.reportName || '—'}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  Scope: <strong>{confirmDelete.scope}</strong>
                  {confirmDelete.metricName && <> &nbsp;·&nbsp; Metric: <strong>{confirmDelete.metricName}</strong></>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeleteConfirmed} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
