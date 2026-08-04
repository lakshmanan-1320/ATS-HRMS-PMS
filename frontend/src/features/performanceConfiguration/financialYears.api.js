import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const getFinancialYears = async () => {
  const res = await api.get('/client-admin/financial-years');
  return res.data;
};

export const getFinancialYearById = async (id) => {
  const res = await api.get(`/client-admin/financial-years/${id}`);
  return res.data;
};

export const createFinancialYear = async (data) => {
  const res = await api.post('/client-admin/financial-years', data);
  return res.data;
};

export const updateFinancialYear = async (id, data) => {
  const res = await api.put(`/client-admin/financial-years/${id}`, data);
  return res.data;
};

export const activateFinancialYear = async (id) => {
  const res = await api.post(`/client-admin/financial-years/${id}/activate`);
  return res.data;
};

export const closeFinancialYear = async (id) => {
  const res = await api.post(`/client-admin/financial-years/${id}/close`);
  return res.data;
};

export const archiveFinancialYear = async (id) => {
  const res = await api.post(`/client-admin/financial-years/${id}/archive`);
  return res.data;
};

export const getGoalSettings = async (financialYearId) => {
  const res = await api.get(`/client-admin/financial-years/${financialYearId}/goal-settings`);
  return res.data;
};

export const updateGoalSettings = async (financialYearId, data) => {
  const res = await api.put(`/client-admin/financial-years/${financialYearId}/goal-settings`, data);
  return res.data;
};
