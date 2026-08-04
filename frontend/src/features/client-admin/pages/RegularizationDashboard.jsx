import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiCheckCircle, FiXCircle, FiX, FiSearch, FiDownload, FiSettings, FiList, FiClock, FiCalendar, FiFilter } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_STYLE = {
  PENDING:  { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  APPROVED: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
}

const PAGE_SIZE = 10

function exportRegCSV(rows) {
  const headers = ['Employee', 'Code', 'Date', 'Type', 'Req Check-in', 'Req Check-out', 'Status', 'Manager', 'Reason']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.first_name} ${r.last_name}"`,
      `"${r.employee_code || ''}"`,
      `"${r.attendance_date ? r.attendance_date.split('T')[0] : ''}"`,
      `"${r.regularization_type?.replace(/_/g, ' ') || ''}"`,
      `"${r.requested_checkin_time ? r.requested_checkin_time.split('T')[1]?.slice(0, 5) : ''}"`,
      `"${r.requested_checkout_time ? r.requested_checkout_time.split('T')[1]?.slice(0, 5) : ''}"`,
      `"${r.current_status || ''}"`,
      `"${r.manager_first_name ? r.manager_first_name + ' ' + r.manager_last_name : ''}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
    ].join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `regularizations-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function formatTimeStr(isoString) {
  if (!isoString) return '—'
  const parts = isoString.split('T')
  return parts.length < 2 ? isoString : parts[1].slice(0, 5)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export default function RegularizationDashboard() {
  const [requests, setRequests]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [page, setPage]               = useState(1)

  const [monthlyLimit, setMonthlyLimit] = useState(5)
  const [cutoffDay, setCutoffDay]       = useState(5)
  const [allowHoliday, setAllowHoliday] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError]   = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')

  const [modal, setModal]       = useState(null)
  const [remarks, setRemarks]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  function loadSettings() {
    api.get('/v1/admin/regularizations/settings')
      .then(res => {
        const { data } = res.data
        setMonthlyLimit(data.regularization_monthly_limit)
        setCutoffDay(data.regularization_cutoff_day)
        setAllowHoliday(data.allow_holiday_regularization)
      })
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
      })
  }

  function loadRequests() {
    setLoading(true)
    api.get('/v1/admin/regularizations', { params: { status: statusFilter || undefined } })
      .then(res => setRequests(res.data?.data || []))
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { loadRequests(); setPage(1) }, [statusFilter])

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSavingSettings(true); setSettingsError(''); setSettingsSuccess('')
    try {
      await api.put('/v1/admin/regularizations/settings', {
        regularization_monthly_limit: parseInt(monthlyLimit),
        regularization_cutoff_day: parseInt(cutoffDay),
        allow_holiday_regularization: allowHoliday
      })
      setSettingsSuccess('Policy configuration saved successfully.')
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Failed to update settings.')
      if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally {
      setSavingSettings(false)
    }
  }

  function openModal(action, request) {
    setModal({ action, request }); setRemarks(''); setModalError('')
  }

  async function handleSubmitAction() {
    if (!modal) return
    if (modal.action === 'reject' && !remarks.trim()) { setModalError('Rejection reason is required.'); return }
    setSubmitting(true); setModalError('')
    api.post(`/v1/admin/regularizations/${modal.request.regularization_id}/${modal.action}`, { rejection_reason: remarks })
      .then(() => { setModal(null); loadRequests() })
      .catch(err => setModalError(err.response?.data?.message || 'Action failed.'))
      .finally(() => setSubmitting(false))
  }

  const uniqueTypes = useMemo(() => {
    const set = new Set(requests.map(r => r.regularization_type).filter(Boolean))
    return Array.from(set).sort()
  }, [requests])

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (search) {
        const q = search.toLowerCase()
        const match = `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
          (r.employee_code || '').toLowerCase().includes(q)
        if (!match) return false
      }
      if (typeFilter && r.regularization_type !== typeFilter) return false
      if (dateFrom) {
        const d = r.attendance_date?.split('T')[0]
        if (!d || d < dateFrom) return false
      }
      if (dateTo) {
        const d = r.attendance_date?.split('T')[0]
        if (!d || d > dateTo) return false
      }
      return true
    })
  }, [requests, search, typeFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const paginatedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    total:    requests.length,
    pending:  requests.filter(r => r.current_status === 'PENDING').length,
    approved: requests.filter(r => r.current_status === 'APPROVED').length,
    rejected: requests.filter(r => r.current_status === 'REJECTED').length,
  }), [requests])

  function resetFilters() {
    setSearch(''); setTypeFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1)
  }

  const hasActiveFilters = search || typeFilter || statusFilter || dateFrom || dateTo

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="regularizations" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Page Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiList size={18} color="#fff" />
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Regularizations Dashboard</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Manage organizational regularization policies and monitor attendance correction requests
              </p>
            </div>
            {filteredRequests.length > 0 && (
              <button
                onClick={() => exportRegCSV(filteredRequests)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                <FiDownload size={14} /> Export CSV
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Requests', value: stats.total, color: '#6366f1', bg: '#eef2ff', icon: <FiList size={18} color="#6366f1" /> },
              { label: 'Pending',        value: stats.pending,  color: '#d97706', bg: '#fffbeb', icon: <FiClock size={18} color="#d97706" /> },
              { label: 'Approved',       value: stats.approved, color: '#16a34a', bg: '#f0fdf4', icon: <FiCheckCircle size={18} color="#16a34a" /> },
              { label: 'Rejected',       value: stats.rejected, color: '#dc2626', bg: '#fef2f2', icon: <FiXCircle size={18} color="#dc2626" /> },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: 3 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Policy Settings */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '18px' }}>
              <FiSettings size={15} color="#6366f1" />
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: '800' }}>Policy Settings Configuration</h3>
            </div>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Requests Per Employee</label>
                <select
                  value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} required
                  style={{ padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', color: '#0f172a', outline: 'none', width: '160px', fontFamily: 'inherit', background: '#f8fafc', cursor: 'pointer' }}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'request' : 'requests'}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Day of Month to Regularize</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>By</span>
                  <input
                    type="number" value={cutoffDay} onChange={e => setCutoffDay(e.target.value)} min="1" max="28" required
                    style={{ padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', color: '#0f172a', outline: 'none', width: '90px', fontFamily: 'inherit', background: '#f8fafc' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>of same month</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: '2px' }}>
                <input
                  type="checkbox" id="allowHoliday" checked={allowHoliday} onChange={e => setAllowHoliday(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                <label htmlFor="allowHoliday" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '600' }}>
                  Allow Regularization on Holidays
                </label>
              </div>
              <button
                type="submit" disabled={savingSettings}
                style={{ padding: '9px 20px', background: savingSettings ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: savingSettings ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                <FiSettings size={13} />
                {savingSettings ? 'Saving…' : 'Save Configuration'}
              </button>
            </form>
            {settingsError   && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '10px', fontWeight: '600' }}>{settingsError}</div>}
            {settingsSuccess && <div style={{ color: '#15803d', fontSize: '12px', marginTop: '10px', fontWeight: '600' }}>{settingsSuccess}</div>}
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: '200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 12px' }}>
                <FiSearch size={14} color="#94a3b8" />
                <input
                  placeholder="Search employee name or code…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ border: 'none', background: 'transparent', padding: '9px 0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%' }}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                    <FiX size={13} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                style={{ padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
                style={{ padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
              >
                <option value="">All Types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCalendar size={13} color="#94a3b8" />
                <input
                  type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                  style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
                <input
                  type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                  style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}
                >
                  <FiX size={12} /> Clear
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiFilter size={12} color="#94a3b8" />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  {filteredRequests.length} of {requests.length} result{filteredRequests.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading requests…</div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiList size={22} color="#94a3b8" />
                </div>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>No regularization requests found</div>
                {hasActiveFilters && (
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Try adjusting your filters or{' '}
                    <span onClick={resetFilters} style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}>clear all</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Employee', 'Date', 'Type', 'Check-in', 'Check-out', 'Status', 'Manager', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((r, idx) => {
                      const badge = STATUS_STYLE[r.current_status] || STATUS_STYLE.PENDING
                      return (
                        <tr
                          key={r.regularization_id}
                          style={{ borderBottom: idx < paginatedRequests.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                                {r.first_name?.[0]}{r.last_name?.[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>{r.first_name} {r.last_name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{r.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontWeight: '700', color: '#6366f1', fontSize: '13px' }}>{fmtDate(r.attendance_date)}</span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                              {r.regularization_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#374151', fontWeight: '600', fontFamily: 'monospace' }}>{formatTimeStr(r.requested_checkin_time)}</td>
                          <td style={{ padding: '14px 18px', color: '#374151', fontWeight: '600', fontFamily: 'monospace' }}>{formatTimeStr(r.requested_checkout_time)}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {r.current_status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#374151', fontWeight: '500' }}>
                            {r.manager_first_name ? `${r.manager_first_name} ${r.manager_last_name}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {r.current_status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => openModal('approve', r)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4' }}
                                >
                                  <FiCheckCircle size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => openModal('reject', r)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                                >
                                  <FiXCircle size={12} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
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

          {/* Pagination */}
          {!loading && filteredRequests.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', marginTop: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredRequests.length)}</strong> of <strong style={{ color: '#374151' }}>{filteredRequests.length}</strong> results
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', transition: 'all 0.15s' }}
                >
                  ‹ Prev
                </button>

                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '13px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: page === p ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff', color: page === p ? '#fff' : '#374151', boxShadow: page === p ? '0 2px 8px rgba(99,102,241,0.3)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', transition: 'all 0.15s' }}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Approve / Reject Modal */}
      {modal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '480px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: modal.action === 'approve' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {modal.action === 'approve'
                    ? <FiCheckCircle size={18} color="#15803d" />
                    : <FiXCircle size={18} color="#dc2626" />}
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  {modal.action === 'approve' ? 'Approve Regularization' : 'Reject Regularization'}
                </h3>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <FiX size={14} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                  {modal.request.first_name?.[0]}{modal.request.last_name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{modal.request.first_name} {modal.request.last_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{modal.request.employee_code}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 2, fontWeight: '600' }}>Type</div>
                  <div style={{ color: '#374151', fontWeight: '700' }}>{modal.request.regularization_type.replace(/_/g, ' ')}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 2, fontWeight: '600' }}>Date</div>
                  <div style={{ color: '#374151', fontWeight: '700' }}>{fmtDate(modal.request.attendance_date)}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 2, fontWeight: '600' }}>Req. Check-in</div>
                  <div style={{ color: '#374151', fontWeight: '700', fontFamily: 'monospace' }}>{formatTimeStr(modal.request.requested_checkin_time)}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 2, fontWeight: '600' }}>Req. Check-out</div>
                  <div style={{ color: '#374151', fontWeight: '700', fontFamily: 'monospace' }}>{formatTimeStr(modal.request.requested_checkout_time)}</div>
                </div>
              </div>
              {modal.request.reason && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                  "{modal.request.reason}"
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Remarks {modal.action === 'reject' ? <span style={{ color: '#dc2626' }}>*</span> : <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>}
              </label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={modal.action === 'approve' ? 'Add a note (optional)…' : 'Reason for rejection…'}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#0f172a', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }}
              />
            </div>

            {modalError && <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>{modalError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setModal(null)}
                style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={submitting}
                style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', background: modal.action === 'approve' ? (submitting ? '#86efac' : 'linear-gradient(135deg,#16a34a,#15803d)') : (submitting ? '#fca5a5' : 'linear-gradient(135deg,#dc2626,#b91c1c)'), color: '#fff', boxShadow: modal.action === 'approve' ? '0 4px 12px rgba(22,163,74,0.3)' : '0 4px 12px rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                {modal.action === 'approve' ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
                {submitting ? 'Processing…' : modal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
