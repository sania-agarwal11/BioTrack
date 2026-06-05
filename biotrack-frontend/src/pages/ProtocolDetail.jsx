import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getProtocolById } from '../api/protocols'
import { getPatientsByProtocol } from '../api/patients'
import { getSitesByProtocol, getSiteById } from '../api/sites'
import { getVisitsByPatient } from '../api/visits'
import { getSamplesByPatient, getLabResults, getSampleStatusHistory } from '../api/samples'

// ── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function EyeIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
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

// ── Badge helpers ────────────────────────────────────────────────────────────

const phaseBadgeClass = { PHASE_I: 'badge-primary', PHASE_II: 'badge-warning', PHASE_III: 'badge-success', PHASE_IV: 'badge-danger' }
const enrollBadgeClass = { ENROLLED: 'badge-success', COMPLETED: 'badge-secondary', WITHDRAWN: 'badge-danger', SCREENING: 'badge-warning' }
const siteBadgeClass = { ACTIVE: 'badge-success', INACTIVE: 'badge-danger', PENDING_APPROVAL: 'badge-warning' }
const visitBadgeClass = { COMPLETED: 'badge-success', SCHEDULED: 'badge-primary', MISSED: 'badge-danger', CANCELLED: 'badge-secondary', IN_PROGRESS: 'badge-warning' }
const sampleBadgeClass = { ANALYZED: 'badge-success', COLLECTED: 'badge-primary', IN_STORAGE: 'badge-warning', DISPOSED: 'badge-secondary' }
const labBadgeClass = { COMPLETED: 'badge-success', REVIEWED: 'badge-primary', PENDING: 'badge-warning', REJECTED: 'badge-danger' }

const Badge = ({ value, map, fallback = 'badge-secondary' }) => (
  <span className={`badge ${map[value] || fallback}`}>{value || '—'}</span>
)

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProtocolDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [protocol, setProtocol] = useState(null)
  const [patients, setPatients] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('patients')

  // Patient detail modal
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedPatientSite, setSelectedPatientSite] = useState(null)
  const [patientVisits, setPatientVisits] = useState([])
  const [patientSamples, setPatientSamples] = useState([])
  const [patientLoading, setPatientLoading] = useState(false)

  // Sample → lab result + status history expansion
  const [expandedSampleId, setExpandedSampleId] = useState(null)
  const [labResult, setLabResult] = useState(null)
  const [labLoading, setLabLoading] = useState(false)
  const [statusHistory, setStatusHistory] = useState([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getProtocolById(id).then(r => setProtocol(r.data)).catch(() => {}),
      getPatientsByProtocol(id).then(r => setPatients(r.data || [])).catch(() => setPatients([])),
      getSitesByProtocol(id).then(r => setSites(r.data || [])).catch(() => setSites([]))
    ]).finally(() => setLoading(false))
  }, [id])

  const openPatient = async (patient) => {
    setSelectedPatient(patient)
    setSelectedPatientSite(null)
    setPatientLoading(true)
    setExpandedSampleId(null)
    setLabResult(null)
    setStatusHistory([])
    setPatientVisits([])
    setPatientSamples([])
    try {
      const fetches = [
        getVisitsByPatient(patient.patientId).catch(() => ({ data: [] })),
        getSamplesByPatient(patient.patientId).catch(() => ({ data: [] })),
      ]
      if (patient.siteId) fetches.push(getSiteById(patient.siteId).catch(() => ({ data: null })))
      const results = await Promise.all(fetches)
      setPatientVisits(results[0].data || [])
      setPatientSamples(results[1].data || [])
      if (patient.siteId && results[2]) setSelectedPatientSite(results[2].data)
    } finally {
      setPatientLoading(false)
    }
  }

  const toggleSampleResult = async (sample) => {
    if (expandedSampleId === sample.sampleId) {
      setExpandedSampleId(null)
      setLabResult(null)
      setStatusHistory([])
      return
    }
    setExpandedSampleId(sample.sampleId)
    setLabLoading(true)
    setLabResult(null)
    setStatusHistory([])
    try {
      const [labRes, histRes] = await Promise.all([
        getLabResults(sample.sampleId).catch(() => ({ data: null })),
        getSampleStatusHistory(sample.sampleId).catch(() => ({ data: [] }))
      ])
      setLabResult(labRes.data)
      setStatusHistory(histRes.data || [])
    } finally {
      setLabLoading(false)
    }
  }

  const closePatient = () => {
    setSelectedPatient(null)
    setSelectedPatientSite(null)
    setPatientVisits([])
    setPatientSamples([])
    setExpandedSampleId(null)
    setLabResult(null)
    setStatusHistory([])
  }

  // ── Tab styles ──────────────────────────────────────────────────────────────
  const tabStyle = (tab) => ({
    padding: '10px 24px',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #1a56db' : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 700 : 500,
    color: activeTab === tab ? '#1a56db' : '#64748b',
    fontSize: '14px',
    transition: 'all 0.15s'
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar title="Protocol Detail" />
      <div className="page-content">

        {/* Back button */}
        <button
          onClick={() => navigate('/protocols')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '14px', fontWeight: 600, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeftIcon /> Back to Protocols
        </button>

        {loading ? (
          <div className="loading"><div className="spinner" />Loading protocol...</div>
        ) : !protocol ? (
          <div className="empty-state"><div className="icon">⚠️</div><h3>Protocol not found</h3></div>
        ) : (
          <>
            {/* ── Protocol Header Card ── */}
            <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>#{protocol.protocolId}</span>
                    <Badge value={protocol.phase} map={phaseBadgeClass} />
                    <span className={`badge ${protocol.status === 'ACTIVE' ? 'badge-success' : protocol.status === 'CLOSED' ? 'badge-danger' : 'badge-secondary'}`}>{protocol.status}</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{protocol.title}</h2>
                </div>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1a56db' }}>{patients.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Enrolled Patients</div>
                  </div>
                  {protocol.targetPatients && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{protocol.targetPatients}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Target Patients</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>{sites.length}</div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Registered Sites</div>
                  </div>
                </div>
              </div>

              {/* Enrollment progress bar */}
              {protocol.targetPatients > 0 && (
                <div style={{ marginTop: 16, marginBottom: 4 }}>
                  {(() => {
                    const pct = Math.min(Math.round((patients.length / protocol.targetPatients) * 100), 100)
                    const barColor = pct >= 100 ? '#059669' : pct >= 60 ? '#1a56db' : pct >= 30 ? '#f59e0b' : '#ef4444'
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Enrollment Progress</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{patients.length} / {protocol.targetPatients} ({pct}%)</span>
                        </div>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', gap: 28, marginTop: 16, flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>START DATE</span><div style={{ fontWeight: 700, color: '#374151', marginTop: 2 }}>{protocol.startDate || '—'}</div></div>
                <div><span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>END DATE</span><div style={{ fontWeight: 700, color: '#374151', marginTop: 2 }}>{protocol.endDate || '—'}</div></div>
              </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
              <button style={tabStyle('patients')} onClick={() => setActiveTab('patients')}>
                👥 Enrolled Patients ({patients.length})
              </button>
              <button style={tabStyle('sites')} onClick={() => setActiveTab('sites')}>
                🏥 Registered Sites ({sites.length})
              </button>
            </div>

            {/* ── Patients Tab ── */}
            {activeTab === 'patients' && (
              <div className="card">
                {patients.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">👥</div>
                    <h3>No patients enrolled</h3>
                    <p>No patients have been enrolled in this protocol yet.</p>
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
                          <th>Enrollment Status</th>
                          <th>Contact</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map(p => (
                          <tr key={p.patientId}>
                            <td><span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>#{p.patientId}</span></td>
                            <td><strong>{[p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || '—'}</strong></td>
                            <td>{p.gender || '—'}</td>
                            <td>{p.dateOfBirth || p.dob || '—'}</td>
                            <td><Badge value={p.enrollmentStatus} map={enrollBadgeClass} /></td>
                            <td>{p.contactNumber || p.contactInfo || '—'}</td>
                            <td>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 12px' }}
                                onClick={() => openPatient(p)}
                              >
                                <EyeIcon size={13} /> View Details
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

            {/* ── Sites Tab ── */}
            {activeTab === 'sites' && (
              <div className="card">
                {sites.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">🏥</div>
                    <h3>No sites registered</h3>
                    <p>No sites have been assigned to this protocol yet.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Site ID</th>
                          <th>Name</th>
                          <th>Location</th>
                          <th>Investigator ID</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sites.map(s => (
                          <tr key={s.siteId}>
                            <td><span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>#{s.siteId}</span></td>
                            <td><strong>{s.name || '—'}</strong></td>
                            <td>{s.location || '—'}</td>
                            <td>{s.investigatorId || '—'}</td>
                            <td><Badge value={s.status} map={siteBadgeClass} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Patient Detail Modal ── */}
      {selectedPatient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '90vw', maxWidth: 960, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>

            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800 }}>
                  {[selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ') || selectedPatient.name || 'Patient'}
                  <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 14, marginLeft: 10 }}>#{selectedPatient.patientId}</span>
                </h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  {selectedPatient.gender && <span style={{ marginRight: 14 }}>👤 {selectedPatient.gender}</span>}
                  {(selectedPatient.dateOfBirth || selectedPatient.dob) && <span style={{ marginRight: 14 }}>🎂 {selectedPatient.dateOfBirth || selectedPatient.dob}</span>}
                  {(selectedPatient.contactNumber || selectedPatient.contactInfo) && <span>📞 {selectedPatient.contactNumber || selectedPatient.contactInfo}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Badge value={selectedPatient.enrollmentStatus} map={enrollBadgeClass} />
                <button onClick={closePatient} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <XIcon />
                </button>
              </div>
            </div>

            {/* Modal Body — scrollable */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
              {patientLoading ? (
                <div className="loading"><div className="spinner" />Loading patient data...</div>
              ) : (
                <>
                  {/* Patient Info Row */}
                  {selectedPatient.email && (
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13, color: '#374151' }}>
                      <span>📧 <strong>{selectedPatient.email}</strong></span>
                      {selectedPatient.address && <span>📍 <strong>{selectedPatient.address}</strong></span>}
                      {selectedPatient.siteId && (
                        <span>
                          🏥 Site:&nbsp;
                          <strong>
                            {selectedPatientSite ? `${selectedPatientSite.name} (#${selectedPatient.siteId})` : `#${selectedPatient.siteId}`}
                          </strong>
                        </span>
                      )}
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
                      <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 14 }}>
                        No visits recorded for this patient.
                      </div>
                    ) : (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              {['Visit ID', 'Visit Type', 'Visit Date', 'Status', 'Notes'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
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
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>— click a row to view lab result</span>
                    </div>

                    {patientSamples.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 14 }}>
                        No samples collected for this patient.
                      </div>
                    ) : (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        {patientSamples.map((s, i) => {
                          const isExpanded = expandedSampleId === s.sampleId
                          return (
                            <div key={s.sampleId}>
                              {/* Sample row */}
                              <div
                                onClick={() => toggleSampleResult(s)}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '80px 120px 1fr 130px 1fr 40px',
                                  alignItems: 'center',
                                  padding: '12px 14px',
                                  background: isExpanded ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                                  borderBottom: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                  fontSize: 13,
                                  gap: 8
                                }}
                              >
                                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>#{s.sampleId}</span>
                                <span style={{ fontWeight: 500 }}>{s.sampleType || '—'}</span>
                                <span style={{ color: '#374151' }}>📅 {s.collectionDate || '—'}</span>
                                <Badge value={s.status} map={sampleBadgeClass} />
                                <span style={{ color: '#64748b', fontSize: 12 }}>📦 {s.storageLocation || '—'}</span>
                                <span style={{ color: '#1a56db' }}>
                                  {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                </span>
                              </div>

                              {/* Expanded Panel — Status History + Lab Result */}
                              {isExpanded && (
                                <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '16px 20px' }}>
                                  {labLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1a56db', fontSize: 13 }}>
                                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                      Loading sample details...
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

                                      {/* ── Status History Timeline ── */}
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
                                              const statusColors = {
                                                COLLECTED: { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
                                                IN_STORAGE: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
                                                ANALYZED: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
                                                DISPOSED: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
                                              }
                                              const c = statusColors[h.status] || { bg: '#f1f5f9', text: '#374151', dot: '#94a3b8' }
                                              const dateStr = h.changedAt
                                                ? (() => {
                                                    const d = new Date(h.changedAt)
                                                    return isNaN(d) ? h.changedAt : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                                  })()
                                                : '—'
                                              return (
                                                <div key={h.historyId} style={{ display: 'flex', gap: 10, marginBottom: isLast ? 0 : 12, position: 'relative' }}>
                                                  {/* Timeline dot + line */}
                                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 3, border: '2px solid #fff', boxShadow: `0 0 0 2px ${c.dot}` }} />
                                                    {!isLast && <div style={{ width: 2, flex: 1, background: '#bfdbfe', marginTop: 2 }} />}
                                                  </div>
                                                  {/* Content */}
                                                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
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

                                      {/* ── Lab Result ── */}
                                      <div style={{ flex: 1, minWidth: 280 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                                          🔬 Lab Result
                                        </div>
                                        {!labResult ? (
                                          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                                            ⚠️ No lab result found for this sample.
                                          </div>
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
            <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closePatient}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
