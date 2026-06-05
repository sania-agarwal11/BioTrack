import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, logout as logoutApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('biotrack_token')
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('biotrack_token')
          localStorage.removeItem('biotrack_user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signIn = (token, userData) => {
    localStorage.setItem('biotrack_token', token)
    setUser(userData)
  }

  const signOut = async () => {
    try {
      // Call backend logout so the LOGOUT audit event is recorded
      await logoutApi()
    } catch (_) {
      // Fire-and-forget — even if the API call fails, still sign out locally
    }
    localStorage.removeItem('biotrack_token')
    localStorage.removeItem('biotrack_user')
    setUser(null)
  }

  const hasRole = (...roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  // Re-fetch /auth/me so sidebar name/avatar reflects profile edits immediately
  const refreshUser = () =>
    getMe().then(res => setUser(res.data)).catch(() => {})

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
