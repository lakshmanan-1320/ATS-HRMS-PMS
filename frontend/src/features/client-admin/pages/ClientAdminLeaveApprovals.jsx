import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import {
  FiRefreshCw, FiCheckCircle, FiCheckSquare, FiXCircle, FiSearch, FiX,
  FiDownload, FiFilter, FiCalendar, FiClock, FiList,
  FiChevronDown, FiChevronUp, FiUser, FiAlertTriangle
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_STYLE = {
  PENDING:   { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  APPROVED:  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  REJECTED:  { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  CANCELLED: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
}

const PAGE_SIZE = 10

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function exportToCSV(rows) {
  const headers = ['Employee', 'Code', 'Leave Type', 'From', 'To', 'Days', 'Manager', 'Applied On', 'Status']
  const lines = [
    headers.join(','),
    ...rows.map(l => [
      `"${l.employee_name || ''}"`,
      l.employee_code || '',
      `"${l.leave_type_name || ''}"`,
      l.start_date ? new Date(l.start_date).toLocaleDateString('en-IN') : '',
      l.end_date   ? new Date(l.end_date).toLocaleDateString('en-IN')   : '',
      l.total_leave_days || '',
      `"${l.manager_name || ''}"`,
      l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '',
      l.current_status || '',
    ].join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `leave-approvals-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export default function ClientAdminLeaveApprovals() {
  const [leaves, setLeaves]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [page, setPage]             = useState(1)

  // Filters
  const [statusFilter, setStatus]   = useState('ALL')
  const [search, setSearch]         = useState('')
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('')
  const [managerFilter, setManagerFilter]     = useState('')
  const [sortBy, setSortBy]         = useState('created_at')
  const [sortDir, setSortDir]       = useState('desc')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Modal
  const [modal, setModal]           = useState(null)
  const [remarks, setRemarks]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [balances, setBalances]     = useState([])
  const [loadingBalance, setLoadingBalance] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const params = {}
    if (fromDate) params.from_date = fromDate
    if (toDate)   params.to_date   = toDate
    api.get('/v1/leave/admin/leaves', { params })
      .then(r => { setLeaves(r.data); setPage(1) })
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
        setError(err.response?.data?.message || 'Failed to load leave requests')
      })
      .finally(() => setLoading(false))
  }, [fromDate, toDate])

  useEffect(() => { load() }, [load])

  const uniqueLeaveTypes = useMemo(() => [...new Set(leaves.map(l => l.leave_type_name).filter(Boolean))].sort(), [leaves])
  const uniqueManagers   = useMemo(() => [...new Set(leaves.map(l => l.manager_name).filter(Boolean))].sort(), [leaves])

  const counts = useMemo(() => ({
    ALL:      leaves.length,
    PENDING:  leaves.filter(l => l.current_status === 'PENDING').length,
    APPROVED: leaves.filter(l => l.current_status === 'APPROVED').length,
    REJECTED: leaves.filter(l => l.current_status === 'REJECTED').length,
  }), [leaves])

  const filtered = useMemo(() => {
    let rows = leaves.filter(l => {
      if (statusFilter !== 'ALL' && l.current_status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (![l.employee_name, l.employee_code, l.leave_type_name].some(f => f?.toLowerCase().includes(q))) return false
      }
      if (leaveTypeFilter && l.leave_type_name !== leaveTypeFilter) return false
      if (managerFilter   && l.manager_name    !== managerFilter)   return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      const va = sortBy === 'total_leave_days' ? Number(a[sortBy]) : new Date(a[sortBy] || 0).getTime()
      const vb = sortBy === 'total_leave_days' ? Number(b[sortBy]) : new Date(b[sortBy] || 0).getTime()
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return rows
  }, [leaves, statusFilter, search, leaveTypeFilter, managerFilter, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasAdvancedFilters = leaveTypeFilter || managerFilter || sortBy !== 'created_at' || sortDir !== 'desc'
  const hasAnyFilter       = search || leaveTypeFilter || managerFilter || statusFilter !== 'ALL' || fromDate || toDate

  function resetAll() {
    setSearch(''); setStatus('ALL'); setFromDate(''); setToDate('')
    setLeaveTypeFilter(''); setManagerFilter(''); setSortBy('created_at'); setSortDir('desc'); setPage(1)
  }

  function openModal(action, leave) {
    setModal({ action, leave }); setRemarks(''); setModalError(''); setBalances([])
    setLoadingBalance(true)
    api.get(`/v1/leave/admin/employee/${leave.employee_id}/balances`)
      .then(r => setBalances(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingBalance(false))
  }

  async function handleSubmitAction() {
    if (!modal) return
    if (modal.action === 'reject' && !remarks.trim()) { setModalError('Remarks are required when rejecting.'); return }
    setSubmitting(true); setModalError('')
    api.post(`/v1/leave/admin/leaves/${modal.leave.leave_request_id}/${modal.action}`, { remarks })
      .then(() => { setModal(null); load() })
      .catch(err => setModalError(err.response?.data?.message || 'Action failed'))
      .finally(() => setSubmitting(false))
  }

  const relevantBalance = modal ? balances.find(b => b.leave_type_id === modal.leave.leave_type_id) : null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="leave-approvals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Header */}
          <PageHeader
            icon={FiCheckSquare}
            title="Leave Approvals"
            subtitle="Review and action all employee leave requests"
            actions={
              <>
                {filtered.length > 0 && (
                  <button onClick={() => exportToCSV(filtered)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                    <FiDownload size={13} /> Export CSV
                  </button>
                )}
                <button onClick={load}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#C2071A,#941018)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(194,7,26,0.3)' }}>
                  <FiRefreshCw size={13} /> Refresh
                </button>
              </>
            }
          />

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { key: 'ALL',      label: 'Total Requests', color: '#C2071A', icon: <FiList size={22} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
              { key: 'PENDING',  label: 'Pending',        color: '#d97706', icon: <FiClock size={22} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
              { key: 'APPROVED', label: 'Approved',       color: '#15803d', icon: <FiCheckCircle size={22} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
              { key: 'REJECTED', label: 'Rejected',       color: '#dc2626', icon: <FiXCircle size={22} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
            ].map(({ key, label, color, icon }) => (
              <div key={key}
                onClick={() => { setStatus(key); setPage(1) }}
                style={{ background: '#fff', border: `1.5px solid ${statusFilter === key ? color : '#e2e8f0'}`, borderRadius: '14px', padding: '18px 20px', boxShadow: statusFilter === key ? `0 4px 14px ${color}22` : '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: statusFilter === key ? color : '#0f172a', lineHeight: 1 }}>{counts[key]}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: 3 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Primary filters row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 260px', minWidth: '180px', maxWidth: '260px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px' }}>
                <FiSearch size={13} color="#94a3b8" />
                <input
                  placeholder="Search employee, code or leave type…"
                  value={search}
                  className="ca-borderless-input"
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%' }}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                    <FiX size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCalendar size={13} color="#94a3b8" />
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
                  style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
                <input type="date" value={toDate} min={fromDate || undefined} onChange={e => { setToDate(e.target.value); setPage(1) }}
                  style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
              </div>

              <button
                onClick={() => setShowAdvanced(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', background: showAdvanced || hasAdvancedFilters ? '#feecee' : '#f8fafc', border: `1px solid ${showAdvanced || hasAdvancedFilters ? '#f7a6af' : '#e2e8f0'}`, borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: showAdvanced || hasAdvancedFilters ? '#941018' : '#374151', cursor: 'pointer' }}>
                <FiFilter size={12} />
                Advanced {hasAdvancedFilters ? '•' : ''}
                {showAdvanced ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
              </button>

              {hasAnyFilter && (
                <button onClick={resetAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}>
                  <FiX size={11} /> Clear All
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <FiFilter size={12} color="#94a3b8" />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                  {filtered.length} of {leaves.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Advanced filters panel */}
            {showAdvanced && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Leave Type</label>
                  <select value={leaveTypeFilter} onChange={e => { setLeaveTypeFilter(e.target.value); setPage(1) }}
                    style={{ padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '160px' }}>
                    <option value="">All Leave Types</option>
                    {uniqueLeaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Manager</label>
                  <select value={managerFilter} onChange={e => { setManagerFilter(e.target.value); setPage(1) }}
                    style={{ padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '160px' }}>
                    <option value="">All Managers</option>
                    {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort By</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '140px' }}>
                    <option value="created_at">Applied On</option>
                    <option value="start_date">Start Date</option>
                    <option value="end_date">End Date</option>
                    <option value="total_leave_days">Days</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order</label>
                  <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {[{ val: 'desc', label: '↓ Newest' }, { val: 'asc', label: '↑ Oldest' }].map(o => (
                      <button key={o.val} onClick={() => setSortDir(o.val)}
                        style={{ padding: '7px 12px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: sortDir === o.val ? '#C2071A' : '#f8fafc', color: sortDir === o.val ? '#fff' : '#374151', transition: 'all 0.15s' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasAdvancedFilters && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>&nbsp;</label>
                    <button onClick={() => { setLeaveTypeFilter(''); setManagerFilter(''); setSortBy('created_at'); setSortDir('desc') }}
                      style={{ padding: '7px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Tab Pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { val: 'ALL',      label: 'All',      color: '#C2071A' },
              { val: 'PENDING',  label: 'Pending',  color: '#d97706' },
              { val: 'APPROVED', label: 'Approved', color: '#16a34a' },
              { val: 'REJECTED', label: 'Rejected', color: '#dc2626' },
            ].map(o => (
              <button key={o.val} onClick={() => { setStatus(o.val); setPage(1) }} style={{
                padding: '7px 16px', borderRadius: '20px',
                border: `1.5px solid ${statusFilter === o.val ? o.color : '#e2e8f0'}`,
                background: statusFilter === o.val ? o.color : '#fff',
                color: statusFilter === o.val ? '#fff' : '#475569',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s',
              }}>
                {o.label}
                <span style={{ background: statusFilter === o.val ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: statusFilter === o.val ? '#fff' : '#374151', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' }}>
                  {counts[o.val]}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#C2071A', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading leave requests…</div>
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, #dc2626 0%, #dc2626 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiAlertTriangle size={24} color="#ffffff" />
                </div>
                <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: '600', marginBottom: 12 }}>{error}</div>
                <button onClick={load} style={{ padding: '9px 20px', background: '#C2071A', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiList size={22} color="#ffffff" />
                </div>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>No leave requests match the current filters</div>
                {hasAnyFilter && (
                  <span onClick={resetAll} style={{ color: '#C2071A', fontSize: '13px', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>
                    Clear all filters
                  </span>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Manager', 'Applied On', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((l, idx) => {
                      const badge = STATUS_STYLE[l.current_status] || STATUS_STYLE.CANCELLED
                      return (
                        <tr key={l.leave_request_id}
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navbar-active-gradient, linear-gradient(135deg, #D01021 0%, #B40619 100%))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
                                {l.employee_name?.[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>{l.employee_name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{l.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              {l.leave_type_name || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: '700', color: '#C2071A', whiteSpace: 'nowrap' }}>{fmtDate(l.start_date)}</td>
                          <td style={{ padding: '14px 18px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(l.end_date)}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '8px', background: '#feecee', color: '#941018', fontWeight: '800', fontSize: '13px' }}>
                              {parseFloat(l.total_leave_days)}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#374151', fontWeight: '500', whiteSpace: 'nowrap' }}>
                            {l.manager_name
                              ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiUser size={11} color="#94a3b8" />{l.manager_name}</div>
                              : <span style={{ color: '#e2e8f0' }}>—</span>
                            }
                          </td>
                          <td style={{ padding: '14px 18px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                              {l.current_status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {l.current_status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => openModal('approve', l)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#15803d', color: '#ffffff', border: '1px solid #15803d', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#166534'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#15803d'}>
                                  <FiCheckCircle size={12} color="#ffffff" /> Approve
                                </button>
                                <button onClick={() => openModal('reject', l)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#b91c1c', color: '#ffffff', border: '1px solid #b91c1c', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#b91c1c'}>
                                  <FiXCircle size={12} color="#ffffff" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#e2e8f0', fontSize: '13px' }}>—</span>
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
          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong style={{ color: '#374151' }}>{filtered.length}</strong> requests
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#e2e8f0' : '#374151' }}>
                  ‹ Prev
                </button>

                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`d${i}`} style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '13px' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: page === p ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg,#C2071A,#941018)' : '#fff', color: page === p ? '#fff' : '#374151', boxShadow: page === p ? '0 2px 8px rgba(194,7,26,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p}
                    </button>
                  )
                )}

                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#e2e8f0' : '#374151' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '500px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: modal.action === 'approve' ? 'linear-gradient(135deg, #15803d 0%, #15803d 100%)' : 'linear-gradient(135deg, #dc2626 0%, #dc2626 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {modal.action === 'approve'
                    ? <FiCheckCircle size={18} color="#ffffff" />
                    : <FiXCircle size={18} color="#ffffff" />}
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  {modal.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
                </h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={14} />
              </button>
            </div>

            {/* Employee + request summary */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px 18px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navbar-active-gradient, linear-gradient(135deg, #D01021 0%, #B40619 100%))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>
                  {modal.leave.employee_name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{modal.leave.employee_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{modal.leave.employee_code}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                {[
                  { label: 'Leave Type',  value: modal.leave.leave_type_name },
                  { label: 'Days',        value: `${parseFloat(modal.leave.total_leave_days)} day(s)` },
                  { label: 'From',        value: fmtDate(modal.leave.start_date) },
                  { label: 'To',          value: fmtDate(modal.leave.end_date) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#94a3b8', marginBottom: 2, fontWeight: '600' }}>{label}</div>
                    <div style={{ color: '#374151', fontWeight: '700' }}>{value}</div>
                  </div>
                ))}
              </div>
              {modal.leave.leave_reason && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                  "{modal.leave.leave_reason}"
                </div>
              )}
            </div>

            {/* Balance card */}
            <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Leave Balance — {modal.leave.leave_type_name}
              </div>
              {loadingBalance ? (
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid #99f6e4', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Fetching balance…
                </div>
              ) : relevantBalance ? (
                <div style={{ display: 'flex', gap: 24 }}>
                  {[
                    { label: 'Allocated', value: parseFloat(relevantBalance.allocated_days), color: '#0f766e' },
                    { label: 'Used',      value: parseFloat(relevantBalance.used_days),      color: '#d97706' },
                    { label: 'Available', value: parseFloat(relevantBalance.available_days), color: Number(relevantBalance.available_days) <= 0 ? '#b91c1c' : '#15803d' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: item.color, lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: 4 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>No balance record found for this leave type.</div>
              )}
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: '18px' }}>
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

            {modalError && (
              <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiXCircle size={11} color="#ffffff" />
                </div>
                {modalError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmitAction} disabled={submitting}
                style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', background: modal.action === 'approve' ? (submitting ? '#86efac' : 'linear-gradient(135deg,#16a34a,#15803d)') : (submitting ? '#fca5a5' : 'linear-gradient(135deg,#dc2626,#b91c1c)'), color: '#fff', boxShadow: modal.action === 'approve' ? '0 4px 12px rgba(22,163,74,0.3)' : '0 4px 12px rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
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
