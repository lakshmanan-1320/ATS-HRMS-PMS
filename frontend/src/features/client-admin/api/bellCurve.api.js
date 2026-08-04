import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const listConfigurations = async () => {
  const res = await api.get('/client-admin/bell-curve/configurations')
  return res.data
}

export const createConfiguration = async (data) => {
  const res = await api.post('/client-admin/bell-curve/configurations', data)
  return res.data
}

export const updateConfiguration = async (configId, data) => {
  const res = await api.put(`/client-admin/bell-curve/configurations/${configId}`, data)
  return res.data
}

export const deleteConfiguration = async (configId) => {
  const res = await api.delete(`/client-admin/bell-curve/configurations/${configId}`)
  return res.data
}

export const getBuckets = async (configId) => {
  const res = await api.get(`/client-admin/bell-curve/configurations/${configId}/buckets`)
  return res.data
}

export const saveBuckets = async (configId, buckets) => {
  const res = await api.post(`/client-admin/bell-curve/configurations/${configId}/buckets`, { buckets })
  return res.data
}

export const generateBellCurve = async (cycleId, configId) => {
  const res = await api.post('/client-admin/bell-curve/generate', { cycleId, configId })
  return res.data
}

export const getRuns = async (cycleId) => {
  const res = await api.get(`/client-admin/bell-curve/cycles/${cycleId}/runs`)
  return res.data
}

export const getResults = async (runId) => {
  const res = await api.get(`/client-admin/bell-curve/runs/${runId}/results`)
  return res.data
}

export const updateRunStatus = async (runId, status) => {
  const res = await api.patch(`/client-admin/bell-curve/runs/${runId}/status`, { status })
  return res.data
}

export const updateResultOverride = async (resultId, currentBucketId, reason) => {
  const res = await api.patch(`/client-admin/bell-curve/results/${resultId}/override`, { currentBucketId, reason })
  return res.data
}

// Support helpers to load cycles and financial years
export const getFinancialYears = async () => {
  const res = await api.get('/client-admin/financial-years')
  return res.data
}

export const getAppraisalCycles = async () => {
  const res = await api.get('/client-admin/appraisal')
  return res.data
}
