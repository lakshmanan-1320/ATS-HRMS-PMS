import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const PMS_MODULE_KEYS = [
  'pms',
  'goals',
  'performance',
  'kpi',
  'continuous_feedback',
  'competency_assessment',
  'self_assessment',
  '360_feedback',
  'pip',
  'bell_curve',
  'nine_box',
];

let cachedModuleMap = null;
let activeFetchPromise = null;

export function clearModuleCache() {
  cachedModuleMap = null;
  activeFetchPromise = null;
  try {
    sessionStorage.removeItem('org_modules_cache');
  } catch {}
}

function getInitialModuleMap() {
  if (cachedModuleMap) return cachedModuleMap;
  try {
    const stored = sessionStorage.getItem('org_modules_cache');
    if (stored) {
      cachedModuleMap = JSON.parse(stored);
      return cachedModuleMap;
    }
  } catch {}
  return null;
}

export function useModules() {
  const [moduleMap, setModuleMap] = useState(getInitialModuleMap);
  const [rawModules, setRawModules] = useState([]);

  const fetchModules = useCallback(() => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
    if (!token) {
      setModuleMap({});
      return Promise.resolve({});
    }

    if (!activeFetchPromise) {
      activeFetchPromise = axios
        .get('/api/client-admin/organization/modules', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const map = res.data?.modules || {};
          cachedModuleMap = map;
          try {
            sessionStorage.setItem('org_modules_cache', JSON.stringify(map));
          } catch {}
          return map;
        })
        .catch(() => {
          return cachedModuleMap || {};
        })
        .finally(() => {
          activeFetchPromise = null;
        });
    }

    return activeFetchPromise.then(map => {
      setModuleMap(map);
      const list = Object.keys(map).map(key => ({
        module_key: key,
        is_enabled: map[key]
      }));
      setRawModules(list);
      return map;
    });
  }, []);

  useEffect(() => {
    fetchModules();

    const handleModulesUpdated = () => {
      clearModuleCache();
      fetchModules();
    };

    window.addEventListener('modules_updated', handleModulesUpdated);
    window.addEventListener('storage', handleModulesUpdated);

    return () => {
      window.removeEventListener('modules_updated', handleModulesUpdated);
      window.removeEventListener('storage', handleModulesUpdated);
    };
  }, [fetchModules]);

  const isEnabled = useCallback((moduleKey) => {
    if (PMS_MODULE_KEYS.includes(moduleKey)) {
      if (!moduleMap || moduleMap['pms'] !== true) return false;
      return Boolean(moduleMap[moduleKey]);
    }

    if (!moduleMap) return true;

    if (!(moduleKey in moduleMap)) return true;

    return Boolean(moduleMap[moduleKey]);
  }, [moduleMap]);

  const reloadModules = useCallback(() => {
    clearModuleCache();
    return fetchModules();
  }, [fetchModules]);

  return { isEnabled, rawModules, loading: moduleMap === null, reloadModules };
}
