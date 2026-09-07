import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle,
  FiLogIn, FiTarget
} from 'react-icons/fi'
import { clearModuleCache } from '../../../hooks/useModules'

const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }
  .login-input {
    transition: all 0.2s ease;
  }
  .login-input:focus {
    outline: none;
    border-color: #C2071A !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 3.5px rgba(194, 7, 26, 0.12) !important;
  }
  .login-btn {
    transition: all 0.2s ease;
  }
  .login-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(194, 7, 26, 0.4) !important;
  }
  .login-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  @media (max-width: 860px) {
    .login-hero-panel {
      display: none !important;
    }
    .login-card {
      max-width: 440px !important;
      min-height: auto !important;
    }
    .login-form-panel {
      padding: 36px 28px !important;
    }
  }
`

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
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#f4f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px 16px',
      boxSizing: 'border-box',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <style>{CSS}</style>

      {/* Decorative top-left corner red cutout */}
      <div style={{
        position: 'absolute',
        top: '-70px',
        left: '-70px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Decorative bottom-right corner red cutout */}
      <div style={{
        position: 'absolute',
        bottom: '-80px',
        right: '-80px',
        width: '260px',
        height: '260px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Main Split Login Card */}
      <div className="login-card" style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '900px',
        minHeight: '520px',
        background: '#ffffff',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.12), 0 8px 24px -5px rgba(0, 0, 0, 0.06)',
        display: 'flex'
      }}>

        {/* ══════ LEFT — FORM PANEL ══════ */}
        <div className="login-form-panel" style={{
          flex: 1.15,
          padding: '48px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#ffffff'
        }}>
          {/* Logo Header */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
            <img
              src={logo || '/insight-tech-logo.png'}
              alt="Insight Tech Logo"
              style={{
                height: '46px',
                maxWidth: '220px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>

          {/* Form Title & Accent Indicator */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Login
            </h1>
            <div style={{ width: '32px', height: '3px', background: '#C2071A', borderRadius: '2px' }} />
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '9px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '12px', padding: '12px 14px', marginBottom: '20px'
            }}>
              <FiAlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '13px', color: '#dc2626', lineHeight: 1.5, fontWeight: '500' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* User ID / Email Input */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: focused === 'email' ? '#C2071A' : '#94a3b8',
                  transition: 'color 0.2s', pointerEvents: 'none', display: 'flex'
                }}>
                  <FiMail size={17} />
                </span>
                <input
                  className="login-input"
                  id="email"
                  type="email"
                  placeholder="Input your user ID or Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 46px',
                    background: focused === 'email' ? '#ffffff' : '#f8fafc',
                    border: `1.5px solid ${focused === 'email' ? '#C2071A' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: focused === 'password' ? '#C2071A' : '#94a3b8',
                  transition: 'color 0.2s', pointerEvents: 'none', display: 'flex'
                }}>
                  <FiLock size={17} />
                </span>
                <input
                  className="login-input"
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Input your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '13px 48px 13px 46px',
                    background: focused === 'password' ? '#ffffff' : '#f8fafc',
                    border: `1.5px solid ${focused === 'password' ? '#C2071A' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label="Toggle password visibility"
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#C2071A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  {showPass ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <span
                onClick={() => navigate('/forgot-password')}
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#C2071A',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                Forgot Password?
              </span>
            </div>

            {/* Submit Button */}
            <button
              className="login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading
                  ? '#fca5a5'
                  : 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '800',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(194, 7, 26, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>LOGGING IN…</span>
                </>
              ) : (
                <>
                  <FiLogIn size={16} color="#ffffff" stroke="#ffffff" />
                  <span>LOG IN</span>
                </>
              )}
            </button>
          </form>

          {/* Subtext */}
          <p style={{
            marginTop: '22px',
            textAlign: 'center',
            fontSize: '11.5px',
            color: '#94a3b8',
            lineHeight: 1.6,
            margin: '22px 0 0'
          }}>
            Employees can set a password with OTP if the temporary password is not available
          </p>
        </div>

        {/* ══════ RIGHT — HERO PANEL ══════ */}
        <div className="login-hero-panel" style={{
          flex: 1,
          background: 'linear-gradient(145deg, #111827 0%, #1a0507 40%, #5a030c 100%)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 36px',
          textAlign: 'center',
          color: '#ffffff',
          overflow: 'hidden'
        }}>
          {/* Subtle radial orb overlay inside hero */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 80% 20%, rgba(194, 7, 26, 0.45) 0%, transparent 60%)',
            pointerEvents: 'none',
            animation: 'pulseGlow 6s ease-in-out infinite'
          }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Target / Hero Badge */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
            }}>
              <FiTarget size={30} color="#ffffff" />
            </div>

            {/* Hero Heading */}
            <h2 style={{
              fontSize: '24px',
              fontWeight: '900',
              color: '#ffffff',
              letterSpacing: '0.06em',
              margin: '0 0 10px',
              textTransform: 'uppercase'
            }}>
              WELCOME!
            </h2>

            {/* Hero Subtitle */}
            <p style={{
              fontSize: '13.5px',
              color: 'rgba(255, 255, 255, 0.75)',
              margin: 0,
              maxWidth: '260px',
              lineHeight: 1.6,
              fontWeight: '400'
            }}>
              Enter your details to access your performance dashboard
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '15px',
      height: '15px',
      flexShrink: 0,
      border: '2.5px solid rgba(255, 255, 255, 0.35)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 0.65s linear infinite'
    }} />
  )
}
