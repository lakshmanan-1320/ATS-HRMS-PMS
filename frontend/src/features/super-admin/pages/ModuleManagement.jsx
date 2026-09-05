import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../../components/layout/Sidebar';
import { clearModuleCache } from '../../../hooks/useModules';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const MODULE_META = {
  // Core HRMS
  attendance:            { icon: '🕐', color: '#f59e0b' },
  leave:                 { icon: '🏖️', color: '#06b6d4' },
  payroll:               { icon: '💰', color: '#10b981' },
  // PMS Master
  pms:                   { icon: '🏆', color: '#6366f1' },
  // PMS Features
  goals:                 { icon: '🎯', color: '#6366f1' },
  performance:           { icon: '📊', color: '#8b5cf6' },
  // PMS Techniques
  kpi:                   { icon: '📈', color: '#00b386' },
  continuous_feedback:   { icon: '💬', color: '#0f766e' },
  competency_assessment: { icon: '📝', color: '#b45309' },
  self_assessment:       { icon: '🙋', color: '#6366f1' },
  '360_feedback':        { icon: '🔄', color: '#8b5cf6' },
  pip:                   { icon: '🚨', color: '#ef4444' },
  bell_curve:            { icon: '📉', color: '#f59e0b' },
  nine_box:              { icon: '🔲', color: '#3b82f6' },
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none',
        background: checked ? '#6366f1' : '#cbd5e1',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      background: type === 'error' ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#86efac'}`,
      color: type === 'error' ? '#dc2626' : '#16a34a',
    }}>{msg}</div>
  );
}

const GOAL_CONFIG_META = [
  { key: 'allow_employee_goal', label: 'Employee Goal Creation',  desc: 'Employees can create their own goals and submit them for manager approval.' },
  { key: 'allow_manager_goal',  label: 'Manager Goal Assignment', desc: 'Managers can create and assign goals directly to direct reports.' },
  { key: 'allow_admin_goal',    label: 'Admin Goal Assignment',   desc: 'Client admin can assign goals across employees, departments, or company.' },
];

export default function ModuleManagement() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [goalConfig, setGoalConfig] = useState(null);
  const [goalConfigLoading, setGoalConfigLoading] = useState(false);
  const [goalToggling, setGoalToggling] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  useEffect(() => {
    api.get('/super-admin/modules')
      .then(res => {
        setClients(res.data.clients || []);
        if (res.data.clients?.length) {
          setSelectedClient(res.data.clients[0]);
        }
      })
      .catch(() => setToast({ msg: 'Failed to load clients', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const loadModules = useCallback((client) => {
    if (!client) return;
    setModuleLoading(true);
    api.get(`/super-admin/modules/${client.id}`)
      .then(res => setModules(res.data || []))
      .catch(() => setToast({ msg: 'Failed to load modules', type: 'error' }))
      .finally(() => setModuleLoading(false));
  }, []);

  const loadGoalConfig = useCallback((client) => {
    if (!client) return;
    setGoalConfigLoading(true);
    api.get(`/super-admin/client-admins/${client.id}/goal-config`)
      .then(res => setGoalConfig(res.data))
      .catch(() => setToast({ msg: 'Failed to load goal configuration', type: 'error' }))
      .finally(() => setGoalConfigLoading(false));
  }, []);

  useEffect(() => {
    loadModules(selectedClient);
    loadGoalConfig(selectedClient);
  }, [selectedClient, loadModules, loadGoalConfig]);

  async function handleToggle(moduleKey, currentEnabled) {
    setToggling(moduleKey);
    const nextEnabled = !currentEnabled;
    try {
      await api.patch(`/super-admin/modules/${selectedClient.id}/${moduleKey}`, {
        is_enabled: nextEnabled,
      });

      clearModuleCache();
      window.dispatchEvent(new Event('modules_updated'));
      localStorage.setItem('modules_last_updated', String(Date.now()));

      if (moduleKey === 'pms') {
        const pmsSubKeys = ['goals', 'performance', 'kpi', 'continuous_feedback', 'competency_assessment', 'self_assessment', '360_feedback', 'pip', 'bell_curve', 'nine_box'];
        setModules(prev => prev.map(m => {
          if (m.module_key === 'pms' || pmsSubKeys.includes(m.module_key)) {
            return { ...m, is_enabled: nextEnabled };
          }
          return m;
        }));
        setToast({
          msg: nextEnabled
            ? 'Performance Management Suite (PMS) enabled.'
            : 'Performance Management Suite (PMS) disabled.',
          type: 'success'
        });
      } else {
        setModules(prev => prev.map(m =>
          m.module_key === moduleKey ? { ...m, is_enabled: nextEnabled } : m
        ));
        setToast({ msg: `${moduleKey} ${nextEnabled ? 'enabled' : 'disabled'} successfully`, type: 'success' });
      }
    } catch {
      setToast({ msg: 'Failed to update module', type: 'error' });
    } finally {
      setToggling(null);
    }
  }

  async function handleGoalConfigToggle(key, currentValue) {
    setGoalToggling(key);
    const updated = { ...goalConfig, [key]: !currentValue };
    try {
      const res = await api.put(`/super-admin/client-admins/${selectedClient.id}/goal-config`, updated);
      setGoalConfig(res.data.data);
      setToast({ msg: 'Goal configuration updated', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to update goal configuration', type: 'error' });
    } finally {
      setGoalToggling(null);
    }
  }

  // Categorize modules
  const pmsModule = modules.find(m => m.module_key === 'pms') || { module_key: 'pms', module_name: 'Performance Management Suite (PMS)', is_enabled: true };
  const isPmsActive = Boolean(pmsModule.is_enabled);

  const hrmsKeys = ['attendance', 'leave', 'payroll'];
  const hrmsModules = modules.filter(m => hrmsKeys.includes(m.module_key));

  const pmsFeatureKeys = ['goals', 'performance'];
  const pmsFeatureModules = modules.filter(m => pmsFeatureKeys.includes(m.module_key));

  const pmsTechniqueKeys = ['kpi', 'continuous_feedback', 'competency_assessment', 'self_assessment', '360_feedback', 'pip', 'bell_curve', 'nine_box'];
  const pmsTechniqueModules = modules.filter(m => pmsTechniqueKeys.includes(m.module_key));

  const isGoalsEnabled = isPmsActive && modules.find(m => m.module_key === 'goals')?.is_enabled;
  const enabledCount = modules.filter(m => m.is_enabled).length;

  const renderModuleGrid = (items, locked = false) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '14px',
      opacity: locked ? 0.65 : 1,
      pointerEvents: locked ? 'none' : 'auto',
      transition: 'opacity 0.2s',
    }}>
      {items.map(mod => {
        const meta = MODULE_META[mod.module_key] || { icon: '⚙️', color: '#6366f1' };
        const isToggling = toggling === mod.module_key;
        const active = locked ? false : mod.is_enabled;

        return (
          <div
            key={mod.module_key}
            style={{
              background: '#ffffff',
              border: `1px solid ${active ? 'rgba(99,102,241,0.2)' : '#e2e8f0'}`,
              borderRadius: '14px', padding: '18px 20px',
              transition: 'all 0.2s',
              boxShadow: active
                ? '0 2px 10px rgba(99,102,241,0.06)'
                : '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: active ? `${meta.color}15` : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', flexShrink: 0,
                  transition: 'all 0.2s',
                }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: '14px', fontWeight: '600',
                    color: active ? '#1e293b' : '#94a3b8',
                    transition: 'color 0.2s',
                  }}>
                    {mod.module_name}
                  </div>
                  <div style={{
                    marginTop: '3px',
                    fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
                    padding: '2px 8px', borderRadius: '20px', display: 'inline-block',
                    background: active ? '#dcfce7' : '#f1f5f9',
                    color: active ? '#15803d' : '#64748b',
                  }}>
                    {active ? 'Enabled' : (locked ? 'Disabled (PMS Off)' : 'Disabled')}
                  </div>
                </div>
              </div>
              <Toggle
                checked={active}
                onChange={() => handleToggle(mod.module_key, mod.is_enabled)}
                disabled={isToggling || locked}
              />
            </div>
            {mod.description && (
              <div style={{
                marginTop: '12px', fontSize: '12px',
                color: active ? '#64748b' : '#94a3b8',
                lineHeight: '1.5',
              }}>
                {mod.description}
              </div>
            )}
            {isToggling && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#6366f1', fontWeight: '600' }}>
                Updating...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar active="modules" />
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Module Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
            Enable or disable HR & Payroll suite modules, master PMS controls, and performance evaluation techniques per client.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Client List */}
          <div style={{
            width: '260px', flexShrink: 0,
            background: '#ffffff',
            border: '1px solid #e8eaf0',
            borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e8eaf0',
              fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#94a3b8',
              background: '#f8fafc',
            }}>
              Clients ({clients.length})
            </div>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Loading...
              </div>
            ) : clients.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No clients found
              </div>
            ) : clients.map(client => {
              const isSelected = selectedClient?.id === client.id;
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none',
                    padding: '12px 16px', cursor: 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#6366f1' : '#1e293b' }}>
                    {client.full_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    {client.email}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px',
                      background: client.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: client.status === 'active' ? '#15803d' : '#b91c1c',
                    }}>
                      {client.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Module Controls Area */}
          <div style={{ flex: 1 }}>
            {!selectedClient ? (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e8eaf0',
                borderRadius: '16px', padding: '48px',
                textAlign: 'center', color: '#94a3b8', fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                Select a client to manage their modules
              </div>
            ) : (
              <>
                {/* Client header summary */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px', padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: 'rgba(99,102,241,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: '700', color: '#6366f1',
                    }}>
                      {selectedClient.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                        {selectedClient.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {selectedClient.email}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      fontSize: '12px', fontWeight: '700',
                      color: isPmsActive ? '#15803d' : '#64748b',
                      background: isPmsActive ? '#dcfce7' : '#f1f5f9',
                      padding: '6px 14px', borderRadius: '20px',
                      border: `1px solid ${isPmsActive ? '#86efac' : '#cbd5e1'}`,
                    }}>
                      {isPmsActive ? '🏆 PMS Enabled' : 'PMS Disabled'}
                    </div>
                    <div style={{
                      fontSize: '13px', fontWeight: '600',
                      color: '#6366f1', background: 'rgba(99,102,241,0.08)',
                      padding: '6px 14px', borderRadius: '20px',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                      {enabledCount} / {modules.length} modules enabled
                    </div>
                  </div>
                </div>

                {moduleLoading ? (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e8eaf0',
                    borderRadius: '14px', padding: '48px',
                    textAlign: 'center', color: '#94a3b8', fontSize: '14px',
                  }}>
                    Loading modules...
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: Core HRMS Modules */}
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{
                        fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#0ea5e9', marginBottom: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span>⚙️</span> Core HR & Payroll Suite (HRMS)
                      </div>
                      {renderModuleGrid(hrmsModules)}
                    </div>

                    {/* SECTION 2: Master Performance Management Suite (PMS) Card */}
                    <div style={{
                      background: '#ffffff',
                      border: `1.5px solid ${isPmsActive ? '#6366f1' : '#cbd5e1'}`,
                      borderRadius: '18px', padding: '24px',
                      marginBottom: '28px',
                      boxShadow: isPmsActive
                        ? '0 4px 16px rgba(99,102,241,0.08)'
                        : '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: isPmsActive ? 'rgba(99,102,241,0.12)' : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '26px', flexShrink: 0,
                          }}>
                            🏆
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                Performance Management Suite (PMS)
                              </h3>
                              <span style={{
                                fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
                                padding: '3px 10px', borderRadius: '20px',
                                background: isPmsActive ? '#dcfce7' : '#fee2e2',
                                color: isPmsActive ? '#15803d' : '#b91c1c',
                              }}>
                                {isPmsActive ? 'SUITE ENABLED' : 'SUITE DISABLED'}
                              </span>
                            </div>
                            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5', maxWidth: '640px' }}>
                              Master toggle for all appraisals, goals, reviews, feedback, calibration, and measurement techniques.
                              Turning this off disables the Performance Management Suite, hiding all performance links from client admins and employees.
                            </p>
                          </div>
                        </div>

                        <Toggle
                          checked={isPmsActive}
                          onChange={() => handleToggle('pms', isPmsActive)}
                          disabled={toggling === 'pms'}
                        />
                      </div>
                    </div>

                    {/* SECTION 3: Performance Core Modules */}
                    <div style={{ marginBottom: '28px' }}>
                      <div style={{
                        fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: isPmsActive ? '#6366f1' : '#94a3b8', marginBottom: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span>🎯</span> PMS Core Feature Modules {!isPmsActive && '(Disabled)'}
                      </div>
                      {renderModuleGrid(pmsFeatureModules, !isPmsActive)}
                    </div>

                    {/* SECTION 4: Performance Measurement Techniques */}
                    <div style={{ marginBottom: '28px' }}>
                      <div style={{
                        fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: isPmsActive ? '#0f766e' : '#94a3b8', marginBottom: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span>⚡</span> Performance Measurement Techniques {!isPmsActive && '(Disabled)'}
                      </div>
                      {renderModuleGrid(pmsTechniqueModules, !isPmsActive)}
                    </div>

                    {/* SECTION 5: Goal Creation Rules Configuration (Visible when PMS & Goals are enabled) */}
                    {isGoalsEnabled && (
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '18px', padding: '24px',
                        marginBottom: '28px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: 'rgba(99,102,241,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px',
                          }}>
                            🎯
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                              Goal Creation Permissions & Workflow
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                              Define who can initiate and assign goal plans for this client organization.
                            </p>
                          </div>
                        </div>

                        {goalConfigLoading ? (
                          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                            Loading goal configuration...
                          </div>
                        ) : goalConfig ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                            {GOAL_CONFIG_META.map(item => {
                              const val = Boolean(goalConfig[item.key]);
                              const isGoalToggling = goalToggling === item.key;
                              return (
                                <div
                                  key={item.key}
                                  style={{
                                    background: '#f8fafc',
                                    border: `1px solid ${val ? 'rgba(99,102,241,0.2)' : '#e2e8f0'}`,
                                    borderRadius: '12px', padding: '16px',
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                      {item.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                      {item.desc}
                                    </div>
                                    {isGoalToggling && (
                                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#6366f1' }}>
                                        Updating...
                                      </div>
                                    )}
                                  </div>
                                  <Toggle
                                    checked={val}
                                    onChange={() => handleGoalConfigToggle(item.key, val)}
                                    disabled={isGoalToggling}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
