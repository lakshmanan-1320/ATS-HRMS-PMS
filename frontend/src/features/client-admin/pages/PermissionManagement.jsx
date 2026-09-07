import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import {
  FiShield, FiSearch, FiX, FiCheckCircle, FiXCircle,
  FiClock, FiUsers, FiList, FiCheck, FiInfo, FiSettings, FiSave
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const PAGE_SIZE = 10
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

const STATUS_COLORS = {
  PENDING:   { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Pending' },
  APPROVED:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Approved' },
  REJECTED:  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' },
  CANCELLED: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Cancelled' },
}

const inp = {
  width: '100%', padding: '10px 14px', background: '#f8fafc',
  border: '1px solid #e2e8f0', borderRadius: '10px',
  fontSize: '13px', color: '#1e293b', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s',
}

export default function PermissionManagement() {
  const now = new Date()
  const [activeTab, setActiveTab] = useState('requests')

  // ── requests state ────────────────────────────────────────────
  const [requests, setRequests]   = useState([])
  const [reqLoading, setReqLoading] = useState(true)
  const [reqPage, setReqPage]     = useState(1)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [monthFilter, setMonthFilter]   = useState(now.getMonth() + 1)
  const [yearFilter, setYearFilter]     = useState(now.getFullYear())
  const [rejectModal, setRejectModal]   = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── balances state ────────────────────────────────────────────
  const [balances, setBalances]   = useState([])
  const [balLoading, setBalLoading] = useState(true)
  const [balPage, setBalPage]     = useState(1)
  const [balMonth, setBalMonth]   = useState(now.getMonth() + 1)
  const [balYear, setBalYear]     = useState(now.getFullYear())
  const [balSearch, setBalSearch] = useState('')

  // ── settings state ────────────────────────────────────────────
  const [settings, setSettings]           = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [monthlyCount, setMonthlyCount]   = useState('2')
  const [hoursPerPerm, setHoursPerPerm]   = useState('2')
  const [proRata, setProRata]             = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg]     = useState(null) // { type: 'success'|'error', text }

  const yearOptions = []
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) yearOptions.push(y)

  function handleUnauth() { sessionStorage.clear(); window.location.href = '/login' }

  // ── fetch settings (always) ────────────────────────────────────
  function fetchSettings() {
    setSettingsLoading(true)
    api.get('/v1/permissions/settings')
      .then(res => {
        setSettings(res.data)
        setMonthlyCount(String(res.data.monthly_count ?? 2))
        setHoursPerPerm(String(res.data.hours_per_permission ?? 2))
        setProRata(res.data.pro_rata_on_join !== false)
      })
      .catch(err => { if (err.response?.status === 401) handleUnauth() })
      .finally(() => setSettingsLoading(false))
  }

  function fetchRequests() {
    setReqLoading(true)
    const p = new URLSearchParams()
    p.set('month', monthFilter)
    p.set('year', yearFilter)
    if (statusFilter !== 'ALL') p.set('status', statusFilter)
    api.get(`/v1/permissions/admin/requests?${p}`)
      .then(res => { setRequests(res.data || []); setReqPage(1) })
      .catch(err => { if (err.response?.status === 401) handleUnauth() })
      .finally(() => setReqLoading(false))
  }

  function fetchBalances() {
    setBalLoading(true)
    api.get(`/v1/permissions/admin/balances?month=${balMonth}&year=${balYear}`)
      .then(res => { setBalances(res.data?.balances || []); setBalPage(1) })
      .catch(err => { if (err.response?.status === 401) handleUnauth() })
      .finally(() => setBalLoading(false))
  }

  useEffect(() => { fetchSettings() }, [])
  useEffect(() => { if (activeTab === 'requests') fetchRequests() }, [activeTab, monthFilter, yearFilter, statusFilter])
  useEffect(() => { if (activeTab === 'balances') fetchBalances() }, [activeTab, balMonth, balYear])

  function handleApprove(id) {
    api.post(`/v1/permissions/admin/requests/${id}/approve`)
      .then(() => fetchRequests())
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to approve.')
        if (err.response?.status === 401) handleUnauth()
      })
  }

  function handleReject() {
    api.post(`/v1/permissions/admin/requests/${rejectModal.id}/reject`, { rejection_reason: rejectReason })
      .then(() => { setRejectModal(null); fetchRequests() })
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to reject.')
        if (err.response?.status === 401) handleUnauth()
      })
  }

  function handleSaveSettings(e) {
    e.preventDefault()
    setSettingsMsg(null)
    setSettingsSaving(true)
    api.put('/v1/permissions/settings', {
      monthly_count: parseInt(monthlyCount, 10),
      hours_per_permission: parseFloat(hoursPerPerm),
      pro_rata_on_join: proRata,
    })
      .then(res => {
        setSettings(res.data)
        setSettingsMsg({ type: 'success', text: 'Permission settings saved successfully.' })
      })
      .catch(err => {
        setSettingsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save settings.' })
        if (err.response?.status === 401) handleUnauth()
      })
      .finally(() => setSettingsSaving(false))
  }

  // ── computed stats ─────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }), [requests])

  const filteredReq = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(r =>
      r.employee_name?.toLowerCase().includes(q) ||
      r.employee_code?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    )
  }, [requests, search])

  const filteredBal = useMemo(() => {
    if (!balSearch.trim()) return balances
    const q = balSearch.toLowerCase()
    return balances.filter(b =>
      b.employee_name?.toLowerCase().includes(q) ||
      b.employee_code?.toLowerCase().includes(q)
    )
  }, [balances, balSearch])

  const reqTotalPages = Math.max(1, Math.ceil(filteredReq.length / PAGE_SIZE))
  const reqPaginated  = filteredReq.slice((reqPage - 1) * PAGE_SIZE, reqPage * PAGE_SIZE)
  const balTotalPages = Math.max(1, Math.ceil(filteredBal.length / PAGE_SIZE))
  const balPaginated  = filteredBal.slice((balPage - 1) * PAGE_SIZE, balPage * PAGE_SIZE)

  // ── shared UI pieces ───────────────────────────────────────────
  const Spinner = ({ label }) => (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#C2071A', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>{label}</div>
    </div>
  )

  const PaginationBar = ({ page, setPage, total, totalPages, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
        Showing <strong>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong> {label}
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151' }}>
          ‹ Prev
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? <span key={`d${i}`} style={{ padding: '6px 8px', color: '#94a3b8' }}>…</span> : (
            <button key={p} onClick={() => setPage(p)}
              style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: page === p ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg,#C2071A,#941018)' : '#fff', color: page === p ? '#fff' : '#374151', boxShadow: page === p ? '0 2px 8px rgba(194,7,26,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p}
            </button>
          )
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151' }}>
          Next ›
        </button>
      </div>
    </div>
  )

  const selStyle = { padding: '8px 11px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }
  const MonthYearPicker = ({ month, setMonth, year, setYear, onChangePage }) => (
    <>
      <select value={month} onChange={e => { setMonth(parseInt(e.target.value, 10)); onChangePage() }} style={selStyle}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select value={year} onChange={e => { setYear(parseInt(e.target.value, 10)); onChangePage() }} style={selStyle}>
        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </>
  )

  const TABS = [
    { key: 'requests', label: 'Permission Requests', icon: <FiList size={13} /> },
    { key: 'balances', label: 'Employee Balances',   icon: <FiUsers size={13} /> },
    { key: 'settings', label: 'Policy Settings',     icon: <FiSettings size={13} /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="permissions" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Page Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#C2071A,#941018)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiShield size={18} color="#fff" />
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Permission Management</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Configure monthly permission policy, review requests, and monitor employee balances
              </p>
            </div>

            {settings && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#feecee', border: '1px solid #f7a6af', borderRadius: '12px', padding: '10px 16px' }}>
                <div style={{ width: 26, height: 26, borderRadius: '8px', background: '#C2071A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiInfo size={13} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#941018' }}>Active Policy</div>
                  <div style={{ fontSize: '11px', color: '#C2071A' }}>
                    {settings.monthly_count} permission{settings.monthly_count !== 1 ? 's' : ''} × {settings.hours_per_permission}h each · credited 1st of every month
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: 4, width: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.15s',
                  background: activeTab === t.key ? 'linear-gradient(135deg,#C2071A,#941018)' : 'transparent',
                  color:      activeTab === t.key ? '#fff' : '#64748b',
                  boxShadow:  activeTab === t.key ? '0 2px 8px rgba(194,7,26,0.3)' : 'none',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ══ REQUESTS TAB ══ */}
          {activeTab === 'requests' && (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
                {[
                  { key: 'ALL',      label: 'Total',    value: stats.total,    color: '#C2071A', icon: <FiList size={18} color="#ffffff" /> },
                  { key: 'PENDING',  label: 'Pending',  value: stats.pending,  color: '#b45309', icon: <FiClock size={18} color="#ffffff" /> },
                  { key: 'APPROVED', label: 'Approved', value: stats.approved, color: '#15803d', icon: <FiCheckCircle size={18} color="#ffffff" /> },
                  { key: 'REJECTED', label: 'Rejected', value: stats.rejected, color: '#b91c1c', icon: <FiXCircle size={18} color="#ffffff" /> },
                ].map(({ key, label, value, color, icon }) => {
                  const active = statusFilter === key
                  return (
                    <div key={key} onClick={() => { setStatusFilter(key); setReqPage(1) }}
                      style={{ background: '#fff', border: `1.5px solid ${active ? color : '#e2e8f0'}`, borderRadius: '14px', padding: '18px 20px', boxShadow: active ? `0 4px 14px ${color}22` : '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '12px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: active ? color : '#0f172a', lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: 3 }}>{label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Filter Bar */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: '200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px' }}>
                    <FiSearch size={13} color="#94a3b8" />
                    <input placeholder="Search name, code, reason…" value={search}
                      onChange={e => { setSearch(e.target.value); setReqPage(1) }}
                      style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                    {search && <button onClick={() => { setSearch(''); setReqPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}><FiX size={12} /></button>}
                  </div>
                  <MonthYearPicker month={monthFilter} setMonth={setMonthFilter} year={yearFilter} setYear={setYearFilter} onChangePage={() => setReqPage(1)} />
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{filteredReq.length} request{filteredReq.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              {/* Status Pills */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '16px' }}>
                {[{ val: 'ALL', label: 'All', count: requests.length, color: '#C2071A' }, { val: 'PENDING', label: 'Pending', count: stats.pending, color: '#b45309' }, { val: 'APPROVED', label: 'Approved', count: stats.approved, color: '#15803d' }, { val: 'REJECTED', label: 'Rejected', count: stats.rejected, color: '#b91c1c' }].map(o => (
                  <button key={o.val} onClick={() => { setStatusFilter(o.val); setReqPage(1) }} style={{ padding: '7px 16px', borderRadius: '20px', border: `1.5px solid ${statusFilter === o.val ? o.color : '#e2e8f0'}`, background: statusFilter === o.val ? o.color : '#fff', color: statusFilter === o.val ? '#fff' : '#475569', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {o.label}
                    <span style={{ background: statusFilter === o.val ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: statusFilter === o.val ? '#fff' : '#374151', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' }}>{o.count}</span>
                  </button>
                ))}
              </div>

              {/* Requests Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {reqLoading ? <Spinner label="Loading permission requests…" /> : filteredReq.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><FiShield size={22} color="#ffffff" /></div>
                    <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700' }}>No permission requests for {MONTHS[monthFilter - 1]} {yearFilter}</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          {['Employee', 'Date', 'Time', 'Duration', 'Reason', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reqPaginated.map((r, idx) => {
                          const sc = STATUS_COLORS[r.status] || STATUS_COLORS.PENDING
                          return (
                            <tr key={r.permission_request_id}
                              style={{ borderBottom: idx < reqPaginated.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.employee_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>{r.employee_code}</div>
                              </td>
                              <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: '#374151', fontWeight: '600' }}>{fmtDate(r.permission_date)}</td>
                              <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</span>
                              </td>
                              <td style={{ padding: '14px 18px', fontWeight: '700', color: '#374151' }}>{r.duration_hours}h</td>
                              <td style={{ padding: '14px 18px', maxWidth: 180 }}>
                                <div style={{ color: '#475569', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || <span style={{ color: '#94a3b8' }}>—</span>}</div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sc.label}</span>
                                {r.rejection_reason && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 3, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rejection_reason}</div>}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                {r.status === 'PENDING' ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => handleApprove(r.permission_request_id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#15803d', color: '#ffffff', border: '1px solid #15803d', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#166534'}
                                      onMouseLeave={e => e.currentTarget.style.background = '#15803d'}>
                                      <FiCheck size={11} color="#ffffff" /> Approve
                                    </button>
                                    <button onClick={() => { setRejectModal({ id: r.permission_request_id, name: r.employee_name }); setRejectReason('') }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#b91c1c', color: '#ffffff', border: '1px solid #b91c1c', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
                                      onMouseLeave={e => e.currentTarget.style.background = '#b91c1c'}>
                                      <FiX size={11} color="#ffffff" /> Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{r.approved_by_name ? `by ${r.approved_by_name}` : '—'}</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {!reqLoading && filteredReq.length > PAGE_SIZE && <PaginationBar page={reqPage} setPage={setReqPage} total={filteredReq.length} totalPages={reqTotalPages} label="requests" />}
            </>
          )}

          {/* ══ BALANCES TAB ══ */}
          {activeTab === 'balances' && (
            <>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: '200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px' }}>
                  <FiSearch size={13} color="#94a3b8" />
                  <input placeholder="Search employee name or code…" value={balSearch}
                    onChange={e => { setBalSearch(e.target.value); setBalPage(1) }}
                    style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                  {balSearch && <button onClick={() => { setBalSearch(''); setBalPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}><FiX size={12} /></button>}
                </div>
                <MonthYearPicker month={balMonth} setMonth={setBalMonth} year={balYear} setYear={setBalYear} onChangePage={() => setBalPage(1)} />
                <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{filteredBal.length} employee{filteredBal.length !== 1 ? 's' : ''}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {balLoading ? <Spinner label="Loading balances…" /> : filteredBal.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><FiUsers size={22} color="#ffffff" /></div>
                    <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>No balance records for {MONTHS[balMonth - 1]} {balYear}</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>Balances are credited on the 1st of each month</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          {['Employee', 'Month / Year', 'Allocated', 'Used', 'Remaining', 'Usage'].map(h => (
                            <th key={h} style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {balPaginated.map((b, idx) => {
                          const remaining = b.allocated_count - b.used_count
                          const usePct = b.allocated_count > 0 ? Math.round((b.used_count / b.allocated_count) * 100) : 0
                          const barColor = usePct >= 100 ? '#b91c1c' : usePct >= 50 ? '#b45309' : '#15803d'
                          return (
                            <tr key={b.balance_id}
                              style={{ borderBottom: idx < balPaginated.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{b.employee_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>{b.employee_code}</div>
                              </td>
                              <td style={{ padding: '14px 18px', fontWeight: '700', color: '#374151' }}>{MONTHS[b.month - 1]} {b.year}</td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 30, borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#374151', fontWeight: '800', fontSize: '14px', padding: '0 10px' }}>{b.allocated_count}</div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 30, borderRadius: '8px', background: b.used_count > 0 ? '#feecee' : '#f8fafc', border: `1px solid ${b.used_count > 0 ? '#f7a6af' : '#e2e8f0'}`, color: b.used_count > 0 ? '#941018' : '#94a3b8', fontWeight: '800', fontSize: '14px', padding: '0 10px' }}>{b.used_count}</div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 30, borderRadius: '8px', background: remaining <= 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${remaining <= 0 ? '#fecaca' : '#bbf7d0'}`, color: remaining <= 0 ? '#b91c1c' : '#15803d', fontWeight: '800', fontSize: '14px', padding: '0 10px' }}>{remaining}</span>
                              </td>
                              <td style={{ padding: '14px 18px', minWidth: 120 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${usePct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: '11px', fontWeight: '700', color: barColor, minWidth: 30 }}>{usePct}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {!balLoading && filteredBal.length > PAGE_SIZE && <PaginationBar page={balPage} setPage={setBalPage} total={filteredBal.length} totalPages={balTotalPages} label="employees" />}
            </>
          )}

          {/* ══ SETTINGS TAB ══ */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* Card header */}
                <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg,#C2071A,#941018)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiSettings size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Monthly Permission Policy</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>Configure how many permissions employees receive each month and their duration</div>
                  </div>
                </div>

                {settingsLoading ? <Spinner label="Loading settings…" /> : (
                  <form onSubmit={handleSaveSettings} style={{ padding: '28px' }}>

                    {/* Monthly Count */}
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Permissions Per Month *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number" min="1" max="30" step="1"
                          value={monthlyCount}
                          onChange={e => setMonthlyCount(e.target.value)}
                          style={{ ...inp, width: 100 }}
                          required
                        />
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                          permissions credited to each employee every month
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6 }}>
                        Current: <strong style={{ color: '#941018' }}>{settings?.monthly_count ?? '—'}</strong> permissions/month
                      </div>
                    </div>

                    {/* Hours Per Permission */}
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Hours Per Permission *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number" min="0.5" max="12" step="0.5"
                          value={hoursPerPerm}
                          onChange={e => setHoursPerPerm(e.target.value)}
                          style={{ ...inp, width: 100 }}
                          required
                        />
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>hours per permission request</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6 }}>
                        Current: <strong style={{ color: '#941018' }}>{settings?.hours_per_permission ?? '—'}</strong> hours per permission
                      </div>
                    </div>

                    {/* Pro-rata on Join */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={proRata}
                          onChange={e => setProRata(e.target.checked)}
                          style={{ marginTop: 2, width: 16, height: 16, accentColor: '#C2071A', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>Pro-rata credit on joining</div>
                          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                            When enabled, new employees joining mid-month receive a proportional number of permissions for their first month based on their joining date.
                            For example, joining on the 15th of a 30-day month gives <strong>ceil(monthly_count × 16/30)</strong> permissions.
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Policy Preview */}
                    <div style={{ background: '#feecee', border: '1px solid #f7a6af', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#C2071A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <FiInfo size={13} color="#ffffff" />
                      </div>
                      <div style={{ fontSize: '12px', color: '#7c0a1a', lineHeight: 1.6 }}>
                        <strong>Effective policy:</strong> Each employee will receive <strong>{monthlyCount || '?'} permission{parseInt(monthlyCount) !== 1 ? 's' : ''}</strong> of <strong>{hoursPerPerm || '?'} hour{parseFloat(hoursPerPerm) !== 1 ? 's' : ''} each</strong> on the <strong>1st of every month at midnight</strong>.
                        {proRata && ' New joiners receive a pro-rata allocation for their first month.'}
                      </div>
                    </div>

                    {/* Feedback message */}
                    {settingsMsg && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                        background: settingsMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color:      settingsMsg.type === 'success' ? '#15803d' : '#b91c1c',
                        border:     `1px solid ${settingsMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: settingsMsg.type === 'success' ? '#15803d' : '#b91c1c',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {settingsMsg.type === 'success' ? <FiCheck size={12} color="#ffffff" /> : <FiX size={12} color="#ffffff" />}
                        </div>
                        {settingsMsg.text}
                      </div>
                    )}

                    <button type="submit" disabled={settingsSaving}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 24px', background: settingsSaving ? 'rgba(194,7,26,0.5)' : 'linear-gradient(135deg,#C2071A,#941018)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: settingsSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(194,7,26,0.35)' }}
                      onMouseEnter={e => { if (!settingsSaving) e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <FiSave size={14} />
                      {settingsSaving ? 'Saving…' : 'Save Settings'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '420px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiXCircle size={18} color="#ffffff" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Reject Permission</h3>
              </div>
              <button onClick={() => setRejectModal(null)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={14} />
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#475569' }}>
              Rejecting <strong style={{ color: '#0f172a' }}>{rejectModal.name}</strong>'s permission request.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason (optional)</label>
              <textarea rows={3} placeholder="Briefly explain why the request is being rejected…"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setRejectModal(null)}
                style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleReject}
                style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(185,28,28,0.3)' }}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
