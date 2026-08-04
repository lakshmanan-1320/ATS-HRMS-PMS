import axios from 'axios'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const getGoals = async (params = {}) => {
  const res = await api.get('/client-admin/goals', { params })
  return res.data
}

export const getGoalById = async (id) => {
  const res = await api.get(`/client-admin/goals/${id}`)
  return res.data
}

export const createGoal = async (data) => {
  const res = await api.post('/client-admin/goals', data)
  return res.data
}

export const updateGoal = async (id, data) => {
  const res = await api.put(`/client-admin/goals/${id}`, data)
  return res.data
}

export const deleteGoal = async (id) => {
  const res = await api.delete(`/client-admin/goals/${id}`)
  return res.data
}

export const updateGoalStatus = async (id, data) => {
  const res = await api.patch(`/client-admin/goals/${id}/status`, data)
  return res.data
}

export const getDashboardSummary = async () => {
  const res = await api.get('/client-admin/goals/dashboard')
  return res.data
}

export const getActiveConfig = async () => {
  const res = await api.get('/client-admin/performance-configurations')
  return res.data
}

export const getEmployees = async () => {
  const res = await api.get('/client-admin/employees')
  return res.data
}

export const getDepartments = async () => {
  const res = await api.get('/client-admin/departments')
  return res.data
}

export const getActiveCategories = async () => {
  const res = await api.get('/client-admin/goal-categories/active')
  return res.data
}

export const getGoalDocuments = async (goalId) => {
  const res = await api.get(`/client-admin/goals/${goalId}/documents`)
  return res.data
}

export const getGoalActivityLogs = async (goalId) => {
  const res = await api.get(`/client-admin/goals/${goalId}/activity`)
  return res.data
}
