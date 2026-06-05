import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getSites, createSite, updateSite, deleteSite, updateSiteStatus, getSitesByProtocol, getDeletedSites, restoreSite } from '../api/sites'
import { getProtocols, assignSiteToProtocol } from '../api/protocols'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL']
const empty = { name: '', location: '', investigatorId: '', status: 'ACTIVE' }

function EyeIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
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

export default function Sites() {
  const { hasRole, user } = useAuth()
  const navigate = useNavigate()
  const canWrite = hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')
  const canEdit  = hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER', 'RESEARCH_SCIENTIST')
  const isRS     = hasRole('RESEARCH_SCIENTIST') && !hasRole('ADMIN', 'CLINICAL_TRIAL_MANAGER')
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterProtocolId, setFilterProtocolId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [protocols, setProtocols] = useState([])
  const [assignModal, setAssignModal] = useState(null)   // site object being assigned
  const [selectedProtocol, setSelectedProtocol] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const load = (deleted = showDeleted) => {
    setLoading(true)
    const fetchSites = deleted ? getDeletedSites() : getSites()
    Promise.all([
      fetchSites.then(r => setSites(r.data)).catch(() => setSites([])),
      getProtocols().then(r => setProtocols(r.data)).catch(() => setProtocols([]))
    ]).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ ...empty, status: isRS ? 'PENDING_APPROVAL' : 'ACTIVE' }); setError(''); setShowModal(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, location: s.location, investigatorId: s.investigatorId, status: s.status })
    setError(''); setShowModal(true)
  }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      if (editing) await updateSite(editing.siteId, isRS ? { ...form, status: editing.status } : form)
      else await createSite(isRS
        ? { ...form, status: 'PENDING_APPROVAL', submittedByName: user?.name, submittedByUserId: user?.userId }
        : { ...form, submittedByName: user?.name, submittedByUserId: user?.userId })
      setShowModal(false); load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save site.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteSite(confirmDelete.siteId)
      setConfirmDelete(null)
      load()
    } catch {
      alert('Failed to delete site. Please try again.')
    } finally { setDeleting(false) }
  }

  const handleStatusChange = async (id, status) => {
    await updateSiteStatus(id, status).catch(() => {})
    load()
  }

  const handleApproveSite = async (s) => {
    await updateSiteStatus(s.siteId, 'ACTIVE').catch(() => {})
    load()
  }

  const handleRejectSite = async (s) => {
    await updateSiteStatus(s.siteId, 'INACTIVE').catch(() => {})
    load()
  }

  const handleAssignProtocol = async () => {
    if (!selectedProtocol) return
    setAssigning(true)
    try {
      await assignSiteToProtocol(selectedProtocol, assignModal.siteId)
      setAssignModal(null); setSelectedProtocol(''); load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign protocol.')
    } finally { setAssigning(false) }
  }

  const handleProtocolIdChange = (value) => {
    setFilterProtocolId(value)
    if (!value) { load(); return }
    getSitesByProtocol(value)
      .then(r => setSites(r.data))
      .catch(() => setSites([]))
  }

  const clearFilters = () => { setFilterProtocolId(''); setFilterStatus(''); load() }
  const hasFilters = filterProtocolId || filterStatus

  const filtered = sites.filter(s => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.toLowerCase().includes(search.toLowerCase()) ||
      s.investigatorId?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const statusBadge = (s) => {
    const map = { ACTIVE: 'badge-success', INACTIVE: 'badge-danger', PENDING_APPROVAL: 'badge-warning' }
    return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s?.replace('_', ' ')}</span>
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <Navbar title="Site Management" />
      <div className="page-content">
        <div className="page-header">
          <h2>Research Sites</h2>
          <p>Manage clinical trial sites and investigators</p>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="toolbar">
              <input className="search-input" placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
              <input className="search-input" style={{ minWidth: 160 }} placeholder="Filter by Protocol #ID" type="number" value={filterProtocolId} onChange={e => handleProtocolIdChange(e.target.value)} />
              <select
                className="search-input"
                style={{ minWidth: 150, color: filterStatus ? '#0f172a' : '#94a3b8' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              {hasFilters && <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear</button>}
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
              <span style={{ color: '#64748b', fontSize: '13px' }}>{filtered.length} of {sites.length} sites</span>
            </div>
            {canEdit && (
              <button className="btn btn-primary" onClick={openCreate}>
                {isRS ? '+ Submit Site Request' : '+ Add Site'}
              </button>
            )}
          </div>
          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            filtered.length === 0 ? <div className="empty-state"><div className="icon">🏛️</div><h3>No sites found</h3></div> :
            <div className="table-container">
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Investigator ID</th><th>Status</th><th>Protocols</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(s => {
                    const isPending = s.status === 'PENDING_APPROVAL'
                    return (
                    <tr key={s.siteId} style={{ background: showDeleted ? '#fff5f5' : isPending ? '#fffbeb' : undefined }}>
                      <td><span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>#{s.siteId}</span></td>
                      <td>
                        <strong>{s.name}</strong>
                        {isPending && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 7px' }}>⏳ PENDING APPROVAL</span>}
                      </td>
                      <td>{s.location}</td>
                      <td><code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{s.investigatorId}</code></td>
                      <td>{statusBadge(s.status)}</td>
                      <td>
                        {s.protocols?.length > 0
                          ? <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{s.protocols.length} Protocol{s.protocols.length !== 1 ? 's' : ''}</span>
                          : <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>}
                      </td>
                      <td>
                        <div className="actions">
                          {showDeleted ? (
                            hasRole('ADMIN') && (
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => restoreSite(s.siteId).then(() => load()).catch(() => {})}
                              >
                                ↩ Restore
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#1a56db', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => navigate(`/sites/${s.siteId}`)}
                                title="View site details"
                              >
                                <EyeIcon /> View
                              </button>
                              {canEdit && <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(s)}><EditIcon /></button>}
                              {canWrite && (
                                <button className="btn btn-icon btn-sm" title="Assign to Protocol"
                                  onClick={() => { setAssignModal(s); setSelectedProtocol('') }}>📋</button>
                              )}
                              {canWrite && (
                                <select style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                  value={s.status} onChange={e => handleStatusChange(s.siteId, e.target.value)}>
                                  {STATUSES.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                                </select>
                              )}
                              {hasRole('ADMIN') && <button className="btn btn-icon btn-sm" title="Delete" onClick={() => setConfirmDelete(s)}><TrashIcon /></button>}
                              {/* Approve / Reject — after Delete, only for ADMIN on pending sites */}
                              {hasRole('ADMIN') && isPending && (<>
                                <button
                                  onClick={() => handleApproveSite(s)}
                                  style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                >✓ Approve</button>
                                <button
                                  onClick={() => handleRejectSite(s)}
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

      {assignModal && (
        <Modal
          title={`Assign "${assignModal.name}" to a Protocol`}
          onClose={() => { setAssignModal(null); setSelectedProtocol('') }}
          onSubmit={handleAssignProtocol}
          submitLabel={assigning ? 'Assigning...' : 'Assign'}
          loading={assigning}
        >
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: 12 }}>
            This site can be linked to multiple protocols. Already assigned protocols are shown in the table.
          </p>
          <div className="form-group">
            <label>Select Protocol</label>
            <select className="form-control" value={selectedProtocol} onChange={e => setSelectedProtocol(e.target.value)}>
              <option value="">— Choose a protocol —</option>
              {protocols.map(p => (
                <option key={p.protocolId} value={p.protocolId}>
                  #{p.protocolId} — {p.title} ({p.phase?.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          {assignModal.protocols?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: '12px', color: '#64748b' }}>Already assigned to:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {assignModal.protocols.map((name, i) => (
                  <span key={i} className="badge badge-primary" style={{ fontSize: '11px' }}>{name}</span>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: '12px 12px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrashIcon size={22} color="#fff" />
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Delete Site</h3>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 13 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                Are you sure you want to permanently delete this site?
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{confirmDelete.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Site #{confirmDelete.siteId} &nbsp;·&nbsp; {confirmDelete.location}
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
        <Modal
          title={editing ? 'Edit Site' : (isRS ? 'Submit Site Request' : 'Add Research Site')}
          onClose={() => setShowModal(false)}
          onSubmit={handleSave}
          loading={saving}
          submitLabel={isRS && !editing ? 'Submit for Approval' : 'Save'}
        >
          {error && <div className="alert alert-danger">{error}</div>}

          {isRS && !editing && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
              ⏳ Your request will be submitted as <strong>PENDING APPROVAL</strong> and sent to an Admin for review.
            </div>
          )}

          <div className="form-group"><label>Site Name *</label><input className="form-control" value={form.name} onChange={f('name')} placeholder="e.g. Mumbai Research Center" /></div>
          <div className="form-group"><label>Location *</label><input className="form-control" value={form.location} onChange={f('location')} placeholder="e.g. Mumbai, Maharashtra, India" /></div>
          <div className="form-row">
            <div className="form-group"><label>Investigator ID *</label><input className="form-control" value={form.investigatorId} onChange={f('investigatorId')} placeholder="e.g. DR-003" /></div>
            <div className="form-group">
              <label>Status</label>
              {!isRS ? (
                <select className="form-control" value={form.status} onChange={f('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              ) : !editing ? (
                <input className="form-control" value="PENDING APPROVAL" disabled style={{ background: '#fffbeb', color: '#b45309', fontWeight: 600 }} />
              ) : (
                <input className="form-control" value={editing.status?.replace('_', ' ')} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
