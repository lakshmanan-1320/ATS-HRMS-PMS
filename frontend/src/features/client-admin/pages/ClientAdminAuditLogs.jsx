import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import {
  FiShield, FiSearch, FiX, FiFilter, FiChevronDown, FiChevronUp,
  FiDownload, FiRefreshCw, FiCalendar, FiLogIn, FiAlertTriangle,
  FiPlusCircle, FiEdit, FiList, FiEye, FiClock
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function exportLogsCSV(rows) {
  const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Target', 'IP Address']
  const lines = [
    headers.join(','),
    ...rows.map(l => [
      `"${new Date(l.created_at).toLocaleString()}"`,
      `"${l.actor_email || ''}"`,
      `"${l.actor_role || ''}"`,
      `"${l.action || ''}"`,
      `"${l.target || ''}"`,
      l.ip_address || '',
    ].join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function getBadgeStyle(action) {
  const a = action?.toLowerCase() || ''
  if (a.includes('login'))
    return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'Login' }
  if (a.includes('delete') || a.includes('remove'))
    return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Delete' }
  if (a.includes('update') || a.includes('edit') || a.includes('changed') || a.includes('modified'))
    return { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: 'Update' }
  if (a.includes('create') || a.includes('import') || a.includes('add'))
    return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', label: 'Create' }
  if (a.includes('logout') || a.includes('password') || a.includes('security'))
    return { bg: '#f3e8ff', color: '#7c3aed', border: '#e9d5ff', label: 'Security' }
  return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'Other' }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ClientAdminAuditLogs() {
  const [logs, setLogs]         = useState([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Pagination
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(20)

  // Filters (all server-side)
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Detail modal
  const [activeLog, setActiveLog] = useState(null)

  const load = useCallback((pg = 1) => {
    setLoading(true); setError(null)
    api.get('/client-admin/audit-logs', {
      params: {
        page: pg, limit,
        from_date:  fromDate  || undefined,
        to_date:    toDate    || undefined,
        action:     actionFilter || undefined,
        search:     search    || undefined,
      }
    })
      .then(r => {
        setLogs(r.data.logs || [])
        setTotal(r.data.total || 0)
        setTotalPages(r.data.totalPages || 1)
      })
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
        setError(err.response?.data?.message || 'Failed to load audit logs')
      })
      .finally(() => setLoading(false))
  }, [limit, fromDate, toDate, actionFilter, search])

  useEffect(() => { load(page) }, [load, page])

  // When filters change, reset to page 1
  useEffect(() => { setPage(1) }, [limit, fromDate, toDate, actionFilter, search])

  function applySearch() {
    setSearch(searchInput)
    setPage(1)
  }

  function clearSearch() {
    setSearchInput(''); setSearch(''); setPage(1)
  }

  function resetAll() {
    setSearchInput(''); setSearch(''); setActionFilter('')
    setFromDate(''); setToDate(''); setPage(1)
  }

  const hasAnyFilter       = search || actionFilter || fromDate || toDate
  const hasAdvancedFilters = actionFilter || fromDate || toDate

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map(l => l.action).filter(Boolean))
    return Array.from(set).sort()
  }, [logs])

  // Summary counts from current page (server sends full total)
  const pageCounts = useMemo(() => ({
    login:    logs.filter(l => l.action?.toLowerCase().includes('login')).length,
    create:   logs.filter(l => getBadgeStyle(l.action).label === 'Create').length,
    update:   logs.filter(l => getBadgeStyle(l.action).label === 'Update').length,
    security: logs.filter(l => ['Delete','Security'].includes(getBadgeStyle(l.action).label)).length,
  }), [logs])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="audit" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiShield size={18} color="#fff" />
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Audit Logs</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Track your administrative actions and security events
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {logs.length > 0 && (
                <button
                  onClick={() => exportLogsCSV(logs)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  <FiDownload size={13} /> Export CSV
                </button>
              )}
              <button
                onClick={() => load(page)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', opacity: loading ? 0.7 : 1 }}>
                <FiRefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Events',    value: total,             color: '#6366f1', bg: '#eef2ff', icon: <FiList size={18} color="#6366f1" /> },
              { label: 'Login Events',    value: pageCounts.login,  color: '#16a34a', bg: '#f0fdf4', icon: <FiLogIn size={18} color="#16a34a" /> },
              { label: 'Data Changes',    value: pageCounts.create + pageCounts.update, color: '#0369a1', bg: '#f0f9ff', icon: <FiEdit size={18} color="#0369a1" /> },
              { label: 'Security Events', value: pageCounts.security, color: '#dc2626', bg: '#fef2f2', icon: <FiAlertTriangle size={18} color="#dc2626" /> },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: 3 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search — press Enter or click the icon to apply */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', minWidth: '220px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px' }}>
                <button
                  onClick={applySearch}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  <FiSearch size={13} color="#94a3b8" />
                </button>
                <input
                  placeholder="Search actor email or target…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applySearch()}
                  style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%' }}
                />
                {searchInput && (
                  <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                    <FiX size={12} />
                  </button>
                )}
              </div>

              {/* Date range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCalendar size={13} color="#94a3b8" />
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
                  style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
                <input type="date" value={toDate} min={fromDate || undefined} onChange={e => { setToDate(e.target.value); setPage(1) }}
                  style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', background: showAdvanced || hasAdvancedFilters ? '#eef2ff' : '#f8fafc', border: `1px solid ${showAdvanced || hasAdvancedFilters ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: showAdvanced || hasAdvancedFilters ? '#4f46e5' : '#374151', cursor: 'pointer' }}>
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
                  {total} event{total !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action Type</label>
                  <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
                    style={{ padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '180px' }}>
                    <option value="">All Actions</option>
                    {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rows per Page</label>
                  <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                    style={{ padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '120px' }}>
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} per page</option>)}
                  </select>
                </div>

                {hasAdvancedFilters && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '10px', color: 'transparent' }}>&nbsp;</label>
                    <button onClick={() => { setActionFilter(''); setFromDate(''); setToDate(''); setPage(1) }}
                      style={{ padding: '7px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action quick-filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { val: '',        label: 'All Events',     color: '#6366f1' },
              { val: 'Login',   label: 'Login',          color: '#16a34a' },
              { val: 'Create',  label: 'Create / Import',color: '#0369a1' },
              { val: 'Update',  label: 'Update / Edit',  color: '#a16207' },
              { val: 'Delete',  label: 'Delete',         color: '#dc2626' },
            ].map(o => {
              const active = actionFilter === o.val || (o.val === '' && !actionFilter)
              return (
                <button key={o.val}
                  onClick={() => {
                    setActionFilter(o.val); setPage(1)
                  }}
                  style={{
                    padding: '7px 16px', borderRadius: '20px',
                    border: `1.5px solid ${active ? o.color : '#e2e8f0'}`,
                    background: active ? o.color : '#fff',
                    color: active ? '#fff' : '#475569',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {o.label}
                </button>
              )
            })}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading audit logs…</div>
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: 10 }}>⚠️</div>
                <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: '600', marginBottom: 12 }}>{error}</div>
                <button onClick={() => load(page)} style={{ padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiShield size={22} color="#94a3b8" />
                </div>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>
                  {hasAnyFilter ? 'No events match the current filters' : 'No audit events recorded yet'}
                </div>
                {hasAnyFilter && (
                  <span onClick={resetAll} style={{ color: '#6366f1', fontSize: '13px', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>
                    Clear all filters
                  </span>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Timestamp', 'Actor', 'Action', 'Target', 'IP Address', 'Details'].map(h => (
                        <th key={h} style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => {
                      const badge = getBadgeStyle(log.action)
                      return (
                        <tr
                          key={log.id}
                          style={{ borderBottom: idx < logs.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setActiveLog(log)}
                        >
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <FiClock size={12} color="#94a3b8" />
                              <span style={{ fontWeight: '600', color: '#374151', fontSize: '12px' }}>{fmtDate(log.created_at)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: '12px', color: '#6366f1', fontFamily: 'monospace', fontWeight: '600' }}>{log.actor_email || '—'}</div>
                            {log.actor_role && (
                              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' }}>{log.actor_role.replace(/_/g, ' ')}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: '700',
                              padding: '4px 10px', borderRadius: '6px',
                              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                              textTransform: 'capitalize', letterSpacing: '0.04em', whiteSpace: 'nowrap'
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#374151', fontWeight: '500', maxWidth: '220px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.target || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                              {log.ip_address || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <button
                              onClick={e => { e.stopPropagation(); setActiveLog(log) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#f8fafc', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                              <FiEye size={11} /> View
                            </button>
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
          {!loading && !error && total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * limit) + 1}–{Math.min(page * limit, total)}</strong> of <strong style={{ color: '#374151' }}>{total}</strong> events
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151' }}>
                  ‹ Prev
                </button>

                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`d${i}`} style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '13px' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: page === p ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff', color: page === p ? '#fff' : '#374151', boxShadow: page === p ? '0 2px 8px rgba(99,102,241,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151' }}>
                  Next ›
                </button>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Detail Modal */}
      {activeLog && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setActiveLog(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '540px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflowY: 'auto', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiShield size={18} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Event Details</h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={14} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px 18px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                {[
                  { label: 'Timestamp',  value: fmtDate(activeLog.created_at) },
                  { label: 'IP Address', value: activeLog.ip_address || '—' },
                  { label: 'Actor',      value: activeLog.actor_email || '—', mono: true, color: '#6366f1' },
                  { label: 'Role',       value: activeLog.actor_role?.replace(/_/g, ' ') || '—' },
                  { label: 'Target',     value: activeLog.target || '—' },
                ].map(({ label, value, mono, color }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#94a3b8', marginBottom: 4, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ color: color || '#0f172a', fontWeight: '700', fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? '11px' : '12px', wordBreak: 'break-all' }}>{value}</div>
                  </div>
                ))}
                <div style={{ background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</div>
                  <span style={{
                    display: 'inline-flex', fontSize: '11px', fontWeight: '700',
                    padding: '4px 10px', borderRadius: '6px',
                    background: getBadgeStyle(activeLog.action).bg,
                    color: getBadgeStyle(activeLog.action).color,
                    border: `1px solid ${getBadgeStyle(activeLog.action).border}`,
                    textTransform: 'capitalize'
                  }}>
                    {activeLog.action}
                  </span>
                </div>
              </div>
            </div>

            {activeLog.metadata && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Event Metadata
                </div>
                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '16px', borderRadius: '12px', fontSize: '11px', overflowX: 'auto', maxHeight: '200px', margin: 0, fontFamily: 'monospace', lineHeight: 1.6 }}>
                  {JSON.stringify(activeLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <button
              onClick={() => setActiveLog(null)}
              style={{ width: '100%', marginTop: '18px', padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
