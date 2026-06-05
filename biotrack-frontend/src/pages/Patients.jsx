import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getPatients, createPatient, updatePatient, deletePatient, updateEnrollmentStatus, getDeletedPatients, restorePatient } from '../api/patients'
import { createNotification } from '../api/notifications'
import { getUsers } from '../api/users'
import { getProtocols } from '../api/protocols'
import { getSites, getSitesByProtocol } from '../api/sites'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['SCREENING', 'ENROLLED', 'ANALYZING', 'COMPLETED', 'WITHDRAWN', 'CANCELLED']
const empty = {
  firstName: '', lastName: '', dateOfBirth: '', gender: '',
  contactNumber: '', email: '', address: '',
  protocolId: '', siteId: '', enrollmentStatus: 'SCREENING'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Defined OUTSIDE the component so React never treats it as a new type on re-render
function EditIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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

function InputField({ label, required, error, children }) {
  return (
    <div className="form-group">
      <label>{label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}</label>
      {children}
      {error && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{error}</p>}
    </div>
  )
}

export default function Patients() {
  const { hasRole, user } = useAuth()
  const navigate = useNavigate()
  const canWrite = hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')

  const [patients,  setPatients]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(empty)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Delete confirmation modal
  const [confirmDelete, setConfirmDelete] = useState(null) // holds the patient object
  const [deleting,      setDeleting]      = useState(false)

  // Dropdown data
  const [protocols,     setProtocols]     = useState([])
  const [sites,         setSites]         = useState([])
  const [loadingSites,  setLoadingSites]  = useState(false)

  // Filter state
  const [filterProtocolId, setFilterProtocolId] = useState('')
  const [filterSiteId,     setFilterSiteId]     = useState('')
  const [filterStatus,     setFilterStatus]     = useState('')
  const [showDeleted,      setShowDeleted]      = useState(false)
  const [filterProtocols,  setFilterProtocols]  = useState([])
  const [filterSites,      setFilterSites]      = useState([])

  // Field-level validation messages
  const [fieldErrors, setFieldErrors] = useState({})

  // ── Load patients ────────────────────────────────────────────────────────
  const load = (deleted = showDeleted) => {
    setLoading(true)
    const fetch = deleted ? getDeletedPatients() : getPatients()
    fetch.then(r => setPatients(r.data || [])).catch(() => setPatients([])).finally(() => setLoading(false))
  }
  useEffect(() => {
    load(showDeleted)
    // Load protocols + sites for the filter bar (separate from modal dropdowns)
    getProtocols().then(r => setFilterProtocols(r.data || [])).catch(() => setFilterProtocols([]))
    getSites().then(r => setFilterSites(r.data || [])).catch(() => setFilterSites([]))
  }, [showDeleted])

  // ── Load protocols + all sites when modal opens ──────────────────────────
  const loadDropdowns = () => {
    getProtocols().then(r => setProtocols(r.data || [])).catch(() => setProtocols([]))
    getSites().then(r => setSites(r.data || [])).catch(() => setSites([]))
  }

  // ── When protocol changes, reload sites filtered to that protocol ─────────
  const handleProtocolChange = (value) => {
    setForm(prev => ({ ...prev, protocolId: value, siteId: '' }))
    clearFieldError('protocolId')
    if (!value) {
      // No protocol selected → show all sites
      getSites().then(r => setSites(r.data || [])).catch(() => setSites([]))
      return
    }
    setLoadingSites(true)
    getSitesByProtocol(value)
      .then(r => setSites(r.data?.length ? r.data : []))
      .catch(() => getSites().then(r => setSites(r.data || [])))
      .finally(() => setLoadingSites(false))
  }

  // ── Open modals ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null); setForm(empty); setError(''); setFieldErrors({})
    loadDropdowns(); setShowModal(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      firstName: p.firstName || '', lastName: p.lastName || '',
      dateOfBirth: p.dateOfBirth || '', gender: p.gender || '',
      contactNumber: p.contactNumber || '', email: p.email || '',
      address: p.address || '', protocolId: p.protocolId || '',
      siteId: p.siteId || '', enrollmentStatus: p.enrollmentStatus || 'SCREENING'
    })
    setError(''); setFieldErrors({})
    loadDropdowns()
    // If patient has a protocol, pre-filter sites
    if (p.protocolId) {
      setLoadingSites(true)
      getSitesByProtocol(p.protocolId)
        .then(r => setSites(r.data?.length ? r.data : []))
        .catch(() => getSites().then(r => setSites(r.data || [])))
        .finally(() => setLoadingSites(false))
    }
    setShowModal(true)
  }

  // ── Field-level error helpers ─────────────────────────────────────────────
  const clearFieldError = (key) => setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })

  const f = (k) => (e) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }))
    clearFieldError(k)
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.firstName.trim())  errs.firstName = 'First name is required.'
    if (!form.lastName.trim())   errs.lastName  = 'Last name is required.'
    if (!form.gender)            errs.gender    = 'Gender is required.'
    if (form.contactNumber && form.contactNumber.replace(/\D/g, '').length !== 10)
      errs.contactNumber = 'Contact number must be exactly 10 digits.'
    if (form.email && !EMAIL_RE.test(form.email))
      errs.email = 'Please enter a valid email address.'
    return errs
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        protocolId: form.protocolId !== '' ? Number(form.protocolId) : null,
        siteId:     form.siteId     !== '' ? Number(form.siteId)     : null,
      }
      if (editing) {
        await updatePatient(editing.patientId, payload)
      } else {
        const created = await createPatient({ ...payload, createdByName: user?.name, createdByUserId: user?.userId })
        // Notify each CTM individually when admin creates a patient
        if (hasRole('ADMIN')) {
          const name = `${payload.firstName || ''} ${payload.lastName || ''}`.trim()
          const message = `Admin "${user?.name}" enrolled a new patient: ${name}${payload.protocolId ? ` (Protocol #${payload.protocolId})` : ''}.`
          getUsers().then(res => {
            const ctms = (res.data || []).filter(u => u.role === 'CLINICAL_TRIAL_MANAGER')
            ctms.forEach(ctm => {
              createNotification({
                userId: Number(ctm.userId),
                senderUserId: user?.userId ? Number(user.userId) : null,
                title: 'New Patient Enrolled',
                message,
                type: 'INFO',
              }).catch(() => {})
            })
          }).catch(() => {})
        }
      }
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save patient.')
    } finally { setSaving(false) }
  }

  // ── Delete / status ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deletePatient(confirmDelete.patientId)
      setConfirmDelete(null)
      load()
    } catch (err) {
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    await updateEnrollmentStatus(id, status).catch(() => {})
    load()
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const hasFilters = search.trim() !== '' || filterProtocolId !== '' || filterSiteId !== '' || filterStatus !== ''
  const filtered = patients.filter(p => {
    const nameMatch     = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(search.toLowerCase())
    const protocolMatch = filterProtocolId === '' || String(p.protocolId)       === String(filterProtocolId)
    const siteMatch     = filterSiteId     === '' || String(p.siteId)           === String(filterSiteId)
    const statusMatch   = filterStatus     === '' || p.enrollmentStatus         === filterStatus
    return nameMatch && protocolMatch && siteMatch && statusMatch
  })

  const clearFilters = () => { setSearch(''); setFilterProtocolId(''); setFilterSiteId(''); setFilterStatus('') }

  const statusBadge = (s) => {
    const map = {
      SCREENING:  'badge-warning',
      ENROLLED:   'badge-success',
      ANALYZING:  'badge-primary',
      COMPLETED:  'badge-secondary',
      WITHDRAWN:  'badge-danger',
      CANCELLED:  'badge-secondary',
    }
    return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s}</span>
  }

  // ── Helpers for dropdowns ─────────────────────────────────────────────────
  const protocolLabel = (id) => {
    const p = protocols.find(p => String(p.protocolId) === String(id))
    return p ? `${p.title} (#${p.protocolId})` : id ? `#${id}` : '—'
  }
  const siteLabel = (id) => {
    const s = sites.find(s => String(s.siteId) === String(id))
    return s ? `${s.name} (#${s.siteId})` : id ? `#${id}` : '—'
  }

  return (
    <>
      <Navbar title="Patient Management" />
      <div className="page-content">
        <div className="page-header">
          <h2>Patients</h2>
          <p>Manage enrolled patients and their clinical trial participation</p>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Search by name */}
              <input
                className="search-input"
                placeholder="🔍 Search by patient name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 220 }}
              />

              {/* Filter by Protocol */}
              <select
                value={filterProtocolId}
                onChange={e => setFilterProtocolId(e.target.value)}
                style={{
                  fontSize: '13px', padding: '7px 10px',
                  border: filterProtocolId ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: '8px', background: '#fff', color: '#374151',
                  cursor: 'pointer', minWidth: 180
                }}
              >
                <option value="">All Protocols</option>
                {filterProtocols.map(p => (
                  <option key={p.protocolId} value={p.protocolId}>
                    {p.title} (#{p.protocolId})
                  </option>
                ))}
              </select>

              {/* Filter by Site */}
              <select
                value={filterSiteId}
                onChange={e => setFilterSiteId(e.target.value)}
                style={{
                  fontSize: '13px', padding: '7px 10px',
                  border: filterSiteId ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                  borderRadius: '8px', background: '#fff', color: '#374151',
                  cursor: 'pointer', minWidth: 180
                }}
              >
                <option value="">All Sites</option>
                {filterSites.map(s => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.name} (#{s.siteId})
                  </option>
                ))}
              </select>

              {/* Filter by Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{
                  fontSize: '13px', padding: '7px 10px',
                  border: filterStatus ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  borderRadius: '8px', background: '#fff', color: '#374151',
                  cursor: 'pointer', minWidth: 160
                }}
              >
                <option value="">Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Show Deleted toggle — ADMIN + CTM */}
              {hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER') && (
                <button
                  onClick={() => setShowDeleted(v => !v)}
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
                  {showDeleted ? 'Showing Deleted Patients' : 'Show Deleted Patients'}
                </button>
              )}

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    fontSize: '12px', padding: '6px 12px',
                    border: '1px solid #cbd5e1', borderRadius: '8px',
                    background: '#f8fafc', color: '#64748b',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  ✕ Clear
                </button>
              )}

              <span style={{ color: '#64748b', fontSize: '13px', marginLeft: 'auto' }}>
                {filtered.length} of {patients.length} records
                {showDeleted && <span style={{ color: '#dc2626', marginLeft: 6, fontWeight: 600 }}>(deleted)</span>}
              </span>
            </div>
            {canWrite && !showDeleted && <button className="btn btn-primary" onClick={openCreate}>+ Enroll Patient</button>}
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? <div className="empty-state"><div className="icon">🏥</div><h3>No patients found</h3></div> :
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Date of Birth</th><th>Gender</th><th>Contact</th><th>Email</th><th>Protocol</th><th>Site</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.patientId}>
                      <td><span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>#{p.patientId}</span></td>
                      <td><strong>{p.firstName} {p.lastName}</strong></td>
                      <td>{p.dateOfBirth || '—'}</td>
                      <td>{p.gender || '—'}</td>
                      <td>{p.contactNumber || '—'}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{p.email || '—'}</td>
                      <td>{p.protocolId ? <span style={{ color: '#6366f1', fontWeight: 500 }}>#{p.protocolId}</span> : '—'}</td>
                      <td>{p.siteId ? <span style={{ color: '#0ea5e9', fontWeight: 500 }}>#{p.siteId}</span> : '—'}</td>
                      <td>{statusBadge(p.enrollmentStatus)}</td>
                      <td>
                        <div className="actions">
                          {showDeleted ? (
                            canWrite && (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => restorePatient(p.patientId).then(load).catch(() => {})}
                              >
                                ↩ Restore
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => navigate(`/patients/${p.patientId}`)}
                                title="View patient details"
                              >
                                <EyeIcon size={13} /> View
                              </button>
                              {canWrite && <button className="btn btn-icon btn-sm" onClick={() => openEdit(p)}><EditIcon /></button>}
                              {canWrite && (
                                <select
                                  style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                  value={p.enrollmentStatus}
                                  onChange={e => handleStatusChange(p.patientId, e.target.value)}
                                >
                                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              )}
                              {canWrite && <button className="btn btn-icon btn-sm" onClick={() => setConfirmDelete(p)}><TrashIcon /></button>}
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
        <Modal title={editing ? 'Edit Patient' : 'Enroll Patient'} onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Row 1 — Name (both required) */}
          <div className="form-row">
            <InputField label="First Name" required error={fieldErrors.firstName}>
              <input
                className="form-control"
                style={{ borderColor: fieldErrors.firstName ? '#dc2626' : undefined }}
                value={form.firstName}
                onChange={e => { setForm(prev => ({ ...prev, firstName: e.target.value })); clearFieldError('firstName') }}
                placeholder="e.g. Priya"
              />
            </InputField>
            <InputField label="Last Name" required error={fieldErrors.lastName}>
              <input
                className="form-control"
                style={{ borderColor: fieldErrors.lastName ? '#dc2626' : undefined }}
                value={form.lastName}
                onChange={e => { setForm(prev => ({ ...prev, lastName: e.target.value })); clearFieldError('lastName') }}
                placeholder="e.g. Sharma"
              />
            </InputField>
          </div>

          {/* Row 2 — DOB + Gender */}
          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth</label>
              <input className="form-control" type="date" value={form.dateOfBirth} onChange={f('dateOfBirth')} />
            </div>
            <InputField label="Gender" required error={fieldErrors.gender}>
              <select
                className="form-control"
                style={{ borderColor: fieldErrors.gender ? '#dc2626' : undefined }}
                value={form.gender}
                onChange={e => { setForm(prev => ({ ...prev, gender: e.target.value })); clearFieldError('gender') }}
              >
                <option value="">Select gender</option>
                <option>MALE</option><option>FEMALE</option><option>OTHER</option>
              </select>
            </InputField>
          </div>

          {/* Row 3 — Contact + Email */}
          <div className="form-row">
            <InputField label="Contact Number" error={fieldErrors.contactNumber}>
              <input
                className="form-control"
                type="tel"
                inputMode="numeric"
                style={{ borderColor: fieldErrors.contactNumber ? '#dc2626' : undefined }}
                value={form.contactNumber}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setForm(prev => ({ ...prev, contactNumber: digits }))
                  clearFieldError('contactNumber')
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
              <p style={{ fontSize: '11px', color: form.contactNumber.length === 10 ? '#059669' : '#94a3b8', marginTop: 3 }}>
                {form.contactNumber.length}/10 digits
              </p>
            </InputField>

            <InputField label="Email" error={fieldErrors.email}>
              <input
                className="form-control"
                type="email"
                style={{ borderColor: fieldErrors.email ? '#dc2626' : undefined }}
                value={form.email}
                onChange={e => { setForm(prev => ({ ...prev, email: e.target.value })); clearFieldError('email') }}
                placeholder="e.g. priya.sharma@email.com"
              />
            </InputField>
          </div>

          {/* Address */}
          <div className="form-group">
            <label>Address</label>
            <input className="form-control" value={form.address} onChange={f('address')} placeholder="e.g. 42 MG Road, Mumbai, Maharashtra" />
          </div>

          {/* Row 4 — Protocol + Site dropdowns */}
          <div className="form-row">
            <div className="form-group">
              <label>Protocol</label>
              <select
                className="form-control"
                value={form.protocolId}
                onChange={e => handleProtocolChange(e.target.value)}
              >
                <option value="">— Select Protocol —</option>
                {protocols.map(p => (
                  <option key={p.protocolId} value={p.protocolId}>
                    {p.title} (#{p.protocolId})
                  </option>
                ))}
              </select>
              {protocols.length === 0 && (
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 3 }}>No protocols found</p>
              )}
            </div>

            <div className="form-group">
              <label>
                Site {form.protocolId && <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 500 }}>(filtered by protocol)</span>}
              </label>
              <select
                className="form-control"
                value={form.siteId}
                onChange={f('siteId')}
                disabled={loadingSites}
              >
                <option value="">— Select Site —</option>
                {loadingSites
                  ? <option disabled>Loading sites...</option>
                  : sites.map(s => (
                      <option key={s.siteId} value={s.siteId}>
                        {s.name} (#{s.siteId})
                      </option>
                    ))
                }
              </select>
              {!loadingSites && form.protocolId && sites.length === 0 && (
                <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: 3 }}>No sites assigned to this protocol yet</p>
              )}
            </div>
          </div>

          {/* Enrollment Status */}
          <div className="form-group">
            <label>Enrollment Status</label>
            <select className="form-control" value={form.enrollmentStatus} onChange={f('enrollmentStatus')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '20px 24px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrashIcon size={22} color="#fff" />
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Delete Patient</h3>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 12 }}>This action cannot be undone</p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#374151', marginBottom: 14 }}>
                Are you sure you want to delete this patient?
              </p>
              {/* Patient info card */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  {confirmDelete.firstName} {confirmDelete.lastName}
                  <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>#{confirmDelete.patientId}</span>
                </span>
                {confirmDelete.email && <span style={{ fontSize: 12, color: '#6b7280' }}>{confirmDelete.email}</span>}
                <span style={{ fontSize: 12, color: '#6b7280' }}>Status: <strong>{confirmDelete.enrollmentStatus}</strong></span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 12 }}>
                The patient will be moved to the deleted records and can be restored later by an Admin.
              </p>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {deleting ? <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Deleting...</> : <><TrashIcon size={13} color="#fff" /> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
