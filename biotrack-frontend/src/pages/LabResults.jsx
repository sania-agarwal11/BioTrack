import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getLabResults, createLabResult, updateLabResult, deleteLabResult, getDeletedLabResults, restoreLabResult } from '../api/labResults'
import { getSampleById } from '../api/samples'
import { useAuth } from '../context/AuthContext'

const empty = { sampleId: '', testName: '', result: '', unit: '', referenceRange: '', status: '', performedBy: '', performedDate: '', reviewNotes: '', rejectionReason: '' }
const RESULT_STATUSES = ['PENDING', 'COMPLETED', 'REVIEWED', 'REJECTED']

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

export default function LabResults() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('ADMIN', 'LAB_TECHNICIAN')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterSampleId, setFilterSampleId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  // Sample collection date — fetched when sampleId is entered/changed
  const [sampleCollectionDate, setSampleCollectionDate] = useState(null)
  const [sampleLookupLoading, setSampleLookupLoading] = useState(false)

  const load = (deleted = showDeleted) => {
    setLoading(true)
    const fetch = deleted ? getDeletedLabResults() : getLabResults()
    fetch.then(r => setResults(r.data || [])).catch(() => setResults([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null); setForm(empty); setError('')
    setSampleCollectionDate(null); setShowModal(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      sampleId: r.sampleId || '', testName: r.testName || '', result: r.result || '',
      unit: r.unit || '', referenceRange: r.referenceRange || '', status: r.status || '',
      performedBy: r.performedBy || '', performedDate: r.performedDate || '',
      reviewNotes: r.reviewNotes || '',
      rejectionReason: r.rejectionReason || ''
    })
    setError('')
    // Pre-fetch sample collection date for the existing sampleId
    setSampleCollectionDate(null)
    if (r.sampleId) {
      getSampleById(r.sampleId)
        .then(res => setSampleCollectionDate(res.data?.collectionDate || null))
        .catch(() => setSampleCollectionDate(null))
    }
    setShowModal(true)
  }

  // Called when user finishes typing a Sample ID (onBlur)
  const handleSampleIdBlur = () => {
    if (!form.sampleId) { setSampleCollectionDate(null); return }
    setSampleLookupLoading(true)
    getSampleById(form.sampleId)
      .then(res => setSampleCollectionDate(res.data?.collectionDate || null))
      .catch(() => setSampleCollectionDate(null))
      .finally(() => setSampleLookupLoading(false))
  }

  const resultRequired = ['COMPLETED', 'REVIEWED'].includes(form.status)
  const resultDisabled = form.status === 'PENDING'

  const handleSave = async () => {
    setError('')
    // Frontend validation
    if (!form.sampleId) { setError('Sample ID is required.'); return }
    if (!form.testName?.trim()) { setError('Test Name is required.'); return }
    if (!form.status) { setError('Status is required.'); return }
    if (resultRequired && !form.result?.trim()) {
      setError(`Result value is required when status is "${form.status}". A successfully conducted test must have a recorded result.`)
      return
    }
    if (resultRequired && !form.performedDate) {
      setError(`Performed Date is required when status is "${form.status}".`)
      return
    }
    if (form.status === 'REVIEWED' && !form.reviewNotes?.trim()) { setError('Please enter Review Notes when status is REVIEWED.'); return }
    if (form.status === 'REJECTED' && !form.rejectionReason?.trim()) { setError('Please enter a Rejection Reason when status is REJECTED.'); return }
    // ── Collection date guard ────────────────────────────────────────────────
    if (form.performedDate && sampleCollectionDate && form.performedDate < sampleCollectionDate) {
      setError(`Performed Date (${form.performedDate}) cannot be earlier than the sample's Collection Date (${sampleCollectionDate}). A test cannot be performed before the sample is collected.`)
      return
    }
    setSaving(true)
    try {
      if (editing) await updateLabResult(editing.resultId, form)
      else await createLabResult(form)
      setShowModal(false); load()
    } catch (err) {
      const serverMsg = err.response?.data
      if (err.response?.status === 404 && typeof serverMsg === 'string' && serverMsg.toLowerCase().includes('sample not found')) {
        setError(`Sample ID ${form.sampleId} not found. Please enter a valid Sample ID.`)
      } else {
        setError(typeof serverMsg === 'string' ? serverMsg : 'Failed to save lab result.')
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteLabResult(confirmDelete.resultId)
      setConfirmDelete(null)
      load()
    } catch {
      alert('Failed to delete lab result. Please try again.')
    } finally { setDeleting(false) }
  }

  const filtered = results.filter(r => {
    const matchSample = !filterSampleId || String(r.sampleId) === filterSampleId.trim()
    const matchDate   = !filterDate   || (r.performedDate || '').startsWith(filterDate)
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSample && matchDate && matchStatus
  })

  const clearFilters = () => { setFilterSampleId(''); setFilterDate(''); setFilterStatus('') }
  const hasFilters = filterSampleId || filterDate || filterStatus

  const statusBadge = (s) => {
    const map = { PENDING: 'badge-warning', COMPLETED: 'badge-success', REVIEWED: 'badge-primary', REJECTED: 'badge-danger' }
    return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s}</span>
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (

    <>
      <Navbar title="Lab Results" />
      <div className="page-content">
        <div className="page-header">
          <h2>Lab Results</h2>
          <p>Manage laboratory test results linked to samples</p>
        </div>
        <div className="card">
          <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Sample ID filter */}
                <input
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '160px' }}
                  type="number"
                  placeholder="Filter by Sample ID"
                  value={filterSampleId}
                  onChange={e => setFilterSampleId(e.target.value)}
                />
                {/* Date filter */}
                <input
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  title="Filter by date"
                />
                {/* Status filter */}
                <select
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: filterStatus ? '#0f172a' : '#94a3b8' }}
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {RESULT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                <span style={{ color: '#64748b', fontSize: '13px' }}>{filtered.length} of {results.length} results</span>
              </div>
              {canWrite && <button className="btn btn-primary" onClick={openCreate}>+ Add Result</button>}
            </div>
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? <div className="empty-state"><div className="icon">🔬</div><h3>No lab results found</h3></div> :
            <div className="table-container">
              <table>
                <thead><tr><th>Sample ID</th><th>Test Name</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Performed By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.resultId} style={{ background: showDeleted ? '#fff5f5' : undefined }}>
                      <td>#{r.sampleId}</td>
                      <td><strong>{r.testName}</strong></td>
                      <td style={{ fontWeight: 600 }}>{r.result || '—'}</td>
                      <td>{r.unit || '—'}</td>
                      <td style={{ color: '#64748b' }}>{r.referenceRange || '—'}</td>
                      <td>{r.performedBy || '—'}</td>
                      <td>{r.performedDate || '—'}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>
                        <div className="actions">
                          {showDeleted ? (
                            hasRole('ADMIN', 'LAB_TECHNICIAN') && (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => restoreLabResult(r.resultId).then(() => load()).catch(() => {})}
                              >
                                ↩ Restore
                              </button>
                            )
                          ) : (
                            <>
                              {canWrite && <button className="btn btn-icon btn-sm" onClick={() => openEdit(r)}><EditIcon /></button>}
                              {hasRole('ADMIN', 'LAB_TECHNICIAN') && <button className="btn btn-icon btn-sm" onClick={() => setConfirmDelete(r)}><TrashIcon /></button>}
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
                <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Delete Lab Result</h3>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 13 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                Are you sure you want to permanently delete this lab result?
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{confirmDelete.testName}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Result #{confirmDelete.resultId} &nbsp;·&nbsp; Sample #{confirmDelete.sampleId}
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

      {showModal && (
        <Modal title={editing ? 'Edit Lab Result' : 'Add Lab Result'} onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Sample ID *</label>
              <input
                className="form-control"
                type="number"
                value={form.sampleId}
                onChange={e => { setForm({ ...form, sampleId: e.target.value }); setSampleCollectionDate(null) }}
                onBlur={handleSampleIdBlur}
                placeholder="e.g. 3"
              />
              {sampleLookupLoading && (
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>🔍 Looking up sample...</p>
              )}
              {sampleCollectionDate && !sampleLookupLoading && (
                <p style={{ fontSize: 11, color: '#0369a1', marginTop: 3, fontWeight: 500 }}>
                  📅 Sample collected on <strong>{sampleCollectionDate}</strong> — Performed Date must be on or after this date.
                </p>
              )}
              {form.sampleId && !sampleCollectionDate && !sampleLookupLoading && (
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Tab out of this field to validate the sample.</p>
              )}
            </div>
            <div className="form-group"><label>Test Name *</label><input className="form-control" value={form.testName} onChange={f('testName')} placeholder="e.g. Complete Blood Count (CBC)" /></div>
          </div>
          {resultDisabled && (
            <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⏳ <strong>Status is PENDING</strong> — Result, Performed By, and Performed Date cannot be entered until the test is conducted. Change the status to COMPLETED to record results.
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>
                Result {resultRequired && <span style={{ color: '#ef4444' }}>*</span>}
                {resultRequired && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 6, fontWeight: 500 }}>Required for {form.status}</span>}
                {resultDisabled && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6, fontWeight: 500 }}>— locked while PENDING</span>}
              </label>
              <input
                className="form-control"
                value={form.result}
                onChange={f('result')}
                placeholder={resultDisabled ? 'Not available — test is pending' : 'e.g. 7.2'}
                disabled={resultDisabled}
                style={{
                  borderColor: resultRequired && !form.result?.trim() ? '#f59e0b' : undefined,
                  background: resultDisabled ? '#f1f5f9' : undefined,
                  color: resultDisabled ? '#94a3b8' : undefined,
                  cursor: resultDisabled ? 'not-allowed' : undefined,
                }}
              />
            </div>
            <div className="form-group"><label>Unit</label><input className="form-control" value={form.unit} onChange={f('unit')} placeholder="e.g. mg/dL" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reference Range</label><input className="form-control" value={form.referenceRange} onChange={f('referenceRange')} placeholder="e.g. 4.0 - 8.0" /></div>
            <div className="form-group"><label>Status *</label>
              <select className="form-control" value={form.status} onChange={f('status')}>
                <option value="">Select status</option>
                {RESULT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {form.status === 'REVIEWED' && (
            <div className="form-group">
              <label>
                Review Notes
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={form.reviewNotes}
                onChange={f('reviewNotes')}
                placeholder="e.g. Results reviewed by Dr. Ananya Rao. HbA1c within acceptable range; recommend follow-up in 3 months."
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>
          )}
          {form.status === 'REJECTED' && (
            <div className="form-group">
              <label>
                Rejection Reason
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={form.rejectionReason}
                onChange={f('rejectionReason')}
                placeholder="e.g. Sample was haemolysed and could not be processed. Please recollect and resubmit."
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>
                Performed By
                {resultDisabled && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>— locked while PENDING</span>}
              </label>
              <input
                className="form-control"
                value={form.performedBy}
                onChange={f('performedBy')}
                placeholder={resultDisabled ? 'Not available — test is pending' : 'e.g. Dr. Ananya Rao'}
                disabled={resultDisabled}
                style={{
                  background: resultDisabled ? '#f1f5f9' : undefined,
                  color: resultDisabled ? '#94a3b8' : undefined,
                  cursor: resultDisabled ? 'not-allowed' : undefined,
                }}
              />
            </div>
            <div className="form-group">
              <label>
                Performed Date {resultRequired && <span style={{ color: '#ef4444' }}>*</span>}
                {resultDisabled && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>— locked while PENDING</span>}
              </label>
              {/* Inline warning when user picks a date earlier than collection */}
              {form.performedDate && sampleCollectionDate && form.performedDate < sampleCollectionDate && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px', marginBottom: 5, fontSize: 11, color: '#b91c1c', fontWeight: 500 }}>
                  ❌ {form.performedDate} is before the collection date ({sampleCollectionDate}). Please pick a valid date.
                </div>
              )}
              <input
                className="form-control"
                type="date"
                value={form.performedDate}
                onChange={e => {
                  setForm({ ...form, performedDate: e.target.value })
                }}
                disabled={resultDisabled}
                min={sampleCollectionDate || undefined}
                style={{
                  borderColor: (form.performedDate && sampleCollectionDate && form.performedDate < sampleCollectionDate)
                    ? '#ef4444'
                    : resultRequired && !form.performedDate ? '#f59e0b' : undefined,
                  background: resultDisabled ? '#f1f5f9' : undefined,
                  color: resultDisabled ? '#94a3b8' : undefined,
                  cursor: resultDisabled ? 'not-allowed' : undefined,
                }}
              />
              {sampleCollectionDate && !resultDisabled && (
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  Earliest allowed: <strong>{sampleCollectionDate}</strong>
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
