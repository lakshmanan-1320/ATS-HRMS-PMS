import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { clearModuleCache } from '../../../hooks/useModules'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'
import { AuthLayout, AuthHeading, AuthButton, AuthAlert, AuthBackLink } from '../components/AuthUI'

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
    <AuthLayout
      heroTitle="One more step to keep your account safe."
      heroSub="We sent a one-time code to your email. Enter it to finish signing in."
    >
      <AuthHeading icon={FiMail} eyebrow="Verify OTP" title="Check your email" subtitle="A 6-digit verification code has been sent to:" />

      <div style={{ background: '#1B2B47', border: '1px solid rgba(143,166,214,0.28)', borderRadius: 8, padding: '12px 16px', marginTop: -14, marginBottom: 20, lineHeight: 1.6 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#5B8CFF' }}>{maskedEmail}</div>
        <div style={{ fontSize: 12, color: '#B1B1B1' }}>Valid for <strong style={{ color: '#FFFFFF' }}>10 minutes</strong> · Do not share it with anyone</div>
      </div>

      {devOtp && (
        <AuthAlert
          tone="dev"
          action={
            <button
              type="button"
              onClick={() => {
                const d = devOtp.split('')
                setDigits(d)
                inputRefs.current[5]?.focus()
              }}
              style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '5px 12px', color: '#92400E', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >
              Auto-fill
            </button>
          }
        >
          <strong>DEV MODE</strong> — OTP: <strong style={{ letterSpacing: 3, fontSize: 14 }}>{devOtp}</strong>
        </AuthAlert>
      )}

      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success}</AuthAlert>}

      <form onSubmit={handleVerify}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginBottom: 22 }} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              className="pms-auth-input"
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: '100%', maxWidth: 58, height: 60, boxSizing: 'border-box',
                background: d ? '#20345A' : '#1B2B47',
                border: `1px solid ${d ? '#2663FF' : 'rgba(143,166,214,0.28)'}`,
                borderRadius: 8, textAlign: 'center',
                fontFamily: "'Sora', 'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: '#FFFFFF',
                boxShadow: d ? '0 0 0 2px rgba(38,99,255,0.35)' : 'none',
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#B1B1B1', marginBottom: 22 }}>
          {timer > 0 ? (
            <>Resend code in <span style={{ color: '#5B8CFF', fontWeight: 700 }}>0:{String(timer).padStart(2, '0')}</span></>
          ) : resendCount >= 3 ? (
            <span style={{ color: '#FCA5A5', fontWeight: 600 }}>Maximum resend limit reached. Please restart login.</span>
          ) : (
            <button type="button" className="pms-auth-link" onClick={handleResend} style={{ fontSize: 13 }}>Resend OTP</button>
          )}
        </div>

        <AuthButton type="submit" loading={loading} loadingText="Verifying…">
          <FiCheck size={17} /> Verify &amp; sign in
        </AuthButton>
      </form>

      <AuthBackLink onClick={() => navigate('/login')}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FiArrowLeft size={14} /> Back to login</span>
      </AuthBackLink>
    </AuthLayout>
  )
}
