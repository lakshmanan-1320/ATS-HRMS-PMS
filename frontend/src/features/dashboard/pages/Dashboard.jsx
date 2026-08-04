import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const authHdr = () => ({ Authorization: `Bearer ${sessionStorage.getItem('sa_token')}` })

// ─── Formatting helpers ───────────────────────────────────────────────────────
function fmtNum(n) {
  const v = Number(n)
  if (!n && n !== 0) return '—'
  if (isNaN(v)) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString('en-IN')
}

function fmtCurrency(n) {
  const v = Number(n)
  if (isNaN(v)) return '₹0'
  if (v >= 10_000_000) return '₹' + (v / 10_000_000).toFixed(1) + 'Cr'
  if (v >= 100_000)    return '₹' + (v / 100_000).toFixed(1) + 'L'
  if (v >= 1_000)      return '₹' + (v / 1_000).toFixed(1) + 'K'
  return '₹' + v.toLocaleString('en-IN')
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const ACTION_LABELS = {
  smtp_settings_updated:          'SMTP settings updated',
  security_settings_updated:      'Security settings updated',
  password_policy_updated:        'Password policy updated',
  notification_settings_updated:  'Notification settings updated',
  session_timeout_updated:        'Session timeout updated',
  client_admin_created:           'Client admin created',
  client_admin_updated:           'Client admin updated',
  client_admin_status_updated:    'Client admin status changed',
  client_admin_deleted:           'Client admin deleted',
  module_toggled:                 'Module configuration changed',
  company_updated:                'Company details updated',
}

function actionLabel(a) { return ACTION_LABELS[a] || a }
function actionColor(a) {
  if (a.includes('created'))  return '#10b981'
  if (a.includes('deleted') || a.includes('suspend')) return '#ef4444'
  if (a.includes('updated') || a.includes('toggled') || a.includes('status')) return '#6366f1'
  return '#f59e0b'
}

const MODULE_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, color = '#6366f1', height = 160 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No data for last 6 months
      </div>
    )
  }
  const max = Math.max(...data.map(d => Number(d.count)), 1)
  const padB = 28
  const padT = 18
  const chartH = height - padB - padT
  const n = data.length
  const barW = 0.55
  const gapW = 1 - barW

  return (
    <svg width="100%" height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const cnt = Number(d.count)
        const barH = Math.max(4, (cnt / max) * chartH)
        const slotW = 100 / n
        const xLeft = i * slotW + slotW * (gapW / 2)
        const xRight = xLeft + slotW * barW
        const xCenter = (xLeft + xRight) / 2
        const yBar = padT + chartH - barH

        return (
          <g key={i}>
            <rect
              x={`${xLeft}%`}
              y={yBar}
              width={`${slotW * barW}%`}
              height={barH}
              rx="5"
              fill="url(#barGrad)"
            />
            <text x={`${xCenter}%`} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Inter,sans-serif">
              {d.month}
            </text>
            {cnt > 0 && (
              <text x={`${xCenter}%`} y={yBar - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fontFamily="Inter,sans-serif">
                {cnt}
              </text>
            )}
          </g>
        )
      })}
      {/* baseline */}
      <line x1="0" y1={padT + chartH} x2="100%" y2={padT + chartH} stroke="#f1f5f9" strokeWidth="1" />
    </svg>
  )
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ segments, size = 130, thickness = 22 }) {
  const r   = (size - thickness) / 2
  const cx  = size / 2
  const cy  = size / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + (Number(seg.value) || 0), 0)

  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      </svg>
    )
  }

  let cumulative = 0
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      {segments.map((seg, i) => {
        const pct   = (Number(seg.value) || 0) / total
        const dash  = pct * circ
        const offset = -(cumulative / total) * circ
        cumulative += Number(seg.value) || 0
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 1s ease' }}
          />
        )
      })}
    </svg>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 20, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon, color, sub, loading }) {
  return (
    <div
      style={{
        background: '#ffffff', borderRadius: '18px', padding: '22px',
        border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${color}22` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '13px',
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em',
          color: '#94a3b8', textTransform: 'uppercase',
        }}>
          Live
        </div>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '6px' }}>
        {loading ? <Skeleton w="70px" h="32px" /> : value}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: sub ? '10px' : 0 }}>{label}</div>
      {sub && (
        <div style={{
          fontSize: '11px', fontWeight: '600',
          color: color, background: `${color}12`,
          padding: '3px 10px', borderRadius: '20px', display: 'inline-block',
        }}>
          {loading ? '...' : sub}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [now, setNow]       = useState(new Date())
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/super-admin/dashboard`, { headers: authHdr() })
      setData(res.data)
      setError(null)
    } catch {
      setError('Failed to load dashboard data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const p       = data?.platform       || {}
  const emp     = data?.employees      || {}
  const leave   = data?.leave          || {}
  const payroll = data?.payroll        || {}
  const modules = data?.moduleAdoption || []
  const growth  = data?.clientGrowth   || []
  const activity = data?.recentActivity || []

  const empTotal    = Number(emp.total_employees    || 0)
  const empActive   = Number(emp.active_employees   || 0)
  const empInactive = Number(emp.inactive_employees || 0)

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const adminCards = [
    { icon: '👥', label: 'Client Admins',      desc: 'Create & manage client accounts',  color: '#6366f1', path: '/settings/client-admins' },
    { icon: '🏢', label: 'Company Details',    desc: 'Configure organisation profile',    color: '#0ea5e9', path: '/settings/company' },
    { icon: '📧', label: 'SMTP Settings',      desc: 'Configure outbound email server',   color: '#f59e0b', path: '/settings/smtp' },
    { icon: '🛡️', label: 'Security',           desc: 'OTP & login lockout settings',      color: '#ef4444', path: '/settings/security' },
    { icon: '📋', label: 'Audit Logs',         desc: 'View all system activity logs',     color: '#8b5cf6', path: '/settings/audit' },
    { icon: '⚙️', label: 'Module Management',  desc: 'Enable / disable feature modules',  color: '#10b981', path: '/settings/modules' },
    { icon: '🔑', label: 'Password Policy',    desc: 'Set strength requirements',         color: '#f97316', path: '/settings/password-policy' },
    { icon: '🔔', label: 'Notifications',      desc: 'Configure notification events',     color: '#06b6d4', path: '/settings/notifications' },
  ]

  const leaveTotal    = Number(leave.total_leaves    || 0)
  const leavePending  = Number(leave.pending_leaves  || 0)
  const leaveApproved = Number(leave.approved_leaves || 0)
  const leaveRejected = Number(leave.rejected_leaves || 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <Sidebar active="dashboard" />

      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 'calc(100vw - 240px)' }}>

        {/* ── Welcome Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #0f172a 100%)',
          borderRadius: '20px', padding: '26px 32px', marginBottom: '22px',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 12px 40px rgba(79,70,229,0.30)',
        }}>
          <div style={{ position: 'absolute', right: '-40px',  top: '-50px',   width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: '80px',   bottom: '-70px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(139,92,246,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '40%', top: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '5px' }}>
              Welcome back, Super Administrator 👋
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>
              {dateStr}&nbsp;&nbsp;•&nbsp;&nbsp;{timeStr}
            </div>
            {error && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,0.18)', padding: '5px 12px', borderRadius: '8px', display: 'inline-block' }}>
                ⚠ {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
            {[
              [loading ? '…' : fmtNum(p.total_orgs),           'Organizations'],
              [loading ? '…' : fmtNum(p.active_client_admins), 'Active Clients'],
              [loading ? '…' : fmtNum(emp.total_employees),    'Total Employees'],
            ].map(([val, lbl]) => (
              <div key={lbl} style={{
                textAlign: 'center', minWidth: '90px',
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(8px)',
                borderRadius: '14px', padding: '13px 18px',
                border: '1px solid rgba(255,255,255,0.16)',
              }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>{val}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '3px', fontWeight: '500', whiteSpace: 'nowrap' }}>{lbl}</div>
              </div>
            ))}
            <button
              onClick={fetchDashboard}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.26)',
                borderRadius: '12px', padding: '9px 16px',
                color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              ↻ {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── KPI Cards Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '22px' }}>
          <KPICard
            label="Total Organizations"
            value={fmtNum(p.total_orgs)}
            icon="🏢"
            color="#6366f1"
            sub={`${fmtNum(p.total_client_admins)} client admins`}
            loading={loading}
          />
          <KPICard
            label="Total Employees"
            value={fmtNum(empTotal)}
            icon="👤"
            color="#0ea5e9"
            sub={`${fmtNum(empActive)} active · ${fmtNum(empInactive)} inactive`}
            loading={loading}
          />
          <KPICard
            label="Leave Requests (Month)"
            value={fmtNum(leaveTotal)}
            icon="📅"
            color="#f59e0b"
            sub={`${fmtNum(leavePending)} pending approval`}
            loading={loading}
          />
          <KPICard
            label="Net Payroll Disbursed"
            value={fmtCurrency(payroll.total_net_salary)}
            icon="💰"
            color="#10b981"
            sub={`${fmtNum(payroll.total_runs)} run(s) this month`}
            loading={loading}
          />
        </div>

        {/* ── Row 2: Growth Chart · Module Adoption · Employee Donut ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: '18px', marginBottom: '20px' }}>

          {/* Client Growth Bar Chart */}
          <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Client Admin Growth</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>New client admins per month · last 6 months</div>
            </div>
            {loading
              ? <Skeleton h={160} r={10} />
              : <BarChart data={growth} color="#6366f1" height={160} />
            }
          </div>

          {/* Module Adoption */}
          <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Module Adoption</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Enabled modules across all client accounts</div>
            </div>
            {loading
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1,2,3,4,5,6].map(i => <Skeleton key={i} h={14} />)}</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {modules.map((m, i) => {
                    const pct = Number(m.total_clients) > 0
                      ? Math.round((Number(m.enabled_clients) / Number(m.total_clients)) * 100) : 0
                    const color = MODULE_COLORS[i % MODULE_COLORS.length]
                    return (
                      <div key={m.module_key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{m.module_name}</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color }}>
                            {m.enabled_clients}/{m.total_clients} &nbsp;
                            <span style={{ fontWeight: '500', color: '#94a3b8' }}>({pct}%)</span>
                          </span>
                        </div>
                        <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: `linear-gradient(to right, ${color}80, ${color})`,
                            borderRadius: '4px', transition: 'width 1s ease',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          {/* Employee Status Donut */}
          <div style={{
            background: '#fff', borderRadius: '18px', padding: '22px',
            border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ width: '100%', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Employee Status</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Across all organizations</div>
            </div>

            {loading
              ? <Skeleton w="130px" h="130px" r="50%" />
              : (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DonutChart
                    segments={[
                      { value: empActive,   color: '#10b981' },
                      { value: empInactive, color: '#f59e0b' },
                    ]}
                    size={130} thickness={22}
                  />
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{fmtNum(empTotal)}</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '500' }}>TOTAL</div>
                  </div>
                </div>
              )
            }

            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '7px', width: '100%' }}>
              {[
                { label: 'Active',   value: empActive,   color: '#10b981' },
                { label: 'Inactive', value: empInactive, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                    {loading ? '—' : fmtNum(s.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Client Admin Status · Leave & Payroll Summary ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>

          {/* Client Admin Status Breakdown */}
          <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Client Admin Accounts</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '20px' }}>Platform-wide account status breakdown</div>

            {[
              { label: 'Active',    value: Number(p.active_client_admins    || 0), color: '#10b981', bg: '#f0fdf4' },
              { label: 'Inactive',  value: Number(p.inactive_client_admins  || 0), color: '#64748b', bg: '#f8fafc' },
              { label: 'Suspended', value: Number(p.suspended_client_admins || 0), color: '#ef4444', bg: '#fef2f2' },
            ].map((item) => {
              const total = Number(p.total_client_admins || 0)
              const pct   = total > 0 ? Math.round((item.value / total) * 100) : 0
              return (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: item.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: item.color }}>
                        {loading ? '—' : `${item.value} (${pct}%)`}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: loading ? '0%' : `${pct}%`,
                        background: item.color, borderRadius: '3px', transition: 'width 1.2s ease',
                      }} />
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{ paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Total Client Admins</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                {loading ? '—' : fmtNum(p.total_client_admins)}
              </span>
            </div>
          </div>

          {/* Leave & Payroll Summary */}
          <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Leave & Payroll — This Month</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '18px' }}>Aggregated across all organizations</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Leave Requests',  value: fmtNum(leaveTotal),                    color: '#f59e0b', icon: '📅', sub: `${fmtNum(leavePending)} pending` },
                { label: 'Approved Leaves', value: fmtNum(leaveApproved),                  color: '#10b981', icon: '✅', sub: `${fmtNum(leaveRejected)} rejected` },
                { label: 'Payroll Runs',    value: fmtNum(payroll.total_runs),             color: '#6366f1', icon: '📊', sub: `${fmtNum(payroll.approved_runs)} approved` },
                { label: 'Net Payroll',     value: fmtCurrency(payroll.total_net_salary),  color: '#0ea5e9', icon: '💰', sub: `${fmtNum(payroll.locked_runs)} locked` },
              ].map((item) => (
                <div key={item.label} style={{
                  background: `${item.color}08`, borderRadius: '13px', padding: '14px',
                  border: `1px solid ${item.color}20`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '9px' }}>
                    <span style={{ fontSize: '15px' }}>{item.icon}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                    {loading ? '—' : item.value}
                  </div>
                  <div style={{ fontSize: '10px', color: item.color, marginTop: '4px', fontWeight: '600' }}>{loading ? '' : item.sub}</div>
                </div>
              ))}
            </div>

            {/* Leave status mini bar */}
            {!loading && leaveTotal > 0 && (
              <div style={{ paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '7px', fontWeight: '500' }}>Leave Status Distribution</div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
                  {[
                    { value: leaveApproved, color: '#10b981' },
                    { value: leavePending,  color: '#f59e0b' },
                    { value: leaveRejected, color: '#ef4444' },
                  ].map((seg, i) => (
                    <div key={i} style={{
                      flex: seg.value,
                      background: seg.color,
                      minWidth: seg.value > 0 ? '6px' : 0,
                      transition: 'flex 1s ease',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '14px', marginTop: '7px' }}>
                  {[
                    { label: 'Approved', value: leaveApproved, color: '#10b981' },
                    { label: 'Pending',  value: leavePending,  color: '#f59e0b' },
                    { label: 'Rejected', value: leaveRejected, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: s.color }} />
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{s.label} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent System Activity ── */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '22px', border: '1px solid #e8eaf0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Recent System Activity</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Latest 8 audit log entries — live from database</div>
            </div>
            <button
              onClick={() => navigate('/settings/audit')}
              style={{
                background: 'none', border: '1px solid #e2e8f0',
                borderRadius: '9px', padding: '7px 16px',
                fontSize: '12px', color: '#6366f1', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#6366f1' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e2e8f0' }}
            >
              View All →
            </button>
          </div>

          {loading
            ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} h={54} r={10} />)}
              </div>
            )
            : activity.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                No audit activity recorded yet
              </div>
            )
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {activity.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 14px', borderRadius: '11px',
                    background: '#f8fafc', border: '1px solid #f1f5f9',
                  }}>
                    <div style={{
                      width: '9px', height: '9px', borderRadius: '50%',
                      background: actionColor(a.action),
                      marginTop: '4px', flexShrink: 0,
                      boxShadow: `0 0 0 3px ${actionColor(a.action)}22`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', marginBottom: '3px', lineHeight: 1.3 }}>
                        {actionLabel(a.action)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {a.actor_email}
                        </span>
                        <span>·</span>
                        <span style={{ whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* ── Quick Admin Access ── */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Administration</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>Quick access to system configuration panels</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '12px' }}>
            {adminCards.map((c) => (
              <div
                key={c.label}
                onClick={() => navigate(c.path)}
                style={{
                  background: '#fff', border: '1px solid #e8eaf0',
                  borderRadius: '15px', padding: '18px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = c.color
                  e.currentTarget.style.transform   = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow   = `0 10px 28px ${c.color}20`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e8eaf0'
                  e.currentTarget.style.transform   = 'translateY(0)'
                  e.currentTarget.style.boxShadow   = '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: `${c.color}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '19px', marginBottom: '13px',
                }}>
                  {c.icon}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '32px' }} />
      </main>
    </div>
  )
}
