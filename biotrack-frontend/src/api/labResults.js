import api from './axios'

export const getLabResults = () => api.get('/lab-results')
export const getLabResultById = (id) => api.get(`/lab-results/${id}`)
export const createLabResult = (data) => api.post('/lab-results', data)
export const updateLabResult = (id, data) => api.put(`/lab-results/${id}`, data)
export const deleteLabResult = (id) => api.delete(`/lab-results/${id}`)
export const getLabResultBySampleId = (sampleId) => api.get(`/lab-results/sample/${sampleId}`)
export const getDeletedLabResults = () => api.get('/lab-results/deleted')
export const restoreLabResult = (id) => api.put(`/lab-results/${id}/restore`)
