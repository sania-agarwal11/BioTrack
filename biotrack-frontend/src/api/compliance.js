import api from './axios'

// Audit Logs
export const getAuditLogs = () => api.get('/audit-logs')
export const getAuditLogById = (id) => api.get(`/audit-logs/${id}`)
export const createAuditLog = (data) => api.post('/audit-logs', data)
export const updateAuditLog = (id, data) => api.put(`/audit-logs/${id}`, data)
export const deleteAuditLog = (id) => api.delete(`/audit-logs/${id}`)
export const getAuditLogsByUser = (userId) => api.get(`/audit-logs/user/${userId}`)
export const getAuditLogsByAction = (action) => api.get(`/audit-logs/action/${action}`)
export const getAuditLogsByEntity = (entityId) => api.get(`/audit-logs/entity/${entityId}`)

// Compliance Reports
export const getComplianceReports = () => api.get('/compliance-reports')
export const getComplianceReportById = (id) => api.get(`/compliance-reports/${id}`)
export const createComplianceReport = (data) => api.post('/compliance-reports', data)
export const updateComplianceReport = (id, data) => api.put(`/compliance-reports/${id}`, data)
export const deleteComplianceReport = (id) => api.delete(`/compliance-reports/${id}`)
export const generateComplianceReport = () => api.post('/compliance-reports/generate')
