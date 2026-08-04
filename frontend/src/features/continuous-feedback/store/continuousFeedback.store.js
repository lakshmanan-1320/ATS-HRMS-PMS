import { create } from 'zustand';
import * as feedbackApi from '../api/continuousFeedback.api';

export const useContinuousFeedbackStore = create((set, get) => ({
  feedbacks: [],
  feedbacksPagination: { currentPage: 1, totalPages: 1, totalCount: 0 },
  reflections: [],
  reflectionsPagination: { currentPage: 1, totalPages: 1, totalCount: 0 },
  actionItems: [],
  actionItemsPagination: { currentPage: 1, totalPages: 1, totalCount: 0 },
  praises: [],
  praisesPagination: { currentPage: 1, totalPages: 1, totalCount: 0 },
  timeline: [],
  timelinePagination: { currentPage: 1, totalPages: 1, totalCount: 0 },
  dashboardStats: null,
  loading: false,
  error: null,
  techniqueConfigs: {},

  fetchGoalFeedbackData: async (goalId, employeeId = null) => {
    if (!goalId) return;
    set({ loading: true, error: null });
    // Default page=1, limit=10 for initial load
    const params = {
      page: 1,
      limit: 10,
      ...(employeeId ? { employee_id: employeeId } : {})
    };
    try {
      const [fRes, rRes, aRes, pRes, tRes] = await Promise.all([
        feedbackApi.getGoalFeedbacks(goalId, params),
        feedbackApi.getGoalReflections(goalId, params),
        feedbackApi.getGoalActionItems(goalId, params),
        feedbackApi.getGoalPraises(goalId, params),
        feedbackApi.getGoalCoachingTimeline(goalId, params)
      ]);

      set({
        feedbacks: fRes.data?.data?.rows || fRes.data?.data || [],
        feedbacksPagination: fRes.data?.data?.pagination || { currentPage: 1, totalPages: 1, totalCount: 0 },
        reflections: rRes.data?.data?.rows || rRes.data?.data || [],
        reflectionsPagination: rRes.data?.data?.pagination || { currentPage: 1, totalPages: 1, totalCount: 0 },
        actionItems: aRes.data?.data?.rows || aRes.data?.data || [],
        actionItemsPagination: aRes.data?.data?.pagination || { currentPage: 1, totalPages: 1, totalCount: 0 },
        praises: pRes.data?.data?.rows || pRes.data?.data || [],
        praisesPagination: pRes.data?.data?.pagination || { currentPage: 1, totalPages: 1, totalCount: 0 },
        timeline: tRes.data?.data?.rows || tRes.data?.data || [],
        timelinePagination: tRes.data?.data?.pagination || { currentPage: 1, totalPages: 1, totalCount: 0 },
        loading: false
      });
    } catch (err) {
      set({ error: err.response?.data?.message || err.message, loading: false });
    }
  },

  loadMore: async (type, goalId, employeeId = null) => {
    if (!goalId) return;
    const state = get();
    let currentPage = 1;
    let totalPages = 1;
    
    if (type === 'feedbacks') {
      currentPage = state.feedbacksPagination?.currentPage || 1;
      totalPages = state.feedbacksPagination?.totalPages || 1;
    } else if (type === 'reflections') {
      currentPage = state.reflectionsPagination?.currentPage || 1;
      totalPages = state.reflectionsPagination?.totalPages || 1;
    } else if (type === 'actionItems') {
      currentPage = state.actionItemsPagination?.currentPage || 1;
      totalPages = state.actionItemsPagination?.totalPages || 1;
    } else if (type === 'praises') {
      currentPage = state.praisesPagination?.currentPage || 1;
      totalPages = state.praisesPagination?.totalPages || 1;
    } else if (type === 'timeline') {
      currentPage = state.timelinePagination?.currentPage || 1;
      totalPages = state.timelinePagination?.totalPages || 1;
    }

    if (currentPage >= totalPages) return;

    const nextPage = currentPage + 1;
    const params = {
      page: nextPage,
      limit: 10,
      ...(employeeId ? { employee_id: employeeId } : {})
    };

    try {
      if (type === 'feedbacks') {
        const res = await feedbackApi.getGoalFeedbacks(goalId, params);
        const newRows = res.data?.data?.rows || [];
        set({
          feedbacks: [...state.feedbacks, ...newRows],
          feedbacksPagination: res.data?.data?.pagination || { currentPage: nextPage, totalPages }
        });
      } else if (type === 'reflections') {
        const res = await feedbackApi.getGoalReflections(goalId, params);
        const newRows = res.data?.data?.rows || [];
        set({
          reflections: [...state.reflections, ...newRows],
          reflectionsPagination: res.data?.data?.pagination || { currentPage: nextPage, totalPages }
        });
      } else if (type === 'actionItems') {
        const res = await feedbackApi.getGoalActionItems(goalId, params);
        const newRows = res.data?.data?.rows || [];
        set({
          actionItems: [...state.actionItems, ...newRows],
          actionItemsPagination: res.data?.data?.pagination || { currentPage: nextPage, totalPages }
        });
      } else if (type === 'praises') {
        const res = await feedbackApi.getGoalPraises(goalId, params);
        const newRows = res.data?.data?.rows || [];
        set({
          praises: [...state.praises, ...newRows],
          praisesPagination: res.data?.data?.pagination || { currentPage: nextPage, totalPages }
        });
      } else if (type === 'timeline') {
        const res = await feedbackApi.getGoalCoachingTimeline(goalId, params);
        const newRows = res.data?.data?.rows || [];
        set({
          timeline: [...state.timeline, ...newRows],
          timelinePagination: res.data?.data?.pagination || { currentPage: nextPage, totalPages }
        });
      }
    } catch (err) {
      console.error('Failed to load more continuous feedback items:', err);
    }
  },

  addFeedback: async (goalId, data, employeeId = null) => {
    try {
      const res = await feedbackApi.addGoalFeedback(goalId, data);
      await get().fetchGoalFeedbackData(goalId, employeeId);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  addReflection: async (goalId, data, employeeId = null) => {
    try {
      const res = await feedbackApi.addGoalReflection(goalId, data);
      await get().fetchGoalFeedbackData(goalId, employeeId);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  addActionItem: async (goalId, data, employeeId = null) => {
    try {
      const res = await feedbackApi.addGoalActionItem(goalId, data);
      await get().fetchGoalFeedbackData(goalId, employeeId);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  toggleCompleteActionItem: async (goalId, actionItemId, employeeId = null) => {
    try {
      const res = await feedbackApi.markActionItemCompleted(actionItemId);
      await get().fetchGoalFeedbackData(goalId, employeeId);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  verifyActionItem: async (goalId, actionItemId, employeeId = null) => {
    try {
      const res = await feedbackApi.verifyActionItem(actionItemId);
      await get().fetchGoalFeedbackData(goalId, employeeId);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  addPraise: async (goalId, data, employeeId = null) => {
    try {
      const res = await feedbackApi.addGoalPraise(goalId, data);
      await get().fetchGoalFeedbackData(goalId, employeeId);
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  fetchTechniqueConfiguration: async (technique) => {
    try {
      const res = await feedbackApi.getTechniqueConfiguration(technique);
      set(state => ({
        techniqueConfigs: {
          ...state.techniqueConfigs,
          [technique]: res.data?.data || null
        }
      }));
    } catch (err) {
      console.error('Failed to fetch technique config:', err);
    }
  },

  saveTechniqueConfiguration: async (technique, configJson) => {
    try {
      const res = await feedbackApi.saveTechniqueConfiguration(technique, configJson);
      set(state => ({
        techniqueConfigs: {
          ...state.techniqueConfigs,
          [technique]: res.data?.data || null
        }
      }));
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  updateAssignmentStatus: async (goalId, assignmentId, status, completionOutcome = null, employeeId = null) => {
    try {
      await feedbackApi.updateAssignmentStatus(goalId, assignmentId, status, completionOutcome);
      await get().fetchGoalFeedbackData(goalId, employeeId);
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  fetchDashboardStats: async () => {
    try {
      const res = await feedbackApi.getContinuousFeedbackDashboard();
      set({ dashboardStats: res.data?.data || null });
    } catch (err) {
      console.error(err);
    }
  }
}));
