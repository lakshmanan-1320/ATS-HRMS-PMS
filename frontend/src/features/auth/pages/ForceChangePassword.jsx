import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FiShield, FiLock, FiKey, FiEye, FiEyeOff, FiCheck, FiArrowRight } from 'react-icons/fi'
import { AuthLayout, AuthHeading, AuthLabel, AuthInput, EyeToggle, AuthButton, AuthAlert } from '../components/AuthUI'


export default function ForceChangePassword() {
  const navigate = useNavigate()
  const token = sessionStorage.getItem('sa_token') || ''
  const role = sessionStorage.getItem('user_role') || ''
  const isRequired = sessionStorage.getItem('password_reset_required') === 'true'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [focused, setFocused] = useState(null)

  useEffect(() => {
    if (!token || !isRequired) {
      navigate('/login')
    }
  }, [token, isRequired])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Please enter your current temporary password.')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as the temporary password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(res.data.message || 'Password changed successfully!')
      sessionStorage.removeItem('password_reset_required')

      setTimeout(() => {
        if (role === 'client_admin') {
          navigate('/client-admin/dashboard', { replace: true })
        } else if (role === 'super_admin') {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/employee/dashboard', { replace: true })
        }
      }, 2000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const rules = [
    { label: 'At least 8 characters long', ok: newPassword.length >= 8 },
    { label: 'Different from your temporary password', ok: !!newPassword && newPassword !== currentPassword },
    { label: 'Passwords match', ok: !!confirmPassword && newPassword === confirmPassword },
  ]

  return (
    <AuthLayout
      heroTitle="Secure your account today."
      heroSub="Set a strong personal password to protect your account and keep your data safe. You only need to do this once."
    >
      <AuthHeading icon={FiShield} eyebrow="Account security" title="Set your new password" subtitle="Your account uses a temporary password. Choose a new one to continue." />

      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success} Redirecting to your dashboard…</AuthAlert>}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <AuthLabel htmlFor="currentPassword">Temporary password</AuthLabel>
            <AuthInput
              id="currentPassword"
              type={showPass ? 'text' : 'password'}
              icon="lock"
              placeholder="Enter the temporary password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused(null)}
              autoComplete="current-password"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <AuthLabel htmlFor="newPassword">New password</AuthLabel>
            <AuthInput
              id="newPassword"
              type={showPass ? 'text' : 'password'}
              icon="lock"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onFocus={() => setFocused('new')}
              onBlur={() => setFocused(null)}
              autoComplete="new-password"
              right={<EyeToggle shown={showPass} onToggle={() => setShowPass(v => !v)} Eye={FiEye} EyeOff={FiEyeOff} />}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <AuthLabel htmlFor="confirmPassword">Confirm new password</AuthLabel>
            <AuthInput
              id="confirmPassword"
              type={showPass ? 'text' : 'password'}
              icon="lock"
              placeholder="Re-enter the new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              autoComplete="new-password"
            />
          </div>

          <div style={{ background: '#1B2B47', border: '1px solid rgba(143,166,214,0.28)', borderRadius: 8, padding: '12px 14px', marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {rules.map(r => (
              <span key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: r.ok ? '#FFFFFF' : '#B1B1B1' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: r.ok ? '#2663FF' : 'transparent', border: `1px solid ${r.ok ? '#2663FF' : '#7E93BD'}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {r.ok && <FiCheck size={11} />}
                </span>
                {r.label}
              </span>
            ))}
          </div>

          <AuthButton type="submit" loading={loading} loadingText="Updating password…">
            Update password <FiArrowRight size={16} />
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  )
}
