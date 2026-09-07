import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle, FiX, FiShield,
  FiKey, FiInfo, FiCheckCircle
} from 'react-icons/fi'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

function validateAgainstPolicy(password, policy) {
  const rules = []
  rules.push({ label: `At least ${policy.minLength} characters`, met: password.length >= policy.minLength })
  if (policy.requireUppercase)    rules.push({ label: 'One uppercase letter (A–Z)',    met: /[A-Z]/.test(password) })
  if (policy.requireLowercase)    rules.push({ label: 'One lowercase letter (a–z)',    met: /[a-z]/.test(password) })
  if (policy.requireNumbers)      rules.push({ label: 'One number (0–9)',              met: /[0-9]/.test(password) })
  if (policy.requireSpecialChars) rules.push({ label: 'One special character (!@#…)', met: /[^A-Za-z0-9]/.test(password) })
  return rules
}

function getStrength(password, policy) {
  if (!password) return { score: 0, label: '', color: '' }
  const rules = validateAgainstPolicy(password, policy)
  const met = rules.filter(r => r.met).length
  const pct = met / (rules.length || 1)
  if (pct <= 0.25) return { score: 1, label: 'Weak',   color: '#ef4444' }
  if (pct <= 0.5)  return { score: 2, label: 'Fair',   color: '#f97316' }
  if (pct <= 0.75) return { score: 3, label: 'Good',   color: '#eab308' }
  return              { score: 4, label: 'Strong', color: '#22c55e' }
}

const inputBase = {
  width: '100%',
  padding: '11px 44px 11px 40px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '13px',
  color: '#1e293b',
  outline: 'none',
  transition: 'border 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const onFocus = e => {
  e.target.style.border = '1px solid #C2071A'
  e.target.style.boxShadow = '0 0 0 3px rgba(194,7,26,0.1)'
}
const onBlur = e => {
  e.target.style.border = '1px solid #e2e8f0'
  e.target.style.boxShadow = 'none'
}

function SectionLabel({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{
        fontSize: '11px', fontWeight: '700', color: '#C2071A',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: '#e8eaf0', marginLeft: '4px' }} />
    </div>
  )
}

function PasswordField({ id, label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <label htmlFor={id} style={{
        fontSize: '11px', fontWeight: '600', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
          color: '#94a3b8', display: 'flex', pointerEvents: 'none',
        }}>
          <FiLock size={14} />
        </div>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          style={inputBase}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0,
            display: 'flex', alignItems: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#C2071A'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePassword() {
  const [policy, setPolicy]                   = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [alert, setAlert]                     = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    axios.get('/api/auth/password-policy', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPolicy(r.data))
      .catch(() => setPolicy({
        minLength: 8, requireUppercase: false, requireLowercase: false,
        requireNumbers: false, requireSpecialChars: false,
      }))
  }, [])

  function showMsg(type, msg) {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 6000)
  }

  const policyRules    = policy && newPassword ? validateAgainstPolicy(newPassword, policy) : []
  const allRulesMet    = policy ? validateAgainstPolicy(newPassword, policy).every(r => r.met) : false
  const strength       = policy && newPassword ? getStrength(newPassword, policy) : null
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword

  async function handleSubmit(e) {
    e.preventDefault()
    setAlert(null)
    if (!currentPassword) return showMsg('error', 'Please enter your current password.')
    if (!allRulesMet)     return showMsg('error', 'New password does not meet the policy requirements.')
    if (newPassword === currentPassword) return showMsg('error', 'New password must differ from current password.')
    if (newPassword !== confirmPassword) return showMsg('error', 'Passwords do not match.')

    setLoading(true)
    try {
      const token = sessionStorage.getItem('sa_token')
      const res = await axios.post(
        '/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMsg('success', res.data.message || 'Password changed successfully.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <EmployeeSidebar active="change-password" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <EmployeeTopBar title="Change Password" />

        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: '#FEECEE',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiLock size={20} color="#C2071A" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Change Password
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '48px' }}>
            Keep your account secure by updating your password regularly
          </p>
        </div>

        {alert && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
            maxWidth: '900px',
            fontSize: '13px', fontWeight: '500',
            background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: alert.type === 'success' ? '#16a34a' : '#dc2626',
          }}>
            {alert.type === 'success'
              ? <FiCheckCircle size={16} color="#16a34a" />
              : <FiAlertCircle size={16} color="#dc2626" />
            }
            {alert.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: '900px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

            {/* Left: main card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
              overflow: 'hidden',
            }}>
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
                    backdropFilter: 'blur(8px)',
                  }}>
                    <FiLock size={22} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
                      Update Password
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '3px' }}>
                      All fields are required
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '20px', padding: '6px 14px', backdropFilter: 'blur(8px)',
                }}>
                  <FiLock size={12} color="#ffffff" />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>
                    Encrypted
                  </span>
                </div>
              </div>

              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                <SectionLabel icon={<FiKey size={14} color="#C2071A" />} title="Current Password" />
                <div style={{ marginBottom: '28px' }}>
                  <PasswordField
                    id="currentPassword"
                    label="Current Password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    show={showCurrent}
                    onToggle={() => setShowCurrent(v => !v)}
                    placeholder="Enter your current password"
                  />
                </div>

                <SectionLabel icon={<FiLock size={14} color="#C2071A" />} title="New Password" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                  <PasswordField
                    id="newPassword"
                    label="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    show={showNew}
                    onToggle={() => setShowNew(v => !v)}
                    placeholder="Enter your new password"
                  />

                  {strength && (
                    <div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '4px',
                            background: i <= strength.score ? strength.color : '#e2e8f0',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <p style={{ margin: 0, fontSize: '11.5px', fontWeight: '600', color: strength.color }}>
                        {strength.label} password
                      </p>
                    </div>
                  )}

                  <PasswordField
                    id="confirmPassword"
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(v => !v)}
                    placeholder="Re-enter your new password"
                  />

                  {confirmPassword.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: '600',
                      color: passwordsMatch ? '#16a34a' : '#ef4444',
                    }}>
                      {passwordsMatch
                        ? <><FiCheck size={13} /> Passwords match</>
                        : <><FiX size={13} /> Passwords do not match</>
                      }
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', borderRadius: '10px',
                  background: 'rgba(194,7,26,0.04)',
                  border: '1px solid rgba(194,7,26,0.12)',
                }}>
                  <FiInfo size={15} color="#C2071A" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#C2071A', fontWeight: '500' }}>
                    Your password is encrypted and never stored in plaintext. Changes take effect immediately.
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '20px 32px',
                borderTop: '1px solid #e8eaf0',
                background: '#f8fafc',
              }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 28px',
                    background: loading
                      ? '#fca5a5'
                      : 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700',
                    color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 3px 10px rgba(194, 7, 26, 0.25)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 16px rgba(194, 7, 26, 0.4)' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 3px 10px rgba(194, 7, 26, 0.25)' }}
                >
                  {loading ? <><Spinner /> Updating…</> : <><FiCheck size={16} color="#ffffff" stroke="#ffffff" /> Update Password</>}
                </button>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'rgba(194,7,26,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FiShield size={14} color="#C2071A" />
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    Password Requirements
                  </p>
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {policy
                    ? validateAgainstPolicy(newPassword || '', policy).map((rule, i) => {
                        const active = newPassword.length > 0
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '9px 12px', borderRadius: '9px',
                            background: active ? (rule.met ? '#f0fdf4' : '#fafafa') : '#fafafa',
                            border: `1px solid ${active ? (rule.met ? '#bbf7d0' : '#f1f5f9') : '#f1f5f9'}`,
                            transition: 'all 0.2s',
                          }}>
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: active ? (rule.met ? '#22c55e' : '#e2e8f0') : '#e2e8f0',
                              transition: 'background 0.2s',
                            }}>
                              {active && rule.met
                                ? <FiCheck size={10} color="#fff" />
                                : <FiX size={10} color={active ? '#94a3b8' : '#cbd5e1'} />
                              }
                            </div>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: active && rule.met ? '600' : '500',
                              color: active ? (rule.met ? '#15803d' : '#64748b') : '#94a3b8',
                              transition: 'color 0.2s',
                            }}>
                              {rule.label}
                            </span>
                          </div>
                        )
                      })
                    : <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Loading policy…</p>
                  }
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 4px 16px rgba(194, 7, 26, 0.25)',
                padding: '22px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-30px', right: '-30px',
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', position: 'relative' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FiShield size={14} color="#ffffff" />
                  </div>
                  <div style={{
                    margin: 0, fontSize: '13px', fontWeight: '700',
                    color: '#ffffff',
                    letterSpacing: '0.01em',
                  }}>
                    Security Tips
                  </div>
                </div>
                {[
                  'Never share your password with anyone.',
                  'Use a unique password not used elsewhere.',
                  'Change your password regularly.',
                ].map((tip, i, arr) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    marginBottom: i < arr.length - 1 ? '10px' : 0,
                    position: 'relative',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.8)', marginTop: '5px', flexShrink: 0,
                    }} />
                    <div style={{
                      margin: 0, fontSize: '12.5px', fontWeight: '500',
                      color: '#ffffff',
                      lineHeight: '1.55',
                    }}>
                      {tip}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                background: '#fffbeb', border: '1px solid #fde68a',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <FiAlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#92400e', lineHeight: '1.5' }}>
                  You will remain logged in after changing your password.
                </p>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            marginTop: '16px', padding: '14px 18px',
            borderRadius: '12px', background: 'rgba(194,7,26,0.04)',
            border: '1px solid rgba(194,7,26,0.1)',
          }}>
            <FiInfo size={16} color="#C2071A" style={{ marginTop: '1px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#C2071A', marginBottom: '3px' }}>
                Tip
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                Use a mix of uppercase, lowercase, numbers, and special characters. Avoid reusing passwords from other sites.
              </div>
            </div>
          </div>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: '14px', height: '14px',
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }} />
  )
}

