import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, verifyOtp, resetPasswordWithOtp } from '../api/auth'

// ── Password strength helper ──────────────────────────────────────────────────
function passwordStrength(pwd) {
  if (!pwd) return null
  if (pwd.length < 6) return { label: 'Too short', color: '#dc2626', pct: 15 }
  if (pwd.length < 8) return { label: 'Weak', color: '#f59e0b', pct: 35 }
  if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Fair', color: '#eab308', pct: 60 }
  if (pwd.length >= 10 && /[^A-Za-z0-9]/.test(pwd)) return { label: 'Strong', color: '#059669', pct: 100 }
  return { label: 'Good', color: '#10b981', pct: 80 }
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step, done }) {
  const steps = ['Enter Email', 'Verify OTP', 'New Password']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => {
        const num = i + 1
        const active = step === num
        const completed = done || step > num
        return (
          <div key={num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: completed ? '#059669' : active ? 'var(--primary)' : '#e2e8f0',
                color: completed || active ? '#fff' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.25s'
              }}>
                {completed ? '✓' : num}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 400,
                color: completed ? '#059669' : active ? 'var(--primary)' : '#94a3b8',
                whiteSpace: 'nowrap'
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 6px', marginBottom: 16,
                background: step > num ? '#059669' : '#e2e8f0',
                transition: 'background 0.3s'
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── OTP digit input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([])

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = val
    onChange(arr.join(''))
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      onChange(pasted)
      inputs.current[5]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
            border: `2px solid ${value[i] ? 'var(--primary)' : '#e2e8f0'}`,
            borderRadius: 10, outline: 'none', color: '#1e293b',
            background: value[i] ? '#eff6ff' : '#f8fafc',
            transition: 'all 0.15s', fontFamily: 'monospace'
          }}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step, setStep]               = useState(1)
  const [done, setDone]               = useState(false)
  const [email, setEmail]             = useState('')
  const [otp, setOtp]                 = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]             = useState('')
  const [info, setInfo]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Countdown for resend button
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  const strength = passwordStrength(newPassword)

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await forgotPassword(email.trim().toLowerCase())
      setInfo(res.data.message || 'OTP sent! Check your email.')
      setStep(2)
      setResendTimer(60)
    } catch (err) {
      const data = err.response?.data
      const msg = (typeof data === 'string' ? data : data?.message || data?.error || data?.detail || null)
        || err.message
        || 'Failed to send OTP. Please try again.'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.length < 6) { setError('Please enter the complete 6-digit OTP.'); return }
    setLoading(true)
    try {
      await verifyOtp(email.trim().toLowerCase(), otp)
      setInfo('')
      setStep(3)
    } catch (err) {
      const data = err.response?.data
      setError((typeof data === 'string' ? data : data?.message || data?.error || null)
        || 'Invalid or expired OTP. Please try again.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return
    setError('')
    setOtp('')
    setLoading(true)
    try {
      const res = await forgotPassword(email.trim().toLowerCase())
      setInfo(res.data.message || 'New OTP sent!')
      setResendTimer(60)
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: reset password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPwd) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await resetPasswordWithOtp(email.trim().toLowerCase(), otp, newPassword)
      setDone(true)
    } catch (err) {
      const data = err.response?.data
      setError((typeof data === 'string' ? data : data?.message || data?.error || null)
        || 'Failed to reset password. Please start over.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <h2 style={{ color: '#1e293b', margin: '0 0 8px' }}>Password Reset!</h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Your password has been updated successfully.<br />
            You can now sign in with your new credentials.
          </p>
          <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Go to Sign In →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1>Bio<span>Track</span></h1>
          <p>Reset your password</p>
        </div>

        <StepIndicator step={step} done={done} />

        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
        {info  && !error && <div className="alert alert-success" style={{ marginBottom: 16 }}>{info}</div>}

        {/* ── Step 1: Enter Email ─────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.65 }}>
              Enter your registered email address. We'll send a 6-digit OTP to verify your identity.
            </p>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading || !email}>
              {loading ? 'Sending OTP…' : 'Send OTP →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
              Remember your password?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>
          </form>
        )}

        {/* ── Step 2: Enter OTP ──────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4, lineHeight: 1.65 }}>
              A 6-digit OTP was sent to <strong>{email}</strong>.<br />
              Enter it below — it expires in <strong>10 minutes</strong>.
            </p>

            <OtpInput value={otp} onChange={setOtp} />

            <button type="submit" className="login-btn" disabled={loading || otp.length < 6}>
              {loading ? 'Verifying…' : 'Verify OTP →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#64748b' }}>
              Didn't receive the email?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                style={{
                  background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                  color: resendTimer > 0 ? '#94a3b8' : 'var(--primary)',
                  fontWeight: 600, fontSize: 13, padding: 0
                }}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                ← Change email
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: New Password ────────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, lineHeight: 1.65 }}>
              OTP verified ✓ — now choose a strong new password for <strong>{email}</strong>.
            </p>

            <div className="form-group">
              <label>New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  autoFocus
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowNew(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', lineHeight: 1 }}>
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
              {strength && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, borderRadius: 4, transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{
                    paddingRight: 44,
                    borderColor: confirmPwd && newPassword !== confirmPwd ? '#dc2626' : undefined
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', lineHeight: 1 }}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPwd && newPassword !== confirmPwd && (
                <span style={{ fontSize: 11, color: '#dc2626' }}>Passwords do not match</span>
              )}
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPwd}
            >
              {loading ? 'Resetting…' : '🔒 Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
