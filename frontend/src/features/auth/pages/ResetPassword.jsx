import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

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
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', bottom: '-10%', left: '-5%',
    width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(15,23,42,0.85)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '24px', width: '100%', maxWidth: '440px',
    padding: '48px 40px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
    position: 'relative', zIndex: 1,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '20px', padding: '4px 12px',
    fontSize: '11px', fontWeight: '600',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#a5b4fc', marginBottom: '24px',
  },
  dot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: '#6366f1', boxShadow: '0 0 6px #6366f1',
  },
  heading: {
    fontSize: '28px', fontWeight: '800', color: '#f1f5f9',
    lineHeight: '1.2', marginBottom: '8px', letterSpacing: '-0.5px',
  },
  subHeading: {
    fontSize: '14px', color: '#64748b', marginBottom: '28px', lineHeight: '1.6',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '8px',
  },
  inputWrap: {
    position: 'relative', marginBottom: '20px',
  },
  input: {
    width: '100%', padding: '14px 16px',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '12px', fontSize: '15px',
    color: '#f1f5f9', outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute', right: '14px', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer',
    color: '#64748b', fontSize: '18px', padding: '4px',
  },
  btn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: 'none', borderRadius: '12px',
    fontSize: '15px', fontWeight: '700', color: '#fff',
    cursor: 'pointer', letterSpacing: '0.02em',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  backLink: {
    textAlign: 'center', marginTop: '24px', fontSize: '13px',
  },
  backA: {
    color: '#6366f1', fontWeight: '500', cursor: 'pointer', textDecoration: 'none',
  },
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
    <div style={styles.page}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.card}>
        <div style={styles.badge}>
          <span style={styles.dot} />
          New Credentials
        </div>

        <h1 style={styles.heading}>Reset password</h1>
        <p style={styles.subHeading}>
          Enter the 6-digit verification code sent to {maskedEmail || 'your email'} and choose a new password.
        </p>

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
              onClick={() => setOtp(devOtp)}
              style={{
                background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)',
                borderRadius: '6px', padding: '4px 10px', color: '#fde047',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              }}
            >Use Code</button>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success} Redirecting to login page...</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div style={styles.inputWrap}>
              <label style={styles.label} htmlFor="otp">Verification Code (6 digits)</label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ ...styles.input, textAlign: 'center', letterSpacing: '8px', fontSize: '18px', fontWeight: '700' }}
                onFocus={e => {
                  e.target.style.border = '1px solid rgba(99,102,241,0.6)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                }}
                onBlur={e => {
                  e.target.style.border = '1px solid rgba(99,102,241,0.2)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={styles.inputWrap}>
              <label style={styles.label} htmlFor="newPassword">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ ...styles.input, paddingRight: '48px' }}
                  onFocus={e => {
                    e.target.style.border = '1px solid rgba(99,102,241,0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.border = '1px solid rgba(99,102,241,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={styles.inputWrap}>
              <label style={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type={showPass ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={styles.input}
                onFocus={e => {
                  e.target.style.border = '1px solid rgba(99,102,241,0.6)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                }}
                onBlur={e => {
                  e.target.style.border = '1px solid rgba(99,102,241,0.2)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.btn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              disabled={loading}
            >
              {loading ? (
                <><Spinner /> Resetting password...</>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

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
