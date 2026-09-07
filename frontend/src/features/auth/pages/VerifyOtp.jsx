import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { clearModuleCache } from '../../../hooks/useModules'
import {
  FiMail, FiShield, FiAlertCircle, FiCheckCircle,
  FiArrowLeft, FiTool, FiCheck
} from 'react-icons/fi'

const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .otp-box {
    transition: all 0.15s ease;
  }
  .otp-box:focus {
    outline: none;
    border-color: #C2071A !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 3.5px rgba(194, 7, 26, 0.12) !important;
  }
  .otp-btn {
    transition: all 0.2s ease;
  }
  .otp-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(194, 7, 26, 0.4) !important;
  }
  .otp-btn:active:not(:disabled) {
    transform: translateY(0);
  }
`

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = sessionStorage.getItem('sa_email') || ''
  const tempToken = sessionStorage.getItem('sa_temp_token') || ''
  const inputRefs = useRef([])
  const verifiedRef = useRef(false)

  // Read devOtp from navigation state first, then sessionStorage fallback
  const [devOtp, setDevOtp] = useState(() => {
    const fromNav = location.state?.devOtp || ''
    const fromSession = sessionStorage.getItem('sa_dev_otp') || ''
    const otp = fromNav || fromSession
    if (otp) sessionStorage.setItem('sa_dev_otp', otp)
    return otp
  })
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timer, setTimer] = useState(RESEND_COOLDOWN)
  const [resendCount, setResendCount] = useState(0)

  useEffect(() => {
    if (verifiedRef.current) return
    if (!email || !tempToken) navigate('/login')
  }, [email, tempToken, navigate])

  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timer])

  // Auto-fill OTP digits when devOtp is available (dev mode convenience)
  useEffect(() => {
    if (devOtp && devOtp.length === OTP_LENGTH) {
      const d = devOtp.split('')
      setDigits(d)
      inputRefs.current[OTP_LENGTH - 1]?.focus()
    } else {
      inputRefs.current[0]?.focus()
    }
  }, [devOtp])

  function handleDigit(index, value) {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (text.length) {
      const next = Array(OTP_LENGTH).fill('')
      text.split('').forEach((ch, i) => { next[i] = ch })
      setDigits(next)
      inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
    }
    e.preventDefault()
  }

  async function handleVerify(e) {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length < OTP_LENGTH) {
      setError('Please enter all 6 digits of the OTP.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/verify-otp', { otp, tempToken })
      clearModuleCache()
      sessionStorage.setItem('sa_token', res.data.token)
      sessionStorage.setItem('user_role', res.data.role || 'super_admin')
      if (res.data.is_manager !== undefined) sessionStorage.setItem('is_manager', String(res.data.is_manager))
      if (res.data.company_name) sessionStorage.setItem('company_name', res.data.company_name)
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
      sessionStorage.removeItem('sa_temp_token')
      sessionStorage.removeItem('sa_dev_otp')
      verifiedRef.current = true
      
      const role = res.data.role || 'super_admin'
      const redirectUrl = sessionStorage.getItem('redirect_after_login')
      sessionStorage.removeItem('redirect_after_login')

      if (res.data.passwordResetRequired) {
        sessionStorage.setItem('password_reset_required', 'true')
        navigate('/force-change-password', { replace: true })
      } else if (redirectUrl && redirectUrl !== '/login') {
        navigate(redirectUrl, { replace: true })
      } else {
        if (role === 'client_admin') {
          navigate('/client-admin/dashboard', { replace: true })
        } else if (role === 'super_admin') {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/employee/dashboard', { replace: true })
        }
      }
      return
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Please try again.'
      setError(msg)
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (timer > 0 || resendCount >= 3) return
    try {
      const res = await axios.post('/api/auth/resend-otp', { tempToken })
      setSuccess('New OTP sent to your email.')
      setTimer(RESEND_COOLDOWN)
      setResendCount(c => c + 1)
      setDigits(Array(OTP_LENGTH).fill(''))
      // Update devOtp from resend response for auto-fill
      if (res.data.devOtp) {
        sessionStorage.setItem('sa_dev_otp', res.data.devOtp)
        setDevOtp(res.data.devOtp)
      }
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError('Failed to resend OTP. Please go back and try again.')
    }
  }

  const maskedEmail = email.replace(/(.{2})(.+)(@.+)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)

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

      {/* Main OTP Card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '460px',
        background: '#ffffff',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.12), 0 8px 24px -5px rgba(0, 0, 0, 0.06)',
        padding: '44px 40px',
        boxSizing: 'border-box'
      }}>
        {/* Header Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FiMail size={24} color="#C2071A" strokeWidth={2.2} />
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FEECEE', border: '1px solid rgba(194, 7, 26, 0.2)',
            borderRadius: '20px', padding: '5px 14px',
            fontSize: '11px', fontWeight: '700',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#C2071A'
          }}>
            <FiShield size={13} color="#C2071A" />
            <span>VERIFY OTP</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Check your email
          </h1>
          <div style={{ width: '32px', height: '3px', background: '#C2071A', borderRadius: '2px' }} />
        </div>

        {/* Subtitle & Masked Email Banner */}
        <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 12px', lineHeight: 1.5, fontWeight: '500' }}>
          A 6-digit verification code has been sent to:
        </p>

        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '24px',
          lineHeight: '1.6',
          fontSize: '13px',
          color: '#475569'
        }}>
          <strong style={{ color: '#C2071A', fontWeight: '700' }}>{maskedEmail}</strong>
          <br />
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Valid for <strong style={{ color: '#0f172a' }}>10 minutes</strong> · Do not share with anyone
          </span>
        </div>

        {/* DEV MODE Banner */}
        {devOtp && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTool size={16} color="#b45309" />
              <span>
                <strong>DEV MODE</strong> — OTP: <strong style={{ letterSpacing: '3px', fontSize: '15px', color: '#78350f' }}>{devOtp}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const d = devOtp.split('')
                setDigits(d)
                inputRefs.current[5]?.focus()
              }}
              style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '5px 12px',
                color: '#92400e',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
              onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}
            >
              Auto-fill
            </button>
          </div>
        )}

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

        {/* Success Banner */}
        {success && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '9px',
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '12px', padding: '12px 14px', marginBottom: '20px'
          }}>
            <FiCheckCircle size={16} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: '#15803d', lineHeight: 1.5, fontWeight: '500' }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleVerify}>
          {/* OTP Digit Box Inputs */}
          <div style={{
            display: 'flex', gap: '10px', justifyContent: 'center',
            marginBottom: '24px'
          }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                className="otp-box"
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: '48px',
                  height: '56px',
                  background: d ? '#ffffff' : '#f8fafc',
                  border: `1.5px solid ${d ? '#C2071A' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '20px',
                  fontWeight: '800',
                  color: '#0f172a',
                  boxShadow: d ? '0 0 0 3px rgba(194, 7, 26, 0.1)' : 'none',
                  fontFamily: 'inherit'
                }}
              />
            ))}
          </div>

          {/* Resend Timer / Action */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '24px', fontWeight: '500' }}>
            {timer > 0 ? (
              <>Resend OTP in <span style={{ color: '#C2071A', fontWeight: '700' }}>0:{String(timer).padStart(2, '0')}</span></>
            ) : resendCount >= 3 ? (
              <span style={{ color: '#dc2626', fontWeight: '600' }}>Maximum resend limit reached. Please restart login.</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C2071A',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Resend OTP
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            className="otp-btn"
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
                <span>VERIFYING…</span>
              </>
            ) : (
              <>
                <FiCheck size={18} color="#ffffff" stroke="#ffffff" />
                <span>VERIFY & SIGN IN</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <span
            onClick={() => navigate('/login')}
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#C2071A',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            <FiArrowLeft size={15} color="#C2071A" />
            <span>Back to login</span>
          </span>
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

