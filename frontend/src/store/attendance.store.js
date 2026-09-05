import { create } from 'zustand'
import axios from 'axios'
import { toast } from 'react-toastify'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const useAttendanceStore = create((set, get) => ({
  policies: [],
  loading: false,
  error: null,
  currentPolicy: null,
  members: [],
  departments: [],
  metadataDepartments: [],
  metadataEmployees: [],
  officeLocations: [],
  currentOfficeLocation: null,
  loadingLocations: false,

  fetchPolicies: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get('/attendance/policies')
      set({ policies: res.data?.data || [] })
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
      }
      set({ error: err.response?.data?.message || 'Failed to fetch policies.' })
    } finally {
      set({ loading: false })
    }
  },

  fetchPolicyDetails: async (id) => {
    set({ loading: true, error: null })
    try {
      const [polRes, memRes, deptRes] = await Promise.all([
        api.get(`/attendance/policies/${id}`),
        api.get(`/attendance/policies/${id}/members`),
        api.get(`/attendance/policies/${id}/departments`)
      ])
      set({
        currentPolicy: polRes.data?.data || null,
        members: memRes.data?.data || [],
        departments: deptRes.data?.data || []
      })
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
        return
      }
      set({ error: err.response?.data?.message || 'Failed to fetch policy details.' })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  createPolicy: async (data) => {
    set({ loading: true, error: null })
    try {
      await api.post('/attendance/policies', data)
      await get().fetchPolicies()
      toast.success('Attendance policy created successfully!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create policy.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loading: false })
    }
  },

  updatePolicy: async (id, data) => {
    set({ loading: true, error: null })
    try {
      await api.put(`/attendance/policies/${id}`, data)
      await get().fetchPolicies()
      toast.success('Attendance policy updated successfully!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update policy.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loading: false })
    }
  },

  deletePolicy: async (p) => {
    if (p.usage_count > 0) {
      const msg = `Cannot delete policy because it is currently assigned to ${p.usage_count} active employee(s). Please unassign them first.`
      toast.error(msg)
      return
    }
    if (!window.confirm('Are you sure you want to delete this policy? This will soft-delete the configuration.')) return

    set({ loading: true, error: null })
    try {
      await api.delete(`/attendance/policies/${p.attendance_policy_id}`)
      await get().fetchPolicies()
      toast.success('Policy deleted successfully.')
    } catch (err) {
      const msg = err.response?.data?.message || 'Deletion failed. Check if employees are assigned to this policy.'
      toast.error(msg)
      set({ error: msg })
    } finally {
      set({ loading: false })
    }
  },

  togglePolicyStatus: async (p) => {
    set({ loading: true, error: null })
    try {
      await api.put(`/attendance/policies/${p.attendance_policy_id}`, {
        name: p.name,
        policy_type: p.policy_type,
        description: p.description,
        enable_location_validation: p.enable_location_validation,
        enable_shift_validation: p.enable_shift_validation,
        is_active: !p.is_active
      })
      await get().fetchPolicies()
      toast.success(`Policy ${!p.is_active ? 'activated' : 'deactivated'} successfully.`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to toggle status.'
      toast.error(msg)
      set({ error: msg })
    } finally {
      set({ loading: false })
    }
  },

  assignPolicy: async (policyId, payload) => {
    set({ loading: true, error: null })
    try {
      await api.post(`/attendance/policies/${policyId}/assign`, payload)
      await get().fetchPolicies()
      toast.success('Policy successfully assigned.')
    } catch (err) {
      const msg = err.response?.data?.message || 'Assignment failed.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loading: false })
    }
  },

  loadAssignmentMetadata: async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/client-admin/departments'),
        api.get('/client-admin/employees')
      ])
      set({
        metadataDepartments: deptRes.data || [],
        metadataEmployees: empRes.data || []
      })
    } catch (err) {
      console.error('Failed to load assignment metadata:', err)
    }
  },

  fetchOfficeLocations: async () => {
    set({ loadingLocations: true, error: null })
    try {
      const res = await api.get('/attendance/office-locations')
      set({ officeLocations: res.data?.data || [] })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch office locations.' })
    } finally {
      set({ loadingLocations: false })
    }
  },

  fetchOfficeLocationDetails: async (id) => {
    set({ loadingLocations: true, error: null })
    try {
      const res = await api.get(`/attendance/office-locations/${id}`)
      set({ currentOfficeLocation: res.data?.data || null })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch office location details.' })
      throw err
    } finally {
      set({ loadingLocations: false })
    }
  },

  createOfficeLocation: async (payload) => {
    set({ loadingLocations: true, error: null })
    try {
      const res = await api.post('/attendance/office-locations', payload)
      await get().fetchOfficeLocations()
      return res.data?.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create office location.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingLocations: false })
    }
  },

  updateOfficeLocation: async (id, payload) => {
    set({ loadingLocations: true, error: null })
    try {
      const res = await api.put(`/attendance/office-locations/${id}`, payload)
      await get().fetchOfficeLocations()
      return res.data?.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update office location.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingLocations: false })
    }
  },

  deleteOfficeLocation: async (id) => {
    set({ loadingLocations: true, error: null })
    try {
      await api.delete(`/attendance/office-locations/${id}`)
      await get().fetchOfficeLocations()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete office location.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingLocations: false })
    }
  },

  toggleOfficeLocationStatus: async (id, isActive) => {
    set({ loadingLocations: true, error: null })
    try {
      await api.put(`/attendance/office-locations/${id}/status`, { is_active: isActive })
      await get().fetchOfficeLocations()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update office location status.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingLocations: false })
    }
  },

  shifts: [],
  currentShift: null,
  loadingShifts: false,

  fetchShifts: async () => {
    set({ loadingShifts: true, error: null })
    try {
      const res = await api.get('/attendance/shifts')
      set({ shifts: res.data?.data || [] })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch shifts.' })
    } finally {
      set({ loadingShifts: false })
    }
  },

  fetchShiftDetails: async (id) => {
    set({ loadingShifts: true, error: null })
    try {
      const res = await api.get(`/attendance/shifts/${id}`)
      set({ currentShift: res.data?.data || null })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch shift details.' })
      throw err
    } finally {
      set({ loadingShifts: false })
    }
  },

  createShift: async (payload) => {
    set({ loadingShifts: true, error: null })
    try {
      const res = await api.post('/attendance/shifts', payload)
      await get().fetchShifts()
      return res.data?.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create shift.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingShifts: false })
    }
  },

  updateShift: async (id, payload) => {
    set({ loadingShifts: true, error: null })
    try {
      const res = await api.put(`/attendance/shifts/${id}`, payload)
      await get().fetchShifts()
      return res.data?.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update shift.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingShifts: false })
    }
  },

  deleteShift: async (id) => {
    set({ loadingShifts: true, error: null })
    try {
      await api.delete(`/attendance/shifts/${id}`)
      await get().fetchShifts()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete shift.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingShifts: false })
    }
  },

  toggleShiftStatus: async (id, isActive) => {
    set({ loadingShifts: true, error: null })
    try {
      await api.put(`/attendance/shifts/${id}/status`, { is_active: isActive })
      await get().fetchShifts()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update shift status.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingShifts: false })
    }
  },

  assignShift: async (shiftId, payload) => {
    set({ loadingShifts: true, error: null })
    try {
      const res = await api.post(`/attendance/shifts/${shiftId}/assign`, payload)
      await get().fetchShifts()
      return res.data?.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign shift.'
      set({ error: msg })
      throw new Error(msg)
    } finally {
      set({ loadingShifts: false })
    }
  },

  fetchEmployeeShiftHistory: async (employeeId) => {
    try {
      const res = await api.get(`/attendance/shifts/employees/${employeeId}/history`)
      return res.data?.data || []
    } catch (err) {
      console.error('Failed to fetch employee shift history:', err)
      return []
    }
  },

  adminOverview: null,
  dashboardSummary: null,
  trends: [],
  departmentsSummary: [],
  employeeHistory: [],
  loadingOverview: false,
  loadingDashboard: false,
  loadingTrends: false,
  loadingDeptSummary: false,
  loadingHistory: false,

  fetchAdminOverview: async (filters = {}) => {
    set({ loadingOverview: true, error: null })
    try {
      const res = await api.get('/attendance/admin/overview', { params: filters })
      set({ adminOverview: res.data || null })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch admin overview.' })
    } finally {
      set({ loadingOverview: false })
    }
  },

  fetchDashboardSummary: async (date) => {
    set({ loadingDashboard: true, error: null })
    try {
      const res = await api.get('/attendance/admin/dashboard-summary', { params: { date } })
      set({ dashboardSummary: res.data || null })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch dashboard summary.' })
    } finally {
      set({ loadingDashboard: false })
    }
  },

  fetchTrends: async (range) => {
    set({ loadingTrends: true, error: null })
    try {
      const res = await api.get('/attendance/admin/trends', { params: { range } })
      set({ trends: res.data || [] })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch trends.' })
    } finally {
      set({ loadingTrends: false })
    }
  },

  fetchDepartmentsSummary: async (date) => {
    set({ loadingDeptSummary: true, error: null })
    try {
      const res = await api.get('/attendance/admin/departments-summary', { params: { date } })
      set({ departmentsSummary: res.data || [] })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch departments summary.' })
    } finally {
      set({ loadingDeptSummary: false })
    }
  },

  fetchEmployeeHistory: async (employeeId, startDate, endDate) => {
    set({ loadingHistory: true, error: null })
    try {
      const res = await api.get(`/attendance/admin/employee/${employeeId}/history`, {
        params: { start_date: startDate, end_date: endDate }
      })
      set({ employeeHistory: res.data || [] })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch employee history.' })
    } finally {
      set({ loadingHistory: false })
    }
  }
}))
