import { useState, useEffect } from 'react';
import axios from 'axios';

export function useModules() {
  const [moduleMap, setModuleMap] = useState(null); // null = loading
  const [rawModules, setRawModules] = useState([]);

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
    if (!token) {
      setModuleMap({});
      return;
    }
    axios
      .get('/api/client-admin/organization/modules', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const map = res.data?.modules || {};
        setModuleMap(map);
        
        // Convert map back to list format for components expecting the rawModules array
        const list = Object.keys(map).map(key => ({
          module_key: key,
          is_enabled: map[key]
        }));
        setRawModules(list);
      })
      .catch(() => {
        setModuleMap({});
        setRawModules([]);
      });
  }, []);

  function isEnabled(moduleKey) {
    if (moduleMap === null) return true; // still loading — show everything
    if (!(moduleKey in moduleMap)) return true; // not configured — default enabled
    return moduleMap[moduleKey];
  }

  return { isEnabled, rawModules, loading: moduleMap === null };
}
