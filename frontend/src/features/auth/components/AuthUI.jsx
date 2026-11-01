import React from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiTool } from 'react-icons/fi'

/*
 * Auth pages (login / OTP / password) — implements the Figma "Desktop - 1" login
 * frame (PMS file, node 5:2): dark #050912 canvas, blue glows + glass stars,
 * "Your People, Your Performance / One Platform" headline and a dark #060E22 card.
 * Fonts: Bricolage Grotesque (headings) + Sora (body).
 */

export const AUTH = {
  bg: '#050912',
  card: '#060E22',
  field: '#1B2B47',
  fieldBorder: 'rgba(143,166,214,0.28)',
  icon: '#8FA6D6',
  label: '#D7D7D7',
  sub: '#B1B1B1',
  placeholder: '#7E93BD',
  hint: '#6F86B3',
  link: '#5B8CFF',
  btn: 'linear-gradient(161deg, #2663FF 23.6%, #0E3BB1 131.1%)',
  head: "'Bricolage Grotesque', 'Poppins', sans-serif",
  body: "'Sora', 'Inter', sans-serif",
}

const CSS = `
  @keyframes pmsSpin { to { transform: rotate(360deg); } }
  .pms-auth-input { transition: box-shadow .15s, background .15s, border-color .15s; }
  .pms-auth-input:hover { border-color: rgba(143,166,214,0.45) !important; }
  .pms-auth-input::placeholder { color: ${AUTH.placeholder}; }
  .pms-auth-input:focus { outline: none; background: #20345A !important; border-color: #2663FF !important; box-shadow: 0 0 0 3px rgba(38,99,255,.30) !important; }
  .pms-auth-btn { transition: transform .18s, box-shadow .18s, filter .18s; }
  .pms-auth-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); box-shadow: 0 10px 26px rgba(38,99,255,.35); }
  .pms-auth-link { color: ${AUTH.link}; font-weight: 400; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; }
  .pms-auth-link:hover { text-decoration: underline; }

  .pms-auth-page { position: relative; min-height: 100vh; overflow: hidden; background: ${AUTH.bg}; font-family: ${AUTH.body}; color: #fff; }
  .pms-auth-deco { position: absolute; pointer-events: none; display: flex; align-items: center; justify-content: center; }
  .pms-auth-headline { position: absolute; left: calc(37.5% - 393.87px); top: 151px; z-index: 1; }
  .pms-auth-card {
    position: absolute; left: calc(62.5% - 15px); top: clamp(300px, 36.5vh, 374px); transform: translateX(-50%); z-index: 2;
    width: 512px; box-sizing: border-box; background: ${AUTH.card}; border-radius: 16px; padding: 40px 30px;
  }
  @media (max-width: 1100px) {
    .pms-auth-headline { left: 48px; top: 64px; }
    .pms-auth-headline p { font-size: 44px !important; line-height: 54px !important; }
    .pms-auth-card { left: 50%; top: 240px; }
  }
  @media (max-width: 600px) {
    .pms-auth-page { padding: 40px 16px 32px; }
    .pms-auth-headline { position: relative; left: 0; top: 0; margin-bottom: 28px; }
    .pms-auth-headline p { font-size: 32px !important; line-height: 40px !important; white-space: normal !important; }
    .pms-auth-card { position: relative; left: 0; top: 0; transform: none; width: 100%; padding: 32px 20px; }
    .pms-auth-deco-hide-sm { display: none !important; }
  }
`


const STAR_PATH = 'M151.466 5.87666C154.365 -1.9589 165.448 -1.95888 168.347 5.87668L206.234 108.263C207.145 110.726 209.087 112.668 211.551 113.58L313.937 151.466C321.772 154.365 321.772 165.448 313.937 168.347L211.551 206.234C209.087 207.145 207.145 209.087 206.234 211.551L168.347 313.937C165.448 321.772 154.365 321.772 151.466 313.937L113.58 211.551C112.668 209.087 110.726 207.145 108.263 206.234L5.87666 168.347C-1.9589 165.448 -1.95888 154.365 5.87668 151.466L108.263 113.58C110.726 112.668 112.668 110.726 113.58 108.263L151.466 5.87666Z'

/** Frosted-glass star (Figma "Star 1/2": 20% black fill + background blur + light edge). */
function GlassStar({ size }) {
  const scale = size / 319.813
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 319.813, height: 319.813, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <div style={{
          position: 'absolute', inset: 0, clipPath: `path('${STAR_PATH}')`,
          backdropFilter: 'blur(22px) saturate(1.25)', WebkitBackdropFilter: 'blur(22px) saturate(1.25)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.22) 100%)',
        }} />
        <svg width="319.813" height="319.813" viewBox="0 0 319.813 319.813" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <linearGradient id={`starEdge${Math.round(size)}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="1" stopColor="#9DB8FF" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <path d={STAR_PATH} fill="black" fillOpacity="0.2" stroke={`url(#starEdge${Math.round(size)})`} strokeWidth={1.4 / scale} />
        </svg>
      </div>
    </div>
  )
}

export function AuthLayout({ children }) {
  return (
    <div className="pms-auth-page">
      <style>{CSS}</style>

      {/* Blue glows (rotated, as in Figma) */}
      <div className="pms-auth-deco" aria-hidden style={{ left: 'calc(16.67% + 70.79px)', top: 114.86, width: 832.43, height: 815.27 }}>
        <div style={{ transform: 'rotate(39.25deg)', flex: 'none' }}>
          <div style={{ position: 'relative', width: 646, height: 525 }}>
            <img src="/pms/login/glow-left.svg" alt="" style={{ position: 'absolute', inset: '-8.06% -6.55% -12.07% -6.55%', width: 'calc(100% + 13.1%)', height: 'calc(100% + 20.13%)', maxWidth: 'none' }} />
          </div>
        </div>
      </div>
      <div className="pms-auth-deco" aria-hidden style={{ left: 'calc(58.33% + 3.62px)', top: 533.91, width: 502.75, height: 513.2 }}>
        <div style={{ transform: 'rotate(-50.73deg)', flex: 'none' }}>
          <div style={{ position: 'relative', width: 398, height: 324 }}>
            <img src="/pms/login/glow-right.svg" alt="" style={{ position: 'absolute', inset: '-24.07% -19.6%', width: 'calc(100% + 39.2%)', height: 'calc(100% + 48.14%)', maxWidth: 'none' }} />
          </div>
        </div>
      </div>

      {/* Glass stars */}
      <div className="pms-auth-deco pms-auth-deco-hide-sm" aria-hidden style={{ left: 'calc(16.67% + 60px)', top: 315.51, width: 493.21, height: 493.21 }}>
        <div style={{ transform: 'rotate(-35.42deg)', flex: 'none' }}>
          <div style={{ position: 'relative', width: 353.68, height: 353.68, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlassStar size={319.81} />
          </div>
        </div>
      </div>
      <div className="pms-auth-deco pms-auth-deco-hide-sm" aria-hidden style={{ left: 'calc(33.33% + 49px)', top: 413.51, width: 78.81, height: 78.81 }}>
        <div style={{ transform: 'rotate(-35.42deg)', flex: 'none' }}>
          <div style={{ position: 'relative', width: 56.52, height: 56.52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlassStar size={45.22} />
          </div>
        </div>
      </div>

      {/* Headline */}
      <div className="pms-auth-headline">
        <p style={{
          margin: 0, fontFamily: AUTH.head, fontWeight: 600, fontSize: 60, lineHeight: '72px', whiteSpace: 'nowrap',
          backgroundImage: 'linear-gradient(90deg, #FFFFFF 0%, #999999 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          WebkitMaskImage: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, #000 12%, #000 82%, rgba(0,0,0,0.6) 100%)',
          maskImage: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, #000 12%, #000 82%, rgba(0,0,0,0.6) 100%)',
        }}>
          Your People, Your Performance
        </p>
        <p style={{
          margin: 0, fontFamily: AUTH.head, fontWeight: 600, fontSize: 60, lineHeight: '72px', whiteSpace: 'nowrap',
          backgroundImage: 'linear-gradient(90deg, #759BF9 0%, #173C99 67.8%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          One Platform
        </p>
      </div>

      {/* Card */}
      <div className="pms-auth-card">{children}</div>
    </div>
  )
}

export function AuthHeading({ title, subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 32, textAlign: 'center' }}>
      <div style={{
        fontFamily: AUTH.head, fontWeight: 700, fontSize: 40, lineHeight: '48px',
        backgroundImage: 'linear-gradient(94.7deg, #FFFFFF 0.7%, #999999 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      }}>{title}</div>
      {subtitle && <div style={{ fontFamily: AUTH.body, fontWeight: 300, fontSize: 14, lineHeight: '21px', color: AUTH.sub }}>{subtitle}</div>}
    </div>
  )
}

export function AuthLabel({ htmlFor, children }) {
  return <label htmlFor={htmlFor} style={{ display: 'block', fontFamily: AUTH.body, fontWeight: 400, fontSize: 14, lineHeight: '21px', color: '#E6ECF7', marginBottom: 8 }}>{children}</label>
}

const ICON_SRC = { mail: '/pms/login/icon-mail.svg', lock: '/pms/login/icon-lock.svg' }

/** Dark Figma input. `icon` may be 'mail' | 'lock' (Figma assets) or a react-icons component. */
export const AuthInput = React.forwardRef(function AuthInput({ icon, right, style, ...props }, ref) {
  const Icon = typeof icon === 'function' || typeof icon === 'object' ? icon : null
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AUTH.icon, pointerEvents: 'none', zIndex: 1 }}>
          {ICON_SRC[icon] ? <img src={ICON_SRC[icon]} alt="" width="22" height="22" style={{ filter: 'brightness(0) invert(0.72) sepia(0.35) hue-rotate(185deg) saturate(1.6)' }} /> : Icon ? <Icon size={17} /> : null}
        </span>
      )}
      <input
        ref={ref}
        className="pms-auth-input"
        {...props}
        style={{
          width: '100%', height: 46, padding: `0 ${right ? 44 : 14}px 0 ${icon ? 44 : 14}px`, boxSizing: 'border-box',
          background: AUTH.field, border: `1px solid ${AUTH.fieldBorder}`, borderRadius: 8,
          fontFamily: AUTH.body, fontWeight: 400, fontSize: 13.5, color: '#FFFFFF', ...style,
        }}
      />
      {right && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', zIndex: 1 }}>{right}</span>}
    </div>
  )
})

export function EyeToggle({ shown, onToggle, Eye, EyeOff }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? 'Hide password' : 'Show password'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: AUTH.icon, padding: 4, display: 'flex' }}>
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

/** Compact gradient button from the Figma (centered, 4px radius). */
export function AuthButton({ loading, loadingText, children, style, ...props }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        className="pms-auth-btn"
        disabled={loading || props.disabled}
        {...props}
        style={{
          minWidth: 120, height: 37, padding: '0 24px', border: 'none', borderRadius: 4,
          backgroundImage: AUTH.btn, color: '#FFFFFF', opacity: loading ? 0.75 : 1,
          fontFamily: AUTH.body, fontWeight: 400, fontSize: 14, lineHeight: '21px',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style,
        }}
      >
        {loading ? <><Spinner /> {loadingText}</> : children}
      </button>
    </div>
  )
}

const TONES = {
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#FCA5A5', icon: FiAlertCircle },
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', color: '#86EFAC', icon: FiCheckCircle },
  info: { bg: 'rgba(38,99,255,0.12)', border: 'rgba(38,99,255,0.35)', color: '#C9DDF3', icon: FiInfo },
  dev: { bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.35)', color: '#FDE047', icon: FiTool },
}

export function AuthAlert({ tone = 'info', children, action }) {
  const t = TONES[tone]
  const Icon = t.icon
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 18 }}>
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontFamily: AUTH.body, fontSize: 12.5, color: t.color, lineHeight: 1.5 }}>
        <Icon size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{children}</span>
      </span>
      {action}
    </div>
  )
}

export function AuthBackLink({ onClick, children }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 18, fontFamily: AUTH.body, fontSize: 12 }}>
      <button type="button" className="pms-auth-link" onClick={onClick}>{children}</button>
    </div>
  )
}

export function AuthHint({ children }) {
  return <div style={{ marginTop: 16, textAlign: 'center', fontFamily: AUTH.body, fontWeight: 300, fontSize: 10, lineHeight: '15px', color: AUTH.hint }}>{children}</div>
}

export function Spinner() {
  return <span style={{ display: 'inline-block', width: 14, height: 14, flexShrink: 0, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'pmsSpin .65s linear infinite' }} />
}
