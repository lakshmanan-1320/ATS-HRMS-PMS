import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-label={enabled ? 'Disable' : 'Enable'}
      style={{
        position: 'relative', width: '52px', height: '28px',
        borderRadius: '14px',
        background: enabled ? '#6366f1' : '#e2e8f0',
        border: `1px solid ${enabled ? '#6366f1' : '#e2e8f0'}`,
        cursor: 'pointer', transition: 'all 0.25s', padding: 0, flexShrink: 0,
        boxShadow: enabled ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: '4px',
        left: enabled ? '26px' : '4px',
        width: '18px', height: '18px',
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function StepInput({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          fontSize: '18px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#475569',
        }}
      >−</button>
      <div style={{ minWidth: '52px', textAlign: 'center', fontSize: '22px', fontWeight: '800', color: '#6366f1' }}>
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          fontSize: '18px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#475569',
        }}
      >+</button>
      <span style={{ fontSize: '13px', color: '#64748b' }}>{unit}</span>
    </div>
  )
}

export default function SessionTimeout() {
  const [policy, setPolicy] = useState({
    idleTimeoutMinutes: 30,
    absoluteTimeoutHours: 8,
    warnBeforeExpiryMinutes: 5,
    extendOnActivity: true,
  })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    axios.get('/api/super-admin/session-timeout', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPolicy(r.data))
      .catch(() => {})
  }, [])

  function showAlert(type, msg) {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 5000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const token = sessionStorage.getItem('sa_token')
      await axios.put('/api/super-admin/session-timeout', policy, { headers: { Authorization: `Bearer ${token}` } })
      showAlert('success', 'Session timeout settings saved successfully.')
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const idleLabel = policy.idleTimeoutMinutes === 0
    ? 'Disabled (users stay logged in)'
    : policy.idleTimeoutMinutes < 60
      ? `${policy.idleTimeoutMinutes} min`
      : `${(policy.idleTimeoutMinutes / 60).toFixed(1).replace(/\.0$/, '')} hr`

  const absLabel = policy.absoluteTimeoutHours === 0
    ? 'Unlimited'
    : `${policy.absoluteTimeoutHours} hr`

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar active="session" />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>⏱</div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Session &amp; Timeout
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '46px' }}>
            Control how long users stay logged in and when they are warned before expiry
          </p>
        </div>

        <form onSubmit={handleSave} style={{ maxWidth: '760px' }}>

          {/* Alert */}
          {alert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '13px', fontWeight: '500',
              background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
              color: alert.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              <span style={{ fontSize: '16px' }}>{alert.type === 'success' ? '✓' : '⚠'}</span>
              {alert.msg}
            </div>
          )}

          {/* Main card */}
          <div style={{
            background: '#ffffff', borderRadius: '20px',
            border: '1px solid #e8eaf0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            overflow: 'hidden', marginBottom: '16px',
          }}>

            {/* Card header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)',
              padding: '24px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>⏱</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
                    Inactivity &amp; Session Limits
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                    Applied to all users across all roles
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: policy.idleTimeoutMinutes > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                border: `1px solid ${policy.idleTimeoutMinutes > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                borderRadius: '20px', padding: '6px 14px',
              }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: policy.idleTimeoutMinutes > 0 ? '#22c55e' : '#ef4444',
                }} />
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  color: policy.idleTimeoutMinutes > 0 ? '#86efac' : '#fca5a5',
                }}>
                  {policy.idleTimeoutMinutes > 0 ? 'Timeout Active' : 'Timeout Disabled'}
                </span>
              </div>
            </div>

            {/* Idle timeout */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Idle Timeout
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                    Auto-logout after this many minutes of no activity. Set to 0 to disable.
                  </div>
                  <input
                    type="range" min={0} max={120} step={5}
                    value={policy.idleTimeoutMinutes}
                    onChange={e => setPolicy(p => ({ ...p, idleTimeoutMinutes: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#6366f1', marginBottom: '6px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>0 (disabled)</span>
                    <span>120 min</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <StepInput
                    value={policy.idleTimeoutMinutes}
                    onChange={v => setPolicy(p => ({ ...p, idleTimeoutMinutes: v }))}
                    min={0} max={480} unit="min"
                  />
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: '600',
                      background: policy.idleTimeoutMinutes === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
                      color: policy.idleTimeoutMinutes === 0 ? '#ef4444' : '#6366f1',
                      border: `1px solid ${policy.idleTimeoutMinutes === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)'}`,
                    }}>
                      {idleLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Absolute session timeout */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Maximum Session Duration
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                    Force re-login after this many hours, regardless of activity. Set to 0 for unlimited.
                  </div>
                  <input
                    type="range" min={0} max={24}
                    value={policy.absoluteTimeoutHours}
                    onChange={e => setPolicy(p => ({ ...p, absoluteTimeoutHours: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#6366f1', marginBottom: '6px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>0 (unlimited)</span>
                    <span>24 hr</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <StepInput
                    value={policy.absoluteTimeoutHours}
                    onChange={v => setPolicy(p => ({ ...p, absoluteTimeoutHours: v }))}
                    min={0} max={24} unit="hr"
                  />
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: '600',
                      background: policy.absoluteTimeoutHours === 0 ? 'rgba(100,116,139,0.08)' : 'rgba(245,158,11,0.08)',
                      color: policy.absoluteTimeoutHours === 0 ? '#64748b' : '#d97706',
                      border: `1px solid ${policy.absoluteTimeoutHours === 0 ? 'rgba(100,116,139,0.15)' : 'rgba(245,158,11,0.2)'}`,
                    }}>
                      {absLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warn before expiry */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Warn Before Expiry
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Show a countdown warning this many minutes before the idle timeout triggers.
                  </div>
                </div>
                <StepInput
                  value={policy.warnBeforeExpiryMinutes}
                  onChange={v => setPolicy(p => ({ ...p, warnBeforeExpiryMinutes: Math.max(1, Math.min(15, v)) }))}
                  min={1} max={15} unit="min"
                />
              </div>
            </div>

            {/* Extend on activity */}
            <div style={{ padding: '24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: policy.extendOnActivity ? '#1e293b' : '#94a3b8' }}>
                      Extend Session on Activity
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '20px',
                      background: policy.extendOnActivity ? 'rgba(99,102,241,0.08)' : 'rgba(239,68,68,0.08)',
                      color: policy.extendOnActivity ? '#6366f1' : '#ef4444',
                      border: `1px solid ${policy.extendOnActivity ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                      {policy.extendOnActivity ? '● Enabled' : '○ Disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Reset the idle timer whenever the user moves the mouse, types, or clicks.
                  </div>
                </div>
                <Toggle
                  enabled={policy.extendOnActivity}
                  onChange={val => setPolicy(p => ({ ...p, extendOnActivity: val }))}
                />
              </div>
            </div>
          </div>

          {/* Warning preview card */}
          {policy.idleTimeoutMinutes > 0 && (
            <div style={{
              background: '#fff', borderRadius: '20px',
              border: '1px solid #e8eaf0',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              overflow: 'hidden', marginBottom: '16px',
            }}>
              <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '11px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>⚠️</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Session Flow Preview</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Based on your current configuration</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { icon: '🟢', label: 'User logs in', desc: 'Session starts, idle timer begins' },
                  {
                    icon: '🟡',
                    label: `After ${policy.idleTimeoutMinutes - policy.warnBeforeExpiryMinutes} min of inactivity`,
                    desc: `Warning modal appears with ${policy.warnBeforeExpiryMinutes}-minute countdown`,
                    show: policy.idleTimeoutMinutes > policy.warnBeforeExpiryMinutes,
                  },
                  {
                    icon: '🔴',
                    label: `After ${policy.idleTimeoutMinutes} min of inactivity`,
                    desc: 'User is automatically logged out',
                  },
                ].filter(s => s.show !== false).map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{step.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{step.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 0',
          }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Changes apply to new sessions immediately. Active sessions use the previous settings until re-login.
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: '700',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                opacity: saving ? 0.75 : 1,
              }}
            >
              <span>⏱</span>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          {/* Info card */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
          }}>
            <span style={{ fontSize: '16px', marginTop: '1px' }}>💡</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#4f46e5', marginBottom: '3px' }}>
                How session timeout works
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                The idle timeout tracks user activity (mouse, keyboard, clicks). When the warning appears, users can click "Stay Logged In" to reset the timer. The maximum session duration is a hard limit regardless of activity.
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  )
}
