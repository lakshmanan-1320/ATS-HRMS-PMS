import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FiKey, FiMail, FiArrowRight, FiArrowLeft } from 'react-icons/fi'
import { AuthLayout, AuthHeading, AuthLabel, AuthInput, AuthButton, AuthAlert, AuthBackLink } from '../components/AuthUI'


export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/forgot-password', { email })
      sessionStorage.setItem('reset_email', email)
      sessionStorage.setItem('reset_temp_token', res.data.tempToken)
      if (res.data.devOtp) {
        sessionStorage.setItem('reset_dev_otp', res.data.devOtp)
      }
      navigate('/reset-password')
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      heroTitle="Locked out? We'll get you back in."
      heroSub="Enter your work email and we'll send a one-time code so you can choose a new password."
    >
      <AuthHeading icon={FiKey} eyebrow="Reset password" title="Forgot password?" subtitle="Enter your email address and we'll send you an OTP to reset your password." />

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 22 }}>
          <AuthLabel htmlFor="email">Email address</AuthLabel>
          <AuthInput id="email" type="email" icon="mail" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <AuthButton type="submit" loading={loading} loadingText="Sending OTP…">
          Send reset code <FiArrowRight size={16} />
        </AuthButton>
      </form>

      <AuthBackLink onClick={() => navigate('/login')}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FiArrowLeft size={14} /> Back to login</span>
      </AuthBackLink>
    </AuthLayout>
  )
}
