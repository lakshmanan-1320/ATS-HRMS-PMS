import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import {
  FiCalendar, FiBriefcase, FiUserPlus, FiStar, FiBarChart2,
  FiCheck, FiAlertCircle
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  brand:   '#C2071A',
  brandDk: '#941018',
  brandLt: '#feecee',
  green:   '#10b981',
  greenLt: '#d1fae5',
  amber:   '#f59e0b',
  amberLt: '#fef3c7',
  red:     '#ef4444',
  slate50: '#f8fafc',
  slate100:'#f1f5f9',
  slate200:'#e2e8f0',
  slate400:'#94a3b8',
  slate500:'#64748b',
  slate600:'#475569',
  slate700:'#334155',
  slate900:'#0f172a',
  white:   '#ffffff',
}

const s = {
  page:    { display: 'flex', minHeight: '100vh', background: C.slate50, fontFamily: 'Inter, system-ui, sans-serif' },
  wrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  main:    { flex: 1, padding: '32px 40px', overflowY: 'auto', maxWidth: '900px' },

  /* Page header */
  pageHeader: { marginBottom: '32px' },
  pageTitle:  { fontSize: '26px', fontWeight: '800', color: C.slate900, margin: '0 0 6px' },
  pageSub:    { fontSize: '13px', color: C.slate500, margin: 0 },

  /* Cards */
  card: {
    background: C.white, border: `1px solid ${C.slate200}`,
    borderRadius: '16px', padding: '28px 32px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '20px',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${C.slate100}`,
  },
  cardIcon: {
    width: '36px', height: '36px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', flexShrink: 0,
  },
  cardTitle:   { fontSize: '15px', fontWeight: '700', color: C.slate900, margin: 0 },
  cardSubtitle:{ fontSize: '12px', color: C.slate500, margin: '2px 0 0' },

  /* Form elements */
  formRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  formGroup:{ marginBottom: '18px' },
  label:    { display: 'block', fontSize: '11px', fontWeight: '700', color: C.slate600, marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  hint:     { fontSize: '11px', color: C.slate400, marginTop: '5px', lineHeight: 1.5 },
  select:   {
    width: '100%', padding: '10px 14px', background: C.white,
    border: `1px solid ${C.slate200}`, borderRadius: '10px',
    fontSize: '13px', color: C.slate900, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', cursor: 'pointer', transition: 'border-color 0.15s',
  },
  numInput: {
    width: '100%', padding: '10px 14px', background: C.white,
    border: `1px solid ${C.slate200}`, borderRadius: '10px',
    fontSize: '13px', color: C.slate900, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },

  /* Radio option cards */
  radioGrid: { display: 'flex', gap: '12px', marginBottom: '4px' },
  radioCard: (active) => ({
    flex: 1, display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px',
    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s',
    border: `2px solid ${active ? C.brand : C.slate200}`,
    background: active ? C.brandLt : C.slate50,
  }),
  radioText:  { fontSize: '13px', fontWeight: '700', color: C.slate900 },
  radioDesc:  { fontSize: '11px', color: C.slate500, marginTop: '3px' },

  /* Toggle */
  toggleRow:  { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 0', borderBottom: `1px solid ${C.slate100}` },
  toggleTrack:(on) => ({
    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
    cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    marginTop: '2px', position: 'relative',
    background: on ? C.brand : C.slate200,
    boxShadow: on ? `0 0 0 3px ${C.brandLt}` : 'none',
  }),
  toggleThumb:(on) => ({
    position: 'absolute', top: '3px',
    left: on ? '23px' : '3px',
    width: '18px', height: '18px', borderRadius: '50%',
    background: C.white, transition: 'left 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  }),
  toggleLabel:{ fontSize: '13px', color: C.slate900, fontWeight: '600', marginBottom: '2px' },
  toggleHint: { fontSize: '11px', color: C.slate500, lineHeight: 1.5 },

  /* Info boxes */
  infoBox: (bg, border, titleColor, textColor) => ({
    background: bg, border: `1px solid ${border}`,
    borderRadius: '10px', padding: '14px 16px', marginTop: '12px',
  }),
  infoTitle:  (color) => ({ fontSize: '12px', fontWeight: '700', color, marginBottom: '4px' }),
  infoText:   (color) => ({ fontSize: '12px', color, lineHeight: 1.6 }),

  /* Year badge */
  yearBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '4px 10px', borderRadius: '20px',
    background: C.brandLt, color: C.brand,
    fontSize: '12px', fontWeight: '700', marginTop: '8px',
  },

  /* Stepper */
  stepper: { display: 'flex', alignItems: 'center', gap: '0' },
  stepBtn: (side) => ({
    width: '36px', height: '38px', border: `1px solid ${C.slate200}`,
    background: C.slate50, cursor: 'pointer', fontSize: '16px',
    color: C.slate700, fontWeight: '700', display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'all 0.15s', userSelect: 'none',
    borderRadius: side === 'left' ? '10px 0 0 10px' : '0 10px 10px 0',
  }),
  stepVal: {
    flex: 1, height: '38px', border: `1px solid ${C.slate200}`,
    borderLeft: 'none', borderRight: 'none',
    textAlign: 'center', fontSize: '15px', fontWeight: '700',
    color: C.slate900, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.white, minWidth: '56px',
  },

  /* Save bar */
  saveBar: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '20px 0', borderTop: `1px solid ${C.slate200}`, marginTop: '8px',
  },
  saveBtn: {
    padding: '11px 32px',
    background: `linear-gradient(135deg, ${C.brand} 0%, ${C.brandDk} 100%)`,
    border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
    color: C.white, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(194,7,26,0.35)', transition: 'all 0.2s',
  },
  msg: (ok) => ({
    fontSize: '13px', fontWeight: '600',
    color: ok ? '#15803d' : C.red,
    display: 'flex', alignItems: 'center', gap: '6px',
  }),

  /* Divider */
  divider: { height: '1px', background: C.slate100, margin: '4px 0 20px' },
}

/* ─── Sub-components ─────────────────────────────────────────── */

function SectionIcon({ icon: Icon }) {
  return (
    <div style={{
      ...s.cardIcon,
      background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
      color: '#ffffff',
      boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)'
    }}>
      <Icon size={18} color="#ffffff" stroke="#ffffff" style={{ color: '#ffffff', stroke: '#ffffff' }} />
    </div>
  )
}

function Toggle({ checked, onChange, label, hint, last }) {
  return (
    <div style={{ ...s.toggleRow, borderBottom: last ? 'none' : `1px solid ${C.slate100}`, paddingBottom: last ? '0' : '14px' }}>
      <button
        type="button"
        style={s.toggleTrack(checked)}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span style={s.toggleThumb(checked)} />
      </button>
      <div>
        <div style={s.toggleLabel}>{label}</div>
        {hint && <div style={s.toggleHint}>{hint}</div>}
      </div>
    </div>
  )
}

function Stepper({ value, onChange, min = 1, max = 30 }) {
  return (
    <div style={s.stepper}>
      <button
        type="button"
        style={s.stepBtn('left')}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >−</button>
      <div style={s.stepVal}>{value}</div>
      <button
        type="button"
        style={s.stepBtn('right')}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >+</button>
    </div>
  )
}

function proRataExample(leaveYearStartMonth, annualDays, label) {
  const startName = MONTH_NAMES[leaveYearStartMonth] || 'April'
  const midOffset = 6
  const joinMonthIdx = ((leaveYearStartMonth - 1 + midOffset) % 12) + 1
  const joinName = MONTH_NAMES[joinMonthIdx]
  const remaining = 12 - midOffset
  const allocated = Math.round((annualDays / 12) * remaining * 2) / 2
  return `Employee joins in ${joinName} → ${remaining} months remaining (year starts ${startName}) → ${allocated} ${label} allocated out of ${annualDays} annual.`
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function LeaveSettingsConfig() {
  const [leaveYearType,          setLeaveYearType]          = useState('financial_year')
  const [leaveYearStartMonth,    setLeaveYearStartMonth]    = useState(4)
  const [proRataOnJoin,          setProRataOnJoin]          = useState(true)
  const [autoCreditOnJoin,       setAutoCreditOnJoin]       = useState(true)
  const [optHolidayMaxDays,      setOptHolidayMaxDays]      = useState(2)
  const [optHolidayProRata,      setOptHolidayProRata]      = useState(true)
  const [paidLeaveCap,           setPaidLeaveCap]           = useState(2)
  const [paidLeaveCapEnabled,    setPaidLeaveCapEnabled]    = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')

  useEffect(() => {
    api.get('/v1/leave/settings')
      .then(res => {
        const d = res.data
        setLeaveYearType(d.leave_year_type || 'financial_year')
        setLeaveYearStartMonth(parseInt(d.leave_year_start_month, 10) || 4)
        setProRataOnJoin(d.pro_rata_on_join !== false)
        setAutoCreditOnJoin(d.auto_credit_on_join !== false)
        setOptHolidayMaxDays(parseInt(d.optional_holiday_max_days, 10) || 2)
        setOptHolidayProRata(d.optional_holiday_pro_rata !== false)
        if (d.monthly_paid_leave_cap != null) {
          setPaidLeaveCapEnabled(true)
          setPaidLeaveCap(parseInt(d.monthly_paid_leave_cap, 10) || 2)
        } else {
          setPaidLeaveCapEnabled(false)
          setPaidLeaveCap(2)
        }
      })
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
        setError('Failed to load leave settings.')
      })
      .finally(() => setLoading(false))
  }, [])

  function handleYearTypeChange(type) {
    setLeaveYearType(type)
    setLeaveYearStartMonth(type === 'calendar_year' ? 1 : 4)
  }

  function handleSave(e) {
    e.preventDefault()
    setSuccess(''); setError('')
    setSaving(true)
    api.put('/v1/leave/settings', {
      leave_year_type:           leaveYearType,
      leave_year_start_month:    leaveYearType === 'calendar_year' ? 1 : leaveYearStartMonth,
      pro_rata_on_join:          proRataOnJoin,
      auto_credit_on_join:       autoCreditOnJoin,
      optional_holiday_max_days: optHolidayMaxDays,
      optional_holiday_pro_rata: optHolidayProRata,
      monthly_paid_leave_cap: paidLeaveCapEnabled ? paidLeaveCap : null,
    })
      .then(() => setSuccess('Settings saved successfully.'))
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
        setError(err.response?.data?.message || 'Failed to save settings.')
      })
      .finally(() => setSaving(false))
  }

  const startLabel = leaveYearType === 'calendar_year' ? 'January' : MONTH_NAMES[leaveYearStartMonth]
  const endLabel   = leaveYearType === 'calendar_year' ? 'December' : MONTH_NAMES[((leaveYearStartMonth - 2 + 12) % 12) + 1]

  return (
    <div style={s.page}>
      <ClientAdminSidebar active="leave-settings" />
      <div style={s.wrapper}>
        <ClientAdminTopBar />
        <main style={s.main}>

          {/* ── Page Header ── */}
          <div style={s.pageHeader}>
            <h1 style={s.pageTitle}>Leave Settings</h1>
            <p style={s.pageSub}>Configure leave year boundary, joining policies, and optional holiday eligibility</p>
          </div>

          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: C.slate400, fontSize: 14 }}>
              Loading settings…
            </div>
          ) : (
            <form onSubmit={handleSave}>

              {/* ── Card 1: Leave Year Type ── */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <SectionIcon icon={FiCalendar} bg="#C2071A" />
                  <div>
                    <div style={s.cardTitle}>Leave Year Boundary</div>
                    <div style={s.cardSubtitle}>Define the start and end of the annual leave cycle</div>
                  </div>
                </div>

                <div style={s.formGroup}>
                  <div style={s.label}>Leave Year Type</div>
                  <div style={s.radioGrid}>
                    {[
                      { value: 'financial_year', label: 'Financial Year', desc: 'Custom start month (e.g. April – March)', icon: FiBriefcase },
                      { value: 'calendar_year',  label: 'Calendar Year',  desc: 'Fixed: January 1 – December 31',       icon: FiCalendar },
                    ].map(opt => (
                      <label key={opt.value} style={s.radioCard(leaveYearType === opt.value)}>
                        <input
                          type="radio" name="leaveYearType" value={opt.value}
                          checked={leaveYearType === opt.value}
                          onChange={() => handleYearTypeChange(opt.value)}
                          style={{ marginTop: '2px', accentColor: C.brand }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <opt.icon size={13} color={leaveYearType === opt.value ? C.brand : C.slate500} />
                            <span style={s.radioText}>{opt.label}</span>
                          </div>
                          <div style={s.radioDesc}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {leaveYearType === 'financial_year' && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Financial Year Start Month</label>
                    <select
                      style={s.select}
                      value={leaveYearStartMonth}
                      onChange={e => setLeaveYearStartMonth(parseInt(e.target.value, 10))}
                    >
                      {MONTH_NAMES.slice(1).map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <div style={s.hint}>Cycle runs from {startLabel} to {endLabel} (next year)</div>
                  </div>
                )}

                <div style={s.yearBadge}>
                  <FiCalendar size={12} color={C.brand} />
                  <span>Active cycle: {startLabel} → {endLabel}</span>
                </div>
              </div>

              {/* ── Card 2: Joining Policy ── */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <SectionIcon icon={FiUserPlus} bg="#059669" />
                  <div>
                    <div style={s.cardTitle}>New Employee Joining Policy</div>
                    <div style={s.cardSubtitle}>How leave balances are allocated when a new hire joins</div>
                  </div>
                </div>

                <Toggle
                  checked={autoCreditOnJoin}
                  onChange={setAutoCreditOnJoin}
                  label="Auto-credit leave balance on joining"
                  hint="Leave balances are created automatically when a new employee is added to the system."
                />
                <Toggle
                  checked={proRataOnJoin}
                  onChange={setProRataOnJoin}
                  label="Pro-rata allocation based on joining month"
                  hint="Employees who join mid-year receive a proportional share of the annual quota."
                  last
                />

                {autoCreditOnJoin && proRataOnJoin && (
                  <div style={s.infoBox('#f0fdf4', '#86efac', '#15803d', '#166534')}>
                    <div style={s.infoTitle('#15803d')}>Pro-rata Example</div>
                    <div style={s.infoText('#166534')}>{proRataExample(leaveYearStartMonth, 12, 'days')}</div>
                  </div>
                )}
                {autoCreditOnJoin && !proRataOnJoin && (
                  <div style={s.infoBox('#fffbeb', '#fde68a', '#92400e', '#78350f')}>
                    <div style={s.infoTitle('#92400e')}>Full Allocation</div>
                    <div style={s.infoText('#78350f')}>
                      Mid-year joiners receive the full annual quota regardless of joining date.
                    </div>
                  </div>
                )}
                {!autoCreditOnJoin && (
                  <div style={s.infoBox('#f8fafc', C.slate200, C.slate600, C.slate500)}>
                    <div style={s.infoTitle(C.slate600)}>Manual Allocation</div>
                    <div style={s.infoText(C.slate500)}>
                      Leave balances must be allocated manually by the HR admin for each new employee.
                    </div>
                  </div>
                )}
              </div>

              {/* ── Card 3: Optional Holiday Eligibility ── */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <SectionIcon icon={FiStar} bg="#d97706" />
                  <div>
                    <div style={s.cardTitle}>Optional Holiday Eligibility</div>
                    <div style={s.cardSubtitle}>Configure how many optional holidays employees can avail per year</div>
                  </div>
                </div>

                <div style={s.formRow}>
                  <div style={s.formGroup}>
                    <div style={s.label}>Max Optional Holidays Per Year</div>
                    <Stepper
                      value={optHolidayMaxDays}
                      onChange={setOptHolidayMaxDays}
                      min={1} max={15}
                    />
                    <div style={s.hint}>
                      Employees can avail up to <strong>{optHolidayMaxDays}</strong> optional holiday{optHolidayMaxDays !== 1 ? 's' : ''} per leave year, chosen from the optional holidays calendar.
                    </div>
                  </div>

                  <div style={s.formGroup}>
                    <div style={s.label}>Leave Year Basis</div>
                    <div style={{
                      padding: '10px 14px', borderRadius: '10px',
                      border: `1px solid ${C.slate200}`, background: C.slate50,
                      fontSize: '13px', color: C.slate700, fontWeight: '600',
                    }}>
                      {leaveYearType === 'financial_year'
                        ? `Financial Year (${startLabel} – ${endLabel})`
                        : 'Calendar Year (Jan 1 – Dec 31)'}
                    </div>
                    <div style={s.hint}>Optional holiday eligibility follows the same leave year as regular leaves.</div>
                  </div>
                </div>

                <div style={s.divider} />

                <Toggle
                  checked={optHolidayProRata}
                  onChange={setOptHolidayProRata}
                  label="Pro-rata optional holidays for mid-year joiners"
                  hint="Employees joining mid-year receive a proportional optional holiday quota based on remaining months in the leave year."
                  last
                />

                {optHolidayProRata && (
                  <div style={s.infoBox('#fffbeb', '#fde68a', '#92400e', '#78350f')}>
                    <div style={s.infoTitle('#b45309')}>Optional Holiday Pro-rata Example</div>
                    <div style={s.infoText('#92400e')}>{proRataExample(leaveYearStartMonth, optHolidayMaxDays, 'optional holidays')}</div>
                  </div>
                )}
                {!optHolidayProRata && (
                  <div style={s.infoBox('#f0fdf4', '#86efac', '#15803d', '#166534')}>
                    <div style={s.infoTitle('#15803d')}>Full Optional Holiday Allocation</div>
                    <div style={s.infoText('#166534')}>
                      All employees receive the full {optHolidayMaxDays} optional holiday quota regardless of joining date.
                    </div>
                  </div>
                )}

                {/* How it works info */}
                <div style={{ ...s.infoBox(C.brandLt, '#f7a6af', C.brand, '#7c0a1a'), marginTop: '16px' }}>
                  <div style={s.infoTitle(C.brand)}>How Optional Holidays Work</div>
                  <div style={s.infoText('#7c0a1a')}>
                    Optional holidays are specific calendar holidays employees can <em>choose</em> to avail.
                    Each employee is allocated a quota (with pro-rata for new joiners). They can select
                    which optional holidays to avail from their Leave Dashboard, and the system tracks
                    their allocation, utilization, and remaining balance separately from regular leave.
                  </div>
                </div>
              </div>

              {/* ── Card 4: Monthly Paid Leave Cap ── */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <SectionIcon icon={FiBarChart2} bg="#be185d" />
                  <div>
                    <div style={s.cardTitle}>Monthly Paid Leave Capping</div>
                    <div style={s.cardSubtitle}>Limit how many paid leave days an employee can take per calendar month</div>
                  </div>
                </div>

                <Toggle
                  checked={paidLeaveCapEnabled}
                  onChange={v => setPaidLeaveCapEnabled(v)}
                  label="Enable monthly paid leave cap"
                  hint="When enabled, employees cannot exceed the set number of paid leave days in any single calendar month, regardless of their annual balance."
                  last={!paidLeaveCapEnabled}
                />

                {paidLeaveCapEnabled && (
                  <>
                    <div style={{ ...s.formRow, marginTop: '16px' }}>
                      <div style={s.formGroup}>
                        <div style={s.label}>Max Paid Leave Days Per Month</div>
                        <Stepper
                          value={paidLeaveCap}
                          onChange={setPaidLeaveCap}
                          min={1} max={30}
                        />
                        <div style={s.hint}>
                          Employees can take at most <strong>{paidLeaveCap}</strong> paid leave day{paidLeaveCap !== 1 ? 's' : ''} per calendar month across all paid leave types.
                        </div>
                      </div>
                      <div style={s.formGroup}>
                        <div style={s.label}>Applies To</div>
                        <div style={{
                          padding: '10px 14px', borderRadius: '10px',
                          border: `1px solid ${C.slate200}`, background: C.slate50,
                          fontSize: '13px', color: C.slate700, fontWeight: '600',
                        }}>
                          All Paid Leave Types (combined)
                        </div>
                        <div style={s.hint}>Cap is enforced across the total of all paid leave types, not per individual type.</div>
                      </div>
                    </div>

                    <div style={s.infoBox('#fdf2f8', '#f0abfc', '#86198f', '#701a75')}>
                      <div style={s.infoTitle('#86198f')}>Example</div>
                      <div style={s.infoText('#701a75')}>
                        Employee has 12 annual paid leave days but monthly cap is {paidLeaveCap}. Even if they have remaining balance, they can only take up to {paidLeaveCap} paid leave day{paidLeaveCap !== 1 ? 's' : ''} in any given month.
                      </div>
                    </div>
                  </>
                )}

                {!paidLeaveCapEnabled && (
                  <div style={{ ...s.infoBox(C.slate50, C.slate200, C.slate600, C.slate500), marginTop: '4px' }}>
                    <div style={s.infoTitle(C.slate600)}>No Monthly Cap</div>
                    <div style={s.infoText(C.slate500)}>
                      Employees can use any amount of their annual paid leave balance in a single month. Enable the cap above to restrict monthly usage.
                    </div>
                  </div>
                )}
              </div>

              {/* ── Save bar ── */}
              <div style={s.saveBar}>
                <button
                  type="submit"
                  style={s.saveBtn}
                  disabled={saving}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(194,7,26,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(194,7,26,0.35)' }}
                >
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
                {success && <span style={s.msg(true)}><FiCheck size={13} /> {success}</span>}
                {error   && <span style={s.msg(false)}><FiAlertCircle size={13} /> {error}</span>}
              </div>

            </form>
          )}
        </main>
      </div>
    </div>
  )
}
