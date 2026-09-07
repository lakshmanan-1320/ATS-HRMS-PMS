import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  FiShield, FiKey, FiLock, FiBriefcase, FiCheckCircle, FiAlertCircle,
  FiAlertTriangle, FiCheck, FiX, FiSave
} from 'react-icons/fi'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'

const OTP_ROLES = [
  {
    key: 'otpSuperAdminEnabled',
    label: 'Super Admin',
    icon: <FiShield size={18} color="#C2071A" />,
    color: '#C2071A',
    bg: 'rgba(194, 7, 26, 0.08)',
    border: 'rgba(194, 7, 26, 0.15)',
    desc: 'Super administrator accounts that manage the entire platform, clients, and global settings.',
    risk: 'High risk — super admins have full system access. Strongly recommended.',
  },
  {
    key: 'otpClientAdminEnabled',
    label: 'Client Admin',
    icon: <FiBriefcase size={18} color="#0ea5e9" />,
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.15)',
    desc: 'Client administrator accounts managing employees, payroll, and HR modules.',
    risk: 'Medium risk — client admins can access sensitive employee and payroll data.',
  },
]

const LOCKOUT_DURATION_OPTIONS = [5, 10, 15, 30, 60, 120]

function Toggle({ enabled, onChange, color }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-label={enabled ? 'Disable' : 'Enable'}
      style={{
        position: 'relative', width: '52px', height: '28px',
        borderRadius: '14px',
        background: enabled ? color : '#e2e8f0',
        border: `1px solid ${enabled ? color : '#e2e8f0'}`,
        cursor: 'pointer', transition: 'all 0.25s',
        boxShadow: enabled ? `0 0 12px ${color}50` : 'none',
        padding: 0, flexShrink: 0,
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

export default function SecuritySettings() {
  const [otp, setOtp] = useState({
    otpSuperAdminEnabled: true,
    otpClientAdminEnabled: true,
    otpEmployeeEnabled: false,
  })
  const [lockout, setLockout] = useState({
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
  })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    axios.get('/api/super-admin/security', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const d = r.data
        setOtp({
          otpSuperAdminEnabled: d.otpSuperAdminEnabled ?? d.otpLoginEnabled ?? true,
          otpClientAdminEnabled: d.otpClientAdminEnabled ?? d.otpLoginEnabled ?? true,
          otpEmployeeEnabled: false,
        })
        setLockout({
          maxLoginAttempts: d.maxLoginAttempts ?? 5,
          lockoutDurationMinutes: d.lockoutDurationMinutes ?? 30,
        })
      })
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
      await axios.put('/api/super-admin/security', { ...otp, ...lockout }, { headers: { Authorization: `Bearer ${token}` } })
      showAlert('success', 'Settings saved successfully.')
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = Object.values(otp).filter(Boolean).length
  const disabledRoles = OTP_ROLES.filter(r => !otp[r.key])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="security" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="Security & Authentication" />
        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(194, 7, 26, 0.3)',
            }}>
              <FiShield size={18} color="#ffffff" style={{ stroke: '#ffffff' }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Security & Authentication
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '46px' }}>
            Manage OTP login policies and account lockout behaviour for all roles
          </p>
        </div>

        <form onSubmit={handleSave} style={{ maxWidth: '760px' }}>

          {/* Alert banner */}
          {alert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '13px', fontWeight: '500',
              background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
              color: alert.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              {alert.type === 'success' ? <FiCheckCircle size={16} color="#16a34a" /> : <FiAlertCircle size={16} color="#dc2626" />}
              {alert.msg}
            </div>
          )}

          {/* ── SECTION 1: OTP Authentication ── */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(194, 7, 26, 0.08)', border: '1px solid rgba(194, 7, 26, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiKey size={14} color="#C2071A" />
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>OTP Authentication</span>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>
                — per-role two-factor login via email OTP
              </span>
            </div>

            {/* Status summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {OTP_ROLES.map(role => {
                const on = otp[role.key]
                return (
                  <div key={role.key} style={{
                    background: '#ffffff', borderRadius: '16px',
                    border: 'none',
                    padding: '16px 18px',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '9px',
                        background: on ? role.bg : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>{role.icon}</div>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '3px 9px',
                        borderRadius: '20px',
                        background: on ? `${role.color}12` : 'rgba(239,68,68,0.08)',
                        color: on ? role.color : '#ef4444',
                        border: `1px solid ${on ? role.border : 'rgba(239,68,68,0.2)'}`,
                      }}>
                        {on ? 'OTP ON' : 'OTP OFF'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: on ? '#1e293b' : '#94a3b8' }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: '11px', color: on ? '#64748b' : '#94a3b8', marginTop: '2px' }}>
                      {on ? '2-factor login active' : 'Password only'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* OTP card */}
            <div style={{
              background: '#ffffff', borderRadius: '16px',
              border: 'none',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                padding: '20px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                  Configure OTP per role
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: enabledCount === 3 ? 'rgba(34,197,94,0.2)' : enabledCount === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.2)',
                  border: `1px solid ${enabledCount === 3 ? 'rgba(34,197,94,0.4)' : enabledCount === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.3)'}`,
                  borderRadius: '20px', padding: '5px 12px',
                }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: enabledCount === 3 ? '#22c55e' : enabledCount === 0 ? '#ef4444' : '#ffffff',
                  }} />
                  <span style={{
                    fontSize: '12px', fontWeight: '600',
                    color: enabledCount === 3 ? '#86efac' : enabledCount === 0 ? '#fca5a5' : '#ffffff',
                  }}>
                    {enabledCount} / 3 roles secured
                  </span>
                </div>
              </div>

              {OTP_ROLES.map((role, idx) => {
                const on = otp[role.key]
                return (
                  <div key={role.key} style={{
                    display: 'flex', alignItems: 'center', gap: '20px',
                    padding: '20px 28px',
                    borderBottom: idx < OTP_ROLES.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: on ? 'transparent' : 'rgba(239,68,68,0.02)',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                      background: on ? role.bg : '#f1f5f9',
                      border: `1px solid ${on ? role.border : '#e8eaf0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>{role.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: on ? '#1e293b' : '#94a3b8' }}>
                          {role.label}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '2px 9px',
                          borderRadius: '20px',
                          background: on ? `${role.color}12` : 'rgba(239,68,68,0.08)',
                          color: on ? role.color : '#ef4444',
                          border: `1px solid ${on ? role.border : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          {on ? '● OTP Enabled' : '○ OTP Disabled'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        {role.desc}
                      </div>
                    </div>
                    <Toggle enabled={on} color={role.color} onChange={val => setOtp(p => ({ ...p, [role.key]: val }))} />
                  </div>
                )
              })}

              {disabledRoles.length > 0 && (
                <div style={{
                  margin: '0 28px 20px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: '#fefce8', border: '1px solid #fde68a',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}>
                  <FiAlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', color: '#a16207', lineHeight: '1.6' }}>
                    OTP disabled for <strong>{disabledRoles.map(r => r.label).join(', ')}</strong> — users in these roles will log in with email + password only.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 2: Account Lockout ── */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(194, 7, 26, 0.08)', border: '1px solid rgba(194, 7, 26, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiLock size={14} color="#C2071A" />
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Account Lockout</span>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>
                — protect against brute-force login attacks
              </span>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: '16px',
              border: 'none',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                padding: '20px 28px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                  Failed Login Attempt Policy
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '3px' }}>
                  Lock accounts automatically after repeated failed password attempts
                </div>
              </div>

              <div style={{ padding: '28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                  {/* Max attempts */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                      Max Failed Attempts
                    </label>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' }}>
                      Account is locked after this many consecutive wrong passwords.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={lockout.maxLoginAttempts}
                        onChange={e => setLockout(p => ({ ...p, maxLoginAttempts: Math.max(1, Math.min(20, Number(e.target.value))) }))}
                        style={{
                          width: '90px', padding: '10px 14px',
                          border: '1px solid #d1d5db', borderRadius: '10px',
                          fontSize: '18px', fontWeight: '700', color: '#1e293b',
                          textAlign: 'center', outline: 'none',
                          transition: 'all 0.2s',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                      />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>attempts</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      {[3, 5, 10].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setLockout(p => ({ ...p, maxLoginAttempts: n }))}
                          style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: lockout.maxLoginAttempts === n ? '#C2071A' : '#f1f5f9',
                            color: lockout.maxLoginAttempts === n ? '#ffffff' : '#64748b',
                            border: `1px solid ${lockout.maxLoginAttempts === n ? '#C2071A' : '#e2e8f0'}`,
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lockout duration */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                      Lockout Duration
                    </label>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' }}>
                      How long the account remains locked before the user can try again.
                    </div>
                    <select
                      value={lockout.lockoutDurationMinutes}
                      onChange={e => setLockout(p => ({ ...p, lockoutDurationMinutes: Number(e.target.value) }))}
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1px solid #d1d5db', borderRadius: '10px',
                        fontSize: '14px', fontWeight: '600', color: '#1e293b',
                        background: '#fff', outline: 'none', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                      onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
                    >
                      {LOCKOUT_DURATION_OPTIONS.map(min => (
                        <option key={min} value={min}>
                          {min < 60 ? `${min} minutes` : `${min / 60} hour${min > 60 ? 's' : ''}`}
                        </option>
                      ))}
                    </select>
                    <div style={{
                      marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(194, 7, 26, 0.04)', border: '1px solid rgba(194, 7, 26, 0.1)',
                      fontSize: '12px', color: '#C2071A',
                    }}>
                      After <strong>{lockout.maxLoginAttempts}</strong> failed attempt{lockout.maxLoginAttempts !== 1 ? 's' : ''}, account locks for{' '}
                      <strong>{lockout.lockoutDurationMinutes < 60 ? `${lockout.lockoutDurationMinutes} minutes` : `${lockout.lockoutDurationMinutes / 60} hour${lockout.lockoutDurationMinutes > 60 ? 's' : ''}`}</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderRadius: '16px',
            background: '#ffffff', border: 'none',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Changes take effect immediately for all new login sessions.
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: '700',
                color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(194, 7, 26, 0.3)',
                transition: 'all 0.2s', opacity: saving ? 0.75 : 1,
              }}
            >
              <FiLock size={15} color="#ffffff" style={{ stroke: '#ffffff' }} />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

        </form>
      </main>
      </div>
    </div>
  )
}

