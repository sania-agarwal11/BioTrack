import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getProtocols, createProtocol, updateProtocol, deleteProtocol, updateProtocolPhase, closeProtocol, assignSiteToProtocol, getProtocolsBySite, getDeletedProtocols, restoreProtocol } from '../api/protocols'
import { getSites } from '../api/sites'
import { useAuth } from '../context/AuthContext'

const PHASES    = ['PHASE_I', 'PHASE_II', 'PHASE_III', 'PHASE_IV']
const PROTO_STATUSES = ['ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT']
const empty = { title: '', phase: 'PHASE_I', startDate: '', endDate: '', status: '', targetPatients: '' }

function EyeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

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

export default function Protocols() {
  const { hasRole, user } = useAuth()
  const navigate = useNavigate()
  const canWrite = hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')          // full write (assign, phase, close, delete)
  const canEdit  = hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST') // edit + create
  const isRS     = hasRole('RESEARCH_SCIENTIST') && !hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')
  const [protocols, setProtocols] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [assignModal,     setAssignModal]     = useState(null)
  const [selectedSite,    setSelectedSite]    = useState('')
  const [filterSiteId,    setFilterSiteId]    = useState('')
  const [filtering,       setFiltering]       = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(null) // protocol object
  const [confirmClose,    setConfirmClose]    = useState(null) // protocol object
  const [actionLoading,   setActionLoading]   = useState(false)
  const [showDeleted,     setShowDeleted]     = useState(false)

  const load = (deleted = showDeleted) => {
    setLoading(true)
    const fetchProtocols = deleted ? getDeletedProtocols() : getProtocols()
    Promise.all([
      fetchProtocols.then(r => setProtocols(r.data)).catch(() => setProtocols([])),
      getSites().then(r => setSites(r.data)).catch(() => setSites([]))
    ]).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ ...empty, status: isRS ? 'DRAFT' : '' }); setError(''); setFieldErrors({}); setShowModal(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ title: p.title, phase: p.phase, startDate: p.startDate || '', endDate: p.endDate || '', status: p.status, targetPatients: p.targetPatients || '' })
    setError(''); setFieldErrors({}); setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    const errs = {}
    if (!form.title.trim())  errs.title     = 'Title is required.'
    if (!form.startDate)     errs.startDate = 'Start date is required.'
    if (!form.endDate)       errs.endDate   = 'End date is required.'
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      errs.endDate = 'End date must be after the start date.'
    if (!form.targetPatients || Number(form.targetPatients) < 1)
      errs.targetPatients = 'Target patients is required and must be at least 1.'
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setSaving(true)
    try {
      if (editing) await updateProtocol(editing.protocolId, isRS ? { ...form, status: editing.status } : form)
      else await createProtocol(isRS
        ? { ...form, status: 'DRAFT', submittedByName: user?.name, submittedByUserId: user?.userId }
        : { ...form, submittedByName: user?.name, submittedByUserId: user?.userId })
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save protocol.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setActionLoading(true)
    try { await deleteProtocol(confirmDelete.protocolId) } catch {}
    setConfirmDelete(null); setActionLoading(false); load()
  }

  const handleClose = async () => {
    if (!confirmClose) return
    setActionLoading(true)
    try { await closeProtocol(confirmClose.protocolId) } catch {}
    setConfirmClose(null); setActionLoading(false); load()
  }

  const handleAssignSite = async () => {
    if (!selectedSite) return
    await assignSiteToProtocol(assignModal.protocolId, selectedSite).catch(() => {})
    setAssignModal(null); setSelectedSite(''); load()
  }

  const handlePhaseChange = async (id, phase) => {
    await updateProtocolPhase(id, phase).catch(() => {})
    load()
  }

  const handleApprove = async (p) => {
    await updateProtocol(p.protocolId, {
      title: p.title, phase: p.phase, startDate: p.startDate,
      endDate: p.endDate, status: 'ACTIVE', targetPatients: p.targetPatients,
    }).catch(() => {})
    load()
  }

  const handleReject = async (p) => {
    await updateProtocol(p.protocolId, {
      title: p.title, phase: p.phase, startDate: p.startDate,
      endDate: p.endDate, status: 'INACTIVE', targetPatients: p.targetPatients,
    }).catch(() => {})
    load()
  }

  const handleFilterBySite = () => {
    if (!filterSiteId) { load(); return }
    setFiltering(true)
    getProtocolsBySite(filterSiteId)
      .then(r => setProtocols(r.data))
      .catch(() => setProtocols([]))
      .finally(() => setFiltering(false))
  }

  const clearSiteFilter = () => { setFilterSiteId(''); load() }

  const [filterPhase,  setFilterPhase]  = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const hasFilters = search.trim() !== '' || filterSiteId !== '' || filterPhase !== '' || filterStatus !== ''

  const filtered = protocols.filter(p => {
    const nameMatch   = p.title?.toLowerCase().includes(search.toLowerCase())
    const siteMatch   = filterSiteId  === '' || p.sites?.some(s => String(s).includes(filterSiteId))
                        || String(p.protocolId).includes(filterSiteId) // fallback: also match by protocol having any site with that id
    const phaseMatch  = filterPhase   === '' || p.phase  === filterPhase
    const statusMatch = filterStatus  === '' || p.status === filterStatus
    return nameMatch && siteMatch && phaseMatch && statusMatch
  })

  const clearFilters = () => { setSearch(''); setFilterSiteId(''); setFilterPhase(''); setFilterStatus(''); load() }

  const phaseBadge = (phase) => {
    const map = { PHASE_I: 'badge-primary', PHASE_II: 'badge-warning', PHASE_III: 'badge-success', PHASE_IV: 'badge-danger' }
    return <span className={`badge ${map[phase] || 'badge-secondary'}`}>{phase?.replace('_', ' ')}</span>
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <Navbar title="Protocol Management" />
      <div className="page-content">
        <div className="page-header">
          <h2>Protocols</h2>
          <p>Manage clinical trial protocols and site assignments</p>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>

              {/* Search by name */}
              <input
                className="search-input"
                placeholder="🔍 Search by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 200 }}
              />

              {/* Filter by Site ID */}
              <input
                style={{ fontSize: '13px', padding: '7px 10px', border: filterSiteId ? '2px solid #0ea5e9' : '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#374151', minWidth: 150 }}
                placeholder="Site #ID"
                type="number"
                value={filterSiteId}
                onChange={e => setFilterSiteId(e.target.value)}
              />

              {/* Filter by Phase */}
              <select
                value={filterPhase}
                onChange={e => setFilterPhase(e.target.value)}
                style={{ fontSize: '13px', padding: '7px 10px', border: filterPhase ? '2px solid #6366f1' : '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#374151', cursor: 'pointer', minWidth: 150 }}
              >
                <option value="">All Phases</option>
                {PHASES.map(ph => <option key={ph} value={ph}>{ph.replace('_', ' ')}</option>)}
              </select>

              {/* Filter by Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ fontSize: '13px', padding: '7px 10px', border: filterStatus ? '2px solid #f59e0b' : '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#374151', cursor: 'pointer', minWidth: 140 }}
              >
                <option value="">All Statuses</option>
                {PROTO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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

              {hasRole('ADMIN') && (
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
                {filtered.length} of {protocols.length} protocols
              </span>
            </div>
            {canEdit && (
              <button className="btn btn-primary" onClick={openCreate}>
                {isRS ? '+ Submit Protocol Request' : '+ New Protocol'}
              </button>
            )}
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? <div className="empty-state"><div className="icon">📋</div><h3>No protocols found</h3></div> :
            <div className="table-container">
              <table>
                <thead><tr><th>ID</th><th>Title</th><th>Phase</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Sites</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(p => {
                    const isPending = p.status === 'DRAFT'
                    return (
                    <tr key={p.protocolId} style={{ background: showDeleted ? '#fff5f5' : isPending ? '#fffbeb' : undefined }}>
                      <td><span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>#{p.protocolId}</span></td>
                      <td>
                        <strong>{p.title}</strong>
                        {isPending && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 7px' }}>⏳ PENDING APPROVAL</span>}
                      </td>
                      <td>{phaseBadge(p.phase)}</td>
                      <td>{p.startDate || '—'}</td>
                      <td>{p.endDate || '—'}</td>
                      <td>
                        <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : p.status === 'CLOSED' ? 'badge-danger' : p.status === 'DRAFT' ? 'badge-warning' : 'badge-secondary'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>{p.sites?.length > 0 ? p.sites.join(', ') : <span style={{ color: '#94a3b8' }}>None</span>}</td>
                      <td>
                        <div className="actions">
                          {showDeleted ? (
                            hasRole('ADMIN') && (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => restoreProtocol(p.protocolId).then(() => load()).catch(() => {})}
                              >
                                ↩ Restore
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                title="View Protocol Details"
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px' }}
                                onClick={() => navigate(`/protocols/${p.protocolId}`)}
                              >
                                <EyeIcon size={13} /> View
                              </button>
                              {canEdit && <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(p)}><EditIcon /></button>}
                              {canWrite && <button className="btn btn-icon btn-sm" title="Assign Site" onClick={() => { setAssignModal(p); setSelectedSite('') }}>🏛️</button>}
                              {canWrite && (
                                <select style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                  value={p.phase} onChange={e => handlePhaseChange(p.protocolId, e.target.value)}>
                                  {PHASES.map(ph => <option key={ph} value={ph}>{ph.replace('_', ' ')}</option>)}
                                </select>
                              )}
                              {hasRole('ADMIN') && p.status !== 'CLOSED' && <button className="btn btn-icon btn-sm" title="Close Protocol" onClick={() => setConfirmClose(p)}>🔒</button>}
                              {hasRole('ADMIN') && <button className="btn btn-icon btn-sm" title="Delete" onClick={() => setConfirmDelete(p)}><TrashIcon /></button>}
                              {/* Approve / Reject — after Delete, only for ADMIN on DRAFT protocols */}
                              {hasRole('ADMIN') && isPending && (<>
                                <button
                                  onClick={() => handleApprove(p)}
                                  style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                >✓ Approve</button>
                                <button
                                  onClick={() => handleReject(p)}
                                  style={{ fontSize: '11px', padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                >✗ Reject</button>
                              </>)}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Edit Protocol' : (isRS ? 'Submit Protocol Request' : 'New Protocol')}
          onClose={() => setShowModal(false)}
          onSubmit={handleSave}
          loading={saving}
          submitLabel={isRS && !editing ? 'Submit for Approval' : 'Save'}
        >
          {error && <div className="alert alert-danger">{error}</div>}

          {/* RS notice banner */}
          {isRS && !editing && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
              ⏳ Your request will be submitted as <strong>DRAFT</strong> and sent to an Admin for review and approval.
            </div>
          )}

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Title *</label>
              <input className="form-control" value={form.title} onChange={f('title')} placeholder="e.g. Cardiology Phase III — Mumbai Cohort" />
            </div>
            <div className="form-group">
              <label>Target Patients <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                className="form-control"
                type="number"
                min="1"
                value={form.targetPatients}
                onChange={e => { setForm({ ...form, targetPatients: e.target.value }); setFieldErrors(p => ({ ...p, targetPatients: undefined })) }}
                placeholder="e.g. 200"
                style={{ borderColor: fieldErrors.targetPatients ? '#dc2626' : undefined }}
              />
              {fieldErrors.targetPatients && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.targetPatients}</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phase *</label>
              <select className="form-control" value={form.phase} onChange={f('phase')}>
                {PHASES.map(ph => <option key={ph} value={ph}>{ph.replace('_', ' ')}</option>)}
              </select>
            </div>
            {/* Status: hidden for RS creating new; read-only for RS editing */}
            {!isRS ? (
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={form.status} onChange={f('status')}>
                  <option value="" disabled>Select status</option>
                  {PROTO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : !editing ? (
              <div className="form-group">
                <label>Status</label>
                <input className="form-control" value="DRAFT (Pending Approval)" disabled style={{ background: '#fffbeb', color: '#b45309', fontWeight: 600 }} />
              </div>
            ) : (
              <div className="form-group">
                <label>Status</label>
                <input className="form-control" value={editing.status} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                className="form-control"
                type="date"
                value={form.startDate}
                onChange={e => { f('startDate')(e); setFieldErrors(prev => ({ ...prev, startDate: undefined, endDate: undefined })) }}
                style={{ borderColor: fieldErrors.startDate ? '#dc2626' : undefined }}
              />
              {fieldErrors.startDate && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.startDate}</p>}
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input
                className="form-control"
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={e => { f('endDate')(e); setFieldErrors(prev => ({ ...prev, endDate: undefined })) }}
                style={{ borderColor: fieldErrors.endDate ? '#dc2626' : undefined }}
              />
              {fieldErrors.endDate && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.endDate}</p>}
            </div>
          </div>
        </Modal>
      )}

      {assignModal && (
        <Modal title={`Assign Site to "${assignModal.title}"`} onClose={() => setAssignModal(null)} onSubmit={handleAssignSite} submitLabel="Assign">
          <div className="form-group"><label>Select Site</label>
            <select className="form-control" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
              <option value="">— Choose a site —</option>
              {sites.map(s => <option key={s.siteId} value={s.siteId}>{s.name} ({s.location})</option>)}
            </select>
          </div>
        </Modal>
      )}

      {/* ── Delete Protocol Confirmation ──────────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrashIcon size={22} color="#fff" />
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Protocol</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '2px 0 0', fontSize: 12 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#374151', marginBottom: 14 }}>Are you sure you want to delete this protocol?</p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>{confirmDelete.title} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>#{confirmDelete.protocolId}</span></span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Phase: {confirmDelete.phase?.replace(/_/g, ' ')} · Status: {confirmDelete.status}</span>
              </div>
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)} disabled={actionLoading}>Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading}
                style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {actionLoading ? <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Deleting...</> : <><TrashIcon size={13} color="#fff" /> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Protocol Confirmation ───────────────────────────────────────── */}
      {confirmClose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>🔒</span>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 700 }}>Close Protocol</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '2px 0 0', fontSize: 12 }}>This will mark the protocol as closed</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#374151', marginBottom: 14 }}>Are you sure you want to close this protocol? No further changes can be made after closing.</p>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>{confirmClose.title} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>#{confirmClose.protocolId}</span></span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Phase: {confirmClose.phase?.replace(/_/g, ' ')} · Status: {confirmClose.status}</span>
              </div>
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmClose(null)} disabled={actionLoading}>Cancel</button>
              <button onClick={handleClose} disabled={actionLoading}
                style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {actionLoading ? <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Closing...</> : '🔒 Yes, Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
