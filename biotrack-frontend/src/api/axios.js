import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('biotrack_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — redirect to login
// Use { skipAuthRedirect: true } on any request config to suppress the redirect
// (e.g. getUserProfile, optional lookups that shouldn't boot the user out on failure)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('biotrack_token')
      localStorage.removeItem('biotrack_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
