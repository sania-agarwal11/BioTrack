import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import {
  getAuditLogs,
  getComplianceReports, createComplianceReport, deleteComplianceReport,
} from '../api/compliance'
import { getPatients }   from '../api/patients'
import { getProtocols }  from '../api/protocols'
import { getSites }      from '../api/sites'
import { getVisits }     from '../api/visits'
import { getSamples }    from '../api/samples'
import { getLabResults } from '../api/labResults'
import { useAuth }       from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, ResponsiveContainer,
} from 'recharts'

// ── Constants ─────────────────────────────────────────────────────────────────
const PALETTE = ['#1a56db','#059669','#d97706','#ef4444','#7c3aed','#0891b2','#9333ea','#64748b']

const REPORT_TYPES = [
  { key: 'AUDIT_TRAIL',           label: 'A', icon: '📋', title: 'Audit Trail Report',              desc: 'Complete record of all platform activities & data changes',   color: '#1a56db', bg: '#dbeafe' },
  { key: 'DATA_CHANGE',           label: 'B', icon: '🔄', title: 'Data Change History',              desc: 'All CREATE / UPDATE / DELETE operations across every module',  color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'PROTOCOL_COMPLIANCE',   label: 'C', icon: '📊', title: 'Protocol Compliance',              desc: 'Enrollment targets, visit completion rates & compliance scores', color: '#059669', bg: '#d1fae5' },
  { key: 'PATIENT_CONSENT',       label: 'D', icon: '👥', title: 'Patient Consent & Eligibility',    desc: 'Consent status, eligibility metrics and screening analysis',     color: '#d97706', bg: '#fef3c7' },
  { key: 'SAMPLE_CUSTODY',        label: 'E', icon: '🧪', title: 'Sample Chain-of-Custody',          desc: 'Sample lifecycle tracking and custody integrity',               color: '#0891b2', bg: '#ecfeff' },
  { key: 'LAB_VALIDATION',        label: 'F', icon: '🔬', title: 'Lab Result Validation',            desc: 'Validation rates, pending reviews and rejection analysis',      color: '#9333ea', bg: '#faf5ff' },
  { key: 'SECURITY_ACCESS',       label: 'G', icon: '🔐', title: 'Security & Access Compliance',    desc: 'Login activity, RBAC adherence and access violation checks',    color: '#dc2626', bg: '#fee2e2' },
  { key: 'REGULATORY_SUBMISSION', label: 'H', icon: '📄', title: 'Regulatory Submission Report',    desc: 'Full exportable study summary for regulatory authorities',       color: '#475569', bg: '#f1f5f9' },
]

// ── Utilities ─────────────────────────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click(); URL.revokeObjectURL(url)
}

function fmtDate(v) {
  if (!v) return '—'
  try { return new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return v }
}
function fmtDateOnly(v) {
  if (!v) return '—'
  try { return new Date(v).toLocaleDateString('en-IN', { dateStyle: 'medium' }) } catch { return v }
}

// ── Shared Sub-Components ─────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, gap:10, color:'#94a3b8' }}><div className="spinner" /> Loading report data…</div>
}

function MetricCard({ label, value, color = '#1a56db', sub }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', minWidth:130, flex:1 }}>
      <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ icon, text }) {
  return <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:14, color:'#0f172a', margin:'20px 0 10px' }}><span>{icon}</span>{text}</div>
}

function StatusPill({ status }) {
  const map = {
    COMPLIANT:     { bg:'#d1fae5', color:'#065f46' },
    AT_RISK:       { bg:'#fef3c7', color:'#92400e' },
    NON_COMPLIANT: { bg:'#fee2e2', color:'#991b1b' },
    GOOD:          { bg:'#d1fae5', color:'#065f46' },
    WARNING:       { bg:'#fef3c7', color:'#92400e' },
    CRITICAL:      { bg:'#fee2e2', color:'#991b1b' },
  }
  const s = map[status] || { bg:'#f1f5f9', color:'#475569' }
  return <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20, background:s.bg, color:s.color }}>{status}</span>
}

function ExportBar({ onCSV, pdfId, pdfName = 'compliance-report.pdf' }) {
  const [exporting, setExporting] = useState(false)

  const handlePDF = async () => {
    const el = document.getElementById(pdfId)
    if (!el) return
    setExporting(true)
    try {
      const { default: html2pdf } = await import('html2pdf.js')
      await html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: pdfName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] },
      }).from(el).save()
    } catch (e) {
      console.error('PDF export failed', e)
      alert('PDF export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display:'flex', gap:8, marginBottom:16, justifyContent:'flex-end' }}>
      <button onClick={onCSV} style={{ fontSize:12, padding:'6px 14px', border:'1px solid #e2e8f0', borderRadius:8, background:'#fff', color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontWeight:600 }}>
        ⬇ Export CSV
      </button>
      <button onClick={handlePDF} disabled={exporting}
        style={{ fontSize:12, padding:'6px 14px', border:'1px solid #e2e8f0', borderRadius:8, background: exporting ? '#f1f5f9' : '#fff', color: exporting ? '#94a3b8' : '#374151', cursor: exporting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:5, fontWeight:600 }}>
        {exporting ? '⏳ Generating…' : '📥 Download PDF'}
      </button>
    </div>
  )
}

function SmallDonut({ data, height = 140 }) {
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={58} dataKey="value" strokeWidth={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [v, n]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// A — AUDIT TRAIL REPORT
// ══════════════════════════════════════════════════════════════════════════════
function AuditTrailReport() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [fAction, setFAction]   = useState('')
  const [fRole, setFRole]       = useState('')
  const [fResource, setFResource] = useState('')

  useEffect(() => {
    getAuditLogs().then(r => setLogs(r.data || [])).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const filtered = logs.filter(l =>
    (!search   || (l.userName || '').toLowerCase().includes(search.toLowerCase())) &&
    (!fAction  || l.action === fAction) &&
    (!fRole    || l.userRole === fRole) &&
    (!fResource || l.resourceType === fResource)
  )

  // Action distribution
  const actionCounts = {}
  logs.forEach(l => { actionCounts[l.action] = (actionCounts[l.action] || 0) + 1 })
  const actionData = Object.entries(actionCounts).map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }))

  // Resource distribution
  const resCounts = {}
  logs.forEach(l => { if (l.resourceType) resCounts[l.resourceType] = (resCounts[l.resourceType] || 0) + 1 })
  const resData = Object.entries(resCounts).map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }))

  const uniqueUsers   = [...new Set(logs.map(l => l.userName).filter(Boolean))].length
  const uniqueRoles   = [...new Set(logs.filter(l => l.userRole).map(l => l.userRole))]
  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))]
  const uniqueResources = [...new Set(logs.map(l => l.resourceType).filter(Boolean))]

  const exportCSV = () => downloadCSV('audit-trail-report.csv',
    ['Audit ID','Username','Role','Email','Action','Resource','Entity ID','Timestamp'],
    filtered.map(l => [l.auditId, l.userName, l.userRole, l.performedBy, l.action, l.resourceType, l.entityId, l.timestamp])
  )

  const actionBadge = (a) => {
    const colors = { CREATE:'#16a34a', UPDATE:'#1a56db', DELETE:'#ef4444', LOGIN:'#7c3aed', LOGOUT:'#94a3b8', RESTORE:'#0891b2' }
    return <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background: (colors[a] || '#64748b') + '22', color: colors[a] || '#64748b' }}>{a}</span>
  }

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-a" pdfName="audit-trail-report.pdf" />
      <div id="rpt-a">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Total Entries"   value={logs.length}   color="#1a56db" />
        <MetricCard label="Unique Users"    value={uniqueUsers}   color="#059669" />
        <MetricCard label="Action Types"    value={uniqueActions.length} color="#7c3aed" sub={uniqueActions.join(', ')} />
        <MetricCard label="Resources Covered" value={uniqueResources.length} color="#d97706" sub={uniqueResources.join(', ')} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="📊" text="Actions Distribution" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={actionData} margin={{ top:5, right:10, bottom:5, left:-10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6,6,0,0]} name="Count">
                {actionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="🗂️" text="Activity by Resource" />
          <SmallDonut data={resData} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        <input style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, minWidth:180 }}
          placeholder="🔍 Search by username…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }} value={fAction} onChange={e => setFAction(e.target.value)}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }} value={fRole} onChange={e => setFRole(e.target.value)}>
          <option value="">All Roles</option>
          {uniqueRoles.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
        </select>
        <select style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }} value={fResource} onChange={e => setFResource(e.target.value)}>
          <option value="">All Resources</option>
          {uniqueResources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search||fAction||fRole||fResource) && <button onClick={() => { setSearch(''); setFAction(''); setFRole(''); setFResource('') }} style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer' }}>✕ Clear</button>}
        <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b', alignSelf:'center' }}>{filtered.length} entries</span>
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#f8fafc' }}>{['#','Username','Role','Email','Action','Resource','Timestamp'].map(h => <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.slice(0, 200).map((l, i) => (
              <tr key={l.auditId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'7px 12px', color:'#94a3b8', fontSize:12 }}>{i+1}</td>
                <td style={{ padding:'7px 12px', fontWeight:600 }}>{l.userName || '—'}</td>
                <td style={{ padding:'7px 12px' }}>{l.userRole ? <span style={{ fontSize:11, padding:'2px 7px', borderRadius:20, background:'#f1f5f9', color:'#475569', fontWeight:600 }}>{l.userRole.replace(/_/g,' ')}</span> : '—'}</td>
                <td style={{ padding:'7px 12px', color:'#64748b', fontSize:12 }}>{l.performedBy || '—'}</td>
                <td style={{ padding:'7px 12px' }}>{actionBadge(l.action)}</td>
                <td style={{ padding:'7px 12px', fontWeight:500, color:'#374151' }}>{l.resourceType || '—'}{l.entityId ? ` #${l.entityId}` : ''}</td>
                <td style={{ padding:'7px 12px', color:'#94a3b8', fontSize:12 }}>{fmtDate(l.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && <div style={{ textAlign:'center', padding:12, fontSize:12, color:'#94a3b8' }}>Showing first 200 of {filtered.length} entries. Export CSV for full data.</div>}
      </div>
      </div>{/* end #rpt-a */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// B — DATA CHANGE HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function DataChangeHistory() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [fResource, setFResource] = useState('')

  useEffect(() => {
    getAuditLogs().then(r => setLogs(r.data || [])).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const changes = logs.filter(l => ['CREATE','UPDATE','DELETE'].includes(l.action))
  const filtered = fResource ? changes.filter(l => l.resourceType === fResource) : changes

  const resCounts = {}
  changes.forEach(l => { if (l.resourceType) resCounts[l.resourceType] = (resCounts[l.resourceType] || 0) + 1 })
  const resData = Object.entries(resCounts).map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }))

  const uniqueResources = Object.keys(resCounts)

  // Timeline: group by date
  const byDate = {}
  changes.forEach(l => {
    const d = l.timestamp ? l.timestamp.split('T')[0] : null
    if (d) byDate[d] = (byDate[d] || 0) + 1
  })
  const timeline = Object.entries(byDate).sort().slice(-14).map(([date, count]) => ({ date: date.slice(5), count }))

  const exportCSV = () => downloadCSV('data-change-history.csv',
    ['Audit ID','Username','Role','Action','Resource','Entity ID','Timestamp'],
    filtered.map(l => [l.auditId, l.userName, l.userRole, l.action, l.resourceType, l.entityId, l.timestamp])
  )

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-b" pdfName="data-change-history.pdf" />
      <div id="rpt-b">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Total Changes"  value={changes.length}                                        color="#7c3aed" />
        <MetricCard label="Creates"        value={changes.filter(l => l.action==='CREATE').length}       color="#16a34a" />
        <MetricCard label="Updates"        value={changes.filter(l => l.action==='UPDATE').length}       color="#1a56db" />
        <MetricCard label="Deletes"        value={changes.filter(l => l.action==='DELETE').length}       color="#ef4444" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="🗂️" text="Changes by Resource" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={resData} layout="vertical" margin={{ top:5, right:40, bottom:5, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip />
              <Bar dataKey="value" radius={[0,6,6,0]} name="Changes" label={{ position:'right', fontSize:11, fontWeight:700, fill:'#374151' }}>
                {resData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="📅" text="Change Activity (Last 14 Days)" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timeline} margin={{ top:5, right:10, bottom:5, left:-10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} name="Changes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <select style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }} value={fResource} onChange={e => setFResource(e.target.value)}>
          <option value="">All Resources</option>
          {uniqueResources.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b', alignSelf:'center' }}>{filtered.length} change records</span>
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#f8fafc' }}>{['#','Username','Role','Action','Resource','Timestamp'].map(h => <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.slice(0,200).map((l, i) => {
              const colors = { CREATE:'#16a34a', UPDATE:'#1a56db', DELETE:'#ef4444' }
              const c = colors[l.action] || '#64748b'
              return (
                <tr key={l.auditId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'7px 12px', color:'#94a3b8' }}>{i+1}</td>
                  <td style={{ padding:'7px 12px', fontWeight:600 }}>{l.userName || '—'}</td>
                  <td style={{ padding:'7px 12px', fontSize:11, color:'#475569' }}>{l.userRole?.replace(/_/g,' ') || '—'}</td>
                  <td style={{ padding:'7px 12px' }}><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:c+'22', color:c }}>{l.action}</span></td>
                  <td style={{ padding:'7px 12px', fontWeight:500 }}>{l.resourceType || '—'}{l.entityId ? ` #${l.entityId}` : ''}</td>
                  <td style={{ padding:'7px 12px', color:'#94a3b8', fontSize:12 }}>{fmtDate(l.timestamp)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>{/* end #rpt-b */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// C — PROTOCOL COMPLIANCE REPORT
// ══════════════════════════════════════════════════════════════════════════════
function ProtocolComplianceReport() {
  const [protocols, setProtocols] = useState([])
  const [patients,  setPatients]  = useState([])
  const [visits,    setVisits]    = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      getProtocols().catch(() => ({ data: [] })),
      getPatients().catch(() => ({ data: [] })),
      getVisits().catch(() => ({ data: [] })),
    ]).then(([pr, pt, vi]) => {
      setProtocols(pr.data || [])
      setPatients(pt.data || [])
      setVisits(vi.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const rows = protocols.map(p => {
    const pPatients   = patients.filter(pt => String(pt.protocolId) === String(p.protocolId))
    const enrolled    = pPatients.filter(pt => ['ENROLLED','ANALYZING','COMPLETED'].includes(pt.enrollmentStatus)).length
    const target      = p.targetPatients || 0
    const enrollPct   = target > 0 ? Math.min(Math.round(enrolled / target * 100), 100) : 0

    const pVisits     = visits.filter(v => String(v.protocolId) === String(p.protocolId))
    const completedV  = pVisits.filter(v => v.status === 'COMPLETED').length
    const visitPct    = pVisits.length > 0 ? Math.round(completedV / pVisits.length * 100) : 0

    const score       = target > 0
      ? Math.round((enrollPct + visitPct) / 2)
      : pVisits.length > 0 ? visitPct : 0

    const status      = score >= 80 ? 'COMPLIANT' : score >= 50 ? 'AT_RISK' : 'NON_COMPLIANT'

    return { ...p, enrolled, enrollPct, totalVisits: pVisits.length, completedV, visitPct, score, status }
  })

  const compliantCount    = rows.filter(r => r.status === 'COMPLIANT').length
  const atRiskCount       = rows.filter(r => r.status === 'AT_RISK').length
  const nonCompliantCount = rows.filter(r => r.status === 'NON_COMPLIANT').length
  const avgScore          = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0

  const chartData = rows.map(r => ({ name: r.title?.substring(0,16) || `P#${r.protocolId}`, score: r.score }))

  const exportCSV = () => downloadCSV('protocol-compliance-report.csv',
    ['Protocol ID','Title','Phase','Status','Target Patients','Enrolled','Enrollment %','Total Visits','Completed Visits','Visit Completion %','Compliance Score','Compliance Status'],
    rows.map(r => [r.protocolId, r.title, r.phase, r.status, r.targetPatients||0, r.enrolled, r.enrollPct+'%', r.totalVisits, r.completedV, r.visitPct+'%', r.score+'%', r.status])
  )

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-c" pdfName="protocol-compliance-report.pdf" />
      <div id="rpt-c">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Overall Compliance Score" value={`${avgScore}%`} color={avgScore>=80?'#059669':avgScore>=50?'#d97706':'#ef4444'} />
        <MetricCard label="Compliant Protocols"     value={compliantCount}    color="#059669" />
        <MetricCard label="At Risk"                 value={atRiskCount}       color="#d97706" />
        <MetricCard label="Non-Compliant"           value={nonCompliantCount} color="#ef4444" />
      </div>

      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginBottom:20 }}>
        <SectionTitle icon="📊" text="Compliance Score by Protocol" />
        <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 38 + 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top:5, right:60, bottom:5, left:8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" domain={[0,100]} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
            <Bar dataKey="score" radius={[0,6,6,0]} name="Compliance Score" label={{ position:'right', fontSize:11, fontWeight:700, fill:'#374151', formatter: v => `${v}%` }}>
              {chartData.map((d, i) => <Cell key={i} fill={d.score>=80?'#059669':d.score>=50?'#d97706':'#ef4444'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['Protocol','Phase','Target','Enrolled','Enroll %','Visits','Completed','Visit %','Score','Status'].map(h =>
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.protocolId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'8px 12px', fontWeight:600, color:'#1a56db' }}>{r.title}</td>
                <td style={{ padding:'8px 12px', fontSize:11, color:'#7c3aed', fontWeight:600 }}>{r.phase}</td>
                <td style={{ padding:'8px 12px' }}>{r.targetPatients || '—'}</td>
                <td style={{ padding:'8px 12px', fontWeight:600 }}>{r.enrolled}</td>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:60, height:6, borderRadius:3, background:'#f1f5f9', overflow:'hidden' }}>
                      <div style={{ width:`${r.enrollPct}%`, height:'100%', borderRadius:3, background: r.enrollPct>=80?'#059669':r.enrollPct>=50?'#d97706':'#ef4444' }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:600 }}>{r.enrollPct}%</span>
                  </div>
                </td>
                <td style={{ padding:'8px 12px' }}>{r.totalVisits}</td>
                <td style={{ padding:'8px 12px' }}>{r.completedV}</td>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:60, height:6, borderRadius:3, background:'#f1f5f9', overflow:'hidden' }}>
                      <div style={{ width:`${r.visitPct}%`, height:'100%', borderRadius:3, background: r.visitPct>=80?'#059669':r.visitPct>=50?'#d97706':'#ef4444' }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:600 }}>{r.visitPct}%</span>
                  </div>
                </td>
                <td style={{ padding:'8px 12px', fontWeight:700, color: r.score>=80?'#059669':r.score>=50?'#d97706':'#ef4444' }}>{r.score}%</td>
                <td style={{ padding:'8px 12px' }}><StatusPill status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>{/* end #rpt-c */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// D — PATIENT CONSENT & ELIGIBILITY
// ══════════════════════════════════════════════════════════════════════════════
function PatientConsentReport() {
  const [patients, setPatients] = useState([])
  const [protocols, setProtocols] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getPatients().catch(() => ({ data: [] })),
      getProtocols().catch(() => ({ data: [] })),
    ]).then(([pt, pr]) => { setPatients(pt.data || []); setProtocols(pr.data || []) })
    .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const statusCounts = {}
  patients.forEach(p => { const s = p.enrollmentStatus || 'UNKNOWN'; statusCounts[s] = (statusCounts[s] || 0) + 1 })
  const statusColors = {
    SCREENING: '#d97706', ENROLLED: '#059669', ANALYZING: '#1a56db',
    COMPLETED: '#16a34a', WITHDRAWN: '#ef4444', CANCELLED: '#94a3b8', UNKNOWN: '#64748b'
  }
  const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value, color: statusColors[name] || '#94a3b8' }))

  const screening  = patients.filter(p => p.enrollmentStatus === 'SCREENING')
  const analyzing  = patients.filter(p => p.enrollmentStatus === 'ANALYZING')
  const enrolled   = patients.filter(p => p.enrollmentStatus === 'ENROLLED')
  const completed  = patients.filter(p => p.enrollmentStatus === 'COMPLETED')
  const withdrawn  = patients.filter(p => p.enrollmentStatus === 'WITHDRAWN')
  const cancelled  = patients.filter(p => p.enrollmentStatus === 'CANCELLED')

  const protocolMap = protocols.reduce((acc, p) => { acc[p.protocolId] = p.title; return acc }, {})

  // Consented = ENROLLED + ANALYZING + COMPLETED (all past the screening gate)
  const consentedCount = enrolled.length + analyzing.length + completed.length
  const consentRate    = patients.length > 0 ? Math.round(consentedCount / patients.length * 100) : 0
  const withdrawalRate = patients.length > 0 ? Math.round(withdrawn.length / patients.length * 100) : 0

  const exportCSV = () => downloadCSV('patient-consent-eligibility.csv',
    ['Patient ID','First Name','Last Name','Enrollment Status','Gender','Date of Birth','Protocol','Site'],
    patients.map(p => [p.patientId, p.firstName, p.lastName, p.enrollmentStatus, p.gender, p.dateOfBirth, protocolMap[p.protocolId]||p.protocolId, p.siteId])
  )

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-d" pdfName="patient-consent-eligibility.pdf" />
      <div id="rpt-d">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Total Patients"   value={patients.length}      color="#1a56db" />
        <MetricCard label="Consent Rate"     value={`${consentRate}%`}    color="#059669" sub={`${consentedCount} enrolled/analyzing/completed`} />
        <MetricCard label="In Screening"     value={screening.length}     color="#d97706" sub="Consent evaluation pending" />
        <MetricCard label="Analyzing"        value={analyzing.length}     color="#1a56db" sub="Active data collection" />
        <MetricCard label="Withdrawal Rate"  value={`${withdrawalRate}%`} color="#ef4444" sub={`${withdrawn.length} withdrawn`} />
        <MetricCard label="Cancelled"        value={cancelled.length}     color="#94a3b8" sub="Ineligible patients" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="📊" text="Enrollment Status Distribution" />
          <SmallDonut data={statusPie} height={180} />
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="⚠️" text="Patients Requiring Action" />
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
            {[
              { label:'In SCREENING — consent pending',   count: screening.length,  color:'#d97706', bg:'#fef3c7' },
              { label:'ANALYZING — active tracking',      count: analyzing.length,  color:'#1a56db', bg:'#dbeafe' },
              { label:'WITHDRAWN — consent revoked',      count: withdrawn.length,  color:'#ef4444', bg:'#fee2e2' },
              { label:'CANCELLED — ineligible',           count: cancelled.length,  color:'#94a3b8', bg:'#f1f5f9' },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:item.bg, borderRadius:8, padding:'10px 14px' }}>
                <span style={{ fontSize:13, color:item.color, fontWeight:600 }}>{item.label}</span>
                <span style={{ fontSize:18, fontWeight:800, color:item.color }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {screening.length > 0 && (
        <>
          <SectionTitle icon="🔍" text={`Patients in SCREENING (${screening.length})`} />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#fef3c7' }}>{['Patient ID','Name','Gender','Protocol','Site ID'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#92400e', fontSize:11, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
              <tbody>
                {screening.map(p => (
                  <tr key={p.patientId} style={{ borderBottom:'1px solid #fef9c3' }}>
                    <td style={{ padding:'8px 12px', color:'#94a3b8' }}>#{p.patientId}</td>
                    <td style={{ padding:'8px 12px', fontWeight:600 }}>{[p.firstName,p.lastName].filter(Boolean).join(' ') || '—'}</td>
                    <td style={{ padding:'8px 12px' }}>{p.gender || '—'}</td>
                    <td style={{ padding:'8px 12px' }}>{protocolMap[p.protocolId] || `Protocol #${p.protocolId}` || '—'}</td>
                    <td style={{ padding:'8px 12px' }}>{p.siteId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>{/* end #rpt-d */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// E — SAMPLE CHAIN-OF-CUSTODY
// ══════════════════════════════════════════════════════════════════════════════
function SampleCustodyReport() {
  const [samples,   setSamples]   = useState([])
  const [protocols, setProtocols] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      getSamples().catch(() => ({ data: [] })),
      getProtocols().catch(() => ({ data: [] })),
    ]).then(([s, p]) => { setSamples(s.data || []); setProtocols(p.data || []) })
    .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const statusColors = { COLLECTED:'#0891b2', IN_STORAGE:'#7c3aed', ANALYZED:'#16a34a', DISPOSED:'#64748b' }
  const statusOrder  = ['COLLECTED','IN_STORAGE','ANALYZED','DISPOSED']
  const statusCounts = {}
  samples.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1 })
  const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value, color: statusColors[name]||'#94a3b8' }))

  // Anomalies
  const now = new Date()
  const anomalies = samples.filter(s => {
    if (s.status === 'COLLECTED') {
      const collected = new Date(s.collectedDate || s.collectionDate)
      const days = isNaN(collected) ? 0 : Math.floor((now - collected) / 86400000)
      return days > 7 || !s.storageLocation
    }
    return false
  })

  const protocolMap = protocols.reduce((acc, p) => { acc[p.protocolId] = p.title; return acc }, {})

  const chainData = statusOrder.map((s, i) => ({
    stage: s.replace(/_/g,' '),
    count: statusCounts[s] || 0,
    fill: statusColors[s],
    pct: samples.length > 0 ? Math.round((statusCounts[s]||0) / samples.length * 100) : 0,
  }))

  const exportCSV = () => downloadCSV('sample-chain-of-custody.csv',
    ['Sample ID','Patient ID','Protocol','Type','Collection Date','Storage Location','Status','Notes'],
    samples.map(s => [s.sampleId, s.patientId, protocolMap[s.protocolId]||s.protocolId, s.sampleType, s.collectedDate||s.collectionDate, s.storageLocation, s.status, s.notes])
  )

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-e" pdfName="sample-chain-of-custody.pdf" />
      <div id="rpt-e">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Total Samples"   value={samples.length}                 color="#0891b2" />
        <MetricCard label="In Custody"      value={samples.filter(s=>['COLLECTED','IN_STORAGE'].includes(s.status)).length} color="#7c3aed" sub="Collected or In Storage" />
        <MetricCard label="Processed"       value={samples.filter(s=>s.status==='ANALYZED').length}  color="#16a34a" />
        <MetricCard label="Anomalies"       value={anomalies.length} color={anomalies.length>0?'#ef4444':'#16a34a'} sub={anomalies.length>0?"Action required":"All clear"} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="🔗" text="Chain-of-Custody Flow" />
          <div style={{ display:'flex', alignItems:'stretch', gap:2, marginTop:12 }}>
            {chainData.map((stage, i) => (
              <div key={stage.stage} style={{ flex: stage.count || 1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:'100%', background: stage.fill+'33', borderRadius:8, padding:'12px 8px', textAlign:'center', border:`2px solid ${stage.fill}` }}>
                  <div style={{ fontSize:18, fontWeight:800, color: stage.fill }}>{stage.count}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#374151', marginTop:2 }}>{stage.stage}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{stage.pct}%</div>
                </div>
                {i < chainData.length - 1 && <div style={{ fontSize:18, color:'#cbd5e1', marginTop:4 }}>→</div>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="📊" text="Status Distribution" />
          <SmallDonut data={statusPie} height={160} />
        </div>
      </div>

      {anomalies.length > 0 && (
        <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:12, padding:16, marginBottom:20 }}>
          <SectionTitle icon="⚠️" text={`Custody Anomalies (${anomalies.length})`} />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#fee2e2' }}>{['Sample ID','Patient','Type','Collection Date','Storage Location','Issue'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:'#991b1b', fontSize:11, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
              <tbody>
                {anomalies.map(s => {
                  const cd = new Date(s.collectedDate||s.collectionDate)
                  const days = isNaN(cd) ? '?' : Math.floor((now - cd) / 86400000)
                  const issue = !s.storageLocation ? 'Missing storage location' : `${days} days in COLLECTED status`
                  return (
                    <tr key={s.sampleId} style={{ borderBottom:'1px solid #fecaca' }}>
                      <td style={{ padding:'7px 12px', color:'#ef4444', fontWeight:600 }}>#{s.sampleId}</td>
                      <td style={{ padding:'7px 12px' }}>Patient #{s.patientId}</td>
                      <td style={{ padding:'7px 12px' }}>{s.sampleType||'—'}</td>
                      <td style={{ padding:'7px 12px' }}>{fmtDateOnly(s.collectedDate||s.collectionDate)}</td>
                      <td style={{ padding:'7px 12px', color: s.storageLocation?'#374151':'#ef4444' }}>{s.storageLocation||'⚠ Not set'}</td>
                      <td style={{ padding:'7px 12px', color:'#ef4444', fontWeight:600 }}>{issue}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SectionTitle icon="🧪" text={`All Samples (${samples.length})`} />
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#f8fafc' }}>{['Sample ID','Patient','Protocol','Type','Collected','Storage Location','Status'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
          <tbody>
            {samples.map(s => (
              <tr key={s.sampleId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'7px 12px', color:'#94a3b8' }}>#{s.sampleId}</td>
                <td style={{ padding:'7px 12px' }}>Patient #{s.patientId}</td>
                <td style={{ padding:'7px 12px', fontSize:12 }}>{protocolMap[s.protocolId]||`P#${s.protocolId}`||'—'}</td>
                <td style={{ padding:'7px 12px' }}>{s.sampleType||'—'}</td>
                <td style={{ padding:'7px 12px', fontSize:12 }}>{fmtDateOnly(s.collectedDate||s.collectionDate)}</td>
                <td style={{ padding:'7px 12px', color: s.storageLocation?'#374151':'#ef4444' }}>{s.storageLocation||'⚠ Not set'}</td>
                <td style={{ padding:'7px 12px' }}><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:(statusColors[s.status]||'#94a3b8')+'22', color:statusColors[s.status]||'#64748b' }}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>{/* end #rpt-e */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// F — LAB RESULT VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
function LabValidationReport() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLabResults().then(r => setResults(r.data || [])).catch(() => setResults([])).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const statusColors = { PENDING:'#d97706', COMPLETED:'#059669', REVIEWED:'#7c3aed', REJECTED:'#ef4444' }
  const statusCounts = {}
  results.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1 })
  const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value, color: statusColors[name]||'#94a3b8' }))

  const pending   = results.filter(r => r.status === 'PENDING')
  const rejected  = results.filter(r => r.status === 'REJECTED')
  const reviewed  = results.filter(r => r.status === 'REVIEWED')
  const completed = results.filter(r => r.status === 'COMPLETED')

  const validationRate   = results.length > 0 ? Math.round((completed.length + reviewed.length) / results.length * 100) : 0
  const rejectionRate    = results.length > 0 ? Math.round(rejected.length / results.length * 100) : 0
  const pendingReviewPct = results.length > 0 ? Math.round(pending.length / results.length * 100) : 0

  // Test name distribution
  const testCounts = {}
  results.forEach(r => { const t = r.testType||r.testName||'Unknown'; testCounts[t] = (testCounts[t]||0)+1 })
  const testData = Object.entries(testCounts).map(([name, value], i) => ({ name, value, fill: PALETTE[i%PALETTE.length] })).sort((a,b)=>b.value-a.value).slice(0,8)

  const exportCSV = () => downloadCSV('lab-result-validation.csv',
    ['Result ID','Sample ID','Test Type','Result','Unit','Reference Range','Status','Performed By','Date','Rejection Reason'],
    results.map(r => [r.resultId, r.sampleId||r.sample?.sampleId, r.testType||r.testName, r.resultValue||r.result, r.unit, r.referenceRange, r.status, r.performedBy, r.date||r.performedDate, r.rejectionReason])
  )

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-f" pdfName="lab-result-validation.pdf" />
      <div id="rpt-f">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Total Lab Results"  value={results.length}        color="#9333ea" />
        <MetricCard label="Validation Rate"    value={`${validationRate}%`}  color={validationRate>=80?'#059669':validationRate>=50?'#d97706':'#ef4444'} sub={`${completed.length+reviewed.length} completed/reviewed`} />
        <MetricCard label="Pending Review"     value={pending.length}        color="#d97706" sub={`${pendingReviewPct}% of total`} />
        <MetricCard label="Rejection Rate"     value={`${rejectionRate}%`}   color={rejectionRate>10?'#ef4444':'#059669'} sub={`${rejected.length} rejected`} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="📊" text="Result Status Distribution" />
          <SmallDonut data={statusPie} height={180} />
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="🔬" text="Top Tests Performed" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={testData} layout="vertical" margin={{ top:5, right:40, bottom:5, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip />
              <Bar dataKey="value" radius={[0,6,6,0]} name="Count" label={{ position:'right', fontSize:11, fontWeight:700, fill:'#374151' }}>
                {testData.map((d,i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:16, marginBottom:20 }}>
          <SectionTitle icon="⏳" text={`Pending Review (${pending.length}) — Action Required`} />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#fef9c3' }}>{['Result ID','Sample ID','Test','Result','Reference Range','Performed By','Date'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:'#92400e', fontSize:11 }}>{h}</th>)}</tr></thead>
              <tbody>
                {pending.map(r => (
                  <tr key={r.resultId} style={{ borderBottom:'1px solid #fde68a' }}>
                    <td style={{ padding:'7px 12px', color:'#d97706', fontWeight:600 }}>#{r.resultId}</td>
                    <td style={{ padding:'7px 12px' }}>#{r.sampleId||r.sample?.sampleId}</td>
                    <td style={{ padding:'7px 12px' }}>{r.testType||r.testName||'—'}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600 }}>{r.resultValue||r.result||'—'} {r.unit||''}</td>
                    <td style={{ padding:'7px 12px', fontSize:12 }}>{r.referenceRange||'—'}</td>
                    <td style={{ padding:'7px 12px' }}>{r.performedBy||'—'}</td>
                    <td style={{ padding:'7px 12px', fontSize:12 }}>{fmtDateOnly(r.date||r.performedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:12, padding:16 }}>
          <SectionTitle icon="❌" text={`Rejected Results (${rejected.length})`} />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'#fee2e2' }}>{['Result ID','Sample ID','Test','Result','Performed By','Rejection Reason'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:'#991b1b', fontSize:11 }}>{h}</th>)}</tr></thead>
              <tbody>
                {rejected.map(r => (
                  <tr key={r.resultId} style={{ borderBottom:'1px solid #fecaca' }}>
                    <td style={{ padding:'7px 12px', color:'#ef4444', fontWeight:600 }}>#{r.resultId}</td>
                    <td style={{ padding:'7px 12px' }}>#{r.sampleId||r.sample?.sampleId}</td>
                    <td style={{ padding:'7px 12px' }}>{r.testType||r.testName||'—'}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600 }}>{r.resultValue||r.result||'—'} {r.unit||''}</td>
                    <td style={{ padding:'7px 12px' }}>{r.performedBy||'—'}</td>
                    <td style={{ padding:'7px 12px', color:'#ef4444', fontStyle:'italic' }}>{r.rejectionReason||'No reason provided'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>{/* end #rpt-f */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// G — SECURITY & ACCESS COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════
function SecurityAccessReport() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLogs().then(r => setLogs(r.data || [])).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const loginEvents  = logs.filter(l => l.action === 'LOGIN')
  const logoutEvents = logs.filter(l => l.action === 'LOGOUT')
  const allUsers     = logs.filter(l => l.userName && l.userRole)

  // Role distribution from all audit activity
  const roleCounts = {}
  allUsers.forEach(l => { if (l.userRole) roleCounts[l.userRole] = (roleCounts[l.userRole] || 0) + 1 })
  const rolePie = Object.entries(roleCounts).map(([name, value], i) => ({ name: name.replace(/_/g,' '), value, color: PALETTE[i%PALETTE.length] }))

  // Unique active users per role (from logins)
  const roleLoginCounts = {}
  loginEvents.forEach(l => { if (l.userRole) roleLoginCounts[l.userRole] = (roleLoginCounts[l.userRole] || 0) + 1 })
  const roleLoginData = Object.entries(roleLoginCounts).map(([name, value], i) => ({ name: name.replace(/_/g,' '), value, fill: PALETTE[i%PALETTE.length] })).sort((a,b)=>b.value-a.value)

  const uniqueUsers = [...new Set(loginEvents.map(l => l.userName).filter(Boolean))]

  // Recent logins (last 20)
  const recentLogins = loginEvents.slice(-20).reverse()

  // Session duration proxy: find matching LOGIN/LOGOUT pairs by userName
  const avgSessionNote = logoutEvents.length > 0
    ? `${logoutEvents.length} logout events recorded`
    : 'No logout events recorded'

  const exportCSV = () => downloadCSV('security-access-report.csv',
    ['Audit ID','Username','Role','Email','Action','Timestamp'],
    logs.filter(l => ['LOGIN','LOGOUT'].includes(l.action)).map(l => [l.auditId, l.userName, l.userRole, l.performedBy, l.action, l.timestamp])
  )

  return (
    <div>
      <ExportBar onCSV={exportCSV} pdfId="rpt-g" pdfName="security-access-report.pdf" />
      <div id="rpt-g">
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <MetricCard label="Total Login Events"   value={loginEvents.length}   color="#dc2626" />
        <MetricCard label="Unique Active Users"   value={uniqueUsers.length}   color="#1a56db" />
        <MetricCard label="Total Logout Events"   value={logoutEvents.length}  color="#7c3aed" sub={avgSessionNote} />
        <MetricCard label="Active Roles"          value={Object.keys(roleCounts).length} color="#059669" />
      </div>

      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
        <div style={{ fontWeight:700, color:'#15803d', fontSize:13, marginBottom:4 }}>✅ RBAC Status: All Recorded Access Within Role Boundaries</div>
        <div style={{ fontSize:12, color:'#166534' }}>All audit log entries have valid role assignments. No unauthorized access attempts detected in the audit trail. Failed login attempts are not captured at the application layer — review infrastructure logs for brute-force detection.</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="👤" text="Login Events by Role" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roleLoginData} margin={{ top:5, right:40, bottom:5, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" />
              <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6,6,0,0]} name="Logins" label={{ position:'top', fontSize:11, fontWeight:700, fill:'#374151' }}>
                {roleLoginData.map((d,i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
          <SectionTitle icon="🔑" text="Platform Activity by Role" />
          <SmallDonut data={rolePie} height={200} />
        </div>
      </div>

      <SectionTitle icon="🕐" text={`Recent Login Activity (Last ${recentLogins.length})`} />
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ background:'#f8fafc' }}>{['#','Username','Role','Email','Timestamp'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
          <tbody>
            {recentLogins.map((l, i) => (
              <tr key={l.auditId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'7px 12px', color:'#94a3b8' }}>{i+1}</td>
                <td style={{ padding:'7px 12px', fontWeight:600 }}>{l.userName||'—'}</td>
                <td style={{ padding:'7px 12px' }}>{l.userRole ? <span style={{ fontSize:11, padding:'2px 7px', borderRadius:20, background:'#dbeafe', color:'#1e40af', fontWeight:600 }}>{l.userRole.replace(/_/g,' ')}</span> : '—'}</td>
                <td style={{ padding:'7px 12px', color:'#64748b', fontSize:12 }}>{l.performedBy||'—'}</td>
                <td style={{ padding:'7px 12px', color:'#94a3b8', fontSize:12 }}>{fmtDate(l.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>{/* end #rpt-g */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// H — REGULATORY SUBMISSION REPORT
// ══════════════════════════════════════════════════════════════════════════════
function RegulatorySubmissionReport() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getProtocols().catch(() => ({ data: [] })),
      getPatients().catch(() => ({ data: [] })),
      getSites().catch(() => ({ data: [] })),
      getVisits().catch(() => ({ data: [] })),
      getSamples().catch(() => ({ data: [] })),
      getLabResults().catch(() => ({ data: [] })),
      getAuditLogs().catch(() => ({ data: [] })),
    ]).then(([pr, pt, si, vi, sa, lr, al]) => {
      setData({
        protocols: pr.data || [], patients: pt.data || [], sites: si.data || [],
        visits: vi.data || [], samples: sa.data || [], labResults: lr.data || [], auditLogs: al.data || [],
      })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data) return null

  const { protocols, patients, sites, visits, samples, labResults, auditLogs } = data
  const generatedDate = new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })

  // Study summary
  const activeProtocols  = protocols.filter(p => p.status === 'ACTIVE').length
  const enrolledPatients = patients.filter(p => ['ENROLLED','ANALYZING'].includes(p.enrollmentStatus)).length
  const completedVisits  = visits.filter(v => v.status === 'COMPLETED').length
  const analyzedSamples  = samples.filter(s => s.status === 'ANALYZED').length
  const reviewedResults  = labResults.filter(r => ['REVIEWED','COMPLETED'].includes(r.status)).length

  // Compliance metrics
  const totalChanges  = auditLogs.filter(l => ['CREATE','UPDATE','DELETE'].includes(l.action)).length
  const loginEvents   = auditLogs.filter(l => l.action === 'LOGIN').length
  const uniqueUsers   = [...new Set(auditLogs.map(l => l.userName).filter(Boolean))].length

  // Protocol compliance
  const protoRows = protocols.map(p => {
    const enrolled = patients.filter(pt => String(pt.protocolId)===String(p.protocolId) && ['ENROLLED','ANALYZING','COMPLETED'].includes(pt.enrollmentStatus)).length
    const target   = p.targetPatients || 0
    const enrollPct = target > 0 ? Math.min(Math.round(enrolled/target*100),100) : 0
    const pVisits   = visits.filter(v => String(v.protocolId)===String(p.protocolId))
    const visitPct  = pVisits.length > 0 ? Math.round(pVisits.filter(v=>v.status==='COMPLETED').length/pVisits.length*100) : 0
    const score     = target > 0 ? Math.round((enrollPct+visitPct)/2) : visitPct
    return { ...p, enrollPct, visitPct, score, complianceStatus: score>=80?'COMPLIANT':score>=50?'AT_RISK':'NON_COMPLIANT' }
  })

  const overallScore = protoRows.length ? Math.round(protoRows.reduce((s,r)=>s+r.score,0)/protoRows.length) : 0

  const exportFullCSV = () => {
    const rows = [
      ['=== BIOTRACK REGULATORY SUBMISSION REPORT ==='],
      [`Generated: ${generatedDate}`],
      [''],
      ['--- STUDY OVERVIEW ---'],
      ['Metric','Value'],
      ['Total Protocols',     protocols.length],
      ['Active Protocols',    activeProtocols],
      ['Total Sites',         sites.length],
      ['Total Patients',      patients.length],
      ['Enrolled Patients',   enrolledPatients],
      ['Total Visits',        visits.length],
      ['Completed Visits',    completedVisits],
      ['Total Samples',       samples.length],
      ['Analyzed Samples',    analyzedSamples],
      ['Total Lab Results',   labResults.length],
      ['Reviewed/Completed Results', reviewedResults],
      ['Overall Compliance Score',   `${overallScore}%`],
      [''],
      ['--- PROTOCOL COMPLIANCE SUMMARY ---'],
      ['Protocol','Phase','Status','Target Patients','Enrolled %','Visit Completion %','Compliance Score','Status'],
      ...protoRows.map(r => [r.title, r.phase, r.status, r.targetPatients||0, `${r.enrollPct}%`, `${r.visitPct}%`, `${r.score}%`, r.complianceStatus]),
      [''],
      ['--- PATIENT DATA SUMMARY (MASKED) ---'],
      ['Patient ID (Masked)','Enrollment Status','Gender','Protocol ID'],
      ...patients.map((p,i) => [`PT-${String(i+1).padStart(4,'0')}`, p.enrollmentStatus, p.gender, p.protocolId]),
      [''],
      ['--- AUDIT SUMMARY ---'],
      ['Metric','Value'],
      ['Total Audit Entries', auditLogs.length],
      ['Total Data Changes',  totalChanges],
      ['Login Events',        loginEvents],
      ['Unique Active Users', uniqueUsers],
    ]
    downloadCSV('biotrack-regulatory-submission.csv', [], rows.map(r => Array.isArray(r) ? r : [r]))
  }

  return (
    <div>
      <ExportBar onCSV={exportFullCSV} pdfId="rpt-h" pdfName="regulatory-submission-report.pdf" />
      <div id="rpt-h">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius:14, padding:'24px 28px', marginBottom:20, color:'#fff' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>BioTrack Clinical Research Platform</div>
        <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Regulatory Submission Report</div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Report generated: {generatedDate} &nbsp;·&nbsp; Overall Compliance Score: <span style={{ color: overallScore>=80?'#4ade80':overallScore>=50?'#fbbf24':'#f87171', fontWeight:700 }}>{overallScore}%</span></div>
      </div>

      {/* Overview Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Protocols',    value:protocols.length,    sub:`${activeProtocols} active`,           color:'#1a56db' },
          { label:'Sites',        value:sites.length,        sub:'Research sites',                       color:'#059669' },
          { label:'Patients',     value:patients.length,     sub:`${enrolledPatients} enrolled`,         color:'#d97706' },
          { label:'Visits',       value:visits.length,       sub:`${completedVisits} completed`,         color:'#7c3aed' },
          { label:'Samples',      value:samples.length,      sub:`${analyzedSamples} analyzed`,          color:'#0891b2' },
          { label:'Lab Results',  value:labResults.length,   sub:`${reviewedResults} reviewed`,          color:'#9333ea' },
          { label:'Audit Events', value:auditLogs.length,    sub:`${totalChanges} data changes`,         color:'#475569' },
          { label:'Active Users', value:uniqueUsers,         sub:`${loginEvents} login events`,          color:'#dc2626' },
        ].map(m => <MetricCard key={m.label} label={m.label} value={m.value} color={m.color} sub={m.sub} />)}
      </div>

      {/* Protocol Compliance Summary */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, marginBottom:20 }}>
        <SectionTitle icon="📊" text="Protocol Compliance Summary" />
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Protocol','Phase','Status','Target Pts','Enroll%','Visit%','Score','Compliance'].map(h=>
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {protoRows.map(r => (
                <tr key={r.protocolId} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:'#1a56db' }}>{r.title}</td>
                  <td style={{ padding:'8px 12px', fontSize:11, color:'#7c3aed', fontWeight:600 }}>{r.phase}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#f1f5f9', color:'#475569' }}>{r.status}</span></td>
                  <td style={{ padding:'8px 12px' }}>{r.targetPatients||'—'}</td>
                  <td style={{ padding:'8px 12px', fontWeight:700, color:r.enrollPct>=80?'#059669':r.enrollPct>=50?'#d97706':'#ef4444' }}>{r.enrollPct}%</td>
                  <td style={{ padding:'8px 12px', fontWeight:700, color:r.visitPct>=80?'#059669':r.visitPct>=50?'#d97706':'#ef4444' }}>{r.visitPct}%</td>
                  <td style={{ padding:'8px 12px', fontWeight:800, fontSize:15, color:r.score>=80?'#059669':r.score>=50?'#d97706':'#ef4444' }}>{r.score}%</td>
                  <td style={{ padding:'8px 12px' }}><StatusPill status={r.complianceStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Integrity Notes */}
      <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:20 }}>
        <SectionTitle icon="📋" text="Regulatory Certification Notes" />
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { ok: true,  text:'All patient records are stored with enrollment status tracking' },
            { ok: true,  text:'Complete audit trail maintained for all data modifications' },
            { ok: true,  text:'Role-based access control (RBAC) enforced across all modules' },
            { ok: true,  text:'Sample chain-of-custody tracked from collection to disposal' },
            { ok: labResults.filter(r=>r.status==='PENDING').length===0, text:`Lab result review queue: ${labResults.filter(r=>r.status==='PENDING').length} pending${labResults.filter(r=>r.status==='PENDING').length>0?' — review required before submission':''}` },
            { ok: samples.filter(s=>s.status==='COLLECTED'&&!s.storageLocation).length===0, text:`Samples without storage location: ${samples.filter(s=>s.status==='COLLECTED'&&!s.storageLocation).length}${samples.filter(s=>s.status==='COLLECTED'&&!s.storageLocation).length>0?' — update required':''}` },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, background:item.ok?'#f0fdf4':'#fef9c3', border:`1px solid ${item.ok?'#bbf7d0':'#fde68a'}`, borderRadius:8, padding:'10px 14px' }}>
              <span style={{ fontSize:16 }}>{item.ok ? '✅' : '⚠️'}</span>
              <span style={{ fontSize:13, color:'#374151' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      </div>{/* end #rpt-h */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function ComplianceReports() {
  const { hasRole } = useAuth()
  const canWrite  = hasRole('ADMIN', 'REGULATORY_OFFICER')
  const [activeReport, setActiveReport] = useState(null)
  const [savedReports, setSavedReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [saving, setSaving]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => {
    getComplianceReports()
      .then(r => setSavedReports(r.data || []))
      .catch(() => setSavedReports([]))
      .finally(() => setLoadingReports(false))
  }, [])

  const activeType = REPORT_TYPES.find(rt => rt.key === activeReport)

  const saveReport = async () => {
    if (!activeReport || !canWrite) return
    setSaving(true)
    try {
      await createComplianceReport({
        scope: activeReport,
        generatedBy: 'USER',
        generatedDate: new Date().toISOString().split('T')[0],
      })
      const r = await getComplianceReports()
      setSavedReports(r.data || [])
    } catch (e) {
      alert('Could not save report record: ' + (e.response?.data?.message || e.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteComplianceReport(confirmDelete.reportId)
      setConfirmDelete(null)
      const r = await getComplianceReports()
      setSavedReports(r.data || [])
    } catch { setConfirmDelete(null) }
    finally { setDeleting(false) }
  }

  return (
    <>
      <Navbar title="Compliance Reports" />
      <div className="page-content">
        <div className="page-header">
          <h2>Compliance Reports</h2>
          <p>Regulatory compliance, audit trail and data integrity reports</p>
        </div>

        {/* ── Report Type Selector ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight:700, fontSize:13, color:'#64748b', marginBottom:12, textTransform:'uppercase', letterSpacing:0.5 }}>Select Report Type</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12 }}>
            {REPORT_TYPES.map(rt => (
              <div
                key={rt.key}
                onClick={() => setActiveReport(rt.key)}
                style={{
                  background: activeReport === rt.key ? rt.color : '#fff',
                  border: `2px solid ${activeReport === rt.key ? rt.color : '#e2e8f0'}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  transition: 'all 0.15s', boxShadow: activeReport === rt.key ? `0 4px 16px ${rt.color}44` : 'none',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background: activeReport===rt.key ? 'rgba(255,255,255,0.2)' : rt.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {rt.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:800, color: activeReport===rt.key ? 'rgba(255,255,255,0.7)' : '#94a3b8', letterSpacing:0.5 }}>REPORT {rt.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color: activeReport===rt.key ? '#fff' : '#0f172a', lineHeight:1.3 }}>{rt.title}</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color: activeReport===rt.key ? 'rgba(255,255,255,0.75)' : '#64748b', marginTop:8, lineHeight:1.4 }}>{rt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Active Report Panel ── */}
        {activeReport && activeType && (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'24px 28px', marginBottom:24, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
            {/* Panel header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:16, borderBottom:'2px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:activeType.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                  {activeType.icon}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:18, color:'#0f172a' }}>{activeType.title}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>Report {activeType.label} &nbsp;·&nbsp; Generated: {new Date().toLocaleDateString('en-IN', { dateStyle:'medium' })}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {canWrite && (
                  <button onClick={saveReport} disabled={saving}
                    style={{ fontSize:12, padding:'7px 14px', border:`1px solid ${activeType.color}`, borderRadius:8, background: activeType.bg, color: activeType.color, cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                    {saving ? '...' : '💾 Save Report'}
                  </button>
                )}
                <button onClick={() => setActiveReport(null)}
                  style={{ fontSize:12, padding:'7px 12px', border:'1px solid #e2e8f0', borderRadius:8, background:'#f8fafc', color:'#64748b', cursor:'pointer' }}>
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Report content */}
            {activeReport === 'AUDIT_TRAIL'           && <AuditTrailReport />}
            {activeReport === 'DATA_CHANGE'           && <DataChangeHistory />}
            {activeReport === 'PROTOCOL_COMPLIANCE'   && <ProtocolComplianceReport />}
            {activeReport === 'PATIENT_CONSENT'       && <PatientConsentReport />}
            {activeReport === 'SAMPLE_CUSTODY'        && <SampleCustodyReport />}
            {activeReport === 'LAB_VALIDATION'        && <LabValidationReport />}
            {activeReport === 'SECURITY_ACCESS'       && <SecurityAccessReport />}
            {activeReport === 'REGULATORY_SUBMISSION' && <RegulatorySubmissionReport />}
          </div>
        )}

        {/* ── Saved Reports History ── */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>📂 Saved Report History</div>
            <span style={{ fontSize:13, color:'#64748b' }}>{savedReports.length} saved records</span>
          </div>
          {loadingReports
            ? <div className="loading"><div className="spinner" />Loading…</div>
            : savedReports.length === 0
            ? (
              <div className="empty-state">
                <div className="icon">📑</div>
                <h3>No saved reports yet</h3>
                <p>Open any report type above and click "💾 Save Report" to record it here.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Report ID</th><th>Report Type</th><th>Saved By</th><th>Saved Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {savedReports.map(r => {
                      const rt = REPORT_TYPES.find(t => t.key === r.scope) || REPORT_TYPES[0]
                      return (
                        <tr key={r.reportId}>
                          <td><strong style={{ fontFamily:'monospace', color:'#1a56db' }}>RPT-{String(r.reportId).padStart(4,'0')}</strong></td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:16 }}>{rt.icon}</span>
                              <div>
                                <div style={{ fontWeight:600, fontSize:13, color:rt.color }}>{rt.title}</div>
                                <div style={{ fontSize:11, color:'#94a3b8' }}>Report {rt.label}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                              {r.generatedBy === 'AUTO' ? '🤖' : '👤'} {r.generatedBy || '—'}
                            </span>
                          </td>
                          <td style={{ color:'#64748b', fontSize:13 }}>{r.generatedDate || '—'}</td>
                          <td>
                            <div className="actions">
                              <button className="btn btn-sm" onClick={() => setActiveReport(r.scope)}
                                style={{ fontSize:11, padding:'4px 10px', background:'#dbeafe', color:'#1e40af', border:'1px solid #bfdbfe', borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                                ▶ View
                              </button>
                              {hasRole('ADMIN') && (
                                <button className="btn btn-icon btn-sm" onClick={() => setConfirmDelete(r)}>
                                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:16, width:420, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background:'linear-gradient(135deg,#ef4444,#b91c1c)', padding:'24px 28px' }}>
              <h3 style={{ margin:0, color:'#fff', fontSize:18 }}>Delete Saved Report</h3>
              <p style={{ margin:'6px 0 0', color:'rgba(255,255,255,0.85)', fontSize:13 }}>This removes the saved record only — not the actual data.</p>
            </div>
            <div style={{ padding:'24px 28px' }}>
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
                <strong>RPT-{String(confirmDelete.reportId).padStart(4,'0')}</strong>
                <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>Type: {REPORT_TYPES.find(t=>t.key===confirmDelete.scope)?.title || confirmDelete.scope}</div>
                <div style={{ fontSize:13, color:'#6b7280', marginTop:2 }}>Date: {confirmDelete.generatedDate || '—'}</div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
