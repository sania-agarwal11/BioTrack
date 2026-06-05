import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { getUsers, createUser, updateUser, deleteUser, updateUserRole, updateUserStatus, resetPassword, approveUser, rejectUser } from '../api/users'

const ROLES = ['ADMIN', 'CLINICAL_TRIAL_MANAGER', 'LAB_TECHNICIAN', 'RESEARCH_SCIENTIST', 'REGULATORY_OFFICER', 'DATA_MANAGER']
const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED']

const emptyForm = { name: '', email: '', phone: '', role: '', status: '', password: '' }

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

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resetModal, setResetModal] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null)
  const [confirmRejectUser, setConfirmRejectUser] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const load = () => {
    setLoading(true)
    getUsers()
      .then(r => setUsers(r.data))
      .catch(() => {}) // keep existing list on load failure — don't blank it
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setFieldErrors({}); setShowModal(true) }
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, status: u.status, password: '' }); setError(''); setFieldErrors({}); setShowModal(true) }

  const validateUserForm = () => {
    const errs = {}
    if (!form.name.trim())  errs.name  = 'Full name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Please enter a valid email address.'
    if (form.phone && form.phone.length !== 10)
      errs.phone = 'Phone number must be exactly 10 digits.'
    return errs
  }

  const handleSave = async () => {
    setError('')
    const errs = validateUserForm()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setSaving(true)
    try {
      if (editing) {
        await updateUser(editing.userId, form)
      } else {
        await createUser(form)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDeleteUser) return
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteUser(confirmDeleteUser.userId)
      setConfirmDeleteUser(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to delete user. They may have linked records in the system.'
      setDeleteError(typeof msg === 'string' ? msg : 'Failed to delete user.')
      setConfirmDeleteUser(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusToggle = async (u) => {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await updateUserStatus(u.userId, next).catch(() => {})
    load()
  }

  const handleResetPassword = async () => {
    if (!newPassword) return
    await resetPassword(resetModal.userId, newPassword).catch(() => {})
    setResetModal(null)
    setNewPassword('')
  }

  const handleApprove = async (id) => {
    await approveUser(id).catch(() => {})
    load()
  }

  const handleReject = async () => {
    if (!confirmRejectUser) return
    await rejectUser(confirmRejectUser.userId).catch(() => {})
    setConfirmRejectUser(null)
    load()
  }

  const hasFilters = filterName || filterUserId || filterRole || filterStatus
  const clearFilters = () => { setFilterName(''); setFilterUserId(''); setFilterRole(''); setFilterStatus('') }

  const filtered = users.filter(u => {
    const matchName   = !filterName   || u.name?.toLowerCase().includes(filterName.toLowerCase())
    const matchId     = !filterUserId || String(u.userId) === filterUserId.trim()
    const matchRole   = !filterRole   || u.role === filterRole
    const matchStatus = !filterStatus || u.status === filterStatus
    return matchName && matchId && matchRole && matchStatus
  })

  const roleBadge = (role) => {
    const colors = {
      ADMIN: 'badge-danger',
      CLINICAL_TRIAL_MANAGER: 'badge-primary',
      LAB_TECHNICIAN: 'badge-success',
      RESEARCH_SCIENTIST: 'badge-warning',
      REGULATORY_OFFICER: 'badge-secondary',
      DATA_MANAGER: 'badge-secondary',
    }
    return <span className={`badge ${colors[role] || 'badge-secondary'}`}>{role?.replace('_', ' ')}</span>
  }

  return (
    <>
      <Navbar title="User Management" />
      <div className="page-content">
        <div className="page-header">
          <h2>Users</h2>
          <p>Manage platform users and their roles</p>
        </div>

        {users.filter(u => u.status === 'PENDING_APPROVAL').length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ color: '#92400e', fontWeight: 600, fontSize: 14 }}>
              {users.filter(u => u.status === 'PENDING_APPROVAL').length} registration request(s) pending your approval
            </span>
          </div>
        )}

        {deleteError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>❌</span>
              <span style={{ color: '#991b1b', fontWeight: 600, fontSize: 14 }}>{deleteError}</span>
            </div>
            <button onClick={() => setDeleteError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        )}

        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
              <input
                className="search-input"
                placeholder="Search by name..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
              <input
                className="search-input"
                style={{ minWidth: 130 }}
                type="number"
                placeholder="Filter by User ID"
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
              />
              <select
                className="search-input"
                style={{ minWidth: 170, color: filterRole ? '#0f172a' : '#94a3b8' }}
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
              <select
                className="search-input"
                style={{ minWidth: 160, color: filterStatus ? '#0f172a' : '#94a3b8' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              {hasFilters && <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear</button>}
              <span style={{ color: '#64748b', fontSize: '13px' }}>{filtered.length} of {users.length} users</span>
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No users found</h3><p>Add your first user to get started.</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.userId}>
                      <td><span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>#{u.userId}</span></td>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td>{roleBadge(u.role)}</td>
                      <td>
                        {u.status === 'ACTIVE'           && <span className="badge badge-success">ACTIVE</span>}
                        {u.status === 'INACTIVE'         && <span className="badge badge-secondary">INACTIVE</span>}
                        {u.status === 'PENDING_APPROVAL' && <span className="badge badge-warning">PENDING APPROVAL</span>}
                        {u.status === 'REJECTED'         && <span className="badge badge-danger">REJECTED</span>}
                      </td>
                      <td>
                        <div className="actions">
                          {u.status === 'PENDING_APPROVAL' ? (
                            <>
                              <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
                                title="Approve" onClick={() => handleApprove(u.userId)}>✅ Approve</button>
                              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
                                title="Reject" onClick={() => setConfirmRejectUser(u)}>❌ Reject</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-icon btn-sm" onClick={() => openEdit(u)}><EditIcon /></button>
                              <button className="btn btn-icon btn-sm" onClick={() => handleStatusToggle(u)} title={u.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}>
                                {u.status === 'ACTIVE' ? '🟢' : '🔴'}
                              </button>
                              <button className="btn btn-icon btn-sm" onClick={() => { setResetModal(u); setNewPassword('') }} title="Reset password">🔐</button>
                              <button className="btn btn-icon btn-sm" onClick={() => setConfirmDeleteUser(u)} title="Delete"><TrashIcon /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Add User'} onClose={() => setShowModal(false)} onSubmit={handleSave} loading={saving}>
          {/* Hidden fields trick: stops Chrome from mapping saved credentials into visible inputs */}
          <input type="text"     style={{ display: 'none' }} autoComplete="username" readOnly />
          <input type="password" style={{ display: 'none' }} autoComplete="current-password" readOnly />

          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                className="form-control"
                autoComplete="off"
                style={{ borderColor: fieldErrors.name ? '#dc2626' : undefined }}
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setFieldErrors(p => ({ ...p, name: undefined })) }}
                placeholder="e.g. Nikita Chaurasia"
              />
              {fieldErrors.name && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.name}</p>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                className="form-control"
                type="email"
                autoComplete="off"
                style={{ borderColor: fieldErrors.email ? '#dc2626' : undefined }}
                value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); setFieldErrors(p => ({ ...p, email: undefined })) }}
                placeholder="e.g. nikita@biotrack.com"
              />
              {fieldErrors.email && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.email}</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                className="form-control"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                style={{ borderColor: fieldErrors.phone ? '#dc2626' : undefined }}
                value={form.phone}
                onChange={e => { setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }); setFieldErrors(p => ({ ...p, phone: undefined })) }}
                placeholder="e.g. 9876543210"
                maxLength={10}
              />
              {fieldErrors.phone
                ? <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.phone}</p>
                : form.phone && <p style={{ color: form.phone.length === 10 ? '#059669' : '#94a3b8', fontSize: '11px', marginTop: 3 }}>{form.phone.length}/10 digits</p>
              }
            </div>
            <div className="form-group">
              <label>Role *</label>
              <select
                className="form-control"
                style={{ color: form.role ? '#0f172a' : '#94a3b8' }}
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                <option value="" disabled>Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                style={{ color: form.status ? '#0f172a' : '#94a3b8' }}
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="" disabled>Select status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input
                className="form-control"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
        </Modal>
      )}

      {resetModal && (
        <Modal title={`Reset Password — ${resetModal.name}`} onClose={() => setResetModal(null)} onSubmit={handleResetPassword} submitLabel="Reset">
          <input type="password" style={{ display: 'none' }} autoComplete="current-password" readOnly />
          <div className="form-group">
            <label>New Password</label>
            <input
              className="form-control"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
            />
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {confirmDeleteUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* Red header */}
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrashIcon size={22} color="#fff" />
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 700 }}>Delete User</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '2px 0 0', fontSize: 12 }}>This action cannot be undone</p>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '24px' }}>
              <p style={{ color: '#1e293b', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                Are you sure you want to delete this user?
              </p>
              {/* User info card */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {confirmDeleteUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{confirmDeleteUser.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{confirmDeleteUser.email}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{confirmDeleteUser.role?.replace(/_/g, ' ')} · #{confirmDeleteUser.userId}</div>
                  </div>
                </div>
              </div>
              <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                ⚠️ If this user has linked records (audit logs, clinical data), deletion may fail. Consider <strong>deactivating</strong> the user instead.
              </p>
            </div>
            {/* Footer */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteUser(null)}
                disabled={deleting}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: deleting ? '#fca5a5' : '#dc2626', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {deleting ? <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Deleting...</> : <><TrashIcon size={13} color="#fff" /> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Confirmation Modal ─────────────────────────────────────── */}
      {confirmRejectUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* Orange header */}
            <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>❌</span>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 700 }}>Reject Registration</h3>
                <p style={{ color: 'rgba(255,255,255,0.85)', margin: '2px 0 0', fontSize: 12 }}>The user will be notified by email</p>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '24px' }}>
              <p style={{ color: '#1e293b', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                Are you sure you want to reject this registration request?
              </p>
              {/* User info card */}
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {confirmRejectUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{confirmRejectUser.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{confirmRejectUser.email}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{confirmRejectUser.role?.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </div>
              <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                📧 A rejection email will be sent to <strong>{confirmRejectUser.email}</strong> informing them their account was not approved.
              </p>
            </div>
            {/* Footer */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmRejectUser(null)}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={handleReject}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                ❌ Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
