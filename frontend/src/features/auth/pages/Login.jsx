import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// ── SVG Icons ─────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2.5"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const LockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2.5"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const DollarIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const ShieldCheckIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
)
const LockSmIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const ServerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/>
    <line x1="6" y1="18" x2="6.01" y2="18"/>
  </svg>
)
const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

// ── Animations ────────────────────────────────────────────────
const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes floatA {
    0%,100% { transform: translate(0,0) scale(1); }
    40% { transform: translate(28px,-22px) scale(1.05); }
    70% { transform: translate(-16px,16px) scale(0.96); }
  }
  @keyframes floatB {
    0%,100% { transform: translate(0,0); }
    50% { transform: translate(-22px,18px) scale(1.06); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes slideLeft {
    from { opacity:0; transform:translateX(-20px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -300% center; }
    100% { background-position:  300% center; }
  }
  @keyframes dotBlink {
    0%,100% { opacity:1; }
    50%     { opacity:.3; }
  }
  @keyframes pulseBtn {
    0%  { box-shadow: 0 6px 20px rgba(79,70,229,.38); }
    50% { box-shadow: 0 6px 28px rgba(79,70,229,.55); }
    100%{ box-shadow: 0 6px 20px rgba(79,70,229,.38); }
  }

  .lf-wrap  { animation: fadeUp .5s cubic-bezier(.22,.68,0,1.15) both; }
  .lf-feat  { animation: slideLeft .42s ease both; opacity:0; }
  .lf-feat:nth-child(1){ animation-delay:.08s; }
  .lf-feat:nth-child(2){ animation-delay:.18s; }
  .lf-feat:nth-child(3){ animation-delay:.28s; }
  .lf-feat:nth-child(4){ animation-delay:.38s; }

  .lf-feat-row { transition: transform .18s, box-shadow .18s; }
  .lf-feat-row:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 18px rgba(79,70,229,.1) !important;
  }

  .lf-input {
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .lf-input:focus {
    outline: none;
    border-color: #4f46e5 !important;
    background: #fff !important;
    box-shadow: 0 0 0 3.5px rgba(79,70,229,.13) !important;
  }
  .lf-input::placeholder { color: #b0bac7; }

  .lf-btn {
    transition: transform .18s, box-shadow .18s;
    animation: pulseBtn 2.8s ease-in-out 1s infinite;
  }
  .lf-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 14px 32px rgba(79,70,229,.45) !important;
    animation: none;
  }
  .lf-btn:active:not(:disabled) { transform: translateY(0); }

  @media (max-width: 860px) {
    .lf-left-panel { display: none !important; }
    .lf-outer { padding: 24px 16px !important; }
  }
`

const FEATURES = [
  { Icon: ClockIcon,      color:'#4f46e5', bg:'rgba(79,70,229,.09)',  border:'rgba(79,70,229,.2)',  title:'Smart Attendance',   desc:'Real-time punch-in/out with geo-tagging & shift tracking'         },
  { Icon: DollarIcon,     color:'#059669', bg:'rgba(5,150,105,.09)',  border:'rgba(5,150,105,.2)',  title:'Automated Payroll',  desc:'One-click payslip generation with tax & compliance handling'      },
  { Icon: CalendarIcon,   color:'#d97706', bg:'rgba(217,119,6,.09)',  border:'rgba(217,119,6,.2)',  title:'Leave Management',   desc:'Approve/reject leaves with auto balance & calendar sync'          },
  { Icon: ShieldCheckIcon,color:'#7c3aed', bg:'rgba(124,58,237,.09)', border:'rgba(124,58,237,.2)', title:'Role-based Access',  desc:'Secure multi-tier access — Admin, Client Admin & Employee'        },
]

const TRUST = [
  { Icon: LockSmIcon,  label:'256-bit SSL' },
  { Icon: ServerIcon,  label:'SOC 2'       },
  { Icon: GlobeIcon,   label:'GDPR Safe'   },
]

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [focused,  setFocused]  = useState(null)
  const [logo,     setLogo]     = useState(null)
  const submittingRef = React.useRef(false)

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
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      <style>{CSS}</style>

      {/* ══════ LEFT — FEATURES PANEL (full height) ══════ */}
      <div className="lf-left-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 64px',
        background: 'linear-gradient(145deg,#eef2ff 0%,#f5f0ff 100%)',
        borderRight: '1px solid rgba(79,70,229,.12)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position:'absolute', top:'-12%', right:'-8%',
          width:'420px', height:'420px', borderRadius:'50%',
          background:'radial-gradient(circle,rgba(99,102,241,.14) 0%,transparent 65%)',
          animation:'floatA 14s ease-in-out infinite', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', bottom:'-10%', left:'-6%',
          width:'380px', height:'380px', borderRadius:'50%',
          background:'radial-gradient(circle,rgba(124,58,237,.11) 0%,transparent 65%)',
          animation:'floatB 18s ease-in-out infinite', pointerEvents:'none',
        }}/>
        {/* Decorative rings */}
        <div style={{
          position:'absolute', top:'-80px', right:'-80px',
          width:'320px', height:'320px', borderRadius:'50%',
          border:'50px solid rgba(79,70,229,.06)', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', bottom:'-50px', left:'-50px',
          width:'220px', height:'220px', borderRadius:'50%',
          border:'36px solid rgba(124,58,237,.06)', pointerEvents:'none',
        }}/>
        {/* Dot grid */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'radial-gradient(circle,rgba(79,70,229,.06) 1.5px,transparent 1.5px)',
          backgroundSize:'28px 28px',
        }}/>

        {/* Content */}
        <div style={{ position:'relative', zIndex:1, maxWidth:'540px' }}>
          {/* Platform badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'7px',
            background:'rgba(79,70,229,.1)', border:'1px solid rgba(79,70,229,.2)',
            borderRadius:'20px', padding:'5px 14px', marginBottom:'36px',
          }}>
            <span style={{
              display:'inline-block', width:'7px', height:'7px', borderRadius:'50%',
              background:'#4f46e5', animation:'dotBlink 2s ease-in-out infinite',
            }}/>
            <span style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'.09em', textTransform:'uppercase', color:'#4f46e5' }}>
              HR &amp; Payroll Platform
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'46px', fontWeight:'900', lineHeight:1.12,
            letterSpacing:'-1.2px', marginBottom:'16px', color:'#0f172a',
          }}>
            Your People.<br/>Your Performance.<br/>
            <span style={{
              background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>One Platform.</span>
          </h1>
          <p style={{ fontSize:'15.5px', color:'#64748b', lineHeight:1.75, marginBottom:'44px', maxWidth:'400px' }}>
            Streamline HR, payroll, attendance &amp; leave management — all in one intelligent workspace.
          </p>

          {/* Feature rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
            {FEATURES.map(({ Icon, color, bg, border, title, desc }, i) => (
              <div key={i} className="lf-feat lf-feat-row" style={{
                display:'flex', alignItems:'center', gap:'16px',
                background:'rgba(255,255,255,.78)',
                border:`1px solid ${border}`,
                borderRadius:'16px', padding:'14px 18px',
                backdropFilter:'blur(10px)',
                boxShadow:'0 2px 10px rgba(79,70,229,.05)',
              }}>
                <div style={{
                  width:'46px', height:'46px', borderRadius:'12px', flexShrink:0,
                  background:bg, border:`1.5px solid ${border}`,
                  display:'flex', alignItems:'center', justifyContent:'center', color,
                }}><Icon/></div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700', color:'#1e293b', marginBottom:'2px' }}>{title}</div>
                  <div style={{ fontSize:'12.5px', color:'#64748b', lineHeight:1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            marginTop:'44px', paddingTop:'28px',
            borderTop:'1px solid rgba(79,70,229,.13)',
            display:'flex', gap:'40px',
          }}>
            {[['10K+','Employees'],['500+','Companies'],['99.9%','Uptime']].map(([v,l]) => (
              <div key={l}>
                <div style={{
                  fontSize:'26px', fontWeight:'900', letterSpacing:'-0.5px',
                  background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                }}>{v}</div>
                <div style={{ fontSize:'12px', color:'#64748b', fontWeight:'600', marginTop:'3px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ RIGHT — FORM PANEL (full height) ══════ */}
      <div style={{
        width: '460px',
        flexShrink: 0,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        minHeight: '100vh',
        boxShadow: '-8px 0 40px rgba(79,70,229,.08)',
      }}>
        {/* Top gradient accent bar */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:'4px',
          background:'linear-gradient(90deg,#4f46e5,#7c3aed,#6366f1)',
        }}/>
        {/* Inner top-right glow */}
        <div style={{
          position:'absolute', top:'-40px', right:'-40px',
          width:'200px', height:'200px', borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%)',
        }}/>
        {/* Inner bottom-left glow */}
        <div style={{
          position:'absolute', bottom:'-40px', left:'-40px',
          width:'180px', height:'180px', borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle,rgba(124,58,237,.06) 0%,transparent 70%)',
        }}/>

        <div style={{ position:'relative', zIndex:1 }}>

          {/* Company logo */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={logo || '/insight-tech-logo.png'}
              alt="Insight Tech Logo"
              style={{
                height: '52px',
                maxWidth: '220px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* Badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'7px',
            background:'#f0f4ff', border:'1px solid rgba(79,70,229,.22)',
            borderRadius:'20px', padding:'5px 13px', marginBottom:'20px',
          }}>
            <span style={{
              display:'inline-block', width:'7px', height:'7px', borderRadius:'50%',
              background:'#4f46e5', animation:'dotBlink 2s ease-in-out infinite',
            }}/>
            <span style={{ fontSize:'10.5px', fontWeight:'700', letterSpacing:'.09em', textTransform:'uppercase', color:'#4f46e5' }}>
              Secure Sign In
            </span>
          </div>

          <h1 style={{
            fontSize:'28px', fontWeight:'800', color:'#0f172a',
            letterSpacing:'-0.5px', lineHeight:1.2, marginBottom:'6px',
          }}>Welcome back</h1>
          <p style={{ fontSize:'13.5px', color:'#64748b', marginBottom:'32px', lineHeight:1.65 }}>
            Sign in to continue — your role is detected automatically
          </p>

          {/* Error */}
          {error && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:'9px',
              background:'#fef2f2', border:'1px solid #fecaca',
              borderRadius:'12px', padding:'12px 14px', marginBottom:'20px',
            }}>
              <span style={{ color:'#ef4444', flexShrink:0, marginTop:'1px' }}><AlertIcon/></span>
              <span style={{ fontSize:'13px', color:'#dc2626', lineHeight:1.5 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Email */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{
                display:'block', fontSize:'11px', fontWeight:'700',
                color:'#475569', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'7px',
              }}>Email Address</label>
              <div style={{ position:'relative' }}>
                <span style={{
                  position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                  color: focused==='email' ? '#4f46e5' : '#b0bac7',
                  transition:'color .15s', pointerEvents:'none', display:'flex',
                }}><MailIcon/></span>
                <input
                  className="lf-input"
                  id="email" type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  autoComplete="username"
                  style={{
                    width:'100%', padding:'13px 14px 13px 44px',
                    background: focused==='email' ? '#fff' : '#f8fafc',
                    border:`1.5px solid ${focused==='email' ? '#4f46e5' : '#e2e8f0'}`,
                    borderRadius:'12px', fontSize:'14px', color:'#0f172a',
                    fontFamily:'inherit', boxSizing:'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom:'28px' }}>
              <label style={{
                display:'block', fontSize:'11px', fontWeight:'700',
                color:'#475569', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'7px',
              }}>Password</label>
              <div style={{ position:'relative' }}>
                <span style={{
                  position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                  color: focused==='password' ? '#4f46e5' : '#b0bac7',
                  transition:'color .15s', pointerEvents:'none', display:'flex',
                }}><LockIcon/></span>
                <input
                  className="lf-input"
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  autoComplete="current-password"
                  style={{
                    width:'100%', padding:'13px 48px 13px 44px',
                    background: focused==='password' ? '#fff' : '#f8fafc',
                    border:`1.5px solid ${focused==='password' ? '#4f46e5' : '#e2e8f0'}`,
                    borderRadius:'12px', fontSize:'14px', color:'#0f172a',
                    fontFamily:'inherit', boxSizing:'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label="Toggle password visibility"
                  style={{
                    position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'#b0bac7', padding:'4px', display:'flex', alignItems:'center',
                    transition:'color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color='#4f46e5'}
                  onMouseLeave={e => e.currentTarget.style.color='#b0bac7'}
                >
                  {showPass ? <EyeOffIcon/> : <EyeIcon/>}
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              className="lf-btn"
              type="submit"
              disabled={loading}
              style={{
                width:'100%', padding:'15px',
                background: loading
                  ? '#c7d2fe'
                  : 'linear-gradient(135deg,#4f46e5 0%,#6366f1 60%,#7c3aed 100%)',
                border:'none', borderRadius:'13px',
                fontSize:'15px', fontWeight:'700', color:'#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing:'.02em',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                position:'relative', overflow:'hidden',
              }}
            >
              {!loading && (
                <span style={{
                  position:'absolute', inset:0, zIndex:0,
                  background:'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)',
                  backgroundSize:'300% auto',
                  animation:'shimmer 3s linear infinite',
                }}/>
              )}
              <span style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:'8px' }}>
                {loading ? <><Spinner/>Verifying…</> : <><span>Sign In</span><ArrowRightIcon/></>}
              </span>
            </button>
          </form>

          {/* Hint */}
          <p style={{
            marginTop:'18px', textAlign:'center',
            fontSize:'12px', color:'#94a3b8', lineHeight:1.65,
          }}>
            Employees can set a password with OTP if the<br/>temporary password is not available
          </p>

          {/* Security badges */}
          <div style={{
            borderTop:'1px solid #f1f5f9',
            marginTop:'24px', paddingTop:'18px',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'20px',
          }}>
            {TRUST.map(({ Icon, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px', color:'#94a3b8' }}>
                <Icon/>
                <span style={{ fontSize:'11.5px', fontWeight:'600' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display:'inline-block', width:'15px', height:'15px', flexShrink:0,
      border:'2.5px solid rgba(255,255,255,.35)',
      borderTopColor:'#fff', borderRadius:'50%',
      animation:'spin .65s linear infinite',
    }}/>
  )
}
