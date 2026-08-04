import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import {
  FiTarget, FiActivity, FiTrendingUp, FiCreditCard,
  FiDownload, FiRefreshCw, FiSearch, FiFileText,
  FiChevronLeft, FiChevronRight, FiAward,
} from 'react-icons/fi'

/* ─── Axios ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

/* ─── CSV export ─── */
function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => c.label).join(',')
  const body = rows.map(row =>
    columns.map(c => {
      const val = c.value(row) ?? ''
      return typeof val === 'string' && (val.includes(',') || val.includes('"'))
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(',')
  )
  const csv = [header, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ─── PDF export ─── */
function downloadPDF(rows, columns, title, filename) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 12)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 200, 12)

  autoTable(doc, {
    startY: 22,
    head: [columns.map(c => c.label)],
    body: rows.map(row => columns.map(c => String(c.value(row) ?? '—'))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
  })

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Page ${i} of ${pageCount}`, 280, 205, { align: 'right' })
  }

  doc.save(filename)
}

/* ─── Shared styles ─── */
const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(val) { return val == null ? '—' : val }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtCurrency(n) { if (n == null) return '—'; return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }

/* ─── Status badge ─── */
const STATUS_COLORS = {
  draft:            { bg: '#f1f5f9', text: '#475569' },
  active:           { bg: '#dcfce7', text: '#15803d' },
  submitted:        { bg: '#fef3c7', text: '#b45309' },
  completed:        { bg: '#ede9fe', text: '#6d28d9' },
  rejected:         { bg: '#fee2e2', text: '#b91c1c' },
  pending_approval: { bg: '#fef3c7', text: '#b45309' },
  approved:         { bg: '#dcfce7', text: '#15803d' },
  pending:          { bg: '#f1f5f9', text: '#475569' },
  DRAFT:            { bg: '#f1f5f9', text: '#475569' },
  APPROVED:         { bg: '#dcfce7', text: '#15803d' },
  LOCKED:           { bg: '#ede9fe', text: '#6d28d9' },
}

function Badge({ value }) {
  if (!value) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
  const c = STATUS_COLORS[value] || { bg: '#f1f5f9', text: '#475569' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
      background: c.bg, color: c.text, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {String(value).replace(/_/g, ' ')}
    </span>
  )
}

/* ─── Filter controls ─── */
function FilterSelect({ label, value, onChange, options, placeholder = 'All' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#1e293b', background: '#fff', cursor: 'pointer' }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function FilterInput({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#1e293b', background: '#fff' }}
      />
    </div>
  )
}

/* ─── Summary pills ─── */
function SummaryPills({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
      {items.map(it => (
        <div key={it.label} style={{
          padding: '8px 16px', borderRadius: 10,
          background: it.bg || '#f1f5f9',
          border: `1px solid ${it.border || '#e2e8f0'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100,
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: it.color || '#1e293b', lineHeight: 1 }}>{it.value}</span>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Pagination helper ─── */
const PAGE_SIZE = 10

function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
  if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, '…', page - 1, page, page + 1, '…', totalPages]
}

/* ─── Data table with pagination ─── */
function DataTable({ columns, rows, emptyMsg = 'No data found.' }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = search
    ? rows.filter(r => columns.some(c => String(c.value(r) ?? '').toLowerCase().includes(search.toLowerCase())))
    : rows

  useEffect(() => { setPage(1) }, [search, rows])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, filtered.length)

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff',
    color: '#475569', transition: 'all 0.15s',
  }

  return (
    <div>
      {/* Search + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Search in table..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 30, padding: '7px 10px 7px 30px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
          {filtered.length === 0 ? '0 rows' : `${from}–${to} of ${filtered.length}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {columns.map(c => (
                <th key={c.key} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  {emptyMsg}
                </td>
              </tr>
            ) : paginated.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '10px 14px', color: '#1e293b', whiteSpace: c.wrap ? 'normal' : 'nowrap' }}>
                    {c.render ? c.render(row) : fmt(c.value(row))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Page {safePage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ ...btnBase, opacity: safePage === 1 ? 0.4 : 1 }}
            >
              <FiChevronLeft size={14} />
            </button>

            {getPageNumbers(safePage, totalPages).map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} style={{ ...btnBase, border: 'none', cursor: 'default', color: '#9ca3af' }}>…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    ...btnBase,
                    background: safePage === n ? '#6366f1' : '#fff',
                    color: safePage === n ? '#fff' : '#475569',
                    border: safePage === n ? '1px solid #6366f1' : '1px solid #e2e8f0',
                    fontWeight: safePage === n ? 700 : 600,
                  }}
                >
                  {n}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ ...btnBase, opacity: safePage === totalPages ? 0.4 : 1 }}
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Export button row ─── */
function ExportButtons({ onCSV, onPDF, onRefresh, loading }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
      >
        <FiRefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
      </button>
      <button
        onClick={onCSV}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #10b981', borderRadius: 8, fontSize: 13, background: '#10b981', cursor: 'pointer', color: '#fff', fontWeight: 700 }}
      >
        <FiDownload size={13} /> Export CSV
      </button>
      <button
        onClick={onPDF}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #6366f1', borderRadius: 8, fontSize: 13, background: '#6366f1', cursor: 'pointer', color: '#fff', fontWeight: 700 }}
      >
        <FiFileText size={13} /> Export PDF
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1 — Goal Report
═══════════════════════════════════════════════════════════════════════════ */
function GoalReport({ filters: filterData }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ department_id: '', employee_id: '', status: '', goal_type: '', date_from: '', date_to: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
      const r = await api.get('/client-admin/reports/goals', { params })
      setRows(r.data)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [f])

  useEffect(() => { load() }, [load])

  const total = rows.length
  const byStatus = rows.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m }, {})
  const avgProgress = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.progress || 0), 0) / rows.length) : 0
  const overdue = rows.filter(r => r.due_date && new Date(r.due_date) < new Date() && !['completed', 'rejected'].includes(r.status)).length

  const summaryPills = [
    { label: 'Total Goals',  value: total,                    bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6' },
    { label: 'Completed',    value: byStatus.completed || 0,  bg: '#d1fae5', border: '#6ee7b7', color: '#065f46' },
    { label: 'Active',       value: byStatus.active || 0,     bg: '#dcfce7', border: '#86efac', color: '#15803d' },
    { label: 'Overdue',      value: overdue,                  bg: '#ffedd5', border: '#fdba74', color: '#c2410c' },
    { label: 'Avg Progress', value: `${avgProgress}%`,        bg: '#e0f2fe', border: '#7dd3fc', color: '#0369a1' },
  ]

  const columns = [
    { key: 'employee', label: 'Employee',   value: r => r.employee_name || '—' },
    { key: 'code',     label: 'Code',       value: r => r.employee_code || '—' },
    { key: 'dept',     label: 'Department', value: r => r.department_name || '—' },
    { key: 'manager',  label: 'Manager',    value: r => r.manager_name || '—' },
    { key: 'title',    label: 'Goal',       value: r => r.title, wrap: true },
    { key: 'type',     label: 'Type',       value: r => r.goal_type,  render: r => <Badge value={r.goal_type} /> },
    { key: 'status',   label: 'Status',     value: r => r.status,     render: r => <Badge value={r.status} /> },
    { key: 'priority', label: 'Priority',   value: r => r.priority,   render: r => <Badge value={r.priority} /> },
    { key: 'progress', label: 'Progress',   value: r => r.progress,   render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, r.progress || 0)}%`, background: '#6366f1', borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{r.progress || 0}%</span>
      </div>
    )},
    { key: 'weight', label: 'Weight',     value: r => `${r.weight || 0}%` },
    { key: 'start',  label: 'Start Date', value: r => fmtDate(r.start_date) },
    { key: 'due',    label: 'Due Date',   value: r => fmtDate(r.due_date) },
  ]

  const exportCols = [
    { label: 'Employee',    value: r => r.employee_name || '' },
    { label: 'Code',        value: r => r.employee_code || '' },
    { label: 'Department',  value: r => r.department_name || '' },
    { label: 'Manager',     value: r => r.manager_name || '' },
    { label: 'Goal',        value: r => r.title || '' },
    { label: 'Type',        value: r => r.goal_type || '' },
    { label: 'Status',      value: r => r.status || '' },
    { label: 'Priority',    value: r => r.priority || '' },
    { label: 'Progress %',  value: r => r.progress || 0 },
    { label: 'Weight %',    value: r => r.weight || 0 },
    { label: 'Start Date',  value: r => fmtDate(r.start_date) },
    { label: 'Due Date',    value: r => fmtDate(r.due_date) },
  ]

  const deptOptions   = (filterData.departments || []).map(d => ({ value: d.id,   label: d.name }))
  const empOptions    = (filterData.employees   || []).map(e => ({ value: e.id,   label: `${e.name} (${e.employee_code})` }))
  const statusOptions = ['draft','active','submitted','completed','rejected','pending_approval'].map(s => ({ value: s, label: s.replace(/_/g,' ') }))
  const typeOptions   = ['individual','department','company'].map(s => ({ value: s, label: s }))

  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <FilterSelect label="Department" value={f.department_id} onChange={v => setF(p => ({ ...p, department_id: v }))} options={deptOptions} />
          <FilterSelect label="Employee"   value={f.employee_id}   onChange={v => setF(p => ({ ...p, employee_id: v }))}   options={empOptions} />
          <FilterSelect label="Status"     value={f.status}        onChange={v => setF(p => ({ ...p, status: v }))}        options={statusOptions} />
          <FilterSelect label="Goal Type"  value={f.goal_type}     onChange={v => setF(p => ({ ...p, goal_type: v }))}     options={typeOptions} />
          <FilterInput  label="From"       value={f.date_from}     onChange={v => setF(p => ({ ...p, date_from: v }))}     type="date" />
          <FilterInput  label="To"         value={f.date_to}       onChange={v => setF(p => ({ ...p, date_to: v }))}       type="date" />
          <button
            onClick={() => setF({ department_id: '', employee_id: '', status: '', goal_type: '', date_from: '', date_to: '' })}
            style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
          >Clear</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Goal Report</div>
          <ExportButtons
            loading={loading}
            onRefresh={load}
            onCSV={() => downloadCSV(rows, exportCols, 'goal-report.csv')}
            onPDF={() => downloadPDF(rows, exportCols, 'Goal Report', 'goal-report.pdf')}
          />
        </div>
        <SummaryPills items={summaryPills} />
        {loading
          ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
          : <DataTable columns={columns} rows={rows} emptyMsg="No goals found for the selected filters." />
        }
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2 — Appraisal Cycle Report
═══════════════════════════════════════════════════════════════════════════ */
function AppraisalReport({ filters: filterData }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [cycleId, setCycleId] = useState('')

  const cycles = filterData.appraisalCycles || []

  useEffect(() => {
    if (cycles.length && !cycleId) setCycleId(String(cycles[0].id))
  }, [cycles])

  const load = useCallback(async () => {
    if (!cycleId) return
    setLoading(true)
    try {
      const r = await api.get('/client-admin/reports/appraisal', { params: { cycle_id: cycleId } })
      setRows(r.data)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [cycleId])

  useEffect(() => { load() }, [load])

  const selectedCycle = cycles.find(c => String(c.id) === String(cycleId))
  const total      = rows.length
  const selfDone   = rows.filter(r => r.self_status === 'submitted').length
  const mgrDone    = rows.filter(r => r.manager_status === 'submitted').length
  const rated      = rows.filter(r => r.final_rating != null)
  const avgRating  = rated.length ? (rated.reduce((s, r) => s + Number(r.final_rating), 0) / rated.length).toFixed(2) : '—'

  const summaryPills = [
    { label: 'Total Employees', value: total,                                                     bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6' },
    { label: 'Self Submitted',  value: selfDone,                                                  bg: '#d1fae5', border: '#6ee7b7', color: '#065f46' },
    { label: 'Manager Done',    value: mgrDone,                                                   bg: '#dcfce7', border: '#86efac', color: '#15803d' },
    { label: 'Self Completion', value: total ? `${Math.round((selfDone / total) * 100)}%` : '—', bg: '#e0f2fe', border: '#7dd3fc', color: '#0369a1' },
    { label: 'Avg Rating',      value: avgRating,                                                 bg: '#fef3c7', border: '#fde68a', color: '#b45309' },
  ]

  const columns = [
    { key: 'code',       label: 'Code',            value: r => r.employee_code },
    { key: 'name',       label: 'Employee',         value: r => r.employee_name },
    { key: 'dept',       label: 'Department',       value: r => r.department_name || '—' },
    { key: 'desig',      label: 'Designation',      value: r => r.designation || '—' },
    { key: 'manager',    label: 'Manager',          value: r => r.manager_name || '—' },
    { key: 'self_status',label: 'Self Appraisal',   value: r => r.self_status || 'not started',    render: r => <Badge value={r.self_status || 'not started'} /> },
    { key: 'self_at',    label: 'Self Submitted',   value: r => fmtDate(r.self_submitted_at) },
    { key: 'mgr_status', label: 'Manager Review',   value: r => r.manager_status || 'not started', render: r => <Badge value={r.manager_status || 'not started'} /> },
    { key: 'mgr_at',     label: 'Review Submitted', value: r => fmtDate(r.manager_submitted_at) },
    { key: 'rating',     label: 'Final Rating',     value: r => r.final_rating,                    render: r => r.final_rating != null
        ? <span style={{ fontWeight: 700, color: '#5b21b6' }}>{Number(r.final_rating).toFixed(2)}</span>
        : <span style={{ color: '#9ca3af' }}>—</span>
    },
  ]

  const exportCols = [
    { label: 'Code',                   value: r => r.employee_code || '' },
    { label: 'Employee',               value: r => r.employee_name || '' },
    { label: 'Department',             value: r => r.department_name || '' },
    { label: 'Designation',            value: r => r.designation || '' },
    { label: 'Manager',                value: r => r.manager_name || '' },
    { label: 'Self Appraisal Status',  value: r => r.self_status || 'not started' },
    { label: 'Self Submitted At',      value: r => fmtDate(r.self_submitted_at) },
    { label: 'Manager Review Status',  value: r => r.manager_status || 'not started' },
    { label: 'Manager Submitted At',   value: r => fmtDate(r.manager_submitted_at) },
    { label: 'Final Rating',           value: r => r.final_rating ?? '' },
  ]

  const cycleOptions = cycles.map(c => ({
    value: c.id,
    label: `${c.name} (${fmtDate(c.period_start)} – ${fmtDate(c.period_end)})`,
  }))

  const pdfTitle = selectedCycle ? `Appraisal Report — ${selectedCycle.name}` : 'Appraisal Report'

  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <FilterSelect label="Appraisal Cycle" value={cycleId} onChange={setCycleId} options={cycleOptions} placeholder="Select cycle" />
          {selectedCycle && (
            <div style={{ display: 'flex', gap: 16, padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Period: <b style={{ color: '#1e293b' }}>{fmtDate(selectedCycle.period_start)} – {fmtDate(selectedCycle.period_end)}</b></span>
              <Badge value={selectedCycle.status} />
            </div>
          )}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Appraisal Cycle Report</div>
          <ExportButtons
            loading={loading}
            onRefresh={load}
            onCSV={() => downloadCSV(rows, exportCols, `appraisal-report-cycle-${cycleId}.csv`)}
            onPDF={() => downloadPDF(rows, exportCols, pdfTitle, `appraisal-report-cycle-${cycleId}.pdf`)}
          />
        </div>
        {!cycleId
          ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Select an appraisal cycle to view the report.</div>
          : loading
            ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
            : <>
                <SummaryPills items={summaryPills} />
                <DataTable columns={columns} rows={rows} emptyMsg="No appraisal data found for this cycle." />
              </>
        }
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3 — KPI Report
═══════════════════════════════════════════════════════════════════════════ */
function KpiReport({ filters: filterData }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ status: '', category: '', employee_id: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
      const r = await api.get('/client-admin/reports/kpi', { params })
      setRows(r.data)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [f])

  useEffect(() => { load() }, [load])

  const total          = rows.length
  const approved       = rows.filter(r => r.status === 'approved').length
  const withAch        = rows.filter(r => r.achievement_pct != null)
  const avgAchievement = withAch.length ? Math.round(withAch.reduce((s, r) => s + Number(r.achievement_pct), 0) / withAch.length) : 0
  const overAchievers  = rows.filter(r => r.achievement_pct != null && Number(r.achievement_pct) > 100).length

  const summaryPills = [
    { label: 'Total KPIs',       value: total,                                     bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6' },
    { label: 'Approved',         value: approved,                                  bg: '#d1fae5', border: '#6ee7b7', color: '#065f46' },
    { label: 'Pending',          value: rows.filter(r => r.status === 'pending').length, bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' },
    { label: 'Avg Achievement',  value: `${avgAchievement}%`,                      bg: '#e0f2fe', border: '#7dd3fc', color: '#0369a1' },
    { label: 'Over-achievers',   value: overAchievers,                             bg: '#fef3c7', border: '#fde68a', color: '#b45309' },
  ]

  const columns = [
    { key: 'emp',        label: 'Employee',    value: r => r.employee_name || '—' },
    { key: 'code',       label: 'Code',        value: r => r.employee_code || '—' },
    { key: 'dept',       label: 'Department',  value: r => r.department_name || '—' },
    { key: 'kpi',        label: 'KPI Name',    value: r => r.kpi_name, wrap: true },
    { key: 'kpicode',    label: 'KPI Code',    value: r => r.code || '—' },
    { key: 'cat',        label: 'Category',    value: r => r.category || '—' },
    { key: 'unit',       label: 'Unit',        value: r => r.measurement_unit || '—' },
    { key: 'goal',       label: 'Goal',        value: r => r.goal_title, wrap: true },
    { key: 'target',     label: 'Target',      value: r => r.target_value ?? '—' },
    { key: 'achieved',   label: 'Achieved',    value: r => r.achieved_value ?? '—' },
    { key: 'pct',        label: 'Achievement %', value: r => r.achievement_pct, render: r => {
      if (r.achievement_pct == null) return <span style={{ color: '#9ca3af' }}>—</span>
      const pct = Number(r.achievement_pct)
      const color = pct >= 100 ? '#15803d' : pct >= 75 ? '#b45309' : '#b91c1c'
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
        </div>
      )
    }},
    { key: 'weight',      label: 'Weight',      value: r => `${r.weight || 0}%` },
    { key: 'status',      label: 'Status',      value: r => r.status,             render: r => <Badge value={r.status} /> },
    { key: 'approved_at', label: 'Approved At', value: r => fmtDate(r.approved_at) },
  ]

  const exportCols = [
    { label: 'Employee',      value: r => r.employee_name || '' },
    { label: 'Code',          value: r => r.employee_code || '' },
    { label: 'Department',    value: r => r.department_name || '' },
    { label: 'KPI Name',      value: r => r.kpi_name || '' },
    { label: 'KPI Code',      value: r => r.code || '' },
    { label: 'Category',      value: r => r.category || '' },
    { label: 'Unit',          value: r => r.measurement_unit || '' },
    { label: 'Goal',          value: r => r.goal_title || '' },
    { label: 'Target',        value: r => r.target_value ?? '' },
    { label: 'Achieved',      value: r => r.achieved_value ?? '' },
    { label: 'Achievement %', value: r => r.achievement_pct ?? '' },
    { label: 'Weight %',      value: r => r.weight || 0 },
    { label: 'Status',        value: r => r.status || '' },
    { label: 'Approved At',   value: r => fmtDate(r.approved_at) },
  ]

  const statusOptions = ['pending','submitted','approved'].map(s => ({ value: s, label: s }))
  const catOptions    = (filterData.kpiCategories || []).map(c => ({ value: c, label: c }))
  const empOptions    = (filterData.employees || []).map(e => ({ value: e.id, label: `${e.name} (${e.employee_code})` }))

  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <FilterSelect label="Status"   value={f.status}      onChange={v => setF(p => ({ ...p, status: v }))}      options={statusOptions} />
          <FilterSelect label="Category" value={f.category}    onChange={v => setF(p => ({ ...p, category: v }))}    options={catOptions} />
          <FilterSelect label="Employee" value={f.employee_id} onChange={v => setF(p => ({ ...p, employee_id: v }))} options={empOptions} />
          <button
            onClick={() => setF({ status: '', category: '', employee_id: '' })}
            style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
          >Clear</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>KPI Report</div>
          <ExportButtons
            loading={loading}
            onRefresh={load}
            onCSV={() => downloadCSV(rows, exportCols, 'kpi-report.csv')}
            onPDF={() => downloadPDF(rows, exportCols, 'KPI Report', 'kpi-report.pdf')}
          />
        </div>
        <SummaryPills items={summaryPills} />
        {loading
          ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
          : <DataTable columns={columns} rows={rows} emptyMsg="No KPI assignments found for the selected filters." />
        }
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 4 — Payroll Summary
═══════════════════════════════════════════════════════════════════════════ */
function PayrollReport({ filters: filterData }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [runId, setRunId] = useState('')

  const runs = filterData.payrollRuns || []

  useEffect(() => {
    if (runs.length && !runId) setRunId(String(runs[0].id))
  }, [runs])

  const load = useCallback(async () => {
    if (!runId) return
    setLoading(true)
    try {
      const r = await api.get('/client-admin/reports/payroll', { params: { run_id: runId } })
      setRows(r.data)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [runId])

  useEffect(() => { load() }, [load])

  const selectedRun      = runs.find(r => String(r.id) === String(runId))
  const totalGross       = rows.reduce((s, r) => s + Number(r.gross_salary || 0), 0)
  const totalNet         = rows.reduce((s, r) => s + Number(r.net_salary || 0), 0)
  const totalDeductions  = rows.reduce((s, r) => s + Number(r.total_deductions || 0), 0)
  const totalLop         = rows.reduce((s, r) => s + Number(r.lop_days || 0), 0)

  const summaryPills = [
    { label: 'Employees',         value: rows.length,              bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6' },
    { label: 'Total Gross',       value: fmtCurrency(totalGross),       bg: '#d1fae5', border: '#6ee7b7', color: '#065f46' },
    { label: 'Total Deductions',  value: fmtCurrency(totalDeductions),  bg: '#fee2e2', border: '#fca5a5', color: '#b91c1c' },
    { label: 'Total Net Salary',  value: fmtCurrency(totalNet),         bg: '#e0f2fe', border: '#7dd3fc', color: '#0369a1' },
    { label: 'Total LOP Days',    value: totalLop,                 bg: '#ffedd5', border: '#fdba74', color: '#c2410c' },
  ]

  const columns = [
    { key: 'code',       label: 'Code',             value: r => r.employee_code },
    { key: 'name',       label: 'Employee',          value: r => r.employee_name },
    { key: 'dept',       label: 'Department',        value: r => r.department_name || '—' },
    { key: 'desig',      label: 'Designation',       value: r => r.designation || '—' },
    { key: 'struct',     label: 'Salary Structure',  value: r => r.structure_name || '—' },
    { key: 'working',    label: 'Working Days',      value: r => r.working_days ?? '—' },
    { key: 'present',    label: 'Present Days',      value: r => r.present_days ?? '—' },
    { key: 'paid_leave', label: 'Paid Leave',        value: r => r.paid_leave_days ?? '—' },
    { key: 'holiday',    label: 'Holidays',          value: r => r.holiday_days ?? '—' },
    { key: 'weekoff',    label: 'Week Off',          value: r => r.week_off_days ?? '—' },
    { key: 'lop',        label: 'LOP Days',          value: r => r.lop_days ?? '—',   render: r => (
      <span style={{ fontWeight: 700, color: Number(r.lop_days) > 0 ? '#b91c1c' : '#1e293b' }}>{r.lop_days ?? '—'}</span>
    )},
    { key: 'gross',      label: 'Gross Salary',      value: r => fmtCurrency(r.gross_salary) },
    { key: 'additions',  label: 'Additions',         value: r => fmtCurrency(r.total_additions) },
    { key: 'deductions', label: 'Deductions',        value: r => fmtCurrency(r.total_deductions) },
    { key: 'net',        label: 'Net Salary',        value: r => fmtCurrency(r.net_salary), render: r => (
      <span style={{ fontWeight: 700, color: '#15803d' }}>{fmtCurrency(r.net_salary)}</span>
    )},
    { key: 'status',     label: 'Status',            value: r => r.current_status, render: r => <Badge value={r.current_status} /> },
  ]

  const exportCols = [
    { label: 'Code',             value: r => r.employee_code || '' },
    { label: 'Employee',         value: r => r.employee_name || '' },
    { label: 'Department',       value: r => r.department_name || '' },
    { label: 'Designation',      value: r => r.designation || '' },
    { label: 'Salary Structure', value: r => r.structure_name || '' },
    { label: 'Working Days',     value: r => r.working_days ?? '' },
    { label: 'Present Days',     value: r => r.present_days ?? '' },
    { label: 'Paid Leave Days',  value: r => r.paid_leave_days ?? '' },
    { label: 'Holiday Days',     value: r => r.holiday_days ?? '' },
    { label: 'Week Off Days',    value: r => r.week_off_days ?? '' },
    { label: 'LOP Days',         value: r => r.lop_days ?? '' },
    { label: 'Gross Salary',     value: r => r.gross_salary ?? '' },
    { label: 'Additions',        value: r => r.total_additions ?? '' },
    { label: 'Deductions',       value: r => r.total_deductions ?? '' },
    { label: 'Net Salary',       value: r => r.net_salary ?? '' },
    { label: 'Status',           value: r => r.current_status || '' },
  ]

  const runOptions = runs.map(r => ({
    value: r.id,
    label: `${MONTH_NAMES[r.payroll_month]} ${r.payroll_year} (${r.current_status})`,
  }))

  const pdfTitle = selectedRun
    ? `Payroll Summary — ${MONTH_NAMES[selectedRun.payroll_month]} ${selectedRun.payroll_year}`
    : 'Payroll Summary'

  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <FilterSelect label="Payroll Run" value={runId} onChange={setRunId} options={runOptions} placeholder="Select payroll run" />
          {selectedRun && (
            <div style={{ display: 'flex', gap: 16, padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Period: <b style={{ color: '#1e293b' }}>{fmtDate(selectedRun.payroll_start_date)} – {fmtDate(selectedRun.payroll_end_date)}</b>
              </span>
              <Badge value={selectedRun.current_status} />
            </div>
          )}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Payroll Summary</div>
          <ExportButtons
            loading={loading}
            onRefresh={load}
            onCSV={() => downloadCSV(rows, exportCols, `payroll-${runId}.csv`)}
            onPDF={() => downloadPDF(rows, exportCols, pdfTitle, `payroll-${runId}.pdf`)}
          />
        </div>
        {!runId
          ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Select a payroll run to view the summary.</div>
          : loading
            ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
            : <>
                <SummaryPills items={summaryPills} />
                <DataTable columns={columns} rows={rows} emptyMsg="No payroll data found for this run." />
              </>
        }
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 5 — Competency Reports
   Gap, Distribution, and Average Score reports.
═══════════════════════════════════════════════════════════════════════════ */
function CompetencyReport({ filters: filterData }) {
  const [reportType, setReportType] = useState('gap')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({ department_id: '', employee_id: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
      const endpoint = `/client-admin/competency-assessment/reports/${reportType}`
      const r = await api.get(endpoint, { params })
      setRows(r.data.data || r.data || [])
    } catch (err) {
      console.error(err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [f, reportType])

  useEffect(() => { load() }, [load])

  let columns = []
  let exportCols = []
  let reportTitle = ''
  let filename = ''

  if (reportType === 'gap') {
    reportTitle = 'Competency Gap Report'
    filename = 'competency_gap_report.pdf'
    columns = [
      { key: 'employee', label: 'Employee Name', value: r => r.employee_name || '—' },
      { key: 'code', label: 'Employee Code', value: r => r.employee_code || '—' },
      { key: 'dept', label: 'Department', value: r => r.department_name || '—' },
      { key: 'competency', label: 'Competency', value: r => r.competency_name || '—' },
      { key: 'target', label: 'Target Rating', value: r => '5.00' },
      { key: 'rating', label: 'Actual Rating', value: r => r.actual_rating !== null ? parseFloat(r.actual_rating).toFixed(2) : '—' },
      { key: 'gap', label: 'Gap Score', value: r => r.gap_score !== null ? parseFloat(r.gap_score).toFixed(2) : '—', render: r => {
        const val = parseFloat(r.gap_score || 0);
        return <span style={{ color: val < 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{val.toFixed(2)}</span>;
      }}
    ]
    exportCols = [
      { label: 'Employee Name', value: r => r.employee_name || '' },
      { label: 'Employee Code', value: r => r.employee_code || '' },
      { label: 'Department', value: r => r.department_name || '' },
      { label: 'Competency', value: r => r.competency_name || '' },
      { label: 'Target Rating', value: r => '5.00' },
      { label: 'Actual Rating', value: r => r.actual_rating !== null ? parseFloat(r.actual_rating).toFixed(2) : '' },
      { label: 'Gap Score', value: r => r.gap_score !== null ? parseFloat(r.gap_score).toFixed(2) : '' }
    ]
  } else if (reportType === 'distribution') {
    reportTitle = 'Competency Rating Distribution Report'
    filename = 'competency_rating_distribution.pdf'
    columns = [
      { key: 'competency', label: 'Competency', value: r => r.competency_name || '—' },
      { key: 'level_1', label: '1 ★', value: r => r.level_1_count || 0 },
      { key: 'level_2', label: '2 ★', value: r => r.level_2_count || 0 },
      { key: 'level_3', label: '3 ★', value: r => r.level_3_count || 0 },
      { key: 'level_4', label: '4 ★', value: r => r.level_4_count || 0 },
      { key: 'level_5', label: '5 ★', value: r => r.level_5_count || 0 },
      { key: 'total', label: 'Total Ratings', value: r => r.total_ratings || 0 }
    ]
    exportCols = [
      { label: 'Competency', value: r => r.competency_name || '' },
      { label: '1 Star Count', value: r => r.level_1_count || 0 },
      { label: '2 Star Count', value: r => r.level_2_count || 0 },
      { label: '3 Star Count', value: r => r.level_3_count || 0 },
      { label: '4 Star Count', value: r => r.level_4_count || 0 },
      { label: '5 Star Count', value: r => r.level_5_count || 0 },
      { label: 'Total Ratings', value: r => r.total_ratings || 0 }
    ]
  } else {
    reportTitle = 'Competency Average Rating Report'
    filename = 'competency_average_rating.pdf'
    columns = [
      { key: 'competency', label: 'Competency', value: r => r.competency_name || '—' },
      { key: 'avg_rating', label: 'Average Rating', value: r => r.avg_rating !== null ? parseFloat(r.avg_rating).toFixed(2) : '—', render: r => {
        const val = parseFloat(r.avg_rating || 0);
        return <span style={{ fontWeight: 700, color: '#4f46e5' }}>{val.toFixed(2)} ★</span>;
      }},
      { key: 'total', label: 'Total Ratings Count', value: r => r.total_ratings || 0 }
    ]
    exportCols = [
      { label: 'Competency', value: r => r.competency_name || '' },
      { label: 'Average Rating', value: r => r.avg_rating !== null ? parseFloat(r.avg_rating).toFixed(2) : '' },
      { label: 'Total Ratings Count', value: r => r.total_ratings || 0 }
    ]
  }

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>📊 Competency Assessment Reports</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>Analyze organizational competencies, gaps, and distributions.</p>
        </div>
        <ExportButtons
          onCSV={() => downloadCSV(rows, exportCols, filename.replace('.pdf', '.csv'))}
          onPDF={() => downloadPDF(rows, exportCols, reportTitle, filename)}
          onRefresh={load}
          loading={loading}
        />
      </div>

      {/* Sub-selector for report sub-type */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#f8fafc', padding: 4, borderRadius: 8, border: '1px solid #e2e8f0', width: 'fit-content' }}>
        <button
          onClick={() => setReportType('gap')}
          style={{
            padding: '6px 12px', borderRadius: 6, border: 'none',
            background: reportType === 'gap' ? '#fff' : 'transparent',
            color: reportType === 'gap' ? '#4f46e5' : '#64748b',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: reportType === 'gap' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          Gap Analysis
        </button>
        <button
          onClick={() => setReportType('distribution')}
          style={{
            padding: '6px 12px', borderRadius: 6, border: 'none',
            background: reportType === 'distribution' ? '#fff' : 'transparent',
            color: reportType === 'distribution' ? '#4f46e5' : '#64748b',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: reportType === 'distribution' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          Distribution
        </button>
        <button
          onClick={() => setReportType('average')}
          style={{
            padding: '6px 12px', borderRadius: 6, border: 'none',
            background: reportType === 'average' ? '#fff' : 'transparent',
            color: reportType === 'average' ? '#4f46e5' : '#64748b',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: reportType === 'average' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          Average Ratings
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <FilterSelect
          label="Department"
          value={f.department_id}
          onChange={v => setF(p => ({ ...p, department_id: v }))}
          options={filterData.departments.map(d => ({ value: d.department_id, label: d.name }))}
        />
        <FilterSelect
          label="Employee"
          value={f.employee_id}
          onChange={v => setF(p => ({ ...p, employee_id: v }))}
          options={filterData.employees.map(e => ({ value: e.employee_id, label: `${e.first_name} ${e.last_name}` }))}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading report data...</div>
      ) : (
        <DataTable columns={columns} rows={rows} emptyMsg="No competency report data found." />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'goals',     label: 'Goals',            icon: FiTarget,     color: '#a855f7' },
  { id: 'appraisal', label: 'Appraisal Cycles',  icon: FiTrendingUp, color: '#f59e0b' },
  { id: 'kpi',       label: 'KPI',              icon: FiActivity,   color: '#10b981' },
  { id: 'payroll',   label: 'Payroll Summary',   icon: FiCreditCard, color: '#6366f1' },
  { id: 'competency', label: 'Competencies',     icon: FiAward,      color: '#4f46e5' },
]

export default function ClientAdminReports() {
  const [activeTab, setActiveTab] = useState('goals')
  const [filterData, setFilterData] = useState({ departments: [], employees: [], kpiCategories: [], appraisalCycles: [], payrollRuns: [] })
  const [filtersLoading, setFiltersLoading] = useState(true)

  useEffect(() => {
    api.get('/client-admin/reports/filters')
      .then(r => setFilterData(r.data))
      .catch(() => {})
      .finally(() => setFiltersLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite }
      `}</style>
      <ClientAdminSidebar active="reports" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar title="Reports" subtitle="Client Admin Panel" />
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>

          {/* Tab Bar */}
          <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    background: active ? tab.color : 'transparent',
                    color: active ? '#fff' : '#6b7280',
                    transition: 'all 0.18s',
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {filtersLoading
            ? <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading report filters...</div>
            : <>
                {activeTab === 'goals'      && <GoalReport      filters={filterData} />}
                {activeTab === 'appraisal'  && <AppraisalReport  filters={filterData} />}
                {activeTab === 'kpi'        && <KpiReport        filters={filterData} />}
                {activeTab === 'payroll'    && <PayrollReport    filters={filterData} />}
                {activeTab === 'competency' && <CompetencyReport filters={filterData} />}
              </>
          }
        </main>
      </div>
    </div>
  )
}
