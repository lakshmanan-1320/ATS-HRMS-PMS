import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { AuthLayout, AuthHeading, AuthLabel, AuthInput, EyeToggle, AuthButton, AuthAlert, AuthHint } from '../components/AuthUI'
import { clearModuleCache } from '../../../hooks/useModules'

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [focused,  setFocused]  = useState(null)
  const [logo,     setLogo]     = useState(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    axios.get('/api/auth/branding')
      .then(res => { if (res.data.logo_base64) setLogo(res.data.logo_base64) })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (submittingRef.current || loading) return
    setError('')
    if (!email || !password) { setError('Please enter both email and password.'); return }
    submittingRef.current = true
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      if (res.data.otpEnabled === false) {
        clearModuleCache()
        sessionStorage.setItem('sa_token',   res.data.token)
        sessionStorage.setItem('sa_email',   email)
        sessionStorage.setItem('user_role',  res.data.role || 'super_admin')
        if (res.data.is_manager   !== undefined) sessionStorage.setItem('is_manager',   String(res.data.is_manager))
        if (res.data.company_name)               sessionStorage.setItem('company_name', res.data.company_name)
        if (res.data.token) {
          try {
            const payload = JSON.parse(atob(res.data.token.split('.')[1]));
            if (payload.employeeId) {
              sessionStorage.setItem('employee_id', payload.employeeId);
            }
          } catch (e) {
            console.error('Failed to parse employeeId from token', e);
          }
        }
        const role = res.data.role || 'super_admin'
        const redirectUrl = sessionStorage.getItem('redirect_after_login')
        sessionStorage.removeItem('redirect_after_login')

        if (res.data.passwordResetRequired) {
          sessionStorage.setItem('password_reset_required', 'true')
          navigate('/force-change-password', { replace: true })
        } else if (redirectUrl && redirectUrl !== '/login') {
          navigate(redirectUrl, { replace: true })
        } else if (role === 'client_admin') {
          navigate('/client-admin/dashboard', { replace: true })
        } else if (role === 'super_admin') {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/employee/dashboard', { replace: true })
        }
      } else {
        sessionStorage.setItem('sa_email',      email)
        sessionStorage.setItem('sa_temp_token', res.data.tempToken)
        if (res.data.devOtp) sessionStorage.setItem('sa_dev_otp', res.data.devOtp)
        console.log('[LOGIN] OTP response:', { otpEnabled: res.data.otpEnabled, hasDevOtp: !!res.data.devOtp, devOtp: res.data.devOtp })
        navigate('/verify-otp', { state: { devOtp: res.data.devOtp || '' } })
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Please make sure the backend is running.')
      } else {
        const data = err.response.data
        const serverMsg = (data && typeof data === 'object' && data.message) ? data.message : null
        setError(serverMsg || 'Login failed. Please check your credentials and try again.')
      }
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <AuthLayout>
      <AuthHeading title="Welcome Back" subtitle="Sign in to continue — your role is detected automatically" />

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          <div>
            <AuthLabel htmlFor="email">Email Address</AuthLabel>
            <AuthInput
              id="email"
              type="email"
              icon="mail"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              autoComplete="username"
            />
          </div>
          <div>
            <AuthLabel htmlFor="password">Password</AuthLabel>
            <AuthInput
              id="password"
              type={showPass ? 'text' : 'password'}
              icon="lock"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              autoComplete="current-password"
              right={<EyeToggle shown={showPass} onToggle={() => setShowPass(v => !v)} Eye={FiEye} EyeOff={FiEyeOff} />}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="pms-auth-link" style={{ fontSize: 12 }} onClick={() => navigate('/forgot-password')}>
              Forgot password?
            </button>
          </div>
        </div>

        <AuthButton type="submit" loading={loading} loadingText="Signing in…">Sign In</AuthButton>
      </form>

      <AuthHint>Employees can set a password with OTP if the temporary password is not available</AuthHint>
    </AuthLayout>
  )
}
