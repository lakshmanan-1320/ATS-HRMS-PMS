import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const getGoalFeedbacks = (goalId, params) =>
  api.get(`/goals/${goalId}/feedback`, { params });

export const addGoalFeedback = (goalId, data) =>
  api.post(`/goals/${goalId}/feedback`, data);

export const getGoalReflections = (goalId, params) =>
  api.get(`/goals/${goalId}/reflections`, { params });

export const addGoalReflection = (goalId, data) =>
  api.post(`/goals/${goalId}/reflections`, data);

export const getGoalReflectionTemplate = (goalId) =>
  api.get(`/goals/${goalId}/reflection-template`);

export const saveGoalReflectionTemplate = (goalId, questions) =>
  api.post(`/goals/${goalId}/reflection-template`, { questions });

export const submitGoalReflectionAnswers = (goalId, data) =>
  api.post(`/goals/${goalId}/reflection-answers`, data);

export const getGoalActionItems = (goalId, params) =>
  api.get(`/goals/${goalId}/action-items`, { params });

export const addGoalActionItem = (goalId, data) =>
  api.post(`/goals/${goalId}/action-items`, data);

export const markActionItemCompleted = (actionItemId) =>
  api.patch(`/action-items/${actionItemId}`);

export const verifyActionItem = (actionItemId) =>
  api.patch(`/action-items/${actionItemId}/verify`);

export const getGoalPraises = (goalId, params) =>
  api.get(`/goals/${goalId}/praise`, { params });

export const addGoalPraise = (goalId, data) =>
  api.post(`/goals/${goalId}/praise`, data);

export const getGoalCoachingTimeline = (goalId, params) =>
  api.get(`/goals/${goalId}/coaching-timeline`, { params });

export const getContinuousFeedbackDashboard = () =>
  api.get('/continuous-feedback/dashboard');

export const getContinuousFeedbackOverview = () =>
  api.get('/continuous-feedback/overview');

export const getTechniqueConfiguration = (technique) =>
  api.get(`/performance-technique-configurations/${technique}`);

export const saveTechniqueConfiguration = (technique, configJson) =>
  api.post(`/performance-technique-configurations/${technique}`, configJson);

export const updateAssignmentStatus = (goalId, assignmentId, status, completionOutcome) =>
  api.patch(`/client-admin/goals/${goalId}/assignments/${assignmentId}/status`, { status, completionOutcome });
