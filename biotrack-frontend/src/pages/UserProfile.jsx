import { useState } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { updateMyProfile, changeMyPassword } from '../api/users'

function EyeIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

const roleLabel = {
  ADMIN:                  'Administrator',
  CLINICAL_TRIAL_MANAGER: 'Clinical Trial Manager',
  LAB_TECHNICIAN:         'Lab Technician',
  RESEARCH_SCIENTIST:     'Research Scientist',
  REGULATORY_OFFICER:     'Regulatory Officer',
  DATA_MANAGER:           'Data Manager',
}

const roleColor = {
  ADMIN:                  { bg: '#fee2e2', text: '#dc2626' },
  CLINICAL_TRIAL_MANAGER: { bg: '#dbeafe', text: '#1a56db' },
  LAB_TECHNICIAN:         { bg: '#d1fae5', text: '#059669' },
  RESEARCH_SCIENTIST:     { bg: '#f3e8ff', text: '#7c3aed' },
  REGULATORY_OFFICER:     { bg: '#fef3c7', text: '#d97706' },
  DATA_MANAGER:           { bg: '#f0fdf4', text: '#16a34a' },
}

export default function UserProfile() {
  const { user, refreshUser } = useAuth()

  const isAdmin = user?.role === 'ADMIN'

  // ── Profile edit state ────────────────────────────────────────
  const [name,  setName]  = useState(user?.name  || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileSaving,  setProfileSaving]  = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError,   setProfileError]   = useState('')

  // ── Password change state ─────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError,   setPwError]   = useState('')

  const rc = roleColor[user?.role] || { bg: '#f1f5f9', text: '#475569' }
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  // ── Password strength ─────────────────────────────────────────
  const pwStrength = (pw) => {
    if (!pw) return null
    let score = 0
    if (pw.length >= 8)  score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { label: 'Weak',   color: '#ef4444', width: '25%' }
    if (score === 2) return { label: 'Fair',   color: '#f59e0b', width: '50%' }
    if (score === 3) return { label: 'Good',   color: '#3b82f6', width: '75%' }
    return               { label: 'Strong', color: '#16a34a', width: '100%' }
  }
  const strength = pwStrength(newPw)

  const handleProfileSave = async () => {
    setProfileError(''); setProfileSuccess('')
    if (!name.trim()) { setProfileError('Name cannot be empty.'); return }
    if (isAdmin && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileError('Please enter a valid email address.'); return
    }
    setProfileSaving(true)
    try {
      const payload = { name: name.trim(), phone: phone.trim() }
      if (isAdmin) payload.email = email.trim()
      await updateMyProfile(user.userId, payload)
      await refreshUser()                // updates sidebar name/email immediately
      setProfileSuccess('Profile updated successfully!')
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPwError(''); setPwSuccess('')
    if (!currentPw) { setPwError('Please enter your current password.'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    setPwSaving(true)
    try {
      await changeMyPassword(user.userId, { currentPassword: currentPw, newPassword: newPw })
      setPwSuccess('Password changed successfully!')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwError(err.response?.data?.message || 'Current password is incorrect.')
    } finally {
      setPwSaving(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Navbar title="My Profile" />
      <div className="page-content">

        {/* ── Page Header ── */}
        <div className="page-header">
          <h2>My Profile</h2>
          <p>View and update your personal information and password</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Identity Card ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Avatar card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* gradient banner */}
              <div style={{ height: 80, background: 'linear-gradient(135deg, #1e3a5f 0%, #028090 100%)' }} />

              {/* avatar overlapping banner */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 24px', marginTop: -36 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#1a56db', border: '4px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 800, color: '#fff',
                  boxShadow: '0 4px 12px rgba(26,86,219,0.35)',
                }}>
                  {initials}
                </div>
                <h3 style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
                  {user.name}
                </h3>
                <span style={{
                  padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: rc.bg, color: rc.text,
                }}>
                  {roleLabel[user.role] || user.role}
                </span>
              </div>
            </div>

            {/* Info card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
                Account Info
              </div>
              {[
                { icon: '🆔', label: 'User ID', value: `#${user.userId}` },
                { icon: '📧', label: 'Email', value: isAdmin ? email || user.email : user.email },
                { icon: '📱', label: 'Phone', value: user.phone || '—' },
                { icon: '🔐', label: 'Role', value: roleLabel[user.role] || user.role },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>{row.value}</div>
                  </div>
                </div>
              ))}
              {isAdmin ? (
                <div style={{ marginTop: 8, padding: '10px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#1d4ed8', lineHeight: 1.5 }}>
                    👑 As Administrator, you can also edit your email address.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 8, padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#0369a1', lineHeight: 1.5 }}>
                    ℹ️ Email and Role can only be changed by an Administrator.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Edit forms ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Edit Profile ── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #eff6ff, #fff)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>✏️ Edit Profile</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Update your name and phone number</p>
              </div>
              <div style={{ padding: '24px' }}>
                {profileSuccess && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#15803d', fontSize: 13, fontWeight: 600 }}>
                    ✅ {profileSuccess}
                  </div>
                )}
                {profileError && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                    ❌ {profileError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      className="form-control"
                      value={name}
                      onChange={e => { setName(e.target.value); setProfileSuccess(''); setProfileError('') }}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      className="form-control"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setProfileSuccess(''); setProfileError('') }}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Email Address{' '}
                      {isAdmin
                        ? <span style={{ color: '#1a56db', fontSize: 11, fontWeight: 600 }}>✏️ editable</span>
                        : <span style={{ color: '#94a3b8', fontSize: 11 }}>(read-only)</span>}
                    </label>
                    <input
                      className="form-control"
                      type="email"
                      value={email}
                      onChange={isAdmin ? e => { setEmail(e.target.value); setProfileSuccess(''); setProfileError('') } : undefined}
                      readOnly={!isAdmin}
                      style={!isAdmin ? { background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' } : {}}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role <span style={{ color: '#94a3b8', fontSize: 11 }}>(read-only)</span></label>
                    <input
                      className="form-control"
                      value={roleLabel[user.role] || user.role}
                      readOnly
                      style={{ background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    style={{ minWidth: 140, fontWeight: 700 }}
                  >
                    {profileSaving ? 'Saving…' : '💾 Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Change Password ── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #fef3f2, #fff)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>🔑 Change Password</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Enter your current password then choose a new one</p>
              </div>
              <div style={{ padding: '24px' }}>
                {pwSuccess && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#15803d', fontSize: 13, fontWeight: 600 }}>
                    ✅ {pwSuccess}
                  </div>
                )}
                {pwError && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                    ❌ {pwError}
                  </div>
                )}

                {/* Current password */}
                <div className="form-group">
                  <label>Current Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPw}
                      onChange={e => { setCurrentPw(e.target.value); setPwError(''); setPwSuccess('') }}
                      placeholder="Enter your current password"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      onClick={() => setShowCurrent(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                    >{showCurrent ? <EyeOffIcon /> : <EyeIcon />}</button>
                  </div>
                </div>

                {/* New passwords side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>New Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type={showNew ? 'text' : 'password'}
                        value={newPw}
                        onChange={e => { setNewPw(e.target.value); setPwError(''); setPwSuccess('') }}
                        placeholder="Min. 6 characters"
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        onClick={() => setShowNew(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                      >{showNew ? <EyeOffIcon /> : <EyeIcon />}</button>
                    </div>
                    {/* Strength bar */}
                    {strength && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: strength.width, height: '100%', background: strength.color, borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 11, color: strength.color, marginTop: 3, fontWeight: 600 }}>{strength.label}</div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-control"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setPwError(''); setPwSuccess('') }}
                        placeholder="Repeat new password"
                        style={{ paddingRight: 44, borderColor: confirmPw && newPw !== confirmPw ? '#fca5a5' : undefined }}
                      />
                      <button
                        onClick={() => setShowConfirm(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                      >{showConfirm ? <EyeOffIcon /> : <EyeIcon />}</button>
                    </div>
                    {confirmPw && newPw !== confirmPw && (
                      <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Passwords do not match</div>
                    )}
                    {confirmPw && newPw === confirmPw && newPw && (
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>✓ Passwords match</div>
                    )}
                  </div>
                </div>

                {/* Tips */}
                <div style={{ margin: '4px 0 16px', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                    <strong>Tips for a strong password:</strong> Use at least 8 characters · Mix uppercase &amp; lowercase · Add numbers and symbols
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handlePasswordChange}
                    disabled={pwSaving}
                    style={{ minWidth: 160, fontWeight: 700, background: '#dc2626', borderColor: '#dc2626' }}
                  >
                    {pwSaving ? 'Changing…' : '🔑 Change Password'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
