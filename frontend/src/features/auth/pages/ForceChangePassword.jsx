import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// ── SVG Icons ─────────────────────────────────────────────────
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
const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)
const KeyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
)
const FingerPrintIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
    <path d="M5 19.5C5.5 18 6 15 6 12c0-1.7.7-3.3 1.8-4.5"/>
    <path d="M17.5 21a16.05 16.05 0 0 0 1.4-5"/>
    <path d="M22 12a10 10 0 0 1-.2 2"/>
    <path d="M12 12c0-2 .7-3.8 2-5"/>
    <path d="M12 12v4c0 1 .2 2.5.8 3.5"/>
    <path d="M9 12c0 .6-.1 1.2-.2 1.7"/>
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

  .fcp-wrap  { animation: fadeUp .5s cubic-bezier(.22,.68,0,1.15) both; }
  .fcp-feat  { animation: slideLeft .42s ease both; opacity:0; }
  .fcp-feat:nth-child(1){ animation-delay:.08s; }
  .fcp-feat:nth-child(2){ animation-delay:.18s; }
  .fcp-feat:nth-child(3){ animation-delay:.28s; }

  .fcp-feat-row { transition: transform .18s, box-shadow .18s; }
  .fcp-feat-row:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 18px rgba(79,70,229,.1) !important;
  }

  .fcp-input {
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .fcp-input:focus {
    outline: none;
    border-color: #4f46e5 !important;
    background: #fff !important;
    box-shadow: 0 0 0 3.5px rgba(79,70,229,.13) !important;
  }
  .fcp-input::placeholder { color: #b0bac7; }

  .fcp-btn {
    transition: transform .18s, box-shadow .18s;
    animation: pulseBtn 2.8s ease-in-out 1s infinite;
  }
  .fcp-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 14px 32px rgba(79,70,229,.45) !important;
    animation: none;
  }
  .fcp-btn:active:not(:disabled) { transform: translateY(0); }

  @media (max-width: 860px) {
    .fcp-left-panel { display: none !important; }
    .fcp-outer { padding: 24px 16px !important; }
  }
`

const SECURITY_TIPS = [
  { Icon: ShieldIcon,      color:'#4f46e5', bg:'rgba(79,70,229,.09)',  border:'rgba(79,70,229,.2)',  title:'Strong Password',    desc:'Use a mix of letters, numbers, and symbols for maximum security'     },
  { Icon: KeyIcon,         color:'#7c3aed', bg:'rgba(124,58,237,.09)', border:'rgba(124,58,237,.2)', title:'Keep it Private',    desc:'Never share your password with anyone, including support staff'      },
  { Icon: FingerPrintIcon, color:'#059669', bg:'rgba(5,150,105,.09)',  border:'rgba(5,150,105,.2)',  title:'Stay Secure',        desc:'Your account is protected with role-based access control'           },
]

const TRUST = [
  { Icon: LockSmIcon,  label:'256-bit SSL' },
  { Icon: ServerIcon,  label:'SOC 2'       },
  { Icon: GlobeIcon,   label:'GDPR Safe'   },
]

export default function ForceChangePassword() {
  const navigate = useNavigate()
  const token = sessionStorage.getItem('sa_token') || ''
  const role = sessionStorage.getItem('user_role') || ''
  const isRequired = sessionStorage.getItem('password_reset_required') === 'true'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [focused, setFocused] = useState(null)

  useEffect(() => {
    if (!token || !isRequired) {
      navigate('/login')
    }
  }, [token, isRequired])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Please enter your current temporary password.')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as the temporary password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(res.data.message || 'Password changed successfully!')
      sessionStorage.removeItem('password_reset_required')

      setTimeout(() => {
        if (role === 'client_admin') {
          navigate('/client-admin/dashboard', { replace: true })
        } else if (role === 'super_admin') {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/employee/dashboard', { replace: true })
        }
      }, 2000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
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

      {/* ══════ LEFT — SECURITY PANEL ══════ */}
      <div className="fcp-left-panel" style={{
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
              Account Security
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'42px', fontWeight:'900', lineHeight:1.12,
            letterSpacing:'-1.2px', marginBottom:'16px', color:'#0f172a',
          }}>
            Secure Your<br/>Account Today.<br/>
            <span style={{
              background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>Stay Protected.</span>
          </h1>
          <p style={{ fontSize:'15px', color:'#64748b', lineHeight:1.75, marginBottom:'44px', maxWidth:'400px' }}>
            Set a strong personal password to protect your account and keep your data secure.
          </p>

          {/* Security tip rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
            {SECURITY_TIPS.map(({ Icon, color, bg, border, title, desc }, i) => (
              <div key={i} className="fcp-feat fcp-feat-row" style={{
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

          {/* Password rules */}
          <div style={{
            marginTop:'32px', paddingTop:'24px',
            borderTop:'1px solid rgba(79,70,229,.13)',
          }}>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'12px' }}>
              Password Requirements
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
              {[
                'At least 8 characters long',
                'Different from your temporary password',
                'Passwords must match',
              ].map((rule, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ color:'#4f46e5', flexShrink:0 }}><CheckIcon/></span>
                  <span style={{ fontSize:'12.5px', color:'#64748b' }}>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ RIGHT — FORM PANEL ══════ */}
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
        {/* Inner glows */}
        <div style={{
          position:'absolute', top:'-40px', right:'-40px',
          width:'200px', height:'200px', borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%)',
        }}/>
        <div style={{
          position:'absolute', bottom:'-40px', left:'-40px',
          width:'180px', height:'180px', borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle,rgba(124,58,237,.06) 0%,transparent 70%)',
        }}/>

        <div style={{ position:'relative', zIndex:1 }}>

          {/* Lock icon */}
          <div style={{ marginBottom:'28px', display:'flex', justifyContent:'center' }}>
            <div style={{
              width:'88px', height:'88px', borderRadius:'20px',
              background:'linear-gradient(135deg,#eef2ff,#ede9fe)',
              border:'1.5px solid rgba(79,70,229,.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 20px rgba(79,70,229,.1)',
            }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2.5"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
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
              First Login Required
            </span>
          </div>

          <h1 style={{
            fontSize:'28px', fontWeight:'800', color:'#0f172a',
            letterSpacing:'-0.5px', lineHeight:1.2, marginBottom:'6px',
          }}>Change Password</h1>
          <p style={{ fontSize:'13.5px', color:'#64748b', marginBottom:'28px', lineHeight:1.65 }}>
            For security reasons, you must update your temporary password before accessing your account.
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

          {/* Success */}
          {success && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:'9px',
              background:'#f0fdf4', border:'1px solid #bbf7d0',
              borderRadius:'12px', padding:'12px 14px', marginBottom:'20px',
            }}>
              <span style={{ color:'#16a34a', flexShrink:0, marginTop:'1px' }}><CheckIcon/></span>
              <span style={{ fontSize:'13px', color:'#15803d', lineHeight:1.5 }}>{success} Loading your dashboard...</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} autoComplete="off">

              {/* Temporary Password */}
              <div style={{ marginBottom:'16px' }}>
                <label style={{
                  display:'block', fontSize:'11px', fontWeight:'700',
                  color:'#475569', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'7px',
                }}>Temporary Password</label>
                <div style={{ position:'relative' }}>
                  <span style={{
                    position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                    color: focused === 'current' ? '#4f46e5' : '#b0bac7',
                    transition:'color .15s', pointerEvents:'none', display:'flex',
                  }}><LockIcon/></span>
                  <input
                    className="fcp-input"
                    id="currentPassword"
                    type="password"
                    placeholder="Enter temporary password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    onFocus={() => setFocused('current')}
                    onBlur={() => setFocused(null)}
                    style={{
                      width:'100%', padding:'13px 14px 13px 44px',
                      background: focused === 'current' ? '#fff' : '#f8fafc',
                      border:`1.5px solid ${focused === 'current' ? '#4f46e5' : '#e2e8f0'}`,
                      borderRadius:'12px', fontSize:'14px', color:'#0f172a',
                      fontFamily:'inherit', boxSizing:'border-box',
                    }}
                  />
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom:'16px' }}>
                <label style={{
                  display:'block', fontSize:'11px', fontWeight:'700',
                  color:'#475569', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'7px',
                }}>New Password</label>
                <div style={{ position:'relative' }}>
                  <span style={{
                    position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                    color: focused === 'new' ? '#4f46e5' : '#b0bac7',
                    transition:'color .15s', pointerEvents:'none', display:'flex',
                  }}><LockIcon/></span>
                  <input
                    className="fcp-input"
                    id="newPassword"
                    type={showPass ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    onFocus={() => setFocused('new')}
                    onBlur={() => setFocused(null)}
                    style={{
                      width:'100%', padding:'13px 48px 13px 44px',
                      background: focused === 'new' ? '#fff' : '#f8fafc',
                      border:`1.5px solid ${focused === 'new' ? '#4f46e5' : '#e2e8f0'}`,
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

              {/* Confirm Password */}
              <div style={{ marginBottom:'28px' }}>
                <label style={{
                  display:'block', fontSize:'11px', fontWeight:'700',
                  color:'#475569', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'7px',
                }}>Confirm New Password</label>
                <div style={{ position:'relative' }}>
                  <span style={{
                    position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                    color: focused === 'confirm' ? '#4f46e5' : '#b0bac7',
                    transition:'color .15s', pointerEvents:'none', display:'flex',
                  }}><LockIcon/></span>
                  <input
                    className="fcp-input"
                    id="confirmPassword"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                    style={{
                      width:'100%', padding:'13px 14px 13px 44px',
                      background: focused === 'confirm' ? '#fff' : '#f8fafc',
                      border:`1.5px solid ${focused === 'confirm' ? '#4f46e5' : '#e2e8f0'}`,
                      borderRadius:'12px', fontSize:'14px', color:'#0f172a',
                      fontFamily:'inherit', boxSizing:'border-box',
                    }}
                  />
                </div>
              </div>

              {/* CTA */}
              <button
                className="fcp-btn"
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
                  {loading ? <><Spinner/>Updating password…</> : <><span>Update &amp; Proceed</span><ArrowRightIcon/></>}
                </span>
              </button>
            </form>
          )}

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
