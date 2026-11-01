import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FiShield, FiKey, FiEye, FiEyeOff, FiArrowRight, FiArrowLeft } from 'react-icons/fi'
import { AuthLayout, AuthHeading, AuthLabel, AuthInput, EyeToggle, AuthButton, AuthAlert, AuthBackLink } from '../components/AuthUI'


export default function ResetPassword() {
  const navigate = useNavigate()
  const email = sessionStorage.getItem('reset_email') || ''
  const tempToken = sessionStorage.getItem('reset_temp_token') || ''
  const devOtp = sessionStorage.getItem('reset_dev_otp') || ''

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP reset code.')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/auth/reset-password', {
        otp: otp.trim(),
        tempToken,
        newPassword,
      })
      setSuccess(res.data.message || 'Password reset successfully!')
      sessionStorage.removeItem('reset_email')
      sessionStorage.removeItem('reset_temp_token')
      sessionStorage.removeItem('reset_dev_otp')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const maskedEmail = email ? email.replace(/(.{2})(.+)(@.+)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c) : ''

  return (
    <AuthLayout
      heroTitle="Choose a new password."
      heroSub="Use the code from your email to set a fresh password, then sign in again."
    >
      <AuthHeading icon={FiShield} eyebrow="New credentials" title="Reset password" subtitle={`Enter the 6-digit code sent to ${maskedEmail || 'your email'} and choose a new password.`} />

      {devOtp && (
        <AuthAlert
          tone="dev"
          action={
            <button type="button" onClick={() => setOtp(devOtp)}
              style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '5px 12px', color: '#92400E', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Use code
            </button>
          }
        >
          <strong>DEV MODE</strong> — OTP: <strong style={{ letterSpacing: 3, fontSize: 14 }}>{devOtp}</strong>
        </AuthAlert>
      )}

      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success} Redirecting to the login page…</AuthAlert>}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <AuthLabel htmlFor="otp">Verification code (6 digits)</AuthLabel>
            <AuthInput
              id="otp" type="text" maxLength={6} inputMode="numeric" placeholder="000000"
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 18, fontWeight: 700 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <AuthLabel htmlFor="newPassword">New password</AuthLabel>
            <AuthInput
              id="newPassword" type={showPass ? 'text' : 'password'} icon="lock" placeholder="At least 8 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password"
              right={<EyeToggle shown={showPass} onToggle={() => setShowPass(v => !v)} Eye={FiEye} EyeOff={FiEyeOff} />}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <AuthLabel htmlFor="confirmPassword">Confirm new password</AuthLabel>
            <AuthInput
              id="confirmPassword" type={showPass ? 'text' : 'password'} icon="lock" placeholder="Confirm your password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password"
            />
          </div>
          <AuthButton type="submit" loading={loading} loadingText="Resetting password…">
            Reset password <FiArrowRight size={16} />
          </AuthButton>
        </form>
      )}

      <AuthBackLink onClick={() => navigate('/login')}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FiArrowLeft size={14} /> Back to login</span>
      </AuthBackLink>
    </AuthLayout>
  )
}
