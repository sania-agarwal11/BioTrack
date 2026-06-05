import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts'
import { getPatientsByProtocol } from '../api/patients'
import { getVisitsByPatient } from '../api/visits'
import { getSiteById } from '../api/sites'

const STATUS_COLORS = {
  ENROLLED:   '#16a34a',
  SCREENING:  '#d97706',
  COMPLETED:  '#1a56db',
  WITHDRAWN:  '#ef4444',
  CANCELLED:  '#94a3b8',
}

const PHASE_COLOR = {
  PHASE_I: '#dbeafe', PHASE_II: '#fef3c7',
  PHASE_III: '#dcfce7', PHASE_IV: '#fee2e2',
}

const PROGRESS_COLOR = {
  'Completed':       '#16a34a',
  'Ahead of Target': '#0891b2',
  'On Track':        '#1a56db',
  'In Progress':     '#d97706',
  'Behind Target':   '#ef4444',
  'Overdue':         '#dc2626',
  'Active':          '#7c3aed',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      {label && <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: '#64748b' }}>{p.name}:</span>
          <strong style={{ color: '#0f172a' }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text = 'No data available' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

// Format date as "MMM D, YYYY" e.g. "Jan 10, 2025"
function formatDateLabel(isoDate) {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Groups visits by actual visit date (no week normalisation)
function groupVisitsByDate(visits) {
  const buckets = {}
  visits.forEach(v => {
    const rawDate = v.visitDate || v.scheduledDate || v.date
    if (!rawDate) return
    const d = new Date(rawDate)
    if (isNaN(d)) return
    const key = rawDate.toString().split('T')[0]   // keep the exact date string
    if (!buckets[key]) buckets[key] = { date: key, label: formatDateLabel(key), Completed: 0, Missed: 0, Scheduled: 0, Cancelled: 0 }
    const s = (v.status || '').toUpperCase()
    if      (s === 'COMPLETED')  buckets[key].Completed++
    else if (s === 'MISSED')     buckets[key].Missed++
    else if (s === 'CANCELLED')  buckets[key].Cancelled++
    else                         buckets[key].Scheduled++
  })
  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date))
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProtocolCharts({ protocol, allProtocols = [], onBack }) {
  const [patients,      setPatients]      = useState([])
  const [visitTrend,    setVisitTrend]    = useState([])
  const [siteNames,     setSiteNames]     = useState({})   // { siteId: siteName }
  const [loading,       setLoading]       = useState(true)
  const [visitsLoading, setVisitsLoading] = useState(false)

  // Fetch patients for this protocol
  useEffect(() => {
    if (!protocol) return
    setLoading(true)
    setPatients([])
    setVisitTrend([])
    setSiteNames({})
    getPatientsByProtocol(protocol.protocolId)
      .then(async r => {
        const pats = Array.isArray(r.data) ? r.data : []
        setPatients(pats)

        // Fetch visits for trend chart
        if (pats.length > 0) {
          setVisitsLoading(true)
          Promise.all(pats.map(p => getVisitsByPatient(p.patientId).catch(() => ({ data: [] }))))
            .then(results => {
              const allVisits = results.flatMap(r => Array.isArray(r.data) ? r.data : [])
              setVisitTrend(groupVisitsByDate(allVisits))
            })
            .finally(() => setVisitsLoading(false))
        }

        // Fetch site names for unique siteIds
        const uniqueSiteIds = [...new Set(pats.map(p => p.siteId).filter(Boolean))]
        if (uniqueSiteIds.length > 0) {
          const siteResults = await Promise.all(
            uniqueSiteIds.map(id => getSiteById(id).catch(() => ({ data: null })))
          )
          const nameMap = {}
          uniqueSiteIds.forEach((id, i) => {
            const site = siteResults[i]?.data
            nameMap[id] = site?.name || `Site #${id}`
          })
          setSiteNames(nameMap)
        }
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false))
  }, [protocol?.protocolId])

  // ── Chart data ──────────────────────────────────────────────────────────────

  // 1. Enrollment Donut
  const enrolled  = protocol.totalPatients ?? 0
  const target    = protocol.targetPatients ?? 0
  const remaining = Math.max(target - enrolled, 0)
  const enrollPct = target > 0 ? Math.min(Math.round((enrolled / target) * 100), 100) : 0
  const barColor  = enrollPct >= 80 ? '#16a34a' : enrollPct >= 50 ? '#d97706' : '#ef4444'
  const enrollmentData = target > 0
    ? [
        { name: `Enrolled (${enrolled})`,   value: enrolled,   color: '#16a34a' },
        { name: `Remaining (${remaining})`, value: remaining,  color: '#e2e8f0' },
      ]
    : [{ name: `Total (${enrolled})`, value: Math.max(enrolled, 1), color: '#16a34a' }]

  // 2. Patient Status Distribution for this protocol
  const patientStatusCounts = patients.reduce((acc, p) => {
    const s = p.enrollmentStatus || p.status
    if (s) acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const patientStatusData = Object.entries(patientStatusCounts)
    .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  // 3. Site Participation (patients grouped by siteId)
  const siteCounts = patients.reduce((acc, p) => {
    if (p.siteId) {
      const label = siteNames[p.siteId] || `Site #${p.siteId}`
      acc[label] = (acc[label] || 0) + 1
    }
    return acc
  }, {})
  const siteData = Object.entries(siteCounts)
    .map(([name, patients]) => ({ name, patients }))
    .sort((a, b) => b.patients - a.patients)

  // Timeline
  const today   = new Date()
  const startDt = protocol.startDate ? new Date(protocol.startDate) : null
  const endDt   = protocol.endDate   ? new Date(protocol.endDate)   : null
  let todayPct  = 0
  let isOverdue = false
  if (startDt && endDt) {
    const totalMs = endDt - startDt
    todayPct  = Math.min(Math.max(((today - startDt) / totalMs) * 100, 0), 100)
    isOverdue = today > endDt
  }

  const progressColor = PROGRESS_COLOR[protocol.progressStatus] || '#64748b'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            color: '#374151', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← All Protocols
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{protocol.title}</span>
            {protocol.phase && (
              <span style={{ background: PHASE_COLOR[protocol.phase] || '#f1f5f9', color: '#374151', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                {protocol.phase.replace('_', ' ')}
              </span>
            )}
            <span style={{ background: progressColor + '18', color: progressColor, borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
              {protocol.progressStatus}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            #{protocol.protocolId} · {protocol.siteCount} site{protocol.siteCount !== 1 ? 's' : ''} · {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading patient data...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Row 1: Enrollment Donut + Protocol Status Donut ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Enrollment Donut */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Enrollment Progress</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                {target > 0 ? `${enrolled} of ${target} target patients` : `${enrolled} total patient${enrolled !== 1 ? 's' : ''} linked`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ flexShrink: 0 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={enrollmentData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                        dataKey="value" strokeWidth={2} startAngle={90} endAngle={-270}>
                        {enrollmentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 38, fontWeight: 900, color: barColor, lineHeight: 1 }}>{enrollPct}%</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>of target reached</div>
                  {enrollmentData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, border: d.color === '#e2e8f0' ? '1px solid #cbd5e1' : 'none', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#374151' }}>{d.name}</span>
                    </div>
                  ))}
                  {target > 0 && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Target: {target} patients</div>}
                </div>
              </div>
            </div>

            {/* Patient Status Distribution */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Patient Status Distribution</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                {patients.length} patient{patients.length !== 1 ? 's' : ''} in this protocol
              </div>
              {patientStatusData.length === 0 ? (
                <EmptyState text="No patients enrolled yet" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ flexShrink: 0 }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={patientStatusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                          dataKey="value" strokeWidth={2}>
                          {patientStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1 }}>
                    {patientStatusData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#374151' }}>{d.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: Study Timeline (Gantt) ── */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Study Timeline</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Planned duration from start to end date</div>
            {!startDt || !endDt ? (
              <EmptyState text="No timeline dates set for this protocol" />
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', width: 120, flexShrink: 0 }}>
                    {protocol.title?.length > 16 ? protocol.title.slice(0, 16) + '…' : protocol.title}
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 36, background: '#f1f5f9', borderRadius: 8 }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: isOverdue ? 'linear-gradient(90deg,#fca5a5,#ef4444)' : 'linear-gradient(90deg,#93c5fd,#1a56db)',
                      borderRadius: 8, opacity: 0.25,
                    }} />
                    <div style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      width: `${todayPct}%`,
                      background: isOverdue ? 'linear-gradient(90deg,#dc2626,#ef4444)' : 'linear-gradient(90deg,#1a56db,#3b82f6)',
                      borderRadius: 8, transition: 'width 0.5s ease',
                    }} />
                    <div style={{ position: 'absolute', top: -6, bottom: -6, left: `${todayPct}%`, width: 3, background: isOverdue ? '#dc2626' : '#0f172a', borderRadius: 2, zIndex: 2 }} />
                    <div style={{
                      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                      left: `${Math.min(todayPct + 1.5, 78)}%`,
                      fontSize: 11, fontWeight: 700,
                      color: isOverdue ? '#dc2626' : '#0f172a',
                      background: '#fff', padding: '2px 6px', borderRadius: 4,
                      border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`,
                      whiteSpace: 'nowrap', zIndex: 3,
                    }}>
                      Today · {Math.round(todayPct)}%
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px' }}>
                    🚀 Start: <strong style={{ color: '#374151' }}>{protocol.startDate}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: isOverdue ? '#dc2626' : '#64748b', background: isOverdue ? '#fef2f2' : '#f8fafc', border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}`, borderRadius: 6, padding: '4px 10px' }}>
                    🏁 End: <strong style={{ color: isOverdue ? '#dc2626' : '#374151' }}>{protocol.endDate}</strong>
                    {isOverdue && ' ⚠️ Overdue'}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px' }}>
                    📅 Today: <strong style={{ color: '#374151' }}>{today.toISOString().split('T')[0]}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Row 3: Visit Trend Line + Site Participation ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Visit Trend Line Chart */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Visit Trend</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Completed, missed &amp; scheduled visits by date
              </div>
              {visitsLoading ? (
                <div className="loading" style={{ height: 180 }}><div className="spinner" />Loading visits...</div>
              ) : visitTrend.length === 0 ? (
                <EmptyState text="No visit data recorded for this protocol" />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={visitTrend} margin={{ top: 5, right: 20, bottom: 48, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      angle={-25} textAnchor="end"
                      interval="preserveStartEnd"
                      label={{ value: 'Visit Date', position: 'insideBottom', offset: -34, fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      label={{ value: 'No. of Visits', angle: -90, position: 'insideLeft', offset: -4, fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                    <Line type="monotone" dataKey="Completed" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Scheduled" stroke="#1a56db" strokeWidth={2}   dot={{ r: 3, fill: '#1a56db' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Missed"    stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
                    <Line type="monotone" dataKey="Cancelled" stroke="#94a3b8" strokeWidth={2}   dot={{ r: 3, fill: '#94a3b8' }} activeDot={{ r: 5 }} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Site Participation Horizontal Bar */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Site Participation</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Patient distribution across {protocol.siteCount} site{protocol.siteCount !== 1 ? 's' : ''}
              </div>
              {siteData.length === 0 ? (
                <EmptyState text="No site data available" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={siteData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="patients" fill="#1a56db" radius={[0, 6, 6, 0]}
                      label={{ position: 'right', fontSize: 12, fill: '#374151', fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
