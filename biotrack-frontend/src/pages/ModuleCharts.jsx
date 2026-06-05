import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { getPatients } from '../api/patients'
import { getVisits }   from '../api/visits'
import { getSamples }  from '../api/samples'
import { getLabResults } from '../api/labResults'
import { getSites }    from '../api/sites'
import { getNotifications } from '../api/notifications'
import { getProtocols } from '../api/protocols'
import { useAuth } from '../context/AuthContext'

// ── Shared palette ─────────────────────────────────────────────────────────────
const PALETTE = ['#1a56db','#16a34a','#d97706','#ef4444','#7c3aed','#0891b2','#dc2626','#059669','#ea580c','#94a3b8']

const STATUS_COLORS = {
  // Patient enrollment lifecycle
  SCREENING:  '#d97706',  // orange  — consent evaluation
  ENROLLED:   '#16a34a',  // green   — officially enrolled
  ANALYZING:  '#1a56db',  // blue    — active tracking / data collection
  WITHDRAWN:  '#ef4444',  // red     — consent revoked
  CANCELLED:  '#94a3b8',  // grey    — ineligible
  // Visit  (COMPLETED = green, SCHEDULED = blue, MISSED = red, CANCELLED = grey)
  COMPLETED: '#059669', SCHEDULED: '#6366f1', MISSED: '#ef4444',
  // Sample
  COLLECTED: '#0891b2', IN_STORAGE: '#7c3aed', ANALYZED: '#16a34a', DISPOSED: '#64748b',
  // Lab
  PENDING: '#d97706', REJECTED: '#dc2626', REVIEWED: '#7c3aed',
  // Site
  ACTIVE: '#16a34a', INACTIVE: '#94a3b8', SITE: '#0284c7',
  // Shared
  READ: '#16a34a', UNREAD: '#ef4444',
}

// ── Shared utilities ───────────────────────────────────────────────────────────
function groupByField(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function toPieData(counts) {
  return Object.entries(counts)
    .map(([name, value], i) => ({ name, value, color: STATUS_COLORS[name] || PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value)
}

function groupByMonth(items, dateField) {
  const buckets = {}
  items.forEach(item => {
    const raw = item[dateField]
    if (!raw) return
    const d = new Date(raw)
    if (isNaN(d)) return
    const key        = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' })
    const yearShort  = String(d.getFullYear()).slice(2)        // "2025" → "25"
    const label      = `${monthShort} '${yearShort}`          // "Jan '25"
    if (!buckets[key]) buckets[key] = { month: key, label, count: 0 }
    buckets[key].count++
  })
  return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month))
}

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--
  return age
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{subtitle}</div>}
      {children}
    </div>
  )
}

function EmptyState({ text = 'No data available' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 170, color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

function Loading() {
  return <div className="loading" style={{ height: 170 }}><div className="spinner" />Loading...</div>
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 13px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      {label && <div style={{ fontWeight: 700, color: '#374151', marginBottom: 5 }}>{label}</div>}
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

function DonutChart({ data, height = 170 }) {
  if (!data?.length) return <EmptyState />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flexShrink: 0 }}>
        <ResponsiveContainer width={150} height={height}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={66} dataKey="value" strokeWidth={2}>
              {data.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#374151' }}>{d.name}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendLine({ data, color = '#1a56db', height = 180 }) {
  if (!data?.length) return <EmptyState text="Not enough data for trend" />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 16, bottom: 24, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          angle={-20} textAnchor="end" interval="preserveStartEnd"
          label={{ value: 'Month', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color }} activeDot={{ r: 6 }} name="Count" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function HorizBar({ data, dataKey = 'value', color = '#1a56db', height = 180 }) {
  if (!data?.length) return <EmptyState />
  return (
    <ResponsiveContainer width="100%" height={Math.max(height, data.length * 42 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 6, 6, 0]}
          label={{ position: 'right', fontSize: 12, fill: '#374151', fontWeight: 700 }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function SectionHeader({ icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ fontWeight: 800, fontSize: 14, color }}>
        {title} — Visualisation Overview
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT
// ══════════════════════════════════════════════════════════════════════════════
function PatientSection() {
  const [data,      setData]      = useState([])
  const [protocols, setProtocols] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getPatients().catch(() => ({ data: [] })),
      getProtocols().catch(() => ({ data: [] })),
    ]).then(([pRes, prRes]) => {
      setData(Array.isArray(pRes.data) ? pRes.data : [])
      setProtocols(Array.isArray(prRes.data) ? prRes.data : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const statusData = toPieData(groupByField(data, 'enrollmentStatus'))
  const genderData = toPieData(groupByField(data, 'gender'))

  // Age groups
  const ageGroups = { '<18': 0, '18–29': 0, '30–44': 0, '45–59': 0, '60+': 0 }
  data.forEach(p => {
    const age = calcAge(p.dateOfBirth)
    if (age === null) return
    if (age < 18)       ageGroups['<18']++
    else if (age < 30)  ageGroups['18–29']++
    else if (age < 45)  ageGroups['30–44']++
    else if (age < 60)  ageGroups['45–59']++
    else                ageGroups['60+']++
  })
  const ageData = Object.entries(ageGroups)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  // Patients per protocol
  const protocolMap = protocols.reduce((acc, p) => { acc[p.protocolId] = p.title || `Protocol #${p.protocolId}`; return acc }, {})
  const protocolCounts = groupByField(data, 'protocolId')
  const protocolData = Object.entries(protocolCounts)
    .map(([id, value]) => ({ name: protocolMap[id] || `Protocol #${id}`, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader icon="👥" title="Patients" color="#1a56db" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Enrollment Status" subtitle={`${data.length} total patients`}>
          <DonutChart data={statusData} />
        </ChartCard>
        <ChartCard title="Gender Distribution" subtitle="Breakdown by gender">
          <DonutChart data={genderData} />
        </ChartCard>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Age Distribution" subtitle="Patients grouped by age band">
          {ageData.length === 0 ? <EmptyState text="No date of birth data" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ageData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  label={{ value: 'Patients', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Patients">
                  {ageData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Patients per Protocol" subtitle="Distribution across protocols">
          <HorizBar data={protocolData} color="#1a56db" />
        </ChartCard>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VISIT
// ══════════════════════════════════════════════════════════════════════════════
function VisitSection() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVisits().then(r => setData(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  // All four visit statuses always shown (0-values included for completeness)
  const statusCounts = groupByField(data, 'status')
  const allVisitStatuses = ['COMPLETED', 'SCHEDULED', 'MISSED', 'CANCELLED']
  allVisitStatuses.forEach(s => { if (!(s in statusCounts)) statusCounts[s] = 0 })
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  // Try both 'type' and 'visitType' field names
  const typeField = data[0]?.visitType !== undefined ? 'visitType' : 'type'
  const typeData = toPieData(
    data.reduce((acc, v) => {
      const t = v[typeField] || v.type || v.visitType
      if (t) acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
  )
  const trend = groupByMonth(data, 'visitDate')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader icon="📅" title="Visits" color="#7c3aed" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Visit Status Distribution" subtitle={`${data.length} total visits`}>
          <DonutChart data={statusData} />
        </ChartCard>
        <ChartCard title="Visit Type Distribution" subtitle="Breakdown by visit type">
          <DonutChart data={typeData} />
        </ChartCard>
      </div>
      <ChartCard title="Visit Trend Over Time" subtitle="Number of visits recorded per month">
        <TrendLine data={trend} color="#7c3aed" />
      </ChartCard>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE
// ══════════════════════════════════════════════════════════════════════════════
function SampleSection() {
  const [data,      setData]      = useState([])
  const [protocols, setProtocols] = useState([])
  const [patients,  setPatients]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getSamples().catch(() => ({ data: [] })),
      getProtocols().catch(() => ({ data: [] })),
      getPatients().catch(() => ({ data: [] })),
    ]).then(([sRes, prRes, patRes]) => {
      setData(Array.isArray(sRes.data) ? sRes.data : [])
      setProtocols(Array.isArray(prRes.data) ? prRes.data : [])
      setPatients(Array.isArray(patRes.data) ? patRes.data : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const statusData = toPieData(groupByField(data, 'status'))
  const typeData   = toPieData(groupByField(data, 'sampleType'))
  const trend      = groupByMonth(data, 'collectionDate')

  const protocolMap = protocols.reduce((acc, p) => { acc[p.protocolId] = p.title || `Protocol #${p.protocolId}`; return acc }, {})
  const protocolCounts = groupByField(data, 'protocolId')
  const protocolData = Object.entries(protocolCounts)
    .map(([id, value]) => ({ name: protocolMap[id] || `Protocol #${id}`, value }))
    .sort((a, b) => b.value - a.value)

  // Samples per patient — show patient name
  const patientMap = patients.reduce((acc, p) => {
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || `Patient #${p.patientId}`
    acc[p.patientId] = name
    return acc
  }, {})
  const patientCounts = groupByField(data, 'patientId')
  const patientData = Object.entries(patientCounts)
    .map(([id, value]) => ({ name: patientMap[id] || `Patient #${id}`, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader icon="🧪" title="Samples" color="#0891b2" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Sample Status Distribution" subtitle={`${data.length} total samples`}>
          <DonutChart data={statusData} />
        </ChartCard>
        <ChartCard title="Sample Type Distribution" subtitle="Breakdown by sample type">
          <DonutChart data={typeData} />
        </ChartCard>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Collection Trend" subtitle="Samples collected per month">
          <TrendLine data={trend} color="#0891b2" />
        </ChartCard>
        <ChartCard title="Samples per Protocol" subtitle="Distribution across protocols">
          <HorizBar data={protocolData} color="#0891b2" />
        </ChartCard>
      </div>
      <ChartCard title="Samples per Patient" subtitle="Number of samples linked to each patient">
        <HorizBar data={patientData} color="#7c3aed" />
      </ChartCard>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LAB RESULT
// ══════════════════════════════════════════════════════════════════════════════
function LabResultSection() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLabResults().then(r => setData(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const statusData = toPieData(groupByField(data, 'status'))
  const trend      = groupByMonth(data, 'performedDate')

  // Test name bar
  const testCounts = groupByField(data, 'testName')
  const testData = Object.entries(testCounts)
    .map(([name, value]) => ({ name: name === 'Unknown' ? 'Other' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader icon="🔬" title="Lab Results" color="#9333ea" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Result Status Distribution" subtitle={`${data.length} total lab results`}>
          <DonutChart data={statusData} />
        </ChartCard>
        <ChartCard title="Results by Test Name" subtitle="Top tests performed">
          <HorizBar data={testData} color="#9333ea" />
        </ChartCard>
      </div>
      <ChartCard title="Lab Results Trend" subtitle="Results recorded per month">
        <TrendLine data={trend} color="#9333ea" />
      </ChartCard>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SITE
// ══════════════════════════════════════════════════════════════════════════════
function SiteSection() {
  const [sites,    setSites]    = useState([])
  const [patients, setPatients] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      getSites().catch(() => ({ data: [] })),
      getPatients().catch(() => ({ data: [] })),
    ]).then(([sRes, pRes]) => {
      setSites(Array.isArray(sRes.data) ? sRes.data : [])
      setPatients(Array.isArray(pRes.data) ? pRes.data : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  // Site name lookup map
  const siteNameMap = sites.reduce((acc, s) => {
    acc[s.siteId] = s.name || `Site #${s.siteId}`
    return acc
  }, {})

  const statusData   = toPieData(groupByField(sites, 'status'))
  const locationData = toPieData(groupByField(sites, 'location'))

  const protocolsPerSite = sites
    .map(s => ({ name: s.name || `Site #${s.siteId}`, value: s.protocols?.length || 0 }))
    .sort((a, b) => b.value - a.value)

  // Patients per site — grouped from actual patients data
  const patientSiteCounts = patients.reduce((acc, p) => {
    if (p.siteId) {
      const label = siteNameMap[p.siteId] || `Site #${p.siteId}`
      acc[label] = (acc[label] || 0) + 1
    }
    return acc
  }, {})
  const patientsPerSite = Object.entries(patientSiteCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader icon="🏥" title="Sites" color="#0284c7" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Site Status Distribution" subtitle={`${sites.length} total sites`}>
          <DonutChart data={statusData} />
        </ChartCard>
        <ChartCard title="Site Location Distribution" subtitle="Breakdown by location / city">
          <DonutChart data={locationData} />
        </ChartCard>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Protocols per Site" subtitle="Number of protocols registered at each site">
          <HorizBar data={protocolsPerSite} color="#0284c7" />
        </ChartCard>
        <ChartCard title="Patients per Site" subtitle={`Patient distribution across ${sites.length} sites`}>
          {patientsPerSite.length === 0
            ? <EmptyState text="No patients linked to any site yet" />
            : <HorizBar data={patientsPerSite} color="#0369a1" />}
        </ChartCard>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION
// ══════════════════════════════════════════════════════════════════════════════
function NotificationSection() {
  const { user }  = useAuth()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications().then(r => setData(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  // ── actual backend fields: status = READ | UNREAD | ARCHIVED ────────────────
  const readCount     = data.filter(n => n.status === 'READ').length
  const unreadCount   = data.filter(n => n.status === 'UNREAD').length
  const archivedCount = data.filter(n => n.status === 'ARCHIVED').length

  const readData = [
    { name: 'Read',     value: readCount,     color: '#16a34a' },
    { name: 'Unread',   value: unreadCount,   color: '#ef4444' },
    { name: 'Archived', value: archivedCount, color: '#94a3b8' },
  ].filter(d => d.value > 0)

  // ── SENT vs RECEIVED using senderUserId ─────────────────────────────────────
  // If senderUserId matches current user → notification was SENT by them
  // Otherwise (senderUserId null = system, or another user) → RECEIVED
  const currentUserId = user?.userId ? Number(user.userId) : null
  const isSent = (n) => currentUserId !== null && Number(n.senderUserId) === currentUserId

  const sentCount     = data.filter(isSent).length
  const receivedCount = data.length - sentCount
  const dirData = [
    { name: 'Sent',     value: sentCount,     color: '#6366f1' },
    { name: 'Received', value: receivedCount, color: '#16a34a' },
  ].filter(d => d.value > 0)

  const typeData = toPieData(groupByField(data, 'type'))

  // ── Trend split by direction per month ──────────────────────────────────────
  // Backend date field is 'createdDate' (String)
  const pickDate = (n) =>
    n.createdDate || n.createdAt || n.timestamp || n.sentAt ||
    n.notificationDate || n.dateCreated || n.date

  const trendBuckets = {}
  data.forEach(n => {
    const raw = pickDate(n)
    if (!raw) return
    const d = new Date(raw)
    if (isNaN(d)) return
    const key        = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' })
    const yearShort  = String(d.getFullYear()).slice(2)
    const label      = `${monthShort} '${yearShort}`
    if (!trendBuckets[key]) trendBuckets[key] = { month: key, label, Sent: 0, Received: 0 }
    if (isSent(n)) trendBuckets[key].Sent++
    else           trendBuckets[key].Received++
  })
  const trend = Object.values(trendBuckets).sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader icon="🔔" title="Notifications" color="#6366f1" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <ChartCard title="Read vs Unread" subtitle={`${data.length} total`}>
          <DonutChart data={readData} />
        </ChartCard>
        <ChartCard title="Sent vs Received" subtitle="Based on who triggered the notification">
          <DonutChart data={dirData} />
        </ChartCard>
        <ChartCard title="Type Distribution" subtitle="Breakdown by notification type">
          <DonutChart data={typeData} />
        </ChartCard>
      </div>
      <ChartCard title="Notification Trend" subtitle="Sent & received notifications per month">
        {trend.length === 0 ? (
          <EmptyState text="No date information found on notifications" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 28, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                angle={-20} textAnchor="end" interval="preserveStartEnd"
                label={{ value: 'Month', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              <Line type="monotone" dataKey="Received" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Sent"     stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function ModuleCharts({ category }) {
  if (!category || category.key === 'PROTOCOL') return null

  return (
    <div style={{ marginTop: 22 }}>
      {category.key === 'PATIENT'      && <PatientSection />}
      {category.key === 'VISIT'        && <VisitSection />}
      {category.key === 'SAMPLE'       && <SampleSection />}
      {category.key === 'LAB_RESULT'   && <LabResultSection />}
      {category.key === 'SITE'         && <SiteSection />}
      {category.key === 'NOTIFICATION' && <NotificationSection />}
    </div>
  )
}
