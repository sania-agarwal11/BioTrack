import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getSamples, createSample, updateSample, deleteSample, updateSampleStatus, disposeSample, getLabResults, getSampleStatusHistory, getDeletedSamples, restoreSample } from '../api/samples'
import { getPatientById } from '../api/patients'
import { getProtocolById } from '../api/protocols'
import { useAuth } from '../context/AuthContext'

const SAMPLE_STATUSES = ['COLLECTED', 'IN_STORAGE', 'ANALYZED', 'DISPOSED']
const SAMPLE_TYPES = ['BLOOD', 'URINE', 'TISSUE', 'SALIVA', 'PLASMA', 'SERUM', 'CSF', 'OTHER']
const empty = { patientId: '', protocolId: '', siteId: '', sampleType: 'BLOOD', collectionDate: '', storageLocation: '', status: 'COLLECTED', notes: '', otherSampleType: '' }

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

const historyColors = {
  COLLECTED:  { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  IN_STORAGE: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  ANALYZED:   { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  DISPOSED:   { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
}

const labBadgeClass = { COMPLETED: 'badge-success', REVIEWED: 'badge-primary', PENDING: 'badge-warning', REJECTED: 'badge-danger' }
const Badge = ({ value, map, fallback = 'badge-secondary' }) => (
  <span className={`badge ${map[value] || fallback}`}>{value || '—'}</span>
)

export default function Samples() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('ADMIN', 'LAB_TECHNICIAN')
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [patientHint, setPatientHint] = useState('')
  const [filterPatientId, setFilterPatientId] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // ── View modal ───────────────────────────────────────────────────────────────
  const [viewSample,       setViewSample]       = useState(null)
  const [viewLabResult,    setViewLabResult]    = useState(null)
  const [viewHistory,      setViewHistory]      = useState([])
  const [viewLoading,      setViewLoading]      = useState(false)
  const [viewPatientName,  setViewPatientName]  = useState('')
  const [viewProtocolName, setViewProtocolName] = useState('')

  const openView = async (s) => {
    setViewSample(s)
    setViewLoading(true)
    setViewLabResult(null)
    setViewHistory([])
    setViewPatientName('')
    setViewProtocolName('')
    try {
      const [labRes, histRes, patRes, proRes] = await Promise.all([
        getLabResults(s.sampleId).catch(() => ({ data: null })),
        getSampleStatusHistory(s.sampleId).catch(() => ({ data: [] })),
        s.patientId  ? getPatientById(s.patientId).catch(() => ({ data: null }))   : Promise.resolve({ data: null }),
        s.protocolId ? getProtocolById(s.protocolId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ])
      setViewLabResult(labRes.data)
      setViewHistory(histRes.data || [])
      const pat = patRes.data
      if (pat) setViewPatientName([pat.firstName, pat.lastName].filter(Boolean).join(' '))
      const pro = proRes.data
      if (pro) setViewProtocolName(pro.title || '')
    } finally {
      setViewLoading(false)
    }
  }

  const closeView = () => {
    setViewSample(null); setViewLabResult(null); setViewHistory([])
    setViewPatientName(''); setViewProtocolName('')
  }

  const load = (deleted = showDeleted) => {
    setLoading(true)
    const fetch = deleted ? getDeletedSamples() : getSamples()
    fetch.then(r => setSamples(r.data || [])).catch(() => setSamples([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setPatientHint(''); setShowModal(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      patientId: s.patientId || '', protocolId: s.protocolId || '', siteId: s.siteId || '',
      sampleType: s.sampleType || 'BLOOD', collectionDate: s.collectionDate || '',
      storageLocation: s.storageLocation || '', status: s.status || 'COLLECTED',
      notes: s.notes || '', otherSampleType: ''
    })
    setPatientHint(''); setError(''); setShowModal(true)
  }

  // Auto-fill Protocol ID and Site ID when Patient ID is entered
  const handlePatientIdBlur = async (e) => {
    const id = e.target.value
    if (!id || editing) return
    try {
      const res = await getPatientById(id)
      const p = res.data
      setForm(prev => ({
        ...prev,
        protocolId: p.protocolId || prev.protocolId,
        siteId:     p.siteId     || prev.siteId,
      }))
      setPatientHint(`✓ ${p.firstName} ${p.lastName} — Protocol #${p.protocolId || '—'}, Site #${p.siteId || '—'}`)
    } catch {
      setPatientHint('⚠ Patient not found')
    }
  }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      // If OTHER is selected, require the custom type and embed it in notes
      if (form.sampleType === 'OTHER' && !form.otherSampleType.trim()) {
        setError('Please specify the sample type when selecting "Other".')
        setSaving(false); return
      }
      const payload = { ...form }
      if (form.sampleType === 'OTHER' && form.otherSampleType.trim()) {
        payload.notes = `[Type: ${form.otherSampleType.trim()}]${form.notes ? ' ' + form.notes : ''}`
      }
      if (editing) await updateSample(editing.sampleId, payload)
      else await createSample(payload)
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save sample.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteSample(confirmDelete.sampleId)
      setConfirmDelete(null)
      load()
    } catch {
      alert('Failed to delete sample. Please try again.')
    } finally { setDeleting(false) }
  }

  const handleDispose = async (id) => {
    if (!window.confirm('Mark this sample as disposed?')) return
    await disposeSample(id).catch(() => {})
    load()
  }

  const handleStatusChange = async (id, status) => {
    await updateSampleStatus(id, status).catch(() => {})
    load()
  }

  const filtered = samples.filter(s => {
    const matchPatient = !filterPatientId || String(s.patientId) === filterPatientId.trim()
    const matchType    = !filterType    || s.sampleType === filterType
    const matchStatus  = !filterStatus  || s.status === filterStatus
    return matchPatient && matchType && matchStatus
  })

  const clearFilters = () => { setFilterPatientId(''); setFilterType(''); setFilterStatus('') }
  const hasFilters = filterPatientId || filterType || filterStatus

  const statusBadge = (s) => {
    const map = { COLLECTED: 'badge-primary', IN_STORAGE: 'badge-warning', ANALYZED: 'badge-success', DISPOSED: 'badge-danger' }
    return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s?.replace('_', ' ')}</span>
  }

  const typeBadge = (t) => <span className="badge badge-secondary">{t}</span>

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (

    <>
      <Navbar title="Sample Management" />
      <div className="page-content">
        <div className="page-header">
          <h2>Samples</h2>
          <p>Track biological samples through collection, processing, and analysis</p>
        </div>
        <div className="card">
          <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Patient ID filter */}
                <input
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '160px' }}
                  type="number"
                  placeholder="Filter by Patient ID"
                  value={filterPatientId}
                  onChange={e => setFilterPatientId(e.target.value)}
                />
                {/* Sample Type filter */}
                <select
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: filterType ? '#0f172a' : '#94a3b8' }}
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {SAMPLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {/* Status filter */}
                <select
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: filterStatus ? '#0f172a' : '#94a3b8' }}
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {SAMPLE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                {hasFilters && (
                  <button onClick={clearFilters} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', background: '#f8fafc', cursor: 'pointer', color: '#64748b' }}>
                    ✕ Clear
                  </button>
                )}
                {hasRole('ADMIN', 'LAB_TECHNICIAN') && (
                  <button
                    onClick={() => { const next = !showDeleted; setShowDeleted(next); load(next) }}
                    style={{
                      fontSize: '12px', padding: '7px 14px',
                      border: `2px solid ${showDeleted ? '#dc2626' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      background: showDeleted ? '#fef2f2' : '#fff',
                      color: showDeleted ? '#dc2626' : '#64748b',
                      fontWeight: showDeleted ? 600 : 400,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                    }}
                  >
                    {showDeleted ? '⚠ Showing Deleted' : 'Show Deleted'}
                  </button>
                )}
                <span style={{ color: '#64748b', fontSize: '13px' }}>{filtered.length} of {samples.length} samples</span>
              </div>
              {canWrite && <button className="btn btn-primary" onClick={openCreate}>+ Add Sample</button>}
            </div>
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? <div className="empty-state"><div className="icon">🧪</div><h3>No samples found</h3></div> :
            <div className="table-container">
              <table>
                <thead><tr><th>Sample ID</th><th>Patient ID</th><th>Protocol ID</th><th>Type</th><th>Collection Date</th><th>Storage Location</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.sampleId} style={{ background: showDeleted ? '#fff5f5' : undefined }}>
                      <td><strong>#{s.sampleId}</strong></td>
                      <td><span style={{ color: '#10b981', fontWeight: 500 }}>#{s.patientId}</span></td>
                      <td><span style={{ color: '#6366f1', fontWeight: 500 }}>#{s.protocolId}</span></td>
                      <td>{typeBadge(s.sampleType || '—')}</td>
                      <td>{s.collectionDate || '—'}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{s.storageLocation || '—'}</td>
                      <td>{statusBadge(s.status)}</td>
                      <td>
                        <div className="actions">
                          {showDeleted ? (
                            hasRole('ADMIN', 'LAB_TECHNICIAN') && (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => restoreSample(s.sampleId).then(() => load()).catch(() => {})}
                              >
                                ↩ Restore
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => openView(s)}
                                title="View lab result & history"
                              >
                                <EyeIcon /> View
                              </button>
                              {canWrite && <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(s)}><EditIcon /></button>}
                              {canWrite && (
                                <select style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                  value={s.status} onChange={e => handleStatusChange(s.sampleId, e.target.value)}>
                                  {SAMPLE_STATUSES.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                                </select>
                              )}
                              {hasRole('ADMIN', 'LAB_TECHNICIAN') && <button className="btn btn-icon btn-sm" title="Delete" onClick={() => setConfirmDelete(s)}><TrashIcon /></button>}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: '12px 12px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrashIcon size={22} color="#fff" />
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Delete Sample</h3>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 13 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                Are you sure you want to permanently delete this sample?
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Sample #{confirmDelete.sampleId}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Patient #{confirmDelete.patientId} &nbsp;·&nbsp; Type: {confirmDelete.sampleType}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                  style={{ minWidth: 90 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ minWidth: 120, background: '#ef4444', color: '#fff', border: 'none' }}
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sample View Modal ─────────────────────────────────────────────────── */}
      {viewSample && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '90vw', maxWidth: 900, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800 }}>
                  Sample #{viewSample.sampleId}
                  <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 14, marginLeft: 10 }}>{viewSample.sampleType}</span>
                </h3>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>
                    👤 {viewPatientName
                      ? <><strong style={{ color: '#fff' }}>{viewPatientName}</strong> <span style={{ opacity: 0.6 }}>(#{viewSample.patientId})</span></>
                      : `Patient #${viewSample.patientId}`}
                  </span>
                  <span>
                    📋 {viewProtocolName
                      ? <><strong style={{ color: '#fff' }}>{viewProtocolName}</strong> <span style={{ opacity: 0.6 }}>(#{viewSample.protocolId})</span></>
                      : `Protocol #${viewSample.protocolId}`}
                  </span>
                  <span>📅 Collected: {viewSample.collectionDate || '—'}</span>
                  <span>📦 {viewSample.storageLocation || '—'}</span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge ${{ COLLECTED: 'badge-primary', IN_STORAGE: 'badge-warning', ANALYZED: 'badge-success', DISPOSED: 'badge-danger' }[viewSample.status] || 'badge-secondary'}`}>
                  {viewSample.status?.replace('_', ' ')}
                </span>
                <button onClick={closeView} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <XIcon />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
              {viewLoading ? (
                <div className="loading"><div className="spinner" />Loading sample details...</div>
              ) : (
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>

                  {/* ── Status History ── */}
                  <div style={{ flex: '0 0 260px', minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 16 }}>📋</span>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Status History</h4>
                      <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{viewHistory.length}</span>
                    </div>
                    {viewHistory.length === 0 ? (
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        No history recorded yet.
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        {viewHistory.map((h, idx) => {
                          const isLast = idx === viewHistory.length - 1
                          const c = historyColors[h.status] || { bg: '#f1f5f9', text: '#374151', dot: '#94a3b8' }
                          const dateStr = h.changedAt
                            ? (() => { const d = new Date(h.changedAt); return isNaN(d) ? h.changedAt : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) })()
                            : '—'
                          return (
                            <div key={h.historyId} style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                                <div style={{ width: 13, height: 13, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 3, border: '2px solid #fff', boxShadow: `0 0 0 2px ${c.dot}` }} />
                                {!isLast && <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 3 }} />}
                              </div>
                              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                                <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{h.status}</span>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{dateStr}</div>
                                {h.changedBy && <div style={{ fontSize: 11, color: '#94a3b8' }}>by {h.changedBy}</div>}
                                {h.notes && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>{h.notes}</div>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, background: '#e2e8f0', flexShrink: 0, alignSelf: 'stretch' }} />

                  {/* ── Lab Result ── */}
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 16 }}>🔬</span>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Lab Result</h4>
                    </div>
                    {!viewLabResult ? (
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        ⚠️ No lab result found for this sample.
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#5b21b6' }}>Result #{viewLabResult.resultId}</span>
                          <Badge value={viewLabResult.status} map={labBadgeClass} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
                          {[
                            ['Test Name',       viewLabResult.testName],
                            ['Result',          viewLabResult.result],
                            ['Unit',            viewLabResult.unit],
                            ['Reference Range', viewLabResult.referenceRange],
                            ['Performed Date',  viewLabResult.performedDate],
                            ['Performed By',    viewLabResult.performedBy],
                          ].map(([label, value]) => (
                            <div key={label} style={{ background: '#faf5ff', borderRadius: 9, padding: '9px 13px', border: '1px solid #e9d5ff' }}>
                              <div style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{value || '—'}</div>
                            </div>
                          ))}
                        </div>
                        {(viewLabResult.reviewNotes || viewLabResult.rejectionReason) && (
                          <div style={{ background: '#faf5ff', borderRadius: 9, padding: '10px 14px', border: '1px solid #e9d5ff', fontSize: 13, color: '#374151' }}>
                            <strong>{viewLabResult.rejectionReason ? '❌ Rejection Reason' : '📝 Review Notes'}:</strong>{' '}
                            {viewLabResult.rejectionReason || viewLabResult.reviewNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '8px 22px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}
                onClick={closeView}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Sample' : 'Add Sample'} onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label>Patient ID *</label>
            <input
              className="form-control"
              type="number"
              value={form.patientId}
              onChange={f('patientId')}
              onBlur={handlePatientIdBlur}
              placeholder="Enter Patient ID — Protocol & Site will auto-fill"
            />
            {patientHint && (
              <small style={{ color: patientHint.startsWith('✓') ? '#10b981' : '#ef4444', marginTop: '4px', display: 'block' }}>
                {patientHint}
              </small>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Protocol ID <span style={{ color: '#94a3b8', fontSize: '11px' }}>(auto-filled)</span></label>
              <input className="form-control" type="number" value={form.protocolId} onChange={f('protocolId')}
                placeholder="Auto-filled from patient" style={{ background: form.protocolId ? '#f0fdf4' : '' }} />
            </div>
            <div className="form-group">
              <label>Site ID <span style={{ color: '#94a3b8', fontSize: '11px' }}>(auto-filled)</span></label>
              <input className="form-control" type="number" value={form.siteId} onChange={f('siteId')}
                placeholder="Auto-filled from patient" style={{ background: form.siteId ? '#f0fdf4' : '' }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Sample Type *</label>
              <select className="form-control" value={form.sampleType} onChange={f('sampleType')}>
                {SAMPLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Collection Date *</label><input className="form-control" type="date" value={form.collectionDate} onChange={f('collectionDate')} /></div>
          </div>
          {form.sampleType === 'OTHER' && (
            <div className="form-group" style={{ marginTop: '-8px' }}>
              <label>Specify Sample Type *</label>
              <input
                className="form-control"
                value={form.otherSampleType}
                onChange={f('otherSampleType')}
                placeholder="e.g. Synovial Fluid, Bone Marrow, Swab"
                autoFocus
              />
            </div>
          )}
          <div className="form-row">
            <div className="form-group"><label>Storage Location</label><input className="form-control" value={form.storageLocation} onChange={f('storageLocation')} placeholder="e.g. Freezer B, Rack 2, Slot 4" /></div>
            <div className="form-group"><label>Status</label>
              <select className="form-control" value={form.status} onChange={f('status')}>
                {SAMPLE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={f('notes')} placeholder="e.g. Sample collected under fasting conditions; stored at -80°C" style={{ resize: 'vertical' }} />
          </div>
        </Modal>
      )}
    </>
  )
}
