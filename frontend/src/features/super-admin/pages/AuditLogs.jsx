import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  FiShield, FiDownload, FiRefreshCw, FiUnlock, FiTrash2, FiEdit2,
  FiPlus, FiFileText, FiX
} from 'react-icons/fi'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  header: { marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', margin: 0 },
  sub: { fontSize: '13px', color: '#64748b', margin: 0 },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
  search: {
    padding: '9px 14px', background: '#ffffff',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', color: '#1e293b', outline: 'none', width: '280px',
    transition: 'all 0.2s', fontFamily: 'inherit',
  },
  select: {
    padding: '9px 14px', background: '#ffffff',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', color: '#1e293b', outline: 'none',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  refreshBtn: {
    padding: '9px 18px', background: '#ffffff',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', fontWeight: '600', color: '#475569',
    cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  pdfBtn: {
    padding: '9px 18px',
    background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
    border: 'none', borderRadius: '10px',
    fontSize: '13px', fontWeight: '600', color: '#ffffff',
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(194, 7, 26, 0.3)',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  tableCard: {
    background: '#ffffff', border: 'none',
    borderRadius: '16px', overflow: 'hidden',
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  th: {
    padding: '12px 20px', color: '#94a3b8', fontWeight: '700',
    borderBottom: '1px solid #e8eaf0', background: '#f8fafc',
    textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.07em',
  },
  tr: { borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' },
  td: { padding: '14px 20px', color: '#475569', fontSize: '13px' },
  actionBadge: {
    display: 'inline-block', fontSize: '11px', fontWeight: '600',
    padding: '3px 9px', borderRadius: '20px', textTransform: 'capitalize',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#ffffff', border: 'none',
    borderRadius: '16px', padding: '32px', width: '580px', maxWidth: '90%',
    boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px', borderBottom: '1px solid #e8eaf0', paddingBottom: '16px',
  },
  closeBtn: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: '#f1f5f9', border: 'none', fontSize: '18px',
    color: '#64748b', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  metaPre: {
    background: '#f8fafc', padding: '16px', borderRadius: '10px',
    border: '1px solid #e2e8f0', fontSize: '12px',
    color: '#C2071A', overflowX: 'auto', maxHeight: '250px',
    fontFamily: 'monospace', lineHeight: '1.6',
  },
  emptyState: { padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderTop: '1px solid #e8eaf0',
    background: '#f8fafc',
  },
  pageBtn: {
    padding: '6px 14px', borderRadius: '8px',
    border: '1px solid #e2e8f0', background: '#ffffff',
    fontSize: '13px', fontWeight: '600', color: '#475569',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  pageBtnActive: {
    padding: '6px 14px', borderRadius: '8px',
    border: 'none', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
    fontSize: '13px', fontWeight: '600', color: '#ffffff',
    cursor: 'pointer',
  },
  pageBtnDisabled: {
    padding: '6px 14px', borderRadius: '8px',
    border: '1px solid #e2e8f0', background: '#f8fafc',
    fontSize: '13px', fontWeight: '600', color: '#cbd5e1',
    cursor: 'not-allowed',
  },
}

function getBadgeStyle(action) {
  const act = action?.toLowerCase() || ''
  if (act.includes('login') || act.includes('auth'))
    return { ...s.actionBadge, background: 'rgba(16,185,129,0.1)', color: '#16a34a', border: '1px solid rgba(16,185,129,0.2)' }
  if (act.includes('delete') || act.includes('remove'))
    return { ...s.actionBadge, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
  if (act.includes('update') || act.includes('save') || act.includes('edit'))
    return { ...s.actionBadge, background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }
  if (act.includes('create') || act.includes('add'))
    return { ...s.actionBadge, background: 'rgba(14,165,233,0.1)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }
  return { ...s.actionBadge, background: 'rgba(194, 7, 26, 0.08)', color: '#C2071A', border: '1px solid rgba(194, 7, 26, 0.2)' }
}

function getActionIcon(action) {
  const act = action?.toLowerCase() || ''
  if (act.includes('login') || act.includes('auth')) return <FiUnlock size={14} color="#16a34a" />
  if (act.includes('delete') || act.includes('remove')) return <FiTrash2 size={14} color="#ef4444" />
  if (act.includes('update') || act.includes('save') || act.includes('edit')) return <FiEdit2 size={14} color="#b45309" />
  if (act.includes('create') || act.includes('add')) return <FiPlus size={14} color="#0284c7" />
  return <FiFileText size={14} color="#C2071A" />
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeLog, setActiveLog] = useState(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [allActions, setAllActions] = useState(['all'])
  const [pdfLoading, setPdfLoading] = useState(false)

  const token = sessionStorage.getItem('sa_token')

  function buildParams(pg, lm) {
    const p = { page: pg, limit: lm }
    if (search)                    p.actorEmail   = search
    if (filterAction !== 'all')    p.action       = filterAction
    if (dateFrom)                  p.dateFrom     = dateFrom
    if (dateTo)                    p.dateTo       = dateTo + 'T23:59:59'
    return p
  }

  const fetchLogs = useCallback((pg = page, lm = limit) => {
    setLoading(true)
    axios.get('/api/super-admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` },
      params: buildParams(pg, lm),
    })
      .then(r => {
        const data = r.data
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setAllActions(prev => {
          const merged = new Set([...prev, ...(data.logs || []).map(l => l.action).filter(Boolean)])
          return ['all', ...merged]
        })
      })
      .catch(err => console.error('Failed to load audit logs', err))
      .finally(() => setLoading(false))
  }, [token, page, limit, search, filterAction, dateFrom, dateTo])

  useEffect(() => { fetchLogs(page, limit) }, [page, limit, search, filterAction, dateFrom, dateTo])

  function handleRefresh() { fetchLogs(page, limit) }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
  }

  function handleLimitChange(e) {
    setLimit(Number(e.target.value))
    setPage(1)
  }

  function handleClearFilters() {
    setSearch('')
    setFilterAction('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters = search || filterAction !== 'all' || dateFrom || dateTo

  async function handleDownloadPDF() {
    setPdfLoading(true)
    try {
      const r = await axios.get('/api/super-admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: buildParams(1, 1000),
      })
      const allLogs = r.data.logs || []

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Header
      doc.setFillColor(194, 7, 26)
      doc.rect(0, 0, 297, 22, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Audit Logs Report', 14, 14)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 200, 10)
      doc.text(`Total Records: ${allLogs.length}`, 200, 16)

      // Summary stats
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(9)
      const loginCount  = allLogs.filter(l => l.action?.toLowerCase().includes('login') || l.action?.toLowerCase().includes('auth')).length
      const updateCount = allLogs.filter(l => l.action?.toLowerCase().includes('update') || l.action?.toLowerCase().includes('edit') || l.action?.toLowerCase().includes('save')).length
      const deleteCount = allLogs.filter(l => l.action?.toLowerCase().includes('delete') || l.action?.toLowerCase().includes('remove')).length
      const createCount = allLogs.filter(l => l.action?.toLowerCase().includes('create') || l.action?.toLowerCase().includes('add')).length

      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 14, 30)
      doc.setFont('helvetica', 'normal')
      const summaryItems = [
        `Total Events: ${allLogs.length}`,
        `Login/Auth: ${loginCount}`,
        `Updates: ${updateCount}`,
        `Deletions: ${deleteCount}`,
        `Creates: ${createCount}`,
      ]
      summaryItems.forEach((item, i) => doc.text(item, 14 + i * 52, 36))

      // Table
      autoTable(doc, {
        startY: 42,
        head: [['#', 'Timestamp', 'Actor', 'Action', 'Target', 'IP Address']],
        body: allLogs.map((log, i) => [
          i + 1,
          new Date(log.created_at).toLocaleString('en-IN'),
          log.actor_email || 'System',
          log.action || '—',
          log.target || '—',
          log.ip_address || '—',
        ]),
        styles: { fontSize: 8, cellPadding: 3, overflow: 'ellipsize' },
        headStyles: { fillColor: [194, 7, 26], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 55 },
          3: { cellWidth: 45 },
          4: { cellWidth: 70 },
          5: { cellWidth: 35 },
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(148, 163, 184)
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 8
          )
        },
      })

      doc.save(`audit-logs-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF generation failed', err)
    } finally {
      setPdfLoading(false)
    }
  }

  const onFocus = e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }
  const onBlur  = e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }

  function renderPageNumbers() {
    const pages = []
    const delta = 2
    const left  = Math.max(2, page - delta)
    const right = Math.min(totalPages - 1, page + delta)

    pages.push(1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)

    return pages.map((p, i) =>
      p === '...' ? (
        <span key={`ellipsis-${i}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '13px' }}>…</span>
      ) : (
        <button
          key={p}
          onClick={() => handlePageChange(p)}
          style={p === page ? s.pageBtnActive : s.pageBtn}
        >
          {p}
        </button>
      )
    )
  }

  return (
    <div style={s.page}>
      <Sidebar active="audit" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="Audit Logs" />
        <main style={s.main}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.h1}>Audit Logs</h1>
            <p style={s.sub}>Track administrator actions and system security events</p>
          </div>
          <div style={s.headerBtns}>
            <button
              style={s.pdfBtn}
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(194, 7, 26, 0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(194, 7, 26, 0.3)' }}
            >
              <FiDownload size={14} color="#ffffff" style={{ stroke: '#ffffff' }} />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              style={s.refreshBtn}
              onClick={handleRefresh}
              disabled={loading}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C2071A'; e.currentTarget.style.color = '#C2071A' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
            >
              <FiRefreshCw size={14} color="#475569" />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        {total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total Events', value: total, color: '#C2071A' },
              { label: 'Login / Auth', value: logs.filter(l => l.action?.toLowerCase().includes('login') || l.action?.toLowerCase().includes('auth')).length, color: '#16a34a' },
              { label: 'Updates', value: logs.filter(l => l.action?.toLowerCase().includes('update') || l.action?.toLowerCase().includes('edit') || l.action?.toLowerCase().includes('save')).length, color: '#b45309' },
              { label: 'Deletions', value: logs.filter(l => l.action?.toLowerCase().includes('delete') || l.action?.toLowerCase().includes('remove')).length, color: '#ef4444' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#ffffff', border: 'none',
                borderRadius: '16px', padding: '16px 20px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
              }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={s.filterRow}>
          <input
            style={s.search}
            placeholder="Search by actor email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            onFocus={onFocus} onBlur={onBlur}
          />
          <select
            style={s.select}
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            onFocus={onFocus} onBlur={onBlur}
          >
            {allActions.map(act => (
              <option key={act} value={act}>
                {act === 'all' ? 'All Actions' : act}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            title="From date"
            style={{ ...s.select, color: dateFrom ? '#1e293b' : '#94a3b8' }}
            onFocus={onFocus} onBlur={onBlur}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            title="To date"
            style={{ ...s.select, color: dateTo ? '#1e293b' : '#94a3b8' }}
            onFocus={onFocus} onBlur={onBlur}
          />
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: '9px 14px', background: '#fff',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                fontSize: '12px', fontWeight: '600', color: '#64748b', cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>
            {total} events
          </span>
        </div>

        {/* Table */}
        <div style={s.tableCard}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid rgba(194, 7, 26, 0.2)', borderTopColor: '#C2071A',
                animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
              }} />
              Loading audit logs…
            </div>
          ) : logs.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(194, 7, 26, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <FiShield size={24} color="#C2071A" />
              </div>
              <div>No audit logs matched the current filters.</div>
            </div>
          ) : (
            <>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Timestamp', 'Actor', 'Action', 'Target', 'IP Address'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={log.id}
                      style={{ ...s.tr, borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                      onClick={() => setActiveLog(log)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(194, 7, 26, 0.03)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={s.td}>
                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>
                          {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            background: 'rgba(194, 7, 26, 0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '700', color: '#C2071A', flexShrink: 0,
                          }}>
                            {(log.actor_email || 'S')?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color: '#1e293b', fontSize: '13px' }}>{log.actor_email || 'System'}</span>
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getActionIcon(log.action)}
                          <span style={getBadgeStyle(log.action)}>{log.action}</span>
                        </div>
                      </td>
                      <td style={{ ...s.td, maxWidth: '200px' }}>
                        <span style={{
                          display: 'block', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569',
                        }}>
                          {log.target || '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: '12px',
                          color: '#64748b', background: '#f8fafc',
                          padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                        }}>
                          {log.ip_address || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={s.pagination}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page:</span>
                  <select
                    value={limit}
                    onChange={handleLimitChange}
                    style={{ ...s.select, padding: '5px 10px', fontSize: '12px' }}
                  >
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    style={page === 1 ? s.pageBtnDisabled : s.pageBtn}
                  >
                    ‹ Prev
                  </button>
                  {renderPageNumbers()}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    style={page === totalPages ? s.pageBtnDisabled : s.pageBtn}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>

      {/* Detail Modal */}
      {activeLog && (
        <div style={s.modalOverlay} onClick={() => setActiveLog(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(194, 7, 26, 0.08)', border: '1px solid rgba(194, 7, 26, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getActionIcon(activeLog.action)}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Log Event Details</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>Click outside to close</div>
                </div>
              </div>
              <button style={s.closeBtn} onClick={() => setActiveLog(null)}><FiX size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8eaf0',
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Timestamp</div>
                  <div style={{ color: '#1e293b', fontWeight: '500' }}>{new Date(activeLog.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>IP Address</div>
                  <code style={{ color: '#C2071A', fontSize: '13px' }}>{activeLog.ip_address || '—'}</code>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Actor</div>
                  <div style={{ color: '#1e293b', fontWeight: '500' }}>{activeLog.actor_email || 'System'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Action</div>
                  <span style={getBadgeStyle(activeLog.action)}>{activeLog.action}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Target</div>
                <div style={{
                  padding: '10px 14px', background: '#f8fafc',
                  border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '13px',
                }}>
                  {activeLog.target || '—'}
                </div>
              </div>

              {activeLog.metadata && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Metadata / Payload
                  </div>
                  <pre style={s.metaPre}>
                    {JSON.stringify(activeLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

