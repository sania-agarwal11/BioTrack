import api from './axios'

export const getVisits = () => api.get('/visits')
export const getVisitById = (id) => api.get(`/visits/${id}`)
export const createVisit = (data) => api.post('/visits', data)
export const updateVisit = (id, data) => api.put(`/visits/${id}`, data)
export const deleteVisit = (id) => api.delete(`/visits/${id}`)
export const getVisitsByPatient = (patientId) => api.get(`/visits/patient/${patientId}`)
export const getDeletedVisits = () => api.get('/visits/deleted')
export const restoreVisit = (id) => api.put(`/visits/${id}/restore`)
