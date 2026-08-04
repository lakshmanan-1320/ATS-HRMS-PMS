import { create } from 'zustand';
import * as api from '../api/kpi.api';

export const useKpiStore = create((set, get) => ({
  goalKpis: [],
  pendingSubmissions: [],
  selectedKpi: null,
  dashboard: {
    total: 0,
    draft: 0,
    pendingApproval: 0,
    active: 0,
    completed: 0,
    rejected: 0,
    averageProgress: 0,
    pendingReviews: 0,
    overdueKpis: 0,
    completedToday: 0,
    dueThisWeek: 0,
    myKpis: 0,
    teamKpis: 0
  },
  loading: false,
  saving: false,
  error: null,

  loadGoalKpis: async (goalId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getGoalKpis(goalId);
      if (res.success) {
        set({ goalKpis: res.data || [] });
      } else {
        set({ error: res.message || 'Failed to load KPIs' });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || err.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  loadDashboard: async () => {
    try {
      const res = await api.getDashboard();
      if (res.success) {
        set({ dashboard: { ...get().dashboard, ...res.data } });
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    }
  },

  loadKpi: async (kpiId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getKpi(kpiId);
      if (res.success) {
        set({ selectedKpi: res.data });
        return res.data;
      } else {
        set({ error: res.message || 'Failed to load KPI details' });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || err.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  createKpi: async (goalId, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.createKpi(goalId, data);
      if (res.success) {
        await get().loadGoalKpis(goalId);
        await get().loadDashboard();
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message || 'Failed to create KPI' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error';
      set({ error: msg });
      return { success: false, message: msg };
    } finally {
      set({ saving: false });
    }
  },

  updateKpi: async (kpiId, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.updateKpi(kpiId, data);
      if (res.success) {
        if (res.data?.goal_id) {
          await get().loadGoalKpis(res.data.goal_id);
        }
        await get().loadDashboard();
        if (get().selectedKpi?.kpi_id === kpiId) {
          await get().loadKpi(kpiId);
        }
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message || 'Failed to update KPI' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error';
      set({ error: msg });
      return { success: false, message: msg };
    } finally {
      set({ saving: false });
    }
  },

  deleteKpi: async (kpiId, goalId) => {
    set({ saving: true, error: null });
    try {
      const res = await api.deleteKpi(kpiId);
      if (res.success) {
        await get().loadGoalKpis(goalId);
        await get().loadDashboard();
        if (get().selectedKpi?.kpi_id === kpiId) {
          set({ selectedKpi: null });
        }
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to delete KPI' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error';
      return { success: false, message: msg };
    } finally {
      set({ saving: false });
    }
  },

  updateStatus: async (kpiId, status, reason, goalId) => {
    set({ saving: true, error: null });
    try {
      const res = await api.updateKpiStatus(kpiId, { status, reason });
      if (res.success) {
        await get().loadGoalKpis(goalId);
        await get().loadDashboard();
        if (get().selectedKpi?.kpi_id === kpiId) {
          await get().loadKpi(kpiId);
        }
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to update status' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error';
      return { success: false, message: msg };
    } finally {
      set({ saving: false });
    }
  },

  submitCompletion: async (kpiId, data, goalId) => {
    set({ saving: true, error: null });
    try {
      const res = await api.createSubmission(kpiId, data);
      if (res.success) {
        await get().loadGoalKpis(goalId);
        await get().loadDashboard();
        if (get().selectedKpi?.kpi_id === kpiId) {
          await get().loadKpi(kpiId);
        }
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to submit progress' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error';
      return { success: false, message: msg };
    } finally {
      set({ saving: false });
    }
  },

  reviewSubmission: async (submissionId, reviewData, goalId, kpiId) => {
    set({ saving: true, error: null });
    try {
      const res = await api.reviewSubmission(submissionId, reviewData);
      if (res.success) {
        await get().loadGoalKpis(goalId);
        await get().loadDashboard();
        if (kpiId) {
          await get().loadKpi(kpiId);
        }
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to review submission' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Network error';
      return { success: false, message: msg };
    } finally {
      set({ saving: false });
    }
  },

  loadPendingSubmissions: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getPendingSubmissions();
      if (res.success) {
        set({ pendingSubmissions: res.data || [] });
      } else {
        set({ error: res.message || 'Failed to load pending submissions' });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || err.message || 'Network error' });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => {
    set({ goalKpis: [], pendingSubmissions: [], selectedKpi: null, error: null });
  }
}));
