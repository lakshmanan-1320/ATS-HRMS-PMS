import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  active:     { label: 'Active',      color: '#15803d', bg: '#dcfce7', border: 'rgba(21,128,61,0.2)' },
  inactive:   { label: 'Inactive',    color: '#475569', bg: '#f1f5f9', border: 'rgba(71,85,105,0.2)' },
  exit:       { label: 'Exit',        color: '#7c3aed', bg: '#ede9fe', border: 'rgba(124,58,237,0.2)' },
  terminated: { label: 'Terminated',  color: '#b91c1c', bg: '#fee2e2', border: 'rgba(185,28,28,0.2)' },
}

const TYPE_META = {
  full_time: { label: 'Full-time', color: '#6366f1', bg: 'rgba(37,99,235,0.08)' },
  part_time: { label: 'Part-time', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
  contract:  { label: 'Contract',  color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  intern:    { label: 'Intern',    color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
}

const getLevelColor = (level) => {
  if (!level) return '#64748b';
  const l = level.toUpperCase();
  if (l.includes('L1')) return '#6366f1';
  if (l.includes('L2')) return '#3b82f6';
  if (l.includes('L3')) return '#06b6d4';
  if (l.includes('L4')) return '#0ea5e9';
  return '#64748b';
}

const initials = (first, last) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()

const PAGE_SIZE = 10

const CSV_HEADERS = [
  'employee_code', 'employee_name', 'email', 'department', 'designation', 'date_of_joining', 'salary_structure',
]
const CSV_EXAMPLE = [
  'EMP001', 'John Doe', 'john.doe@example.com', 'Engineering', 'Software Engineer', '2024-06-01', 'Standard Developer',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const rawHeaders = lines[0].split(',').map(h =>
    h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
  )
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = []
    let inQ = false, cur = ''
    for (const ch of line + ',') {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim().replace(/^"|"$/g, '')); cur = '' }
      else cur += ch
    }
    return Object.fromEntries(rawHeaders.map((h, i) => [h, vals[i] ?? '']))
  })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500,
          minWidth: 280, maxWidth: 360,
          background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#b91c1c' : '#15803d',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {t.type === 'error' ? '✗' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  )
}

const iStyle = (err) => ({
  padding: '9px 13px', background: '#ffffff',
  border: `1px solid ${err ? '#ef4444' : '#cbd5e1'}`,
  borderRadius: 10, color: '#1e293b', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
})

const selStyle = {
  padding: '9px 13px', background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: 10, color: '#1e293b', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer',
  transition: 'border-color 0.15s ease',
}


// ── Main Component ────────────────────────────────────────────────────────────

export default function Employees() {
  const navigate = useNavigate()
  const [employees, setEmployees]     = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [toasts, setToasts]           = useState([])

  // Filters
  const [search, setSearch]           = useState('')
  const [filterDept, setFilterDept]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]   = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // Status popup
  const [statusPop, setStatusPop] = useState(null)
  const statusRef = useRef()

  // Bulk import
  const [showImport, setShowImport]     = useState(false)
  const [importRows, setImportRows]     = useState([])
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [generatedCredentials, setGeneratedCredentials] = useState(null)
  const fileInputRef = useRef()

  const toastId = useRef(0)
  const token = sessionStorage.getItem('sa_token')
  const api = axios.create({
    baseURL: '/api/client-admin',
    headers: { Authorization: `Bearer ${token}` },
  })

  // ── Toast ──
  function addToast(msg, type = 'success') {
    const id = ++toastId.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }

  // ── Fetch ──
  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/employees')
      setEmployees(data)
    } catch (err) {
      addToast('Failed to load employees.', 'error')
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
    api.get('/departments')
      .then(r => setDepartments(r.data))
      .catch((err) => {
        if (err.response?.status === 401) {
          sessionStorage.clear()
          window.location.href = '/login'
        }
      })
  }, [])

  // Close status popup on outside click
  useEffect(() => {
    function handler(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusPop(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Track window width for responsive layout
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [search, filterDept, filterStatus, filterType])

  // ── Filter ──
  const filtered = employees.filter(e => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !e.first_name?.toLowerCase().includes(q) &&
        !e.last_name?.toLowerCase().includes(q) &&
        !e.employee_code?.toLowerCase().includes(q) &&
        !e.email?.toLowerCase().includes(q)
      ) return false
    }
    if (filterDept && String(e.department_id) !== filterDept) return false
    if (filterStatus && e.status !== filterStatus) return false
    if (filterType && e.employment_type !== filterType) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Status ──
  function openStatusPop(e, emp) {
    const rect = e.currentTarget.getBoundingClientRect()
    setStatusPop({ empId: emp.employee_id, current: emp.status, x: rect.left, y: rect.bottom + 6 })
  }

  async function changeStatus(empId, newStatus) {
    try {
      await api.patch(`/employees/${empId}/status`, { status: newStatus })
      setEmployees(p => p.map(e => e.employee_id === empId ? { ...e, status: newStatus } : e))
      addToast('Status updated.')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status.', 'error')
    } finally {
      setStatusPop(null)
    }
  }

  // ── PDF Export ──
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Employees Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} · Total: ${filtered.length}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['Code', 'Name', 'Email', 'Department', 'Designation', 'Type', 'Joined', 'Status']],
      body: filtered.map(e => [
        e.employee_code || '',
        `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        e.email || '',
        e.department_name || '',
        e.designation || '',
        TYPE_META[e.employment_type]?.label || e.employment_type || '',
        fmtDate(e.date_of_joining),
        STATUS_META[e.status]?.label || e.status || '',
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
    doc.save('employees.pdf')
  }

  // ── Bulk Import ──
  function downloadTemplate() {
    const csv = [CSV_HEADERS.join(','), CSV_EXAMPLE.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'employee_import_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleCSVSelect(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const rows = parseCSV(e.target.result)
      setImportRows(rows)
      setImportResult(null)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importRows.length) return
    setImporting(true)
    try {
      const { data } = await api.post('/employees/bulk-import', { rows: importRows })
      setImportResult(data)
      if (data.credentials?.length) {
        setGeneratedCredentials({
          title: 'Imported Employee Logins',
          credentials: data.credentials,
        })
      }
      if (data.imported > 0) fetchEmployees()
      addToast(`Imported ${data.imported} employee${data.imported !== 1 ? 's' : ''}.${data.skipped ? ` ${data.skipped} skipped.` : ''}`)
    } catch (err) {
      addToast(err.response?.data?.message || 'Import failed.', 'error')
    } finally {
      setImporting(false)
    }
  }

  // ── Styles ──
  const BD = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
  const inputFocus = e => { e.target.style.borderColor = '#6366f1' }
  const inputBlur  = e => { e.target.style.borderColor = '#cbd5e1' }
  const credentialText = generatedCredentials?.credentials?.map(c =>
    `${c.name || 'Employee'} (${c.employeeCode || 'No code'})\nEmail: ${c.email}\nTemporary password: ${c.tempPassword}`
  ).join('\n\n') || ''

  const isMobile = windowWidth < 640
  const isTablet = windowWidth >= 640 && windowWidth < 1024

  const COLS        = '100px 1fr 160px 160px 105px 100px 115px 80px'
  const COLS_TABLET = '1fr 150px 110px 115px 76px'

  // ── Render ──
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="employees" />
      <Toast toasts={toasts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: isMobile ? '16px 12px' : '32px 36px', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#1e293b' }}>Employees</h1>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
              Manage your workforce — add, edit, and control employee status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isMobile && (
              <button onClick={exportPDF} style={{
                padding: '9px 16px', background: '#ffffff',
                border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#64748b', fontFamily: 'inherit',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
              >⬇ Export PDF</button>
            )}
            <button onClick={() => { setShowImport(true); setImportRows([]); setImportResult(null) }} style={{
              padding: '9px 16px', background: '#ffffff',
              border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#64748b', fontFamily: 'inherit',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease',
              flex: isMobile ? 1 : 'none',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
            >⬆ Bulk Import</button>
            <button onClick={() => navigate('/client-admin/employees/add')} style={{
              padding: '9px 18px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', transition: 'all 0.2s ease',
              flex: isMobile ? 1 : 'none',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >+ Add Employee</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search name, code, email…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...iStyle(false), width: isMobile ? '100%' : 240, flex: isMobile ? '1 1 100%' : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onFocus={inputFocus} onBlur={inputBlur}
          />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ ...selStyle, width: isMobile ? 'calc(50% - 5px)' : 180, flex: isMobile ? '1 1 calc(50% - 5px)' : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onFocus={inputFocus} onBlur={inputBlur}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.department_id} value={String(d.department_id)}>{d.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selStyle, width: isMobile ? 'calc(50% - 5px)' : 150, flex: isMobile ? '1 1 calc(50% - 5px)' : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onFocus={inputFocus} onBlur={inputBlur}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...selStyle, width: isMobile ? 'calc(50% - 5px)' : 150, flex: isMobile ? '1 1 calc(50% - 5px)' : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            onFocus={inputFocus} onBlur={inputBlur}>
            <option value="">All Types</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(search || filterDept || filterStatus || filterType) && (
            <button onClick={() => { setSearch(''); setFilterDept(''); setFilterStatus(''); setFilterType('') }}
              style={{
                padding: '9px 14px', background: 'none', border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit',
                transition: 'all 0.15s ease', flex: isMobile ? '1 1 calc(50% - 5px)' : 'none',
              }}
              onMouseEnter={e => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#1e293b' }}
              onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#64748b' }}
            >
              ✕ Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            {filtered.length} of {employees.length} employee{employees.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 60, fontSize: 14 }}>Loading employees…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              {employees.length === 0 ? 'No employees yet' : 'No results match your filters'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {employees.length === 0 ? 'Click "Add Employee" or use Bulk Import to get started.' : 'Try adjusting your search or filters.'}
            </div>
            {employees.length === 0 && (
              <button onClick={() => navigate('/client-admin/employees/add')} style={{ padding: '10px 20px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#6366f1', fontFamily: 'inherit' }}>
                + Add First Employee
              </button>
            )}
          </div>
        ) : isMobile ? (
          /* ── Mobile: card-per-employee layout ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paginated.map(emp => {
              const sm = STATUS_META[emp.status] || STATUS_META.active
              const tm = TYPE_META[emp.employment_type] || TYPE_META.full_time
              const levelColor = getLevelColor(emp.level_code)
              return (
                <div key={emp.employee_id} style={{
                  background: '#ffffff', border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${levelColor}`,
                  borderRadius: 12, padding: 14,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}>
                  {/* Top: avatar + name + code */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: `${levelColor}12`, border: `2px solid ${levelColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: levelColor,
                    }}>
                      {initials(emp.first_name, emp.last_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{emp.first_name} {emp.last_name}</span>
                        {emp.level_code && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: levelColor, background: `${levelColor}15`, padding: '1px 5px', borderRadius: 5 }}>
                            {emp.level_code}
                          </span>
                        )}
                      </div>
                      {emp.email && <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{emp.email}</div>}
                    </div>
                    <span style={{ display: 'inline-block', padding: '3px 9px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#475569', fontFamily: 'monospace', flexShrink: 0 }}>
                      {emp.employee_code}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Department</div>
                      <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{emp.department_name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Designation</div>
                      <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{emp.designation || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Type & Work Mode</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', background: tm.bg, borderRadius: 20, fontSize: 10, fontWeight: 700, color: tm.color }}>{tm.label}</span>
                        {(emp.attendance_policy_type === 'REMOTE' || emp.office_location_name === 'Remote') ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 7px', borderRadius: 12, background: '#e0e7ff', color: '#4338ca', fontSize: 10, fontWeight: 700 }}>
                            🏠 Remote
                          </span>
                        ) : emp.attendance_policy_type === 'HYBRID' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 7px', borderRadius: 12, background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 700 }}>
                            🏢/🏠 Hybrid
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 7px', borderRadius: 12, background: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 700 }}>
                            🏢 Office
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Joined</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{fmtDate(emp.date_of_joining)}</div>
                    </div>
                  </div>

                  {/* Bottom: status + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={e => openStatusPop(e, emp)} style={{
                      padding: '5px 14px', background: sm.bg, border: `1px solid ${sm.color}30`,
                      borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>{sm.label} ▾</button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => navigate(`/client-admin/employees/${emp.employee_id}`)} title="View Details" style={{
                        width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(15,118,110,0.06)', border: '1px solid rgba(15,118,110,0.2)',
                        borderRadius: 8, cursor: 'pointer', color: '#0f766e',
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button onClick={() => navigate(`/client-admin/employees/${emp.employee_id}/edit`)} title="Edit Employee" style={{
                        width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 8, cursor: 'pointer', color: '#6366f1',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Tablet / Desktop: grid table layout ── */
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: isTablet ? 700 : 1000 }}>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isTablet ? COLS_TABLET : COLS,
              padding: isTablet ? '0 21px 10px 24px' : '0 21px 10px 24px',
              gap: 12,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#64748b',
              borderBottom: '1px solid #cbd5e1', marginBottom: 12,
            }}>
              {isTablet
                ? <><span>Name</span><span>Department</span><span>Type</span><span>Status</span><span style={{ textAlign: 'right' }}>Actions</span></>
                : <><span>Code</span><span>Name</span><span>Department</span><span>Designation</span><span>Type</span><span>Joined</span><span>Status</span><span style={{ textAlign: 'right' }}>Actions</span></>
              }
            </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paginated.map(emp => {
              const sm = STATUS_META[emp.status] || STATUS_META.active
              const tm = TYPE_META[emp.employment_type] || TYPE_META.full_time
              const levelColor = getLevelColor(emp.level_code)
              return (
                <div key={emp.employee_id} style={{
                  display: 'grid',
                  gridTemplateColumns: isTablet ? COLS_TABLET : COLS,
                  alignItems: 'center', gap: 12, padding: '14px 20px',
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  borderLeft: `4px solid ${levelColor}`,
                  borderRadius: 12, transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = levelColor
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  {/* Code — desktop only */}
                  {!isTablet && (
                    <div>
                      <span style={{ display: 'inline-block', padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                        {emp.employee_code}
                      </span>
                    </div>
                  )}
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `${levelColor}12`, border: `2px solid ${levelColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: levelColor, flexShrink: 0,
                    }}>
                      {initials(emp.first_name, emp.last_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{emp.first_name} {emp.last_name}</span>
                        {emp.level_code && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: levelColor, background: `${levelColor}15`, padding: '1px 5px', borderRadius: 5 }}>
                            {emp.level_code}
                          </span>
                        )}
                      </div>
                      {emp.email && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</div>}
                      {isTablet && emp.employee_code && (
                        <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 7px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                          {emp.employee_code}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Department */}
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{emp.department_name || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
                  {/* Designation — desktop only */}
                  {!isTablet && (
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{emp.designation || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
                  )}
                  {/* Type & Location Mode */}
                  <div>
                    <span style={{ display: 'inline-block', padding: '2px 9px', background: tm.bg, borderRadius: 20, fontSize: 11, fontWeight: 700, color: tm.color }}>
                      {tm.label}
                    </span>
                    <div style={{ marginTop: 4 }}>
                      {(emp.attendance_policy_type === 'REMOTE' || emp.office_location_name === 'Remote') ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 12, background: '#e0e7ff', color: '#4338ca', fontSize: 10, fontWeight: 700 }}>
                          🏠 Remote
                        </span>
                      ) : emp.attendance_policy_type === 'HYBRID' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 12, background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 700 }}>
                          🏢/🏠 Hybrid
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 12, background: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 700 }}>
                          🏢 Office
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Joined — desktop only */}
                  {!isTablet && (
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{fmtDate(emp.date_of_joining)}</div>
                  )}
                  {/* Status */}
                  <div>
                    <button onClick={e => openStatusPop(e, emp)} style={{
                      padding: '4px 12px', background: sm.bg, border: `1px solid ${sm.color}30`,
                      borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>{sm.label} ▾</button>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button onClick={() => navigate(`/client-admin/employees/${emp.employee_id}`)} title="View Details" style={{
                      width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(15,118,110,0.06)', border: '1px solid rgba(15,118,110,0.2)',
                      borderRadius: 8, cursor: 'pointer', color: '#0f766e',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.14)'; e.currentTarget.style.borderColor = 'rgba(15,118,110,0.4)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.06)'; e.currentTarget.style.borderColor = 'rgba(15,118,110,0.2)' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button onClick={() => navigate(`/client-admin/employees/${emp.employee_id}/edit`)} title="Edit Employee" style={{
                      width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 8, cursor: 'pointer', color: '#6366f1',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} employees
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{
                  padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
                  background: safePage === 1 ? '#f8fafc' : '#ffffff', cursor: safePage === 1 ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: 600, color: safePage === 1 ? '#cbd5e1' : '#475569', fontFamily: 'inherit',
                }}
              >← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', fontSize: 12, color: '#94a3b8' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      style={{
                        width: 32, height: 32, border: '1px solid', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                        background: p === safePage ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#ffffff',
                        borderColor: p === safePage ? '#6366f1' : '#cbd5e1',
                        color: p === safePage ? '#ffffff' : '#475569',
                      }}
                    >{p}</button>
                  )
                )
              }
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{
                  padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
                  background: safePage === totalPages ? '#f8fafc' : '#ffffff', cursor: safePage === totalPages ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: 600, color: safePage === totalPages ? '#cbd5e1' : '#475569', fontFamily: 'inherit',
                }}
              >Next →</button>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Status Popup */}
      {statusPop && (
        <div ref={statusRef} style={{
          position: 'fixed', left: statusPop.x, top: statusPop.y, zIndex: 2000,
          background: '#ffffff', border: '1px solid #cbd5e1',
          borderRadius: 12, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          minWidth: 150,
        }}>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <button key={k} onClick={() => changeStatus(statusPop.empId, k)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px', background: k === statusPop.current ? 'rgba(99, 102, 241, 0.08)' : 'none',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: k === statusPop.current ? '#6366f1' : v.color,
                fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Generated Credentials Modal (bulk import) */}
      {generatedCredentials && (
        <div style={{ ...BD, zIndex: 1100 }} onClick={() => setGeneratedCredentials(null)}>
          <div style={{
            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 16,
            padding: 24, width: 620, maxWidth: '95vw', maxHeight: '85vh',
            overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{generatedCredentials.title}</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: '#64748b' }}>
                  Share these temporary passwords with employees for their first sign-in. They will be asked to change the password after OTP verification.
                </p>
              </div>
              <button onClick={() => setGeneratedCredentials(null)} style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(0,0,0,0.05)',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                color: '#64748b', fontSize: '16px',
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {generatedCredentials.credentials.map((c, i) => (
                <div key={`${c.email}-${i}`} style={{ padding: 14, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{c.name || 'Employee'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.employeeCode || 'No code'} · {c.email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: c.emailSent === false ? '#b91c1c' : '#15803d', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {c.emailSent === false ? 'Email failed' : c.emailSent === true ? 'Email sent' : 'Password generated'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <code style={{ color: '#6366f1', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em' }}>{c.tempPassword}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(c.tempPassword)}
                      style={{ padding: '6px 10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 8, color: '#6366f1', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                    >
                      Copy
                    </button>
                  </div>
                  {c.emailError && <div style={{ marginTop: 8, fontSize: 11, color: '#b91c1c' }}>{c.emailError}</div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(credentialText)}
                style={{ padding: '9px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: '600' }}
              >
                Copy All
              </button>
              <button onClick={() => setGeneratedCredentials(null)} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div style={BD} onClick={() => setShowImport(false)}>
          <div style={{
            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 20,
            padding: 32, width: 700, maxWidth: '95vw', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Bulk Import Employees</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Upload a CSV to add multiple employees at once.</p>
              </div>
              <button onClick={() => setShowImport(false)} style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(0,0,0,0.05)',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                color: '#64748b', fontSize: '16px',
              }}>✕</button>
            </div>

            <div style={{ padding: 16, background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 6 }}>Step 1 — Download the CSV template</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                The template has the exact column names required. Fill it with your employee data and save as CSV.
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, fontFamily: 'monospace', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: 8 }}>
                {CSV_HEADERS.join(', ')}
              </div>
              <button onClick={downloadTemplate} style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6366f1', fontFamily: 'inherit' }}>
                ⬇ Download Template
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>Step 2 — Upload your CSV file</div>
              <div
                style={{ border: '2px dashed rgba(37, 99, 235, 0.25)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(37, 99, 235, 0.03)' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleCSVSelect(e.dataTransfer.files[0]) }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {importRows.length > 0
                    ? <span style={{ color: '#15803d', fontWeight: 600 }}>✓ {importRows.length} row{importRows.length !== 1 ? 's' : ''} loaded</span>
                    : 'Click or drag & drop your CSV file here'}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleCSVSelect(e.target.files[0])} />
            </div>

            {importRows.length > 0 && !importResult && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Preview (first 5 rows)</div>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #cbd5e1' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {Object.keys(importRows[0]).map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1px solid #cbd5e1' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} style={{ padding: '7px 12px', color: '#475569', whiteSpace: 'nowrap' }}>{v || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult && (
              <div style={{ marginBottom: 20, padding: 16, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
                  Import Complete — {importResult.imported} imported, {importResult.skipped} skipped
                </div>
                {importResult.errors?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {importResult.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#b91c1c' }}>Row {e.row}: {e.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImport(false)} style={{ padding: '9px 18px', background: 'rgba(0,0,0,0.04)', border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit', fontWeight: '600' }}>Close</button>
              {importRows.length > 0 && !importResult && (
                <button onClick={handleImport} disabled={importing} style={{
                  padding: '9px 22px', background: importing ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none', borderRadius: 10, cursor: importing ? 'default' : 'pointer',
                  fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                  boxShadow: importing ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.35)',
                }}>
                  {importing ? 'Importing…' : `Import ${importRows.length} Employee${importRows.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
