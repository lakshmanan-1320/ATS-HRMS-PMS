import axios from 'axios';

const api = axios.create({ baseURL: '/api/pip' });

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Settings
export const getSettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const saveSettings = async (data) => {
  const res = await api.post('/settings', data);
  return res.data;
};

// Templates
export const getTemplates = async () => {
  const res = await api.get('/templates');
  return res.data;
};

export const createTemplate = async (data) => {
  const res = await api.post('/templates', data);
  return res.data;
};

export const updateTemplate = async (id, data) => {
  const res = await api.put(`/templates/${id}`, data);
  return res.data;
};

export const deleteTemplate = async (id) => {
  const res = await api.delete(`/templates/${id}`);
  return res.data;
};

export const getTemplate = async (id) => {
  const res = await api.get(`/templates/${id}`);
  return res.data;
};

// Candidates
export const getCandidates = async (params) => {
  const res = await api.get('/candidates', { params });
  return res.data;
};

export const createCandidate = async (data) => {
  const res = await api.post('/candidates', data);
  return res.data;
};

export const reviewCandidate = async (id, data) => {
  const res = await api.post(`/candidates/${id}/action`, data);
  return res.data;
};

// Active PIPs
export const getPips = async (params) => {
  const res = await api.get('/active', { params });
  return res.data;
};

export const getPip = async (id) => {
  const res = await api.get(`/active/${id}`);
  return res.data;
};

export const confirmRead = async (id) => {
  const res = await api.post(`/active/${id}/confirm-read`);
  return res.data;
};

export const refreshMetrics = async (id) => {
  const res = await api.post(`/active/${id}/refresh-metrics`);
  return res.data;
};

export const processHrDecision = async (id, data) => {
  const res = await api.post(`/active/${id}/decision`, data);
  return res.data;
};

// Check-ins
export const completeCheckin = async (id, data) => {
  const res = await api.post(`/checkins/${id}/complete`, data);
  return res.data;
};

export const addEmployeeComment = async (id, comments) => {
  const res = await api.post(`/checkins/${id}/comment`, { comments });
  return res.data;
};

// Reports
export const getDetailedReport = async (params) => {
  const res = await api.get('/reports/detailed', { params });
  return res.data;
};

export const getPipStatistics = async (params) => {
  const res = await api.get('/reports/statistics', { params });
  return res.data;
};

export const convertToPip = async (id, data) => {
  const res = await api.post(`/active/${id}/convert`, data);
  return res.data;
};

export const getMetricSnapshots = async (id) => {
  const res = await api.get(`/active/${id}/metric-snapshots`);
  return res.data;
};
