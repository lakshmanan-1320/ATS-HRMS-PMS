import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { clearModuleCache } from '../../../hooks/useModules'

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px', position: 'relative', overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: '-10%', right: '-5%',
    width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', bottom: '-10%', left: '-5%',
    width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(15,23,42,0.85)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: '24px', width: '100%', maxWidth: '440px',
    padding: '48px 40px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
    position: 'relative', zIndex: 1,
  },
  iconWrap: {
    width: '60px', height: '60px', borderRadius: '16px',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '26px', marginBottom: '24px',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '20px', padding: '4px 12px',
    fontSize: '11px', fontWeight: '600',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#86efac', marginBottom: '20px',
  },
  heading: {
    fontSize: '26px', fontWeight: '800', color: '#f1f5f9',
    lineHeight: '1.2', marginBottom: '8px', letterSpacing: '-0.5px',
  },
  subHeading: {
    fontSize: '14px', color: '#64748b', marginBottom: '8px', lineHeight: '1.6',
  },
  emailHint: {
    fontSize: '13px', color: '#94a3b8',
    background: 'rgba(30,41,59,0.6)',
    borderRadius: '8px', padding: '10px 14px',
    marginBottom: '32px', lineHeight: '1.5',
  },
  emailStrong: { color: '#6366f1', fontWeight: '600' },
  otpRow: {
    display: 'flex', gap: '10px', justifyContent: 'center',
    marginBottom: '24px',
  },
  otpBox: {
    width: '52px', height: '60px',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '12px', textAlign: 'center',
    fontSize: '22px', fontWeight: '700', color: '#f1f5f9',
    outline: 'none', caretColor: '#6366f1',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  timerRow: {
    textAlign: 'center', fontSize: '13px',
    color: '#64748b', marginBottom: '24px',
  },
  timerSpan: { color: '#6366f1', fontWeight: '600' },
  resendBtn: {
    background: 'none', border: 'none', color: '#6366f1',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px',
    padding: '0', textDecoration: 'underline',
  },
  verifyBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    border: 'none', borderRadius: '12px',
    fontSize: '15px', fontWeight: '700', color: '#fff',
    cursor: 'pointer', letterSpacing: '0.02em',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(22,163,74,0.35)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
  },
  backLink: {
    textAlign: 'center', marginTop: '20px',
    fontSize: '13px', color: '#475569',
    cursor: 'pointer',
  },
  backA: { color: '#6366f1', fontWeight: '500' },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px', padding: '12px 16px',
    marginBottom: '20px', fontSize: '13px', color: '#fca5a5',
  },
  successBox: {
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '10px', padding: '12px 16px',
    marginBottom: '20px', fontSize: '13px', color: '#86efac',
  },
}

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
  }, [email, tempToken])

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
    <div style={styles.page}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.card}>
        <div style={styles.iconWrap}>📧</div>
        <div style={styles.badge}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          Verify OTP
        </div>

        <h1 style={styles.heading}>Check your email</h1>
        <p style={styles.subHeading}>
          A 6-digit verification code has been sent to:
        </p>
        <div style={styles.emailHint}>
          <strong style={styles.emailStrong}>{maskedEmail}</strong>
          <br />
          Valid for <strong style={{ color: '#f1f5f9' }}>10 minutes</strong> · Do not share with anyone
        </div>

        {devOtp && (
          <div style={{
            background: 'rgba(234,179,8,0.1)',
            border: '1px solid rgba(234,179,8,0.35)',
            borderRadius: '10px', padding: '12px 16px',
            marginBottom: '20px', fontSize: '13px', color: '#fde047',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>🛠 <strong>DEV MODE</strong> — OTP: <strong style={{ letterSpacing: '4px', fontSize: '16px' }}>{devOtp}</strong></span>
            <button
              onClick={() => {
                const d = devOtp.split('')
                setDigits(d)
                inputRefs.current[5]?.focus()
              }}
              style={{
                background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)',
                borderRadius: '6px', padding: '4px 10px', color: '#fde047',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              }}
            >Auto-fill</button>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <form onSubmit={handleVerify}>
          <div style={styles.otpRow} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  ...styles.otpBox,
                  border: d
                    ? '1px solid rgba(99,102,241,0.6)'
                    : '1px solid rgba(99,102,241,0.2)',
                  boxShadow: d ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                }}
                onFocus={e => {
                  e.target.style.border = '1px solid rgba(99,102,241,0.7)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'
                }}
                onBlur={e => {
                  e.target.style.border = d
                    ? '1px solid rgba(99,102,241,0.6)'
                    : '1px solid rgba(99,102,241,0.2)'
                  e.target.style.boxShadow = d ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none'
                }}
              />
            ))}
          </div>

          <div style={styles.timerRow}>
            {timer > 0 ? (
              <>Resend OTP in <span style={styles.timerSpan}>0:{String(timer).padStart(2, '0')}</span></>
            ) : resendCount >= 3 ? (
              <span style={{ color: '#ef4444' }}>Maximum resend limit reached. Please restart login.</span>
            ) : (
              <button type="button" style={styles.resendBtn} onClick={handleResend}>
                Resend OTP
              </button>
            )}
          </div>

          <button
            type="submit"
            style={{
              ...styles.verifyBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? (
              <><Spinner /> Verifying...</>
            ) : (
              '✓ Verify & Sign In'
            )}
          </button>
        </form>

        <p style={styles.backLink}>
          <a style={styles.backA} href="#" onClick={e => { e.preventDefault(); navigate('/login') }}>
            ← Back to login
          </a>
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: '16px', height: '16px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}
