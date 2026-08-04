import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const MONTHS = ['All Months','January','February','March','April','May','June','July','August','September','October','November','December']
const PAGE_SIZE = 8

const BADGE = {
  PUBLIC:   { bg: 'rgba(16,185,129,0.12)',  color: '#059669', border: 'rgba(16,185,129,0.25)' },
  OPTIONAL: { bg: 'rgba(168,85,247,0.12)',  color: '#9333ea', border: 'rgba(168,85,247,0.25)' },
}

function fmt(dateStr) {
  if (!dateStr) return ''
  const p = dateStr.split('T')[0].split('-')
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function monthShort(dateStr) {
  if (!dateStr) return ''
  const p = dateStr.split('T')[0].split('-')
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}
function dayNum(dateStr) {
  if (!dateStr) return ''
  return parseInt(dateStr.split('T')[0].split('-')[2], 10)
}
function dayOfWeek(dateStr) {
  if (!dateStr) return ''
  const p = dateStr.split('T')[0].split('-')
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US', { weekday: 'long' })
}
function monthIndex(dateStr) {
  if (!dateStr) return 0
  return parseInt(dateStr.split('T')[0].split('-')[1], 10)
}

function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '18px', padding: '22px 24px',
      border: `1px solid ${accent}28`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: '18px',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 28px rgba(0,0,0,0.1), 0 0 0 1px ${accent}44` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}
    >
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${accent}14`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '28px', fontWeight: '800', color: accent, lineHeight: 1, marginBottom: '4px' }}>{value}</div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sub}</div>}
      </div>
    </div>
  )
}

function Pagination({ page, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#fcfcfd' }}>
      <div style={{ fontSize: '12px', color: '#64748b' }}>
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
          ← Prev
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            style={{ width: '30px', height: '30px', border: '1px solid', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', borderColor: p === page ? '#6366f1' : '#e2e8f0', background: p === page ? '#6366f1' : '#fff', color: p === page ? '#fff' : '#374151' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
          Next →
        </button>
      </div>
    </div>
  )
}

export default function HolidayList() {
  const [holidays,  setHolidays]  = useState([])
  const [upcoming,  setUpcoming]  = useState([])
  const [ohData,    setOhData]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [ohLoading, setOhLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)
  const [toast,     setToast]     = useState(null)

  const [search,     setSearch]     = useState('')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [monthFilter, setMonthFilter] = useState('0')
  const [page, setPage] = useState(1)

  function showToast(msg, type = 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function loadUpcoming() {
    api.get('/v1/holidays/upcoming')
      .then(res => setUpcoming(res.data?.data?.slice(0, 3) || []))
      .catch(err => console.error('Upcoming holidays error', err))
  }

  function loadHolidays() {
    setLoading(true)
    const params = { year: yearFilter }
    if (typeFilter !== 'ALL') params.type = typeFilter
    api.get('/v1/holidays/my-calendar', { params })
      .then(res => setHolidays(res.data?.data || []))
      .catch(err => console.error('Calendar holidays error', err))
      .finally(() => setLoading(false))
  }

  function loadOH() {
    setOhLoading(true)
    api.get('/v1/leave/optional-holidays/my')
      .then(res => setOhData(res.data))
      .catch(err => console.error('Optional holiday error', err))
      .finally(() => setOhLoading(false))
  }

  useEffect(() => { loadUpcoming(); loadOH() }, [])
  useEffect(() => { loadHolidays() }, [yearFilter, typeFilter])

  function toggleOH(holidayId) {
    if (togglingId) return
    setTogglingId(holidayId)
    api.post(`/v1/leave/optional-holidays/${holidayId}/toggle`)
      .then(res => {
        setOhData(res.data)
        showToast(
          res.data.availed_holidays?.some(h => h.holiday_id === holidayId)
            ? 'Optional holiday availed successfully.'
            : 'Optional holiday un-availed.',
          'success'
        )
      })
      .catch(err => showToast(err.response?.data?.message || 'Failed to update.'))
      .finally(() => setTogglingId(null))
  }

  // Derived KPIs
  const publicCount   = holidays.filter(h => h.holiday_type === 'PUBLIC').length
  const optionalCount = holidays.filter(h => h.holiday_type === 'OPTIONAL').length
  const ohUsed        = ohData?.used_days ?? 0
  const ohTotal       = ohData?.allocated_days ?? 0
  const availedIds    = useMemo(() => new Set((ohData?.availed_holidays || []).map(h => h.holiday_id)), [ohData])

  // Filtered + paged list
  const filtered = useMemo(() => holidays.filter(h => {
    if (search && !h.holiday_name.toLowerCase().includes(search.toLowerCase()) &&
        !(h.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (monthFilter !== '0' && monthIndex(h.holiday_date) !== parseInt(monthFilter, 10)) return false
    return true
  }), [holidays, search, monthFilter])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => setPage(1), [search, monthFilter, typeFilter, yearFilter])

  // Optional holiday quota state (computed from ohData)
  const isQuotaFull = ohData && ohData.remaining_days <= 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <EmployeeSidebar active="holidays" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Holidays" />
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>Holiday Calendar</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Plan your schedule around official public and optional holidays</p>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <KpiCard icon="🗓️" label="Total Holidays" value={holidays.length} sub={`Year ${yearFilter}`} accent="#6366f1" />
            <KpiCard icon="🌐" label="Public Holidays" value={publicCount} sub="Mandatory days off" accent="#10b981" />
            <KpiCard icon="✨" label="Optional Holidays" value={optionalCount} sub="Choose your preference" accent="#9333ea" />
            {ohLoading ? (
              <div style={{ background: '#fff', borderRadius: '18px', padding: '22px 24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading…</div>
            ) : (
              <KpiCard icon="🎯" label="My Optional Quota"
                value={`${ohUsed}/${ohTotal}`}
                sub={ohTotal > ohUsed ? `${ohData.remaining_days} slot${ohData.remaining_days !== 1 ? 's' : ''} remaining` : 'Quota fully used'}
                accent="#f59e0b" />
            )}
          </div>

          {/* Upcoming holidays strip */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Upcoming Holidays</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {upcoming.map(h => {
                  const b = BADGE[h.holiday_type] || BADGE.PUBLIC
                  return (
                    <div key={h.holiday_id} style={{ background: '#fff', border: `1px solid ${b.border}`, borderRadius: '16px', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ width: '52px', height: '56px', borderRadius: '12px', background: `${b.bg}`, border: `1px solid ${b.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: b.color, textTransform: 'uppercase' }}>{monthShort(h.holiday_date)}</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: b.color, lineHeight: 1 }}>{dayNum(h.holiday_date)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.holiday_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{dayOfWeek(h.holiday_date)}</div>
                        <span style={{ display: 'inline-block', marginTop: '5px', fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '20px', background: b.bg, color: b.color, border: `1px solid ${b.border}`, textTransform: 'uppercase' }}>
                          {h.holiday_type}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <input
              type="text"
              placeholder="Search holiday name or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '180px', padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' }}
            />
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
              style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', cursor: 'pointer', background: '#fff' }}>
              {['2024','2025','2026','2027','2028'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', cursor: 'pointer', background: '#fff' }}>
              {MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', cursor: 'pointer', background: '#fff' }}>
              <option value="ALL">All Types</option>
              <option value="PUBLIC">Public</option>
              <option value="OPTIONAL">Optional</option>
            </select>
            {(search || monthFilter !== '0' || typeFilter !== 'ALL') && (
              <button onClick={() => { setSearch(''); setMonthFilter('0'); setTypeFilter('ALL') }}
                style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: '600' }}>
                Clear
              </button>
            )}
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Holidays Table */}
          <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Loading calendar…</div>
            ) : paged.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No holidays found matching the selected criteria.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Holiday Name', 'Date', 'Day', 'Type', 'Description', 'Opt. Holiday'].map(h => (
                      <th key={h} style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e8eaf0', background: '#f8fafc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(h => {
                    const b = BADGE[h.holiday_type] || BADGE.PUBLIC
                    const dateStr = h.holiday_date ? h.holiday_date.split('T')[0] : ''
                    const isOptional = h.holiday_type === 'OPTIONAL'
                    const isAvailed  = availedIds.has(h.holiday_id)
                    const isToggling = togglingId === h.holiday_id
                    const isDisabled = isOptional && !isAvailed && isQuotaFull
                    return (
                      <tr key={h.holiday_id}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      >
                        <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f172a' }}>
                          <div>{h.holiday_name}</div>
                          {isAvailed && (
                            <div style={{ fontSize: '10px', color: '#d97706', fontWeight: '600', marginTop: '2px' }}>✓ Availed by you</div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#475569' }}>{dateStr}</td>
                        <td style={{ padding: '14px 18px', color: '#64748b' }}>{dayOfWeek(h.holiday_date)}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase', background: b.bg, color: b.color, border: `1px solid ${b.border}` }}>
                            {h.holiday_type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#64748b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.description || '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {isOptional ? (
                            <button
                              onClick={() => { if (!isDisabled && !isToggling) toggleOH(h.holiday_id) }}
                              disabled={isDisabled || isToggling}
                              title={isDisabled ? 'Quota exhausted — un-avail another first' : isAvailed ? 'Click to un-avail this holiday' : `Click to avail (${ohData?.remaining_days ?? 0} slot${(ohData?.remaining_days ?? 0) !== 1 ? 's' : ''} left)`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                                cursor: (isDisabled || isToggling) ? 'not-allowed' : 'pointer',
                                border: `1px solid ${isAvailed ? 'rgba(245,158,11,0.35)' : isDisabled ? '#e2e8f0' : 'rgba(99,102,241,0.3)'}`,
                                background: isAvailed ? 'rgba(245,158,11,0.1)' : isDisabled ? '#f8fafc' : 'rgba(99,102,241,0.08)',
                                color: isAvailed ? '#d97706' : isDisabled ? '#cbd5e1' : '#6366f1',
                                opacity: isDisabled ? 0.5 : 1,
                                transition: 'all 0.15s',
                              }}>
                              {isToggling ? '…' : isAvailed ? '✓ Availed' : isDisabled ? 'Quota Full' : '+ Avail'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#e2e8f0' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <Pagination page={page} total={filtered.length} onChange={setPage} />
          </div>

          {/* Optional Holiday Quota Panel */}
          {!ohLoading && ohData && ohData.calendar_count > 0 && (
            <div style={{ marginTop: '24px', background: '#fff', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>My Optional Holiday Selection</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Leave Year {ohData.leave_year} — Choose up to {ohData.allocated_days} optional holiday{ohData.allocated_days !== 1 ? 's' : ''}</div>
                </div>
                {ohData.remaining_days > 0 ? (
                  <div style={{ padding: '5px 13px', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', color: '#d97706', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(245,158,11,0.25)' }}>
                    {ohData.remaining_days} of {ohData.allocated_days} remaining
                  </div>
                ) : (
                  <div style={{ padding: '5px 13px', borderRadius: '20px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(239,68,68,0.2)' }}>
                    Quota fully used
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>
                  <span>{ohData.used_days} of {ohData.allocated_days} availed</span>
                  <span>{ohData.allocated_days > 0 ? Math.round((ohData.used_days / ohData.allocated_days) * 100) : 0}%</span>
                </div>
                <div style={{ height: '7px', borderRadius: '6px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '6px', width: `${ohData.allocated_days > 0 ? Math.min(100, (ohData.used_days / ohData.allocated_days) * 100) : 0}%`, background: ohData.remaining_days <= 0 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#f59e0b,#d97706)', transition: 'width 0.5s' }} />
                </div>
              </div>

              {ohData.availed_holidays && ohData.availed_holidays.length > 0 ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Your Availed Holidays</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ohData.availed_holidays.map(h => (
                      <div key={h.holiday_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{h.holiday_name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{h.holiday_date ? h.holiday_date.split('T')[0] : ''}</span>
                        <button
                          onClick={() => toggleOH(h.holiday_id)}
                          disabled={!!togglingId}
                          style={{ background: 'none', border: 'none', cursor: togglingId ? 'not-allowed' : 'pointer', color: '#ef4444', fontSize: '13px', padding: '0 2px', fontWeight: '700', lineHeight: 1 }}
                          title="Un-avail this holiday"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  No optional holidays availed yet. Click "+ Avail" in the table above on any OPTIONAL holiday.
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', borderRadius: '12px', padding: '12px 18px', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: '4px', fontSize: '16px', opacity: 0.7 }}>×</button>
        </div>
      )}
    </div>
  )
}
