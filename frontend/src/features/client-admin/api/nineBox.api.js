import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token =
    sessionStorage.getItem('sa_token') ||
    sessionStorage.getItem('token');

  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  return cfg;
});

export const getNineBoxGrid = async (cycleId) => {
  const res = await api.get(
    `/client-admin/nine-box/grid/${cycleId}`
  );

  return res.data;
};

export const generateNineBoxGrid = async (cycleId) => {
  const res = await api.post('/client-admin/nine-box/generate', {
    cycleId,
  });

  return res.data;
};

export const updatePotentialLevel = async (
  employeeId,
  cycleId,
  potentialLevel
) => {
  const res = await api.put(
    `/client-admin/nine-box/employee/${employeeId}/potential`,
    {
      cycleId,
      potentialLevel,
    }
  );

  return res.data;
};