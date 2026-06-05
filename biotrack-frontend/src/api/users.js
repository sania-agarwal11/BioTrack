import api from './axios'

export const getUsers = (options = {}) => api.get('/users', options)
export const getUserById = (id) => api.get(`/users/${id}`)
export const getUserProfile = (id) => api.get(`/users/${id}/profile`, { skipAuthRedirect: true })
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const updateUserRole = (id, role) => api.put(`/users/${id}/role?role=${role}`)
export const updateUserStatus = (id, status) => api.patch(`/users/${id}/status?status=${status}`)
export const resetPassword = (id, newPassword) => api.post(`/users/${id}/reset-password?newPassword=${newPassword}`)
export const getRoles = () => api.get('/users/roles')
export const approveUser = (id) => api.post(`/users/${id}/approve`)
export const rejectUser  = (id) => api.post(`/users/${id}/reject`)

// Self-service profile endpoints — any authenticated user
export const updateMyProfile  = (id, data)  => api.patch(`/users/${id}/me`, data)
export const changeMyPassword = (id, data)  => api.post(`/users/${id}/change-password`, data)
