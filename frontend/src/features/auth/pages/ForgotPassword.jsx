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
    fontSize: '14px', color: '#64748b', marginBottom: '36px', lineHeight: '1.6',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '8px',
  },
  inputWrap: {
    position: 'relative', marginBottom: '24px',
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
}

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
    <div style={styles.page}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.card}>
        <div style={styles.badge}>
          <span style={styles.dot} />
          Reset Password
        </div>

        <h1 style={styles.heading}>Forgot password?</h1>
        <p style={styles.subHeading}>
          Enter your email address and we'll send you an OTP to reset your password.
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputWrap}>
            <label style={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              <><Spinner /> Sending OTP...</>
            ) : (
              'Send Reset Code'
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
