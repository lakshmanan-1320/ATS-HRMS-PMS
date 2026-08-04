import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const getGoalKpis = async (goalId, params = {}) => {
  const res = await api.get(`/goals/${goalId}/kpis`, { params });
  return res.data;
};

export const createKpi = async (goalId, data) => {
  const res = await api.post(`/goals/${goalId}/kpis`, data);
  return res.data;
};

export const getKpi = async (kpiId) => {
  const res = await api.get(`/kpis/${kpiId}`);
  return res.data;
};

export const updateKpi = async (kpiId, data) => {
  const res = await api.put(`/kpis/${kpiId}`, data);
  return res.data;
};

export const deleteKpi = async (kpiId) => {
  const res = await api.delete(`/kpis/${kpiId}`);
  return res.data;
};

export const updateKpiStatus = async (kpiId, data) => {
  const res = await api.patch(`/kpis/${kpiId}/status`, data);
  return res.data;
};

export const updateKpiProgress = async (kpiId, data) => {
  const res = await api.patch(`/kpis/${kpiId}/progress`, data);
  return res.data;
};

export const getDashboard = async () => {
  const res = await api.get('/kpis/dashboard');
  return res.data;
};

export const createSubmission = async (kpiId, data) => {
  const res = await api.post(`/kpis/${kpiId}/submissions`, data);
  return res.data;
};

export const getSubmissionHistory = async (kpiId) => {
  const res = await api.get(`/kpis/${kpiId}/submissions`);
  return res.data;
};

export const reviewSubmission = async (submissionId, data) => {
  const res = await api.patch(`/kpi-submissions/${submissionId}/review`, data);
  return res.data;
};

export const getGoalProgressHistory = async (goalId) => {
  const res = await api.get(`/goals/${goalId}/progress-history`);
  return res.data;
};

export const getPendingSubmissions = async () => {
  const res = await api.get('/kpi-submissions/pending');
  return res.data;
};
