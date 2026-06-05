import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import {
  getNotifications, getNotificationsByUser, createNotification, deleteNotification,
  markAsRead, markAsUnread, archiveNotification,
  markAllAsRead, dispatchNotification, getDeletedNotifications,
  getDeletedNotificationsByUser, restoreNotification
} from '../api/notifications'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { getUserById, getUserProfile, getUsers } from '../api/users'

const ArchiveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <polyline points="10 13 12 16 14 13"/>
    <line x1="12" y1="9" x2="12" y2="16"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const TYPES = ['INFO', 'WARNING', 'ALERT', 'REMINDER', 'SYSTEM']
const STATUSES = ['UNREAD', 'READ', 'ARCHIVED']
const empty = { userId: '', title: '', message: '', type: '' }

export default function Notifications() {
  const { user, hasRole } = useAuth()
  const { refresh: refreshBadge } = useNotifications()
  const canCreate = !!user  // every authenticated user can send notifications
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [viewTab, setViewTab] = useState('all')   // 'all' | 'sent' | 'received'
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [viewNotif, setViewNotif] = useState(null)
  const [modalNames, setModalNames] = useState({ sender: null, recipient: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [usersList,       setUsersList]       = useState([])    // for recipient dropdown
  const [usersLoadFailed, setUsersLoadFailed] = useState(false) // true when role can't fetch all users

  const load = (deleted = showDeleted) => {
    setLoading(true)
    setLoadError('')
    // All roles (including ADMIN) see only their own personal notifications
    // so admin does not accidentally receive messages sent between other users
    const fetchFn = deleted
      ? getDeletedNotificationsByUser(user?.userId)
      : getNotificationsByUser(user?.userId)
    fetchFn
      .then(r => { setNotifications(r.data || []); setLoadError('') })
      .catch(err => {
        const status = err?.response?.status
        if (status === 404 || status === 403 || status === 401) {
          // Backend may not be restarted yet — show info instead of crashing
          setLoadError('deleted-unavailable')
        }
        setNotifications([])
      })
      .finally(() => { setLoading(false); refreshBadge() })
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentUserId = user?.userId ? Number(user.userId) : null

  // Split into sent vs received
  const isSentByMe = (n) => n.senderUserId != null && Number(n.senderUserId) === currentUserId
  const sentList     = notifications.filter(n => isSentByMe(n))
  const receivedList = notifications.filter(n => !isSentByMe(n))
  const unreadCount  = receivedList.filter(n => n.status === 'UNREAD').length

  const baseList = viewTab === 'sent' ? sentList
                 : viewTab === 'received' ? receivedList
                 : notifications

  const buildPayload = () => ({
    ...form,
    userId: form.userId !== '' ? Number(form.userId) : null,
    senderUserId: currentUserId
  })

  const handleSave = async () => {
    setError('')
    if (!form.type) { setError('Type is required.'); return }
    if (!form.title?.trim()) { setError('Title is required.'); return }
    if (!form.message?.trim()) { setError('Message is required.'); return }
    setSaving(true)
    try {
      await createNotification(buildPayload())
      setShowModal(false); load()
    } catch (err) {
      const data = err.response?.data
      setError(typeof data === 'string' ? data : data?.message || data?.error || 'Failed to send notification.')
    } finally { setSaving(false) }
  }

  const handleDispatch = async () => {
    setError('')
    if (!form.title?.trim()) { setError('Title is required.'); return }
    if (!form.message?.trim()) { setError('Message is required.'); return }
    setSaving(true)
    try {
      await dispatchNotification(buildPayload())
      setShowModal(false); load()
    } catch (err) {
      const msg = err.response?.data
      setError(typeof msg === 'string' ? msg : 'Failed to dispatch notification.')
    } finally { setSaving(false) }
  }

  const handleMarkRead    = async (id) => { await markAsRead(id).catch(() => {}); load() }
  const handleMarkUnread  = async (id) => { await markAsUnread(id).catch(() => {}); load() }
  const handleArchive     = async (id) => { await archiveNotification(id).catch(() => {}); load() }

  const handleViewNotif = async (n) => {
    setViewNotif(n)
    setModalNames({ sender: null, recipient: null })
    // getUserProfile uses skipAuthRedirect — a lookup failure will NEVER boot the user to login
    // Try multiple field names since different API versions may differ
    const fmt = (p) => {
      const name = p?.name || p?.fullName || p?.username || null
      if (!name) return null
      const role = p?.role || p?.userRole || null
      return role ? `${name} (${role})` : name
    }
    if (n.senderUserId) {
      getUserProfile(n.senderUserId)
        .then(r => { const label = fmt(r.data); if (label) setModalNames(prev => ({ ...prev, sender: label })) })
        .catch(() => {}) // silently ignore — user will just see "User #id"
    }
    if (n.userId) {
      getUserProfile(n.userId)
        .then(r => { const label = fmt(r.data); if (label) setModalNames(prev => ({ ...prev, recipient: label })) })
        .catch(() => {}) // silently ignore
    }
    if (!isSentByMe(n) && n.status === 'UNREAD') {
      markAsRead(n.notificationId).catch(() => {}).finally(() => load())
    }
  }

  const closeViewNotif = () => { setViewNotif(null); setModalNames({ sender: null, recipient: null }) }

  const handleMarkAllRead = async () => {
    if (!user?.userId) return
    await markAllAsRead(user.userId).catch(() => {})
    load()
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteNotification(confirmDelete.notificationId)
      setConfirmDelete(null)
      load()
    } catch {
      alert('Failed to delete notification. Please try again.')
    } finally { setDeleting(false) }
  }

  const clearFilters = () => { setFilterStatus(''); setFilterType(''); setSearch('') }
  const hasFilters = filterStatus || filterType || search

  const filtered = baseList.filter(n => {
    const matchSearch = !search ||
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.message?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || n.status === filterStatus
    const matchType   = !filterType   || n.type === filterType
    return matchSearch && matchStatus && matchType
  })

  const typeBadge = (t) => {
    const map = {
      INFO: 'badge-primary', WARNING: 'badge-warning', ALERT: 'badge-danger',
      REMINDER: 'badge-success', SYSTEM: 'badge-secondary',
      EMAIL: 'badge-secondary', SMS: 'badge-secondary'
    }
    return <span className={`badge ${map[t] || 'badge-secondary'}`}>{t}</span>
  }

  const statusBadge = (s) => {
    const map = { UNREAD: 'badge-primary', READ: 'badge-secondary', ARCHIVED: 'badge-warning' }
    return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s}</span>
  }

  const directionChip = (n) => {
    const sent = isSentByMe(n)
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
        padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
        background: sent ? '#eff6ff' : '#f0fdf4',
        color: sent ? '#1d4ed8' : '#15803d',
        border: `1px solid ${sent ? '#bfdbfe' : '#bbf7d0'}`
      }}>
        {sent ? '↑ SENT' : '↓ RECEIVED'}
      </span>
    )
  }

  const tabBtn = (tab, label, count) => (
    <button
      onClick={() => setViewTab(tab)}
      style={{
        padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: viewTab === tab ? '2px solid #1a56db' : '1px solid #e2e8f0',
        background: viewTab === tab ? '#eff6ff' : '#f8fafc',
        color: viewTab === tab ? '#1a56db' : '#64748b',
        display: 'flex', alignItems: 'center', gap: 6
      }}
    >
      {label}
      <span style={{
        background: viewTab === tab ? '#1a56db' : '#e2e8f0',
        color: viewTab === tab ? '#fff' : '#64748b',
        borderRadius: 10, fontSize: 11, fontWeight: 700,
        padding: '1px 7px', minWidth: 20, textAlign: 'center'
      }}>{count}</span>
    </button>
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    } catch { return dateStr }
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <Navbar title="Notifications" />
      <div className="page-content">
        <div className="page-header">
          <h2>Notifications</h2>
          <p>Platform alerts and messages — {unreadCount} unread</p>
        </div>
        <div className="card">
          {/* ── Tab row ── */}
          <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8, borderBottom: '1px solid #f1f5f9' }}>
            {tabBtn('all',      'All',      notifications.length)}
            {tabBtn('received', 'Received', receivedList.length)}
            {tabBtn('sent',     'Sent',     sentList.length)}
          </div>

          {/* ── Toolbar ── */}
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10, borderTop: 'none', paddingTop: 14 }}>
            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
              <input className="search-input" placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)} />
              <select
                className="search-input"
                style={{ minWidth: 140, color: filterStatus ? '#0f172a' : '#94a3b8' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="search-input"
                style={{ minWidth: 140, color: filterType ? '#0f172a' : '#94a3b8' }}
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {hasFilters && <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear</button>}
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
              <span style={{ color: '#64748b', fontSize: '13px' }}>{filtered.length} of {baseList.length} notifications</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {viewTab !== 'sent' && (
                <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>✓ Mark All Read</button>
              )}
              {canCreate && (
                <button className="btn btn-primary" onClick={() => {
                  setForm(empty); setError(''); setShowModal(true)
                  setUsersLoadFailed(false)
                  // Load users list for recipient dropdown — skipAuthRedirect so non-admin
                  // roles (CTM etc.) don't get redirected to login on 403
                  getUsers({ skipAuthRedirect: true })
                    .then(r => {
                      const others = (r.data || []).filter(u => Number(u.userId) !== currentUserId)
                      setUsersList(others)
                      setUsersLoadFailed(false)
                    })
                    .catch(() => {
                      setUsersList([])
                      setUsersLoadFailed(true) // fall back to manual ID input
                    })
                }}>
                  + Send Notification
                </button>
              )}
            </div>
          </div>

          {loading ? <div className="loading"><div className="spinner" />Loading...</div> :
            loadError === 'deleted-unavailable'
              ? (
                <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🗑️</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#475569', marginBottom: 6 }}>Deleted notifications unavailable</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    The service may need a restart to enable this feature.
                    <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }}
                      onClick={() => { setShowDeleted(false); load(false) }}>
                      ← Back to inbox
                    </button>
                  </div>
                </div>
              )
            : filtered.length === 0
              ? <div className="empty-state"><div className="icon">🔔</div><h3>No notifications</h3></div>
              : <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 12 }}></th>
                        {viewTab === 'all' && <th style={{ width: 90 }}>Direction</th>}
                        <th>Title</th>
                        <th>Message</th>
                        <th>Type</th>
                        {viewTab !== 'sent' && <th>Status</th>}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(n => {
                        const sent = isSentByMe(n)
                        return (
                          <tr
                            key={n.notificationId}
                            style={{
                              background: showDeleted ? '#fff5f5' : (!sent && n.status === 'UNREAD' ? '#eff6ff' : 'white'),
                              cursor: 'pointer'
                            }}
                            onClick={() => handleViewNotif(n)}
                          >
                            <td style={{ padding: '12px 4px 12px 14px' }} onClick={e => e.stopPropagation()}>
                              {!sent && n.status === 'UNREAD' && (
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1a56db' }} />
                              )}
                            </td>
                            {viewTab === 'all' && (
                              <td onClick={e => e.stopPropagation()}>{directionChip(n)}</td>
                            )}
                            <td><strong>{n.title || '—'}</strong></td>
                            <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{n.message || '—'}</td>
                            <td>{typeBadge(n.type)}</td>
                            {viewTab !== 'sent' && <td>{statusBadge(n.status)}</td>}
                            <td onClick={e => e.stopPropagation()}>
                              <div className="actions">
                                {showDeleted ? (
                                  <>
                                    {/* Restore — admin only can restore any; others can restore their own */}
                                    {(hasRole('ADMIN') || isSentByMe(n) || n.userId === currentUserId) && (
                                      <button
                                        className="btn btn-sm"
                                        style={{ fontSize: '11px', padding: '4px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                        onClick={() => restoreNotification(n.notificationId).then(() => load()).catch(() => {})}
                                      >
                                        ↩ Restore
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {/* Received: mark read/unread */}
                                    {!sent && n.status === 'UNREAD' && (
                                      <span className="icon-tooltip" data-tip="Mark as Read">
                                        <button className="btn btn-icon btn-sm" onClick={() => handleMarkRead(n.notificationId)}>✓</button>
                                      </span>
                                    )}
                                    {!sent && n.status === 'READ' && (
                                      <span className="icon-tooltip" data-tip="Mark as Unread">
                                        <button className="btn btn-icon btn-sm" onClick={() => handleMarkUnread(n.notificationId)}>↩</button>
                                      </span>
                                    )}
                                    {/* Archive — available for both sent and received */}
                                    {n.status !== 'ARCHIVED' && (
                                      <span className="icon-tooltip" data-tip="Archive">
                                        <button className="btn btn-icon btn-sm" onClick={() => handleArchive(n.notificationId)}><ArchiveIcon /></button>
                                      </span>
                                    )}
                                    {n.status === 'ARCHIVED' && (
                                      <span className="icon-tooltip" data-tip="Unarchive">
                                        <button className="btn btn-icon btn-sm" onClick={() => handleMarkUnread(n.notificationId)}>↩</button>
                                      </span>
                                    )}
                                    {/* Delete — available to all users for their own notifications */}
                                    <span className="icon-tooltip" data-tip="Delete">
                                      <button className="btn btn-icon btn-sm" onClick={() => setConfirmDelete(n)}><TrashIcon /></button>
                                    </span>
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

      {/* ── Send Notification Modal ──────────────────────────────────────────── */}
      {showModal && (
        <Modal title="Send Notification" onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel="Send" loading={saving}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Recipient</label>
              {usersLoadFailed ? (
                /* Fallback: manual ID entry for roles that can't fetch the users list */
                <>
                  <input
                    className="form-control"
                    type="number"
                    value={form.userId}
                    onChange={f('userId')}
                    placeholder="Enter recipient User ID (leave blank to broadcast)"
                  />
                  <small style={{ color: '#64748b', fontSize: '11px' }}>
                    {form.userId ? `Sending to User #${form.userId}` : 'Leave blank to broadcast to all users.'}
                  </small>
                </>
              ) : (
                /* Dropdown for roles that can fetch all users (ADMIN) */
                <>
                  <select
                    className="form-control"
                    value={form.userId}
                    onChange={f('userId')}
                    style={{ fontSize: 13 }}
                  >
                    <option value="">📢 Broadcast to all users</option>
                    {usersList.length === 0 && (
                      <option disabled>Loading users...</option>
                    )}
                    {usersList.map(u => {
                      const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || `User #${u.userId}`
                      const role = (u.role || u.userRole || '').replace(/_/g, ' ')
                      return (
                        <option key={u.userId} value={u.userId}>
                          {name}{role ? ` — ${role}` : ''} (#{u.userId})
                        </option>
                      )
                    })}
                  </select>
                  <small style={{ color: '#64748b', fontSize: '11px' }}>
                    {form.userId ? `Sending to User #${form.userId}` : 'No recipient selected — will broadcast to all users.'}
                  </small>
                </>
              )}
            </div>
            <div className="form-group">
              <label>Type *</label>
              <select className="form-control" value={form.type} onChange={f('type')}>
                <option value="" disabled>Select Type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Title *</label>
            <input className="form-control" value={form.title} onChange={f('title')} placeholder="e.g. Sample Analysis Complete" />
          </div>
          <div className="form-group">
            <label>Message *</label>
            <textarea className="form-control" rows={3} value={form.message} onChange={f('message')} placeholder="e.g. Lab results for Patient #1 are now available." style={{ resize: 'vertical' }} />
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderRadius: '12px 12px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}><TrashIcon /></span>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Delete Notification</h3>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 13 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                Are you sure you want to permanently delete this notification?
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{confirmDelete.title || '(No title)'}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {confirmDelete.message || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setConfirmDelete(null)} disabled={deleting} style={{ minWidth: 90 }}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}
                  style={{ minWidth: 120, background: '#ef4444', color: '#fff', border: 'none' }}>
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Detail Modal ─────────────────────────────────────────── */}
      {viewNotif && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            <div style={{
              background: viewNotif.type === 'ALERT'    ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
                        : viewNotif.type === 'WARNING'  ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                        : viewNotif.type === 'REMINDER' ? 'linear-gradient(135deg,#059669,#047857)'
                        : 'linear-gradient(135deg,#1a56db,#1e429f)',
              padding: '22px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {viewNotif.type}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: 'rgba(255,255,255,0.2)', color: '#fff'
                  }}>
                    {isSentByMe(viewNotif) ? '↑ SENT' : '↓ RECEIVED'}
                  </span>
                </div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>
                  {viewNotif.title || 'Notification'}
                </h3>
              </div>
              <button onClick={closeViewNotif}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 8px', flexShrink: 0 }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <p style={{ color: '#1e293b', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {viewNotif.message || '—'}
              </p>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {!isSentByMe(viewNotif) && (
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Status</div>
                    <div>{statusBadge(viewNotif.status)}</div>
                  </div>
                )}
                {/* Sent By — shown for received notifications */}
                {!isSentByMe(viewNotif) && viewNotif.senderUserId && (
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>From</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {modalNames.sender || `User #${viewNotif.senderUserId}`}
                    </div>
                  </div>
                )}
                {/* Recipient — shown for sent notifications */}
                {isSentByMe(viewNotif) && (
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>To</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {viewNotif.userId
                        ? (modalNames.recipient || `User #${viewNotif.userId}`)
                        : viewNotif.senderUserId
                          ? <span style={{ color: '#64748b', fontWeight: 400 }}>All Users (Broadcast)</span>
                          : <span style={{ color: '#64748b', fontWeight: 400 }}>System</span>}
                    </div>
                  </div>
                )}
                {viewNotif.createdDate && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Date</div>
                    <div style={{ fontSize: 13, color: '#475569' }}>{formatDate(viewNotif.createdDate)}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '12px 28px 20px', display: 'flex', gap: 8 }}>
              {/* Only show these actions for received notifications */}
              {!isSentByMe(viewNotif) && viewNotif.status === 'READ' && (
                <button className="btn btn-outline btn-sm" onClick={() => { handleMarkUnread(viewNotif.notificationId); closeViewNotif() }}>↩ Mark Unread</button>
              )}
              {viewNotif.status !== 'ARCHIVED' && (
                <button className="btn btn-outline btn-sm" onClick={() => { handleArchive(viewNotif.notificationId); closeViewNotif() }}><ArchiveIcon /> Archive</button>
              )}
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={closeViewNotif}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
