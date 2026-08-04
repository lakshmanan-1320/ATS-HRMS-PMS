import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel']
const DEFAULTS = { idleTimeoutMinutes: 30, warnBeforeExpiryMinutes: 5, extendOnActivity: true }

let _cachedSettings = null

async function loadSettings() {
  if (!sessionStorage.getItem('sa_token')) {
    _cachedSettings = null
    return DEFAULTS
  }
  if (_cachedSettings) return _cachedSettings
  try {
    const token = sessionStorage.getItem('sa_token')
    const { data } = await axios.get('/api/settings/session-timeout', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    })
    _cachedSettings = data
    return data
  } catch {
    return DEFAULTS
  }
}

function fmt(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

function removeOverlay() {
  document.getElementById('__session_warn__')?.remove()
}

function showOverlay(totalSecs, onStay, onLogoutNow) {
  removeOverlay()
  let remaining = totalSecs

  const div = document.createElement('div')
  div.id = '__session_warn__'
  div.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999',
    'background:rgba(15,23,42,0.75)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'backdrop-filter:blur(4px)',
  ].join(';')

  div.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:40px 36px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.35);">
      <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ef4444);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 8px 24px rgba(239,68,68,0.35);">⏱</div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#0f172a;">Session Expiring Soon</h2>
      <p style="margin:0 0 20px;font-size:13px;color:#64748b;line-height:1.6;">Due to inactivity, you will be automatically logged out in</p>
      <div id="__session_countdown__" style="font-size:52px;font-weight:900;color:#ef4444;letter-spacing:-2px;margin-bottom:28px;font-variant-numeric:tabular-nums;">${fmt(remaining)}</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="__session_logout_btn__" style="padding:11px 24px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;">Logout Now</button>
        <button id="__session_stay_btn__" style="padding:11px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);font-size:13px;font-weight:700;color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,0.4);">Stay Logged In</button>
      </div>
    </div>
  `

  document.body.appendChild(div)

  const iv = setInterval(() => {
    remaining = Math.max(0, remaining - 1)
    const el = document.getElementById('__session_countdown__')
    if (el) el.textContent = fmt(remaining)
  }, 1000)

  document.getElementById('__session_stay_btn__').onclick = () => { clearInterval(iv); onStay() }
  document.getElementById('__session_logout_btn__').onclick = () => { clearInterval(iv); onLogoutNow() }

  return iv
}

export default function useInactivityLogout() {
  const navigate = useNavigate()
  const idleTimerRef = useRef(null)
  const warnTimerRef = useRef(null)
  const countdownIvRef = useRef(null)
  const resetFnRef = useRef(null)

  useEffect(() => {
    if (!sessionStorage.getItem('sa_token')) return

    let active = true

    function doLogout() {
      removeOverlay()
      clearInterval(countdownIvRef.current)
      sessionStorage.clear()
      _cachedSettings = null
      navigate('/login', { replace: true })
    }

    loadSettings().then(settings => {
      if (!active || !sessionStorage.getItem('sa_token')) return
      if (settings.idleTimeoutMinutes === 0) return

      const totalMs = settings.idleTimeoutMinutes * 60 * 1000
      const warnMs = Math.min(
        settings.warnBeforeExpiryMinutes * 60 * 1000,
        totalMs - 60_000
      )
      const warnSecs = Math.floor(warnMs / 1000)

      function reset() {
        clearTimeout(idleTimerRef.current)
        clearTimeout(warnTimerRef.current)
        clearInterval(countdownIvRef.current)
        removeOverlay()

        if (warnMs >= 60_000) {
          warnTimerRef.current = setTimeout(() => {
            countdownIvRef.current = showOverlay(warnSecs, reset, doLogout)
          }, totalMs - warnMs)
        }

        idleTimerRef.current = setTimeout(doLogout, totalMs)
      }

      resetFnRef.current = reset

      if (settings.extendOnActivity !== false) {
        EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
      }
      reset()
    })

    return () => {
      active = false
      clearTimeout(idleTimerRef.current)
      clearTimeout(warnTimerRef.current)
      clearInterval(countdownIvRef.current)
      removeOverlay()
      if (resetFnRef.current) {
        EVENTS.forEach(e => window.removeEventListener(e, resetFnRef.current))
        resetFnRef.current = null
      }
    }
  }, [navigate])
}
