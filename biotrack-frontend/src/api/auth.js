import api from './axios'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const register = (data) =>
  api.post('/auth/register', data)

export const getMe = () =>
  api.get('/auth/me')

export const logout = () =>
  api.post('/auth/logout')

// ── Forgot Password OTP flow ──────────────────────────────────────────────────

// Step 1: request OTP email
export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email })

// Step 2: verify OTP (non-consuming — OTP stays valid for step 3)
export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp })

// Step 3: reset password with the verified OTP (consuming)
export const resetPasswordWithOtp = (email, otp, newPassword) =>
  api.post('/auth/reset-password', { email, otp, newPassword })
