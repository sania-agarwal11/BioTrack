import api from './axios'

export const getSites = () => api.get('/sites')
export const getSiteById = (id) => api.get(`/sites/${id}`)
export const createSite = (data) => api.post('/sites', data)
export const updateSite = (id, data) => api.put(`/sites/${id}`, data)
export const deleteSite = (id) => api.delete(`/sites/${id}`)
export const updateSiteStatus = (id, status) => api.put(`/sites/${id}/status?status=${status}`)
export const getSitesByProtocol = (protocolId) => api.get(`/sites/protocol/${protocolId}`)
export const getSiteInvestigators = (id) => api.get(`/sites/${id}/investigators`)
export const getSiteProtocols = (id) => api.get(`/sites/${id}/protocols`)
export const getDeletedSites = () => api.get('/sites/deleted')
export const restoreSite = (id) => api.put(`/sites/${id}/restore`)
