import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getPatientById } from '../api/patients'
import { getProtocolById } from '../api/protocols'
import { getSiteById } from '../api/sites'
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

const Badge = ({ value, map, fallback = 'badge-secondary' }) => (
  <span className={`badge ${map[value] || fallback}`}>{value || '—'}</span>
)

// ── Status history colours ────────────────────────────────────────────────────

const historyColors = {
  COLLECTED:  { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  IN_STORAGE: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  ANALYZED:   { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  DISPOSED:   { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [patient,   setPatient]   = useState(null)
  const [protocol,  setProtocol]  = useState(null)
  const [site,      setSite]      = useState(null)
  const [visits,    setVisits]    = useState([])
  const [samples,   setSamples]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('visits')

  // Sample expansion
  const [expandedSampleId, setExpandedSampleId] = useState(null)
  const [labResult,        setLabResult]         = useState(null)
  const [labLoading,       setLabLoading]        = useState(false)
  const [statusHistory,    setStatusHistory]     = useState([])

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getPatientById(id).then(r => r.data).catch(() => null),
      getVisitsByPatient(id).then(r => r.data || []).catch(() => []),
      getSamplesByPatient(id).then(r => r.data || []).catch(() => []),
    ]).then(([pat, vis, samp]) => {
      setPatient(pat)
      setVisits(vis)
      setSamples(samp)
      // Fetch protocol + site details in parallel
      const extraFetches = []
      if (pat?.protocolId) extraFetches.push(getProtocolById(pat.protocolId).then(r => setProtocol(r.data)).catch(() => {}))
      if (pat?.siteId)     extraFetches.push(getSiteById(pat.siteId).then(r => setSite(r.data)).catch(() => {}))
      if (extraFetches.length) Promise.all(extraFetches)
    }).finally(() => setLoading(false))
  }, [id])

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
        getSampleStatusHistory(sample.sampleId).catch(() => ({ data: [] }))
      ])
      setLabResult(labRes.data)
      setStatusHistory(histRes.data || [])
    } finally {
      setLabLoading(false)
    }
  }

  // ── Tab style helper ──────────────────────────────────────────────────────

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
        <Navbar title="Patient Detail" />
        <div className="page-content">
          <div className="loading"><div className="spinner" />Loading patient...</div>
        </div>
      </>
    )
  }

  if (!patient) {
    return (
      <>
        <Navbar title="Patient Detail" />
        <div className="page-content">
          <div className="empty-state"><div className="icon">⚠️</div><h3>Patient not found</h3></div>
        </div>
      </>
    )
  }

  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || '—'

  return (
    <>
      <Navbar title="Patient Detail" />
      <div className="page-content">

        {/* Back button */}
        <button
          onClick={() => navigate('/patients')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '14px', fontWeight: 600, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeftIcon /> Back to Patients
        </button>

        {/* ── Patient Header Card ── */}
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          {/* Coloured banner */}
          <div style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', padding: '24px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Avatar */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>#{patient.patientId}</span>
                  <Badge value={patient.enrollmentStatus} map={enrollBadgeClass} />
                </div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 800 }}>{fullName}</h2>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {patient.gender      && <span>👤 {patient.gender}</span>}
                  {patient.dateOfBirth && <span>🎂 {patient.dateOfBirth}</span>}
                  {patient.contactNumber && <span>📞 {patient.contactNumber}</span>}
                </p>
              </div>
            </div>

            {/* Summary counters */}
            <div style={{ display: 'flex', gap: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{visits.length}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Visits</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{samples.length}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Samples</div>
              </div>
            </div>
          </div>

          {/* Details strip */}
          <div style={{ padding: '16px 28px', background: '#f8fafc', display: 'flex', gap: 32, flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#374151' }}>
            {patient.email   && <span>📧 <strong>{patient.email}</strong></span>}
            {patient.address && <span>📍 <strong>{patient.address}</strong></span>}

            {/* Protocol info */}
            {protocol ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📋 Protocol:&nbsp;
                <strong
                  onClick={() => navigate(`/protocols/${protocol.protocolId}`)}
                  style={{ color: '#1a56db', cursor: 'pointer', textDecoration: 'underline' }}
                  title="Go to protocol"
                >
                  {protocol.title}
                </strong>
                <Badge value={protocol.phase} map={phaseBadgeClass} />
                <span className={`badge ${protocol.status === 'ACTIVE' ? 'badge-success' : protocol.status === 'CLOSED' ? 'badge-danger' : 'badge-secondary'}`}>{protocol.status}</span>
              </span>
            ) : patient.protocolId ? (
              <span>📋 Protocol: <strong style={{ color: '#6366f1' }}>#{patient.protocolId}</strong></span>
            ) : null}

            {patient.siteId && (
              <span>
                🏛️ Site:&nbsp;
                <strong style={{ color: '#0ea5e9' }}>
                  {site ? `${site.name} (#${patient.siteId})` : `#${patient.siteId}`}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
          <button style={tabStyle('visits')} onClick={() => setActiveTab('visits')}>
            📅 Visit History ({visits.length})
          </button>
          <button style={tabStyle('samples')} onClick={() => setActiveTab('samples')}>
            🧪 Samples & Lab Results ({samples.length})
          </button>
        </div>

        {/* ── Visits Tab ── */}
        {activeTab === 'visits' && (
          <div className="card">
            {visits.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📅</div>
                <h3>No visits recorded</h3>
                <p>No visits have been scheduled or completed for this patient yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Visit ID</th>
                      <th>Visit Type</th>
                      <th>Visit Date</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.visitId}>
                        <td><span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>#{v.visitId}</span></td>
                        <td><strong>{v.visitType || '—'}</strong></td>
                        <td>{v.visitDate || '—'}</td>
                        <td><Badge value={v.status} map={visitBadgeClass} /></td>
                        <td style={{ color: '#64748b', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Samples Tab ── */}
        {activeTab === 'samples' && (
          <div className="card">
            {samples.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🧪</div>
                <h3>No samples collected</h3>
                <p>No biological samples have been recorded for this patient yet.</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                  Click any row to expand and view the <strong>status history</strong> and <strong>lab result</strong>.
                </div>
                <div>
                  {samples.map((s, i) => {
                    const isExpanded = expandedSampleId === s.sampleId
                    return (
                      <div key={s.sampleId}>
                        {/* ── Sample Row ── */}
                        <div
                          onClick={() => toggleSample(s)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 130px 160px 140px 1fr 36px',
                            alignItems: 'center',
                            padding: '13px 20px',
                            background: isExpanded ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            fontSize: 13,
                            gap: 10,
                          }}
                        >
                          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>#{s.sampleId}</span>
                          <span style={{ fontWeight: 600, color: '#374151' }}>{s.sampleType || '—'}</span>
                          <span style={{ color: '#64748b' }}>📅 {s.collectionDate || '—'}</span>
                          <Badge value={s.status} map={sampleBadgeClass} />
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>📦 {s.storageLocation || '—'}</span>
                          <span style={{ color: '#1a56db', display: 'flex', justifyContent: 'center' }}>
                            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          </span>
                        </div>

                        {/* ── Expanded Panel ── */}
                        {isExpanded && (
                          <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '20px 24px' }}>
                            {labLoading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1a56db', fontSize: 13 }}>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                Loading sample details...
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

                                {/* ── Status History Timeline ── */}
                                <div style={{ flex: '0 0 240px', minWidth: 200 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
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
                                          ? (() => {
                                              const d = new Date(h.changedAt)
                                              return isNaN(d) ? h.changedAt : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                            })()
                                          : '—'
                                        return (
                                          <div key={h.historyId} style={{ display: 'flex', gap: 10, marginBottom: isLast ? 0 : 14, position: 'relative' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                                              <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 3, border: '2px solid #fff', boxShadow: `0 0 0 2px ${c.dot}` }} />
                                              {!isLast && <div style={{ width: 2, flex: 1, background: '#bfdbfe', marginTop: 2 }} />}
                                            </div>
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
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                                    🔬 Lab Result
                                  </div>
                                  {!labResult ? (
                                    <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                                      ⚠️ No lab result found for this sample.
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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
                                        <div style={{ marginTop: 10, background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #bfdbfe', fontSize: 12, color: '#374151' }}>
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
              </>
            )}
          </div>
        )}

      </div>
    </>
  )
}
