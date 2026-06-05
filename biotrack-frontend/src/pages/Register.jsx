import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/auth'

const ROLES = [
  { value: 'CLINICAL_TRIAL_MANAGER', label: 'Clinical Trial Manager' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'RESEARCH_SCIENTIST', label: 'Research Scientist' },
  { value: 'DATA_MANAGER', label: 'Data Manager' },
  { value: 'REGULATORY_OFFICER', label: 'Regulatory Officer' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_RE  = /^[a-zA-Z\s]+$/

// Simple SVG eye icons (no emoji)
function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: '', password: '', confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const f = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value })
    setFieldErrors(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const errs = {}
    if (!form.name.trim())                          errs.name  = 'Full name is required.'
    else if (!NAME_RE.test(form.name.trim()))        errs.name  = 'Name must contain letters only.'
    if (!form.email.trim())                          errs.email = 'Email address is required.'
    else if (!EMAIL_RE.test(form.email.trim()))      errs.email = 'Please enter a valid email address.'
    if (!form.role)                                  errs.role  = 'Please select a role.'
    if (form.phone && form.phone.length !== 10)      errs.phone = 'Phone number must be exactly 10 digits.'
    if (form.password.length < 6)                    errs.password = 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPassword)      errs.confirmPassword = 'Passwords do not match.'

    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setLoading(true)
    try {
      const { confirmPassword, ...payload } = form
      const res = await register(payload)
      const msg = res.data?.message || 'Registration submitted! Please wait for admin approval.'
      setSuccess(msg)
      // Don't redirect — user must wait for approval email before they can log in
    } catch (err) {
      const serverMsg = err.response?.data
      setError(typeof serverMsg === 'string' ? serverMsg : (serverMsg?.message || 'Registration failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (pwd) => {
    if (!pwd) return null
    if (pwd.length < 6) return { label: 'Too short', color: '#dc2626', width: '20%' }
    if (pwd.length < 8) return { label: 'Weak', color: '#f59e0b', width: '40%' }
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Fair', color: '#f59e0b', width: '60%' }
    if (pwd.length >= 10) return { label: 'Strong', color: '#059669', width: '100%' }
    return { label: 'Good', color: '#10b981', width: '80%' }
  }

  const strength = passwordStrength(form.password)

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480 }}>
        <div className="login-brand">
          <h1>Bio<span>Track</span></h1>
          <p>Create your account</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                  setForm({ ...form, name: val })
                  setFieldErrors(prev => { const n = { ...prev }; delete n.name; return n })
                }}
                placeholder="Jane Doe"
                style={{ borderColor: fieldErrors.name ? '#dc2626' : undefined }}
              />
              {fieldErrors.name && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.name}</p>}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                className="form-control"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="Enter 10-digit number"
                maxLength={10}
                style={{ borderColor: form.phone && form.phone.length !== 10 ? '#dc2626' : undefined }}
              />
              {form.phone && form.phone.length !== 10 && (
                <p style={{ fontSize: '11px', color: '#dc2626', marginTop: 3, fontWeight: 500 }}>
                  Invalid phone number. Must be exactly 10 digits.
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              className="form-control"
              type="email"
              value={form.email}
              onChange={f('email')}
              placeholder="you@biotrack.com"
              style={{ borderColor: fieldErrors.email ? '#dc2626' : undefined }}
            />
            {fieldErrors.email && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.email}</p>}
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              className="form-control"
              value={form.role}
              onChange={f('role')}
              style={{ borderColor: fieldErrors.role ? '#dc2626' : undefined }}
            >
              <option value="" disabled>Select Role</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {fieldErrors.role
              ? <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.role}</p>
              : <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>Admin accounts can only be created by an existing administrator.</p>
            }
          </div>

          <div className="form-group">
            <label>Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={f('password')}
                placeholder="Min. 6 characters"
                required
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {fieldErrors.password && <p style={{ color: '#dc2626', fontSize: '11px', marginTop: 3, fontWeight: 500 }}>{fieldErrors.password}</p>}
            {strength && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: '11px', color: strength.color, marginTop: 3, fontWeight: 500 }}>{strength.label}</p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={f('confirmPassword')}
                placeholder="Re-enter your password"
                required
                style={{
                  paddingRight: 40,
                  borderColor: form.confirmPassword && form.password !== form.confirmPassword ? '#dc2626' : undefined
                }}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p style={{ fontSize: '11px', color: '#dc2626', marginTop: 3, fontWeight: 500 }}>{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '13px', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
