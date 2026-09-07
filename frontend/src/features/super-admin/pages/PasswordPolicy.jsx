import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  FiKey, FiClock, FiAlertTriangle, FiLock, FiHelpCircle, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'

const REQUIREMENTS = [
  { key: 'requireUppercase', label: 'Uppercase Letter', desc: 'At least one uppercase letter (A–Z)', example: 'e.g. Password' },
  { key: 'requireLowercase', label: 'Lowercase Letter', desc: 'At least one lowercase letter (a–z)', example: 'e.g. password' },
  { key: 'requireNumbers',   label: 'Number',           desc: 'At least one numeric digit (0–9)',  example: 'e.g. Pass1' },
  { key: 'requireSpecialChars', label: 'Special Character', desc: 'At least one special character (!@#$…)', example: 'e.g. Pass@1' },
]

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-label={enabled ? 'Disable' : 'Enable'}
      style={{
        position: 'relative', width: '52px', height: '28px',
        borderRadius: '14px',
        background: enabled ? '#C2071A' : '#e2e8f0',
        border: `1px solid ${enabled ? '#C2071A' : '#e2e8f0'}`,
        cursor: 'pointer', transition: 'all 0.25s', padding: 0, flexShrink: 0,
        boxShadow: enabled ? '0 0 12px rgba(194,7,26,0.4)' : 'none',
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

function StrengthBar({ policy }) {
  const score = [
    policy.requireUppercase,
    policy.requireLowercase,
    policy.requireNumbers,
    policy.requireSpecialChars,
    policy.minLength >= 12,
  ].filter(Boolean).length

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
  const color = colors[score] || '#e2e8f0'
  const label = labels[score] || 'No Requirements'

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Estimated Password Strength</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: '6px', borderRadius: '3px',
            background: i <= score ? color : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
    </div>
  )
}

export default function PasswordPolicy() {
  const [policy, setPolicy] = useState({
    minLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    maxAgeDays: 0,
  })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    axios.get('/api/super-admin/password-policy', { headers: { Authorization: `Bearer ${token}` } })
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
      await axios.put('/api/super-admin/password-policy', policy, { headers: { Authorization: `Bearer ${token}` } })
      showAlert('success', 'Password policy saved successfully.')
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to save policy.')
    } finally {
      setSaving(false)
    }
  }

  const activeRequirements = REQUIREMENTS.filter(r => policy[r.key]).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="password-policy" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="Password Policy" />
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
              <FiKey size={18} color="#ffffff" style={{ stroke: '#ffffff' }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Password Policy
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '46px' }}>
            Set minimum password requirements enforced for all users across all roles
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
              {alert.type === 'success' ? <FiCheckCircle size={16} color="#16a34a" /> : <FiAlertCircle size={16} color="#dc2626" />}
              {alert.msg}
            </div>
          )}

          {/* Strength bar */}
          <StrengthBar policy={policy} />

          {/* Main card */}
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden', marginBottom: '16px',
          }}>

            {/* Card header */}
            <div style={{
              background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
              padding: '24px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FiKey size={22} color="#ffffff" style={{ stroke: '#ffffff' }} />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
                    Password Requirements
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '3px' }}>
                    Applied when users set or change their password
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: activeRequirements >= 3 ? 'rgba(34,197,94,0.2)' : activeRequirements === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.2)',
                border: `1px solid ${activeRequirements >= 3 ? 'rgba(34,197,94,0.4)' : activeRequirements === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.3)'}`,
                borderRadius: '20px', padding: '6px 14px',
              }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: activeRequirements >= 3 ? '#22c55e' : activeRequirements === 0 ? '#ef4444' : '#ffffff',
                }} />
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  color: activeRequirements >= 3 ? '#86efac' : activeRequirements === 0 ? '#fca5a5' : '#ffffff',
                }}>
                  {activeRequirements} / {REQUIREMENTS.length} rules active
                </span>
              </div>
            </div>

            {/* Min length */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Minimum Length
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Passwords shorter than this will be rejected
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPolicy(p => ({ ...p, minLength: Math.max(4, p.minLength - 1) }))}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: '#f1f5f9', border: '1px solid #e2e8f0',
                      fontSize: '18px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#475569',
                    }}
                  >−</button>
                  <div style={{
                    minWidth: '52px', textAlign: 'center',
                    fontSize: '22px', fontWeight: '800', color: '#C2071A',
                  }}>
                    {policy.minLength}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPolicy(p => ({ ...p, minLength: Math.min(128, p.minLength + 1) }))}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: '#f1f5f9', border: '1px solid #e2e8f0',
                      fontSize: '18px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#475569',
                    }}
                  >+</button>
                </div>
              </div>
              <input
                type="range" min={4} max={32}
                value={policy.minLength}
                onChange={e => setPolicy(p => ({ ...p, minLength: Number(e.target.value) }))}
                style={{ width: '100%', marginTop: '14px', accentColor: '#C2071A' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>4 (minimum)</span>
                <span>32</span>
              </div>
            </div>

            {/* Character requirement toggles */}
            {REQUIREMENTS.map((req, idx) => {
              const on = policy[req.key]
              return (
                <div key={req.key} style={{
                  display: 'flex', alignItems: 'center', gap: '20px',
                  padding: '20px 32px',
                  borderBottom: idx < REQUIREMENTS.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: on ? 'transparent' : 'rgba(239,68,68,0.02)',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: on ? '#1e293b' : '#94a3b8' }}>
                        {req.label}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '2px 9px',
                        borderRadius: '20px',
                        background: on ? 'rgba(194,7,26,0.08)' : 'rgba(239,68,68,0.08)',
                        color: on ? '#C2071A' : '#ef4444',
                        border: `1px solid ${on ? 'rgba(194,7,26,0.15)' : 'rgba(239,68,68,0.2)'}`,
                      }}>
                        {on ? '● Required' : '○ Optional'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{req.desc}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{req.example}</div>
                  </div>
                  <Toggle
                    enabled={on}
                    onChange={val => setPolicy(p => ({ ...p, [req.key]: val }))}
                  />
                </div>
              )
            })}
          </div>

          {/* Password expiry card */}
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden', marginBottom: '16px',
          }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '11px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FiClock size={18} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Password Expiry</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Force users to reset their password after this many days (0 = never expires)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number" min={0} max={365}
                  value={policy.maxAgeDays}
                  onChange={e => setPolicy(p => ({ ...p, maxAgeDays: Math.max(0, Math.min(365, Number(e.target.value) || 0)) }))}
                  style={{
                    width: '100px', padding: '10px 14px',
                    border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '16px', fontWeight: '700', color: '#C2071A',
                    textAlign: 'center', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                <span style={{ fontSize: '13px', color: '#64748b' }}>days</span>
                {policy.maxAgeDays > 0 && (
                  <span style={{
                    fontSize: '12px', padding: '4px 12px', borderRadius: '20px',
                    background: 'rgba(245,158,11,0.08)', color: '#d97706',
                    border: '1px solid rgba(245,158,11,0.2)', fontWeight: '600',
                  }}>
                    Expires every {policy.maxAgeDays} days
                  </span>
                )}
                {policy.maxAgeDays === 0 && (
                  <span style={{
                    fontSize: '12px', padding: '4px 12px', borderRadius: '20px',
                    background: 'rgba(100,116,139,0.08)', color: '#64748b',
                    border: '1px solid rgba(100,116,139,0.15)', fontWeight: '600',
                  }}>
                    Never expires
                  </span>
                )}
              </div>
            </div>

            {policy.maxAgeDays > 0 && (
              <div style={{
                padding: '14px 32px',
                background: '#fffbeb', borderTop: '1px solid #fde68a',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <FiAlertTriangle size={16} color="#92400e" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.6' }}>
                  Users whose password was last changed more than <strong>{policy.maxAgeDays} days</strong> ago will be required to reset it at their next login.
                </div>
              </div>
            )}
          </div>

          {/* Save footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 0',
          }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Policy applies to all new password changes and resets immediately.
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
                opacity: saving ? 0.75 : 1,
              }}
            >
              <FiCheckCircle size={15} color="#ffffff" style={{ stroke: '#ffffff' }} />
              {saving ? 'Saving…' : 'Save Password Policy'}
            </button>
          </div>

          {/* Info card */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(194, 7, 26, 0.04)', border: '1px solid rgba(194, 7, 26, 0.1)',
          }}>
            <FiHelpCircle size={16} color="#C2071A" style={{ marginTop: '1px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#C2071A', marginBottom: '3px' }}>
                When is this policy enforced?
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                The policy is checked when any user — regardless of role — changes their password, resets it via email OTP, or is forced to change it on first login. It does not affect existing passwords until the user next changes them.
              </div>
            </div>
          </div>

        </form>
      </main>
      </div>
    </div>
  )
}

