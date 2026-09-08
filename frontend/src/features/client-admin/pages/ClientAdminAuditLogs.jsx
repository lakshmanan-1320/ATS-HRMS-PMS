import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import {
  FiShield, FiSearch, FiX, FiFilter, FiChevronDown, FiChevronUp,
  FiDownload, FiRefreshCw, FiCalendar, FiLogIn, FiAlertTriangle,
  FiPlusCircle, FiEdit, FiList, FiEye, FiClock, FiCheckCircle
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
    return { bg: '#e8fbf0', color: '#0fa958', border: 'none', label: 'Login' }
  if (a.includes('delete') || a.includes('remove'))
    return { bg: '#feecee', color: '#dc2626', border: 'none', label: 'Delete' }
  if (a.includes('update') || a.includes('edit') || a.includes('changed') || a.includes('modified'))
    return { bg: '#fef3c7', color: '#d97706', border: 'none', label: 'Update' }
  if (a.includes('create') || a.includes('import') || a.includes('add'))
    return { bg: 'rgba(194, 7, 26, 0.08)', color: 'var(--primary-color, #C2071A)', border: 'none', label: 'Create' }
  if (a.includes('logout') || a.includes('password') || a.includes('security'))
    return { bg: '#f3e8ff', color: '#7c3aed', border: 'none', label: 'Security' }
  return { bg: '#f1f5f9', color: '#64748b', border: 'none', label: 'Other' }
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

  const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

  const iStyle = {
    padding: '9px 12px',
    background: '#ffffff',
    border: 'none',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
    borderRadius: 10,
    color: '#111827',
    fontSize: 12,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#111827', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="audit" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>

          {/* Header Banner */}
          <PageHeader
            icon={FiShield}
            title="Audit Logs"
            subtitle="Track administrative actions, user logins, and system-wide security events."
            actions={
              <>
                {logs.length > 0 && (
                  <button
                    onClick={() => exportLogsCSV(logs)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'linear-gradient(135deg, #0fa958 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(15, 169, 88, 0.25)', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <FiDownload size={15} color="#ffffff" /> Export CSV
                  </button>
                )}
                <button
                  onClick={() => load(page)}
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(194, 7, 26, 0.25)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <FiRefreshCw size={16} color="#ffffff" stroke="#ffffff" style={{ color: '#ffffff', stroke: '#ffffff', strokeWidth: 2.5, flexShrink: 0, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </>
            }
          />

          {/* Borderless Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Events',    value: total,             icon: <FiList size={24} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
              { label: 'Login Events',    value: pageCounts.login,  icon: <FiLogIn size={24} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
              { label: 'Data Changes',    value: pageCounts.create + pageCounts.update, icon: <FiEdit size={24} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
              { label: 'Security Events', value: pageCounts.security, icon: <FiAlertTriangle size={24} style={{ color: 'var(--primary-color, #C2071A)', stroke: 'var(--primary-color, #C2071A)' }} strokeWidth={1.75} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '20px 22px', boxShadow: cardShadow, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginTop: 4 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Borderless Filter Bar */}
          <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', boxShadow: cardShadow }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 260px', minWidth: '180px', maxWidth: '260px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px' }}>
                <button
                  onClick={applySearch}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                  <FiSearch size={14} color="#9ca3af" />
                </button>
                <input
                  placeholder="Search actor email or target…"
                  value={searchInput}
                  className="ca-borderless-input"
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applySearch()}
                  style={{ border: 'none', background: 'transparent', padding: '9px 0', fontSize: '13px', color: '#111827', outline: 'none', fontFamily: 'inherit', width: '100%' }}
                />
                {searchInput && (
                  <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                    <FiX size={13} />
                  </button>
                )}
              </div>

              {/* Date range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiCalendar size={14} color="#9ca3af" />
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
                  style={{ ...iStyle, cursor: 'pointer' }} />
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>to</span>
                <input type="date" value={toDate} min={fromDate || undefined} onChange={e => { setToDate(e.target.value); setPage(1) }}
                  style={{ ...iStyle, cursor: 'pointer' }} />
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: showAdvanced || hasAdvancedFilters ? 'rgba(194, 7, 26, 0.08)' : '#ffffff', border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: showAdvanced || hasAdvancedFilters ? 'var(--primary-color, #C2071A)' : '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                <FiFilter size={13} />
                Advanced {hasAdvancedFilters ? '•' : ''}
                {showAdvanced ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
              </button>

              {hasAnyFilter && (
                <button onClick={resetAll}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', background: '#feecee', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <FiX size={12} /> Clear All
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                  Showing {logs.length} of {total} event records
                </span>
              </div>
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action Type</label>
                  <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
                    style={{ ...iStyle, minWidth: '180px', cursor: 'pointer', fontWeight: '600' }}>
                    <option value="">All Actions</option>
                    {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rows per Page</label>
                  <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                    style={{ ...iStyle, minWidth: '130px', cursor: 'pointer', fontWeight: '600' }}>
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} per page</option>)}
                  </select>
                </div>

                {hasAdvancedFilters && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '11px', color: 'transparent' }}>&nbsp;</label>
                    <button onClick={() => { setActionFilter(''); setFromDate(''); setToDate(''); setPage(1) }}
                      style={{ padding: '9px 14px', background: '#feecee', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action quick-filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { val: '',        label: 'All Events' },
              { val: 'Login',   label: 'Login' },
              { val: 'Create',  label: 'Create / Import' },
              { val: 'Update',  label: 'Update / Edit' },
              { val: 'Delete',  label: 'Delete' },
            ].map(o => {
              const active = actionFilter === o.val || (o.val === '' && !actionFilter)
              return (
                <button key={o.val}
                  onClick={() => {
                    setActionFilter(o.val); setPage(1)
                  }}
                  style={{
                    padding: '7px 16px', borderRadius: '20px',
                    border: 'none',
                    background: active ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : '#ffffff',
                    color: active ? '#ffffff' : '#4b5563',
                    boxShadow: active ? '0 4px 12px rgba(194, 7, 26, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit'
                  }}>
                  {o.label}
                </button>
              )
            })}
          </div>

          {/* Borderless Table Container */}
          <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', overflow: 'hidden', boxShadow: cardShadow }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: 'var(--primary-color, #C2071A)', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '600' }}>Loading audit logs…</div>
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <FiAlertTriangle size={36} color="#dc2626" style={{ marginBottom: 10 }} />
                <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: '700', marginBottom: 12 }}>{error}</div>
                <button onClick={() => load(page)} style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Retry
                </button>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiShield size={24} color="#9ca3af" />
                </div>
                <div style={{ color: '#111827', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>
                  {hasAnyFilter ? 'No events match the current filters' : 'No audit events recorded yet'}
                </div>
                {hasAnyFilter && (
                  <span onClick={resetAll} style={{ color: 'var(--primary-color, #C2071A)', fontSize: '13px', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}>
                    Clear all filters
                  </span>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      {['Timestamp', 'Actor', 'Action', 'Target', 'IP Address', 'Details'].map(h => (
                        <th key={h} style={{ padding: '14px 18px', color: '#6b7280', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
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
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setActiveLog(log)}
                        >
                          <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <FiClock size={13} color="#9ca3af" />
                              <span style={{ fontWeight: '600', color: '#111827', fontSize: '12px' }}>{fmtDate(log.created_at)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--primary-color, #C2071A)', fontFamily: 'monospace', fontWeight: '700' }}>{log.actor_email || '—'}</div>
                            {log.actor_role && (
                              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: 2, textTransform: 'capitalize' }}>{log.actor_role.replace(/_/g, ' ')}</div>
                            )}
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: '700',
                              padding: '4px 10px', borderRadius: '6px',
                              background: badge.bg, color: badge.color, border: 'none',
                              textTransform: 'capitalize', letterSpacing: '0.04em', whiteSpace: 'nowrap'
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '16px 18px', color: '#374151', fontWeight: '500', maxWidth: '220px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.target || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </div>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4b5563', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
                              {log.ip_address || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 18px' }}>
                            <button
                              onClick={e => { e.stopPropagation(); setActiveLog(log) }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#f8fafc', color: '#111827', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(194, 7, 26, 0.08)'; e.currentTarget.style.color = 'var(--primary-color, #C2071A)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#111827'; }}
                            >
                              <FiEye size={13} style={{ color: 'var(--primary-color, #C2071A)' }} /> View
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

          {/* Borderless Pagination */}
          {!loading && !error && total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', marginTop: '16px', background: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: cardShadow, flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                Showing <strong style={{ color: '#111827' }}>{((page - 1) * limit) + 1}–{Math.min(page * limit, total)}</strong> of <strong style={{ color: '#111827' }}>{total}</strong> events
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#ffffff', color: page === 1 ? '#cbd5e1' : '#374151', fontFamily: 'inherit' }}>
                  ‹ Prev
                </button>

                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`d${i}`} style={{ padding: '6px 8px', color: '#9ca3af', fontSize: '13px' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: 'none', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : '#ffffff', color: page === p ? '#ffffff' : '#374151', boxShadow: page === p ? '0 4px 12px rgba(194, 7, 26, 0.25)' : '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#ffffff', color: page === totalPages ? '#cbd5e1' : '#374151', fontFamily: 'inherit' }}>
                  Next ›
                </button>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Detail Modal (Borderless) */}
      {activeLog && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setActiveLog(null)}
        >
          <div
            style={{ background: '#ffffff', borderRadius: '16px', border: 'none', padding: '28px', width: '560px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', overflowY: 'auto', maxHeight: '90vh', fontFamily: "'Inter', sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiShield size={18} color="var(--primary-color, #C2071A)" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111827' }}>Event Details</h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '18px', marginBottom: '18px', border: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                {[
                  { label: 'Timestamp',  value: fmtDate(activeLog.created_at) },
                  { label: 'IP Address', value: activeLog.ip_address || '—' },
                  { label: 'Actor',      value: activeLog.actor_email || '—', mono: true, color: 'var(--primary-color, #C2071A)' },
                  { label: 'Role',       value: activeLog.actor_role?.replace(/_/g, ' ') || '—' },
                  { label: 'Target',     value: activeLog.target || '—' },
                ].map(({ label, value, mono, color }) => (
                  <div key={label} style={{ background: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                    <div style={{ color: '#6b7280', marginBottom: 4, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ color: color || '#111827', fontWeight: '700', fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? '11px' : '12px', wordBreak: 'break-all' }}>{value}</div>
                  </div>
                ))}
                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <div style={{ color: '#6b7280', marginBottom: 6, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</div>
                  <span style={{
                    display: 'inline-flex', fontSize: '11px', fontWeight: '700',
                    padding: '4px 10px', borderRadius: '6px',
                    background: getBadgeStyle(activeLog.action).bg,
                    color: getBadgeStyle(activeLog.action).color,
                    border: 'none',
                    textTransform: 'capitalize'
                  }}>
                    {activeLog.action}
                  </span>
                </div>
              </div>
            </div>

            {activeLog.metadata && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Event Metadata
                </div>
                <pre style={{ background: '#111827', color: '#f3f4f6', padding: '16px', borderRadius: '12px', fontSize: '11px', overflowX: 'auto', maxHeight: '200px', margin: 0, fontFamily: 'monospace', lineHeight: 1.6 }}>
                  {JSON.stringify(activeLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <button
              onClick={() => setActiveLog(null)}
              style={{ width: '100%', marginTop: '20px', padding: '11px', background: '#ffffff', border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#4b5563', cursor: 'pointer', fontFamily: 'inherit' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
