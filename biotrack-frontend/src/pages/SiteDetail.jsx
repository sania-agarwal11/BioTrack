import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getSiteById } from '../api/sites'
import { getProtocols } from '../api/protocols'
import { getPatientsBySite } from '../api/patients'
import { getVisitsByPatient } from '../api/visits'
import { getSamplesByPatient, getLabResults, getSampleStatusHistory } from '../api/samples'

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function EyeIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDownIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronUpIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const enrollBadgeClass  = { ENROLLED: 'badge-success', COMPLETED: 'badge-secondary', WITHDRAWN: 'badge-danger', SCREENING: 'badge-warning' }
const visitBadgeClass   = { COMPLETED: 'badge-success', SCHEDULED: 'badge-primary', MISSED: 'badge-danger', CANCELLED: 'badge-secondary', IN_PROGRESS: 'badge-warning' }
const sampleBadgeClass  = { ANALYZED: 'badge-success', COLLECTED: 'badge-primary', IN_STORAGE: 'badge-warning', DISPOSED: 'badge-secondary' }
const labBadgeClass     = { COMPLETED: 'badge-success', REVIEWED: 'badge-primary', PENDING: 'badge-warning', REJECTED: 'badge-danger' }
const phaseBadgeClass   = { PHASE_I: 'badge-primary', PHASE_II: 'badge-warning', PHASE_III: 'badge-success', PHASE_IV: 'badge-danger' }
const siteBadgeClass    = { ACTIVE: 'badge-success', INACTIVE: 'badge-danger', PENDING_APPROVAL: 'badge-warning' }

const Badge = ({ value, map, fallback = 'badge-secondary' }) => (
  <span className={`badge ${map[value] || fallback}`}>{value?.replace(/_/g, ' ') || '—'}</span>
)

const historyColors = {
  COLLECTED:  { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  IN_STORAGE: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  ANALYZED:   { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  DISPOSED:   { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [site,      setSite]      = useState(null)
  const [protocols, setProtocols] = useState([])
  const [patients,  setPatients]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('protocols')

  // Patient detail modal state
  const [selectedPatient,  setSelectedPatient]  = useState(null)
  const [patientVisits,    setPatientVisits]    = useState([])
  const [patientSamples,   setPatientSamples]   = useState([])
  const [patientLoading,   setPatientLoading]   = useState(false)

  // Sample expansion inside patient modal
  const [expandedSampleId, setExpandedSampleId] = useState(null)
  const [labResult,        setLabResult]         = useState(null)
  const [labLoading,       setLabLoading]        = useState(false)
  const [statusHistory,    setStatusHistory]     = useState([])

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSiteById(id).then(r => r.data).catch(() => null),
      getProtocols().then(r => r.data || []).catch(() => []),
      getPatientsBySite(id).then(r => r.data || []).catch(() => []),
    ]).then(([s, allProtocols, pts]) => {
      setSite(s)
      // site.protocols is an array of protocol title strings — filter full protocol objects by title match
      const siteProtocolNames = s?.protocols || []
      const matched = siteProtocolNames.length > 0
        ? allProtocols.filter(p => siteProtocolNames.includes(p.title))
        : []
      setProtocols(matched)
      setPatients(pts)
    }).finally(() => setLoading(false))
  }, [id])

  // ── Patient modal open/close ───────────────────────────────────────────────

  const openPatient = async (patient) => {
    setSelectedPatient(patient)
    setPatientLoading(true)
    setPatientVisits([]); setPatientSamples([])
    setExpandedSampleId(null); setLabResult(null); setStatusHistory([])
    try {
      const [vRes, sRes] = await Promise.all([
        getVisitsByPatient(patient.patientId).catch(() => ({ data: [] })),
        getSamplesByPatient(patient.patientId).catch(() => ({ data: [] })),
      ])
      setPatientVisits(vRes.data || [])
      setPatientSamples(sRes.data || [])
    } finally {
      setPatientLoading(false)
    }
  }

  const closePatient = () => {
    setSelectedPatient(null)
    setPatientVisits([]); setPatientSamples([])
    setExpandedSampleId(null); setLabResult(null); setStatusHistory([])
  }

  // ── Sample expansion ──────────────────────────────────────────────────────

  const toggleSample = async (sample) => {
    if (expandedSampleId === sample.sampleId) {
      setExpandedSampleId(null); setLabResult(null); setStatusHistory([])
      return
    }
    setExpandedSampleId(sample.sampleId)
    setLabLoading(true); setLabResult(null); setStatusHistory([])
    try {
      const [labRes, histRes] = await Promise.all([
        getLabResults(sample.sampleId).catch(() => ({ data: null })),
        getSampleStatusHistory(sample.sampleId).catch(() => ({ data: [] })),
      ])
      setLabResult(labRes.data)
      setStatusHistory(histRes.data || [])
    } finally {
      setLabLoading(false)
    }
  }

  // ── Tab style ─────────────────────────────────────────────────────────────

  const tabStyle = (tab) => ({
    padding: '10px 26px',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #1a56db' : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 700 : 500,
    color: activeTab === tab ? '#1a56db' : '#64748b',
    fontSize: '14px',
    transition: 'all 0.15s',
  })

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Navbar title="Site Detail" />
        <div className="page-content">
          <div className="loading"><div className="spinner" />Loading site...</div>
        </div>
      </>
    )
  }

  if (!site) {
    return (
      <>
        <Navbar title="Site Detail" />
        <div className="page-content">
          <div className="empty-state"><div className="icon">⚠️</div><h3>Site not found</h3></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar title="Site Detail" />
      <div className="page-content">

        {/* Back button */}
        <button
          onClick={() => navigate('/sites')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '14px', fontWeight: 600, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeftIcon /> Back to Sites
        </button>

        {/* ── Site Header Card ── */}
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '24px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                🏛️
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600 }}>#{site.siteId}</span>
                  <Badge value={site.status} map={siteBadgeClass} />
                </div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 800 }}>{site.name}</h2>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>📍 {site.location || '—'}</span>
                  {site.investigatorId && <span>🔬 Investigator: <strong style={{ color: '#93c5fd' }}>{site.investigatorId}</strong></span>}
                </p>
              </div>
            </div>
            {/* Counters */}
            <div style={{ display: 'flex', gap: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{protocols.length}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Protocols</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{patients.length}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Patients</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
          <button style={tabStyle('protocols')} onClick={() => setActiveTab('protocols')}>
            📋 Protocols ({protocols.length})
          </button>
          <button style={tabStyle('patients')} onClick={() => setActiveTab('patients')}>
            👥 Enrolled Patients ({patients.length})
          </button>
        </div>

        {/* ── Protocols Tab ── */}
        {activeTab === 'protocols' && (
          <div className="card">
            {protocols.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <h3>No protocols assigned</h3>
                <p>This site has not been assigned to any protocol yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Protocol ID</th>
                      <th>Title</th>
                      <th>Phase</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocols.map(p => (
                      <tr key={p.protocolId}>
                        <td><span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>#{p.protocolId}</span></td>
                        <td><strong>{p.title || '—'}</strong></td>
                        <td><Badge value={p.phase} map={phaseBadgeClass} /></td>
                        <td>
                          <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : p.status === 'CLOSED' ? 'badge-danger' : 'badge-secondary'}`}>
                            {p.status || '—'}
                          </span>
                        </td>
                        <td>{p.startDate || '—'}</td>
                        <td>{p.endDate || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => navigate(`/protocols/${p.protocolId}`)}
                          >
                            <EyeIcon /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Patients Tab ── */}
        {activeTab === 'patients' && (
          <div className="card">
            {patients.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👥</div>
                <h3>No patients enrolled</h3>
                <p>No patients have been enrolled at this site yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Date of Birth</th>
                      <th>Contact</th>
                      <th>Enrollment Status</th>
                      <th>Protocol</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(p => (
                      <tr key={p.patientId}>
                        <td><span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>#{p.patientId}</span></td>
                        <td><strong>{[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</strong></td>
                        <td>{p.gender || '—'}</td>
                        <td>{p.dateOfBirth || '—'}</td>
                        <td>{p.contactNumber || '—'}</td>
                        <td><Badge value={p.enrollmentStatus} map={enrollBadgeClass} /></td>
                        <td>{p.protocolId ? <span style={{ color: '#6366f1', fontWeight: 600 }}>#{p.protocolId}</span> : '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => openPatient(p)}
                          >
                            <EyeIcon /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Patient Detail Modal ──────────────────────────────────────────────── */}
      {selectedPatient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '90vw', maxWidth: 980, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>

            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800 }}>
                  {[selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ') || 'Patient'}
                  <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 14, marginLeft: 10 }}>#{selectedPatient.patientId}</span>
                </h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 13, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {selectedPatient.gender        && <span>👤 {selectedPatient.gender}</span>}
                  {selectedPatient.dateOfBirth   && <span>🎂 {selectedPatient.dateOfBirth}</span>}
                  {selectedPatient.contactNumber && <span>📞 {selectedPatient.contactNumber}</span>}
                  {selectedPatient.email         && <span>📧 {selectedPatient.email}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Badge value={selectedPatient.enrollmentStatus} map={enrollBadgeClass} />
                <button onClick={closePatient} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <XIcon />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
              {patientLoading ? (
                <div className="loading"><div className="spinner" />Loading patient data...</div>
              ) : (
                <>
                  {/* Extra info row */}
                  {(selectedPatient.address || selectedPatient.protocolId) && (
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 16px', marginBottom: 22, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#374151' }}>
                      {selectedPatient.address    && <span>📍 <strong>{selectedPatient.address}</strong></span>}
                      {selectedPatient.protocolId && <span>📋 Protocol: <strong style={{ color: '#6366f1' }}>#{selectedPatient.protocolId}</strong></span>}
                    </div>
                  )}

                  {/* ── Visit History ── */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>📅</span>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Visit History</h4>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{patientVisits.length}</span>
                    </div>
                    {patientVisits.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '18px', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 14 }}>No visits recorded for this patient.</div>
                    ) : (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              {['Visit ID', 'Visit Type', 'Visit Date', 'Status', 'Notes'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {patientVisits.map((v, i) => (
                              <tr key={v.visitId} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '10px 14px' }}><span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>#{v.visitId}</span></td>
                                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{v.visitType || '—'}</td>
                                <td style={{ padding: '10px 14px' }}>{v.visitDate || '—'}</td>
                                <td style={{ padding: '10px 14px' }}><Badge value={v.status} map={visitBadgeClass} /></td>
                                <td style={{ padding: '10px 14px', color: '#64748b', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ── Samples ── */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>🧪</span>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Samples</h4>
                      <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{patientSamples.length}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>— click a row to view status history & lab result</span>
                    </div>
                    {patientSamples.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '18px', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 14 }}>No samples collected for this patient.</div>
                    ) : (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        {patientSamples.map((s, i) => {
                          const isExpanded = expandedSampleId === s.sampleId
                          return (
                            <div key={s.sampleId}>
                              {/* Sample row */}
                              <div
                                onClick={() => toggleSample(s)}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '80px 120px 1fr 130px 1fr 36px',
                                  alignItems: 'center',
                                  padding: '12px 14px',
                                  background: isExpanded ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                                  borderBottom: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                  fontSize: 13,
                                  gap: 8,
                                }}
                              >
                                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>#{s.sampleId}</span>
                                <span style={{ fontWeight: 500 }}>{s.sampleType || '—'}</span>
                                <span style={{ color: '#374151' }}>📅 {s.collectionDate || '—'}</span>
                                <Badge value={s.status} map={sampleBadgeClass} />
                                <span style={{ color: '#64748b', fontSize: 12 }}>📦 {s.storageLocation || '—'}</span>
                                <span style={{ color: '#1a56db', display: 'flex', justifyContent: 'center' }}>
                                  {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                </span>
                              </div>

                              {/* Expanded — Status History + Lab Result */}
                              {isExpanded && (
                                <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '16px 20px' }}>
                                  {labLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1a56db', fontSize: 13 }}>
                                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                      Loading sample details...
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

                                      {/* Status History */}
                                      <div style={{ flex: '0 0 240px', minWidth: 200 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                          📋 Status History
                                        </div>
                                        {statusHistory.length === 0 ? (
                                          <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>No history recorded yet.</div>
                                        ) : (
                                          <div style={{ position: 'relative' }}>
                                            {statusHistory.map((h, idx) => {
                                              const isLast = idx === statusHistory.length - 1
                                              const c = historyColors[h.status] || { bg: '#f1f5f9', text: '#374151', dot: '#94a3b8' }
                                              const dateStr = h.changedAt
                                                ? (() => { const d = new Date(h.changedAt); return isNaN(d) ? h.changedAt : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) })()
                                                : '—'
                                              return (
                                                <div key={h.historyId} style={{ display: 'flex', gap: 10, marginBottom: isLast ? 0 : 12, position: 'relative' }}>
                                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 3, border: '2px solid #fff', boxShadow: `0 0 0 2px ${c.dot}` }} />
                                                    {!isLast && <div style={{ width: 2, flex: 1, background: '#bfdbfe', marginTop: 2 }} />}
                                                  </div>
                                                  <div style={{ flex: 1 }}>
                                                    <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{h.status}</span>
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{dateStr}</div>
                                                    {h.changedBy && <div style={{ fontSize: 11, color: '#94a3b8' }}>by {h.changedBy}</div>}
                                                    {h.notes && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 1 }}>{h.notes}</div>}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {/* Lab Result */}
                                      <div style={{ flex: 1, minWidth: 280 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                          🔬 Lab Result
                                        </div>
                                        {!labResult ? (
                                          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>⚠️ No lab result found for this sample.</div>
                                        ) : (
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>#{labResult.resultId}</span>
                                              <Badge value={labResult.status} map={labBadgeClass} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                                              {[
                                                ['Test Name',       labResult.testName],
                                                ['Result',          labResult.result],
                                                ['Unit',            labResult.unit],
                                                ['Reference Range', labResult.referenceRange],
                                                ['Performed Date',  labResult.performedDate],
                                                ['Performed By',    labResult.performedBy],
                                              ].map(([label, value]) => (
                                                <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #bfdbfe' }}>
                                                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
                                                </div>
                                              ))}
                                            </div>
                                            {(labResult.reviewNotes || labResult.rejectionReason) && (
                                              <div style={{ marginTop: 8, background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #bfdbfe', fontSize: 12, color: '#374151' }}>
                                                <strong>{labResult.rejectionReason ? '❌ Rejection Reason' : '📝 Review Notes'}:</strong>{' '}
                                                {labResult.rejectionReason || labResult.reviewNotes}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-sm"
                style={{ background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                onClick={() => navigate(`/patients/${selectedPatient.patientId}`)}
              >
                Open Full Patient Page →
              </button>
              <button
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}
                onClick={closePatient}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
