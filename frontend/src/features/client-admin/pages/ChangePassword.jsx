import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiLock, FiEye, FiEyeOff, FiCheck, FiX, FiShield, FiKey, FiRefreshCcw, FiInfo, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'

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
  border: '1px solid #E3E7EE',
  borderRadius: '10px',
  fontSize: '13px',
  color: '#001233',
  outline: 'none',
  transition: 'border 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const onFocus = e => {
  e.target.style.border = '1px solid #0466C8'
  e.target.style.boxShadow = '0 0 0 3px rgba(4, 102, 200,0.1)'
}
const onBlur = e => {
  e.target.style.border = '1px solid #E3E7EE'
  e.target.style.boxShadow = 'none'
}

function SectionLabel({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <Icon size={14} color="#0466C8" />
      <span style={{
        fontSize: '11px', fontWeight: '700', color: '#0466C8',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: '#E3E7EE', marginLeft: '4px' }} />
    </div>
  )
}

function PasswordField({ id, label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <label htmlFor={id} style={{
        fontSize: '11px', fontWeight: '600', color: '#7D8597',
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
          onMouseEnter={e => e.currentTarget.style.color = '#0466C8'}
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
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="change-password" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <PageHeader
          icon={FiLock}
          title="Change Password"
          subtitle="Keep your account secure by updating your password regularly"
        />

        {alert && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
            fontSize: '13px', fontWeight: '500',
            background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: alert.type === 'success' ? '#16a34a' : '#dc2626',
          }}>
            {alert.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertTriangle size={16} />}
            {alert.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ width: '100%' }}>

            {/* Left: main card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #E3E7EE',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))',
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
                  }}><FiLock size={22} color="#ffffff" /></div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
                      Update Password
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                      All fields are required
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                <SectionLabel icon={FiKey} title="Current Password" />
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

                <SectionLabel icon={FiRefreshCcw} title="New Password" />
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
                            background: i <= strength.score ? strength.color : '#E3E7EE',
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
                  background: 'rgba(4, 102, 200,0.04)',
                  border: '1px solid rgba(4, 102, 200,0.12)',
                }}>
                  <FiInfo size={13} color="#0466C8" />
                  <span style={{ fontSize: '12px', color: '#0466C8', fontWeight: '500' }}>
                    Your password is encrypted and never stored in plaintext. Changes take effect immediately.
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '20px 32px',
                borderTop: '1px solid #E3E7EE',
                background: '#f8fafc',
              }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 28px',
                    background: loading
                      ? 'rgba(4, 102, 200,0.5)'
                      : 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))',
                    border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700',
                    color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(4, 102, 200,0.4)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(4, 102, 200,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(4, 102, 200,0.4)' }}
                >
                  {loading ? <><Spinner /> Updating…</> : <><FiCheck size={15} /> Update Password</>}
                </button>
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
