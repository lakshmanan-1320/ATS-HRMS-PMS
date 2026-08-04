import { create } from 'zustand'
import * as api from './goal.api'

export const useGoalStore = create((set, get) => ({
  // Data
  goals: [],
  selectedGoal: null,
  dashboardSummary: {
    total: 0, draft: 0, pending_approval: 0, changes_requested: 0,
    active: 0, in_progress: 0, completed: 0, rejected: 0
  },
  activeConfig: null,
  employees: [],
  departments: [],
  categories: [],

  // Filters
  filters: {
    search: '',
    status: '',
    priority: '',
    category: '',
    goal_type: '',
    employee_id: '',
    department_id: '',
    start_date: '',
    due_date: '',
    is_my_goals: 'true',
    sortBy: 'created_at',
    sortDir: 'DESC'
  },

  // Pagination
  pagination: { page: 1, limit: 15, totalPages: 1 },

  // UI State
  loading: false,
  saving: false,
  error: null,

  // ─── Actions ──────────────────────────────────────────

  fetchGoals: async () => {
    const { filters, pagination } = get()
    set({ loading: true, error: null })
    try {
      const params = { ...filters, page: pagination.page, limit: pagination.limit }
      // Remove empty filter values
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const res = await api.getGoals(params)
      const rows = res.data || []
      set({
        goals: rows,
        pagination: {
          ...pagination,
          totalPages: Math.ceil((res.total || rows.length) / pagination.limit) || 1
        }
      })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load goals.' })
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
      }
    } finally {
      set({ loading: false })
    }
  },

  fetchGoalById: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await api.getGoalById(id)
      set({ selectedGoal: res.data })
      return res.data
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load goal.' })
    } finally {
      set({ loading: false })
    }
  },

  createGoal: async (data) => {
    set({ saving: true, error: null })
    try {
      const res = await api.createGoal(data)
      // Re-fetch goals + dashboard
      get().fetchGoals()
      get().fetchDashboardSummary()
      return res
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to create goal.' })
      throw err
    } finally {
      set({ saving: false })
    }
  },

  updateGoal: async (id, data) => {
    set({ saving: true, error: null })
    try {
      const res = await api.updateGoal(id, data)
      get().fetchGoals()
      get().fetchDashboardSummary()
      return res
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to update goal.' })
      throw err
    } finally {
      set({ saving: false })
    }
  },

  deleteGoal: async (id) => {
    set({ saving: true, error: null })
    try {
      await api.deleteGoal(id)
      get().fetchGoals()
      get().fetchDashboardSummary()
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to delete goal.' })
      throw err
    } finally {
      set({ saving: false })
    }
  },

  updateGoalStatus: async (id, data) => {
    set({ saving: true, error: null })
    try {
      const res = await api.updateGoalStatus(id, data)
      get().fetchGoals()
      get().fetchDashboardSummary()
      return res
    } catch (err) {
      set({ error: err.response?.data?.message || 'Status update failed.' })
      throw err
    } finally {
      set({ saving: false })
    }
  },

  fetchDashboardSummary: async () => {
    try {
      const res = await api.getDashboardSummary()
      set({ dashboardSummary: res.data || {} })
    } catch (err) {
      console.error('[GoalStore] Dashboard summary error:', err.message)
    }
  },

  fetchActiveConfig: async () => {
    try {
      const res = await api.getActiveConfig()
      // The endpoint returns the single ACTIVE config object (or null) directly
      set({ activeConfig: res || null })
    } catch (err) {
      console.error('[GoalStore] Active config error:', err.message)
    }
  },

  fetchEmployees: async () => {
    try {
      const res = await api.getEmployees()
      set({ employees: Array.isArray(res) ? res : (res.data || []) })
    } catch (err) {
      console.error('[GoalStore] Employees error:', err.message)
    }
  },

  fetchDepartments: async () => {
    try {
      const res = await api.getDepartments()
      set({ departments: Array.isArray(res) ? res : (res.data || []) })
    } catch (err) {
      console.error('[GoalStore] Departments error:', err.message)
    }
  },

  fetchActiveCategories: async () => {
    try {
      const res = await api.getActiveCategories()
      set({ categories: Array.isArray(res) ? res : (res.data || []) })
    } catch (err) {
      console.error('[GoalStore] Categories error:', err.message)
    }
  },

  // ─── Filter & Pagination Setters ──────────────────────

  setFilters: (updates) => {
    set(s => ({ filters: { ...s.filters, ...updates }, pagination: { ...s.pagination, page: 1 } }))
  },

  resetFilters: () => {
    set({
      filters: {
        search: '', status: '', priority: '', category: '', goal_type: '',
        employee_id: '', department_id: '', start_date: '', due_date: '',
        is_my_goals: 'true',
        sortBy: 'created_at', sortDir: 'DESC'
      },
      pagination: { page: 1, limit: 15, totalPages: 1 }
    })
  },

  setPage: (page) => {
    set(s => ({ pagination: { ...s.pagination, page } }))
  },

  setSelectedGoal: (goal) => set({ selectedGoal: goal }),
  clearSelectedGoal: () => set({ selectedGoal: null }),
  clearError: () => set({ error: null })
}))
