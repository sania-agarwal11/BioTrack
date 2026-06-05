import api from './axios'

export const getDashboard = () => api.get('/analytics/dashboard')
export const getKpiReports = () => api.get('/analytics/kpi-reports')
export const getKpiReportById = (id) => api.get(`/analytics/kpi-reports/${id}`)
export const createKpiReport = (data) => api.post('/analytics/kpi-reports', data)
export const updateKpiReport = (id, data) => api.put(`/analytics/kpi-reports/${id}`, data)
export const deleteKpiReport = (id) => api.delete(`/analytics/kpi-reports/${id}`)
export const getReportsByScope = (scope) => api.get(`/analytics/kpi-reports/scope/${scope}`)
export const autoGenerateKpiReports = () => api.post('/analytics/kpi-reports/auto-generate')
export const autoGenerateKpiReportsByScope = (scope) => api.post(`/analytics/kpi-reports/auto-generate/${scope}`)
export const getStudyProgressReport = () => api.get('/analytics/study-progress')
