import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getVisits, createVisit, updateVisit, deleteVisit, getDeletedVisits, restoreVisit } from '../api/visits'
import { getPatientById } from '../api/patients'
import { createNotification } from '../api/notifications'
import { getUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'

const empty = { patientId: '', visitDate: '', visitType: '', notes: '', status: '' }
const VISIT_TYPES = ['SCREENING', 'BASELINE', 'FOLLOW_UP', 'END_OF_STUDY', 'UNSCHEDULED']
const VISIT_STATUSES = ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED']

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

export default function Visits() {
  const { hasRole, user } = useAuth()
  const canWrite = hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null) // holds visit object
  const [deleting,      setDeleting]      = useState(false)

  // Filters
  const [filterPatientId, setFilterPatientId] = useState('')
  const [filterType,      setFilterType]      = useState('')
  const [filterStatus,    setFilterStatus]    = useState('')
  const [showDeleted,     setShowDeleted]     = useState(false)

  const load = (deleted = showDeleted) => {
    setLoading(true)
    const fetch = deleted ? getDeletedVisits() : getVisits()
    fetch.then(r => setVisits(r.data || [])).catch(() => setVisits([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setFieldErrors({}); setShowModal(true) }
  const openEdit = (v) => {
    setEditing(v)
    setForm({ patientId: v.patientId || '', visitDate: v.visitDate || '', visitType: v.visitType || '', notes: v.notes || '', status: v.status || '' })
    setError(''); setFieldErrors({}); setShowModal(true)
  }

  const clearFieldError = (k) => setFieldErrors(prev => { const n = { ...prev }; delete n[k]; return n })

  const validate = () => {
    const errs = {}
    if (!form.patientId) errs.patientId = 'Patient ID is required.'
    if (!form.visitDate)  errs.visitDate  = 'Visit date is required.'
    return errs
  }

  const handleSave = async () => {
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setSaving(true)
    try {
      // Verify the patient exists before saving
      if (!editing) {
        try {
          await getPatientById(Number(form.patientId))
        } catch (e) {
          if (e.response?.status === 404) {
            setFieldErrors({ patientId: `Patient #${form.patientId} does not exist. Please check the Patient ID.` })
            setSaving(false)
            return
          }
        }
      }

      if (editing) {
        await updateVisit(editing.visitId, form)
      } else {
        await createVisit({ ...form, createdByName: user?.name, createdByUserId: user?.userId })
        // Notify each CTM individually when admin schedules a visit
        if (hasRole('ADMIN')) {
          const typeLabel = form.visitType ? form.visitType.replace(/_/g, ' ') : 'visit'
          const message = `Admin "${user?.name}" scheduled a new ${typeLabel} for Patient #${form.patientId}${form.visitDate ? ` on ${form.visitDate}` : ''}.`
          getUsers().then(res => {
            const ctms = (res.data || []).filter(u => u.role === 'CLINICAL_TRIAL_MANAGER')
            ctms.forEach(ctm => {
              createNotification({
                userId: Number(ctm.userId),
                senderUserId: user?.userId ? Number(user.userId) : null,
                title: 'New Visit Scheduled',
                message,
                type: 'INFO',
              }).catch(() => {})
            })
          }).catch(() => {})
        }
      }
      setShowModal(false); load()
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.toLowerCase().includes('patient') && msg.toLowerCase().includes('not found')) {
        setFieldErrors({ patientId: `Patient #${form.patientId} does not exist. Please check the Patient ID.` })
      } else {
        setError(msg || 'Failed to save visit. Please try again.')
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteVisit(confirmDelete.visitId)
      setConfirmDelete(null)
      load()
    } catch {
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = filterPatientId !== '' || filterType !== '' || filterStatus !== ''
  const filtered = visits.filter(v => {
    const patientMatch = filterPatientId === '' || String(v.patientId).includes(filterPatientId.trim())
    const typeMatch    = filterType      === '' || v.visitType === filterType
    const statusMatch  = filterStatus   === '' || v.status    === filterStatus
    return patientMatch && typeMatch && statusMatch
  })
  const clearFilters = () => { setFilterPatientId(''); setFilterType(''); setFilterStatus('') }

  const statusBadge = (s) => {
    const map = { SCHEDULED: 'badge-primary', COMPLETED: 'badge-success', MISSED: 'badge-danger', CANCELLED: 'badge-secondary' }
    return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s}</span>
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <Navbar title="Visit Management" />
      <div className="page-content">
        <div className="page-header">
          <h2>Visits</h2>
          <p>Track patient clinical visits and appointments</p>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>

              {/* Filter by Patient ID */}
              <input
                className="search-input"
                placeholder="🔍 Patient ID..."
                value={filterPatientId}
                onChange={e => setFilterPatientId(e.target.value.replace(/\D/g, ''))}
                style={{ minWidth: 130, maxWidth: 150 }}
                inputMode="numeric"
              />

              {/* Filter by Type */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{
                  fontSize: '13px', padding: '7px 10px',
                  border: filterType ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: '8px', background: '#fff', color: '#374151',
                  cursor: 'pointer', minWidth: 160
                }}
              >
                <option value="">All Types</option>
                {VISIT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>

              {/* Filter by Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{
                  fontSize: '13px', padding: '7px 10px',
                  border: filterStatus ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  borderRadius: '8px', background: '#fff', color: '#374151',
                  cursor: 'pointer', minWidth: 150
                }}
              >
                <option value="">All Statuses</option>
                {VISIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Clear */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#64748b', cursor: 'pointer' }}
                >
                  ✕ Clear
                </button>
              )}

              {/* Show Deleted — ADMIN + CTM */}
              {canWrite && (
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

              <span style={{ color: '#64748b', fontSize: '13px', marginLeft: 'auto' }}>
                {filtered.length} of {visits.length} records
              </span>
            </div>
            {canWrite && <button className="btn btn-primary" onClick={openCreate}>+ Schedule Visit</button>}
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? <div className="empty-state"><div className="icon">📅</div><h3>No visits found</h3></div> :
            <div className="table-container">
              <table>
                <thead><tr><th>Visit ID</th><th>Patient ID</th><th>Visit Date</th><th>Type</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.visitId} style={{ background: showDeleted ? '#fff5f5' : undefined }}>
                      <td>#{v.visitId}</td>
                      <td>Patient #{v.patientId}</td>
                      <td>{v.visitDate || '—'}</td>
                      <td><span className="badge badge-secondary">{v.visitType || '—'}</span></td>
                      <td>{statusBadge(v.status)}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.notes || '—'}</td>
                      <td>
                        <div className="actions">
                          {showDeleted ? (
                            canWrite && (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => restoreVisit(v.visitId).then(() => load()).catch(() => {})}
                              >
                                ↩ Restore
                              </button>
                            )
                          ) : (
                            <>
                              {canWrite && <button className="btn btn-icon btn-sm" onClick={() => openEdit(v)}><EditIcon /></button>}
                              {canWrite && <button className="btn btn-icon btn-sm" onClick={() => setConfirmDelete(v)}><TrashIcon /></button>}
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

      {showModal && (
        <Modal title={editing ? 'Edit Visit' : 'Schedule Visit'} onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            {/* Patient ID */}
            <div className="form-group">
              <label>Patient ID <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                className="form-control"
                type="number"
                value={form.patientId}
                onChange={e => { setForm({ ...form, patientId: e.target.value }); clearFieldError('patientId') }}
                placeholder="Patient # from Patients page"
                style={{ borderColor: fieldErrors.patientId ? '#dc2626' : undefined }}
              />
              {fieldErrors.patientId && (
                <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.patientId}</p>
              )}
            </div>

            {/* Visit Date */}
            <div className="form-group">
              <label>Visit Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                className="form-control"
                type="date"
                value={form.visitDate}
                onChange={e => { setForm({ ...form, visitDate: e.target.value }); clearFieldError('visitDate') }}
                style={{ borderColor: fieldErrors.visitDate ? '#dc2626' : undefined }}
              />
              {fieldErrors.visitDate && (
                <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.visitDate}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Visit Type</label>
              <select className="form-control" value={form.visitType} onChange={f('visitType')}>
                <option value="">— Select visit type —</option>
                {VISIT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={f('status')}>
                <option value="" disabled>Status</option>
                {VISIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" rows={3} value={form.notes} onChange={f('notes')} placeholder="e.g. Patient reports reduced symptoms; vitals within normal range" style={{ resize: 'vertical' }} />
          </div>
        </Modal>
      )}
      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '20px 24px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrashIcon size={22} color="#fff" />
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Delete Visit</h3>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>This action cannot be undone</p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#374151', marginBottom: 14 }}>Are you sure you want to delete this visit?</p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  Visit <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>#{confirmDelete.visitId}</span>
                  {confirmDelete.visitType && <span style={{ marginLeft: 8, fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{confirmDelete.visitType.replace(/_/g, ' ')}</span>}
                </span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Patient #{confirmDelete.patientId}</span>
                {confirmDelete.visitDate && <span style={{ fontSize: 12, color: '#6b7280' }}>Date: {confirmDelete.visitDate}</span>}
                <span style={{ fontSize: 12, color: '#6b7280' }}>Status: <strong>{confirmDelete.status}</strong></span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {deleting
                  ? <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Deleting...</>
                  : <><TrashIcon size={13} color="#fff" /> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
