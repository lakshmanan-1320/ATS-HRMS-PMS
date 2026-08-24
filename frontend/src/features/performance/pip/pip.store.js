import { create } from 'zustand';
import * as api from './pip.api';

export const usePipStore = create((set, get) => ({
  // Data
  settings: null,
  templates: [],
  candidates: [],
  pips: [],
  selectedPip: null,
  stats: null,
  reports: [],
  setSelectedPip: (selectedPip) => set({ selectedPip }),

  // UI State
  loading: false,
  saving: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getSettings();
      set({ settings: res.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch settings.', loading: false });
    }
  },

  saveSettings: async (data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.saveSettings(data);
      set({ settings: res.data, saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to save settings.', saving: false });
      throw err;
    }
  },

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getTemplates();
      set({ templates: res.data || [], loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load templates.', loading: false });
    }
  },

  createTemplate: async (data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.createTemplate(data);
      const { templates } = get();
      set({ templates: [res.data, ...templates], saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to create template.', saving: false });
      throw err;
    }
  },

  updateTemplate: async (id, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.updateTemplate(id, data);
      const { templates } = get();
      set({
        templates: templates.map(t => t.template_id === id ? res.data : t),
        saving: false
      });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to update template.', saving: false });
      throw err;
    }
  },

  deleteTemplate: async (id) => {
    set({ saving: true, error: null });
    try {
      await api.deleteTemplate(id);
      const { templates } = get();
      set({
        templates: templates.filter(t => t.template_id !== id),
        saving: false
      });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to delete template.', saving: false });
      throw err;
    }
  },

  fetchCandidates: async (params) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getCandidates(params);
      set({ candidates: res.data || [], loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load candidates.', loading: false });
    }
  },

  createCandidate: async (data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.createCandidate(data);
      const { candidates } = get();
      set({ candidates: [res.data, ...candidates], saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to create candidate recommendation.', saving: false });
      throw err;
    }
  },

  reviewCandidate: async (id, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.reviewCandidate(id, data);
      const { candidates } = get();
      set({
        candidates: candidates.filter(c => c.candidate_id !== id),
        saving: false
      });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to process candidate action.', saving: false });
      throw err;
    }
  },

  fetchPips: async (params) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getPips(params);
      set({ pips: res.data || [], loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load active PIP records.', loading: false });
    }
  },

  fetchPip: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getPip(id);
      set({ selectedPip: res.data, loading: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load PIP details.', loading: false });
      throw err;
    }
  },

  confirmRead: async (id) => {
    set({ saving: true, error: null });
    try {
      const res = await api.confirmRead(id);
      set({ selectedPip: res.data, saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to acknowledge read status.', saving: false });
      throw err;
    }
  },

  refreshMetrics: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.refreshMetrics(id);
      const { selectedPip } = get();
      if (selectedPip && selectedPip.pip_id === id) {
        set({
          selectedPip: {
            ...selectedPip,
            metrics: res.data.metrics,
            overall_progress: res.data.overallProgress
          }
        });
      }
      set({ loading: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to synchronize live metrics.', loading: false });
      throw err;
    }
  },

  processHrDecision: async (id, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.processHrDecision(id, data);
      set({ selectedPip: null, saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to record decision.', saving: false });
      throw err;
    }
  },

  completeCheckin: async (id, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.completeCheckin(id, data);
      set({ saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to complete check-in log.', saving: false });
      throw err;
    }
  },

  addEmployeeComment: async (id, comments) => {
    set({ saving: true, error: null });
    try {
      const res = await api.addEmployeeComment(id, comments);
      set({ saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to submit feedback comment.', saving: false });
      throw err;
    }
  },

  fetchStatistics: async (params) => {
    try {
      const res = await api.getPipStatistics(params);
      set({ stats: res.data });
    } catch (err) {
      console.error(err);
    }
  },

  fetchDetailedReport: async (params) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getDetailedReport(params);
      set({ reports: res.data || [], loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to compile report.', loading: false });
    }
  },

  convertToPip: async (id, data) => {
    set({ saving: true, error: null });
    try {
      const res = await api.convertToPip(id, data);
      set({ selectedPip: null, saving: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to convert monitoring plan to PIP.', saving: false });
      throw err;
    }
  },

  getMetricSnapshots: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.getMetricSnapshots(id);
      set({ loading: false });
      return res.data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch metric snapshots.', loading: false });
      throw err;
    }
  }
}));
