import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../../components/layout/Sidebar';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const MODULE_META = {
  // Feature modules
  goals:                 { icon: '🎯', color: '#6366f1' },
  performance:           { icon: '📊', color: '#8b5cf6' },
  leave:                 { icon: '🏖️', color: '#06b6d4' },
  payroll:               { icon: '💰', color: '#10b981' },
  attendance:            { icon: '🕐', color: '#f59e0b' },
  // Performance Measurement Techniques
  kpi:                   { icon: '📈', color: '#00b386' },
  continuous_feedback:   { icon: '💬', color: '#0f766e' },
  competency_assessment: { icon: '🎯', color: '#b45309' },
  self_assessment:       { icon: '📝', color: '#6366f1' },
  '360_feedback':        { icon: '🔄', color: '#8b5cf6' },
  okr:                   { icon: '🚀', color: '#ec4899' },
  mbo:                   { icon: '📋', color: '#3b82f6' },
  balanced_scorecard:    { icon: '⚖️', color: '#14b8a6' },
  bell_curve:            { icon: '📉', color: '#f59e0b' },
  pip:                   { icon: '🚨', color: '#ef4444' },
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none',
        background: checked ? '#6366f1' : '#e2e8f0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
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
  { key: 'allow_employee_goal', label: 'Employee Goal Creation',  desc: 'Employees can create their own goals and submit them to their manager for approval.' },
  { key: 'allow_manager_goal',  label: 'Manager Goal Assignment', desc: 'Managers can create and assign goals directly to their direct reports.' },
  { key: 'allow_admin_goal',    label: 'Admin Goal Assignment',   desc: 'Client admin can create and assign goals to employees, departments, or the organization.' },
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
    try {
      await api.patch(`/super-admin/modules/${selectedClient.id}/${moduleKey}`, {
        is_enabled: !currentEnabled,
      });
      setModules(prev => prev.map(m =>
        m.module_key === moduleKey ? { ...m, is_enabled: !currentEnabled } : m
      ));
      setToast({ msg: `${moduleKey} ${!currentEnabled ? 'enabled' : 'disabled'} successfully`, type: 'success' });
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

  const enabledCount = modules.filter(m => m.is_enabled).length;

  const coreKeys = ['goals', 'performance', 'leave', 'payroll', 'attendance'];
  const featureModules = modules.filter(m => coreKeys.includes(m.module_key));
  const techniqueModules = modules.filter(m => !coreKeys.includes(m.module_key));

  const renderModuleGrid = (items) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '14px',
    }}>
      {items.map(mod => {
        const meta = MODULE_META[mod.module_key] || { icon: '⚙️', color: '#6366f1' };
        const isToggling = toggling === mod.module_key;
        return (
          <div
            key={mod.module_key}
            style={{
              background: '#ffffff',
              border: `1px solid ${mod.is_enabled ? 'rgba(99,102,241,0.2)' : '#e8eaf0'}`,
              borderRadius: '14px', padding: '18px 20px',
              transition: 'all 0.2s',
              boxShadow: mod.is_enabled
                ? '0 2px 12px rgba(99,102,241,0.08)'
                : '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: mod.is_enabled ? `${meta.color}15` : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', flexShrink: 0,
                  transition: 'all 0.2s',
                }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: '14px', fontWeight: '600',
                    color: mod.is_enabled ? '#1e293b' : '#94a3b8',
                    transition: 'color 0.2s',
                  }}>
                    {mod.module_name}
                  </div>
                  <div style={{
                    marginTop: '3px',
                    fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em',
                    padding: '2px 8px', borderRadius: '20px', display: 'inline-block',
                    background: mod.is_enabled ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                    color: mod.is_enabled ? '#16a34a' : '#ef4444',
                  }}>
                    {mod.is_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              <Toggle
                checked={mod.is_enabled}
                onChange={() => handleToggle(mod.module_key, mod.is_enabled)}
                disabled={isToggling}
              />
            </div>
            {mod.description && (
              <div style={{
                marginTop: '12px', fontSize: '12px',
                color: mod.is_enabled ? '#64748b' : '#94a3b8',
                lineHeight: '1.5',
              }}>
                {mod.description}
              </div>
            )}
            {isToggling && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#6366f1' }}>
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

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            Module Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
            Enable or disable feature modules and performance measurement techniques per client.
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
                    borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
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
                      background: client.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: client.status === 'active' ? '#16a34a' : '#ef4444',
                    }}>
                      {client.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Module Grid */}
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
                {/* Client header */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e8eaf0',
                  borderRadius: '14px', padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
                  <div style={{
                    fontSize: '13px', fontWeight: '600',
                    color: '#6366f1', background: 'rgba(99,102,241,0.08)',
                    padding: '6px 14px', borderRadius: '20px',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    {enabledCount} / {modules.length} modules enabled
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
                    {/* Core Feature Modules */}
                    <div style={{ marginBottom: '28px' }}>
                      <div style={{
                        fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#6366f1', marginBottom: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span>⚙️</span> Core HR & Payroll Modules
                      </div>
                      {renderModuleGrid(featureModules)}
                    </div>

                    {/* Performance Measurement Techniques */}
                    <div style={{ marginBottom: '28px' }}>
                      <div style={{
                        fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#0f766e', marginBottom: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span>⚡</span> Performance Measurement Techniques
                      </div>
                      {renderModuleGrid(techniqueModules)}
                    </div>
                  </>
                )}

                {/* Goal Configuration */}
                <div style={{ marginTop: '28px' }}>
                  <div style={{
                    fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#6366f1', marginBottom: '14px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span>🎯</span> Goal Configuration
                  </div>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e8eaf0',
                    borderRadius: '14px', overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}>
                    {goalConfigLoading || !goalConfig ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Loading goal configuration...
                      </div>
                    ) : GOAL_CONFIG_META.map((item, idx) => {
                      const isOn = goalConfig[item.key];
                      const isToggling = goalToggling === item.key;
                      return (
                        <div
                          key={item.key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 20px', gap: '16px',
                            borderBottom: idx < GOAL_CONFIG_META.length - 1 ? '1px solid #f1f5f9' : 'none',
                            opacity: isToggling ? 0.7 : 1, transition: 'opacity 0.15s',
                            background: 'transparent',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: isOn ? '#1e293b' : '#94a3b8', marginBottom: '3px' }}>
                              {item.label}
                              <span style={{
                                marginLeft: '8px', fontSize: '10px', fontWeight: '700',
                                padding: '2px 7px', borderRadius: '20px',
                                background: isOn ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                                color: isOn ? '#16a34a' : '#ef4444',
                              }}>
                                {isOn ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{item.desc}</div>
                          </div>
                          <Toggle
                            checked={isOn}
                            onChange={() => handleGoalConfigToggle(item.key, isOn)}
                            disabled={isToggling}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '' })} />
    </div>
  );
}
