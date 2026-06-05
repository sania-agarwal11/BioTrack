import api from './axios'

export const getProtocols = () => api.get('/protocols')
export const getProtocolById = (id) => api.get(`/protocols/${id}`)
export const createProtocol = (data) => api.post('/protocols', data)
export const updateProtocol = (id, data) => api.put(`/protocols/${id}`, data)
export const deleteProtocol = (id) => api.delete(`/protocols/${id}`)
export const updateProtocolPhase = (id, phase) => api.patch(`/protocols/${id}/phase?phase=${phase}`)
export const closeProtocol = (id) => api.patch(`/protocols/${id}/close`)
export const assignSiteToProtocol = (protocolId, siteId) => api.post(`/protocols/${protocolId}/sites/${siteId}`)
export const getProtocolsBySite = (siteId) => api.get(`/protocols/site/${siteId}`)
export const getDeletedProtocols = () => api.get('/protocols/deleted')
export const restoreProtocol = (id) => api.put(`/protocols/${id}/restore`)
