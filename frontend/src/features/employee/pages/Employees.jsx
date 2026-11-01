import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  FiUsers, FiSearch, FiX, FiDownload, FiUpload, FiPlus,
  FiEye, FiEdit2, FiCheckCircle, FiXCircle, FiUploadCloud,
  FiHome, FiBriefcase, FiShuffle,
} from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'
import Table from '../../../components/common/Table.jsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  active:     { label: 'Active',      color: '#15803d', bg: '#dcfce7', border: 'rgba(21,128,61,0.2)' },
  inactive:   { label: 'Inactive',    color: '#33415C', bg: '#F1F4F8', border: 'rgba(71,85,105,0.2)' },
  exit:       { label: 'Exit',        color: '#7c3aed', bg: '#ede9fe', border: 'rgba(124,58,237,0.2)' },
  terminated: { label: 'Terminated',  color: '#b91c1c', bg: '#fee2e2', border: 'rgba(185,28,28,0.2)' },
}

const TYPE_META = {
  full_time: { label: 'Full-time', color: '#0466C8', bg: 'rgba(4, 102, 200,0.08)' },
  part_time: { label: 'Part-time', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
  contract:  { label: 'Contract',  color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  intern:    { label: 'Intern',    color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
}

// Same level palette used on the Org Chart page — L1 uses the brand red.
const LEVEL_META = {
  L1: '#0466C8',
  L2: '#7c3aed',
  L3: '#059669',
  L4: '#d97706',
  L5: '#33415C',
}

const getLevelColor = (level) => {
  if (!level) return LEVEL_META.L5
  const key = level.toUpperCase().slice(0, 2)
  return LEVEL_META[key] || LEVEL_META.L5
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
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500,
          minWidth: 280, maxWidth: 360,
          background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#b91c1c' : '#15803d',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {t.type === 'error' ? <FiXCircle size={16} /> : <FiCheckCircle size={16} />} {t.msg}
        </div>
      ))}
    </div>
  )
}

const iStyle = (err) => ({
  padding: '9px 13px', background: '#ffffff',
  border: `1px solid ${err ? '#ef4444' : '#E3E7EE'}`,
  borderRadius: 10, color: '#001233', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
})

const selStyle = {
  padding: '9px 14px', background: '#ffffff',
  border: '1px solid #E3E7EE',
  borderRadius: 10, color: '#001233', fontSize: 13.5, outline: 'none',
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

  // Sorting
  const [sortColumn, setSortColumn]     = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

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
  useEffect(() => { setCurrentPage(1) }, [search, filterDept, filterStatus, filterType, sortColumn, sortDirection])

  const handleSort = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(colKey)
      setSortDirection('asc')
    }
  }

  // ── Filter ──
  const filtered = useMemo(() => {
    return employees.filter(e => {
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
  }, [employees, search, filterDept, filterStatus, filterType])

  // ── Sort ──
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = ''
      let valB = ''
      if (sortColumn === 'name') {
        valA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
        valB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
      } else if (sortColumn === 'employee_code') {
        valA = (a.employee_code || '').toLowerCase()
        valB = (b.employee_code || '').toLowerCase()
      } else if (sortColumn === 'department_name') {
        valA = (a.department_name || '').toLowerCase()
        valB = (b.department_name || '').toLowerCase()
      } else if (sortColumn === 'designation') {
        valA = (a.designation || '').toLowerCase()
        valB = (b.designation || '').toLowerCase()
      } else if (sortColumn === 'employment_type') {
        valA = (a.employment_type || '').toLowerCase()
        valB = (b.employment_type || '').toLowerCase()
      } else if (sortColumn === 'date_of_joining') {
        valA = a.date_of_joining ? new Date(a.date_of_joining).getTime() : 0
        valB = b.date_of_joining ? new Date(b.date_of_joining).getTime() : 0
      } else if (sortColumn === 'status') {
        valA = (a.status || '').toLowerCase()
        valB = (b.status || '').toLowerCase()
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
  const inputFocus = e => { e.target.style.borderColor = 'var(--primary-color, #0466C8)' }
  const inputBlur  = e => { e.target.style.borderColor = '#E3E7EE' }
  const credentialText = generatedCredentials?.credentials?.map(c =>
    `${c.name || 'Employee'} (${c.employeeCode || 'No code'})\nEmail: ${c.email}\nTemporary password: ${c.tempPassword}`
  ).join('\n\n') || ''

  const isMobile = windowWidth < 640
  const isTablet = windowWidth >= 640 && windowWidth < 1024

  const tabs = useMemo(() => [
    { key: 'all', label: 'All', count: employees.length },
    { key: 'active', label: 'Active', count: employees.filter(e => e.status === 'active').length },
    { key: 'inactive', label: 'Inactive', count: employees.filter(e => e.status === 'inactive').length },
    { key: 'exit', label: 'Exit', count: employees.filter(e => e.status === 'exit').length },
    { key: 'terminated', label: 'Terminated', count: employees.filter(e => e.status === 'terminated').length },
  ], [employees])

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Employee',
      sortable: true,
      render: (_, emp) => {
        const levelColor = getLevelColor(emp.level_code)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${levelColor}14`,
                border: `2px solid ${levelColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13.5,
                fontWeight: 700,
                color: levelColor,
                flexShrink: 0,
              }}
            >
              {initials(emp.first_name, emp.last_name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#001233' }}>
                  {emp.first_name} {emp.last_name}
                </span>
                {emp.level_code && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: levelColor,
                      background: `${levelColor}15`,
                      padding: '2px 7px',
                      borderRadius: 5,
                    }}
                  >
                    {emp.level_code}
                  </span>
                )}
              </div>
              {emp.email && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: '#7D8597',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {emp.email}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'employee_code',
      label: 'Code',
      sortable: true,
      render: (code) => (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: '#F1F4F8',
            border: '1px solid #E3E7EE',
            borderRadius: 20,
            fontSize: 12.5,
            fontWeight: 700,
            color: '#33415C',
            letterSpacing: '0.04em',
            fontFamily: 'monospace',
          }}
        >
          {code || '—'}
        </span>
      ),
    },
    {
      key: 'department_name',
      label: 'Department',
      sortable: true,
      render: (dept) => (
        <span style={{ fontSize: 14, color: '#001233', fontWeight: 500 }}>
          {dept || <span style={{ color: '#cbd5e1' }}>—</span>}
        </span>
      ),
    },
    {
      key: 'designation',
      label: 'Designation',
      sortable: true,
      render: (desig) => (
        <span style={{ fontSize: 14, color: '#33415C', fontWeight: 500 }}>
          {desig || <span style={{ color: '#cbd5e1' }}>—</span>}
        </span>
      ),
    },
    {
      key: 'employment_type',
      label: 'Type & Work Mode',
      sortable: true,
      render: (_, emp) => {
        const tm = TYPE_META[emp.employment_type] || TYPE_META.full_time
        return (
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                background: tm.bg,
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                color: tm.color,
              }}
            >
              {tm.label}
            </span>
            <div style={{ marginTop: 4 }}>
              {emp.attendance_policy_type === 'REMOTE' || emp.office_location_name === 'Remote' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'rgba(15,118,110,0.1)',
                    color: '#0f766e',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <FiHome size={11} /> Remote
                </span>
              ) : emp.attendance_policy_type === 'HYBRID' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <FiShuffle size={11} /> Hybrid
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#F1F4F8',
                    color: '#33415C',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <FiBriefcase size={11} /> Office
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'date_of_joining',
      label: 'Joined',
      sortable: true,
      render: (date) => (
        <span style={{ fontSize: 13.5, color: '#33415C', fontWeight: 600 }}>
          {fmtDate(date)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_, emp) => {
        const sm = STATUS_META[emp.status] || STATUS_META.active
        return (
          <button
            onClick={(e) => openStatusPop(e, emp)}
            style={{
              padding: '5px 14px',
              background: sm.bg,
              border: `1px solid ${sm.color}30`,
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 700,
              color: sm.color,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {sm.label} ▾
          </button>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, emp) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            onClick={() => navigate(`/client-admin/employees/${emp.employee_id}`)}
            title="View Details"
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15,118,110,0.06)',
              border: '1px solid rgba(15,118,110,0.2)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#0f766e',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(15,118,110,0.14)'
              e.currentTarget.style.borderColor = 'rgba(15,118,110,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15,118,110,0.06)'
              e.currentTarget.style.borderColor = 'rgba(15,118,110,0.2)'
            }}
          >
            <FiEye size={16} />
          </button>
          <button
            onClick={() => navigate(`/client-admin/employees/${emp.employee_id}/edit`)}
            title="Edit Employee"
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--card-active-bg, #EEF8FF)',
              border: '1px solid var(--card-active-border, #C9DDF3)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--primary-color, #0466C8)',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fddde1'
              e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'
              e.currentTarget.style.borderColor = 'var(--card-active-border, #C9DDF3)'
            }}
          >
            <FiEdit2 size={15} />
          </button>
        </div>
      ),
    },
  ], [navigate])

  const emptyStateNode = (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <FiUsers size={40} color="#94a3b8" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: '#001233', marginBottom: 6 }}>
        {employees.length === 0 ? 'No employees yet' : 'No results match your filters'}
      </div>
      <div style={{ fontSize: 13, color: '#7D8597', marginBottom: 20 }}>
        {employees.length === 0 ? 'Click "Add Employee" or use Bulk Import to get started.' : 'Try adjusting your search or filters.'}
      </div>
      {employees.length === 0 && (
        <button
          onClick={() => navigate('/client-admin/employees/add')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
            background: 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(4, 102, 200, 0.3)'
          }}
        >
          <AddIcon size={20} />
          <span style={{ color: '#ffffff', fontWeight: 700 }}>Add First Employee</span>
        </button>
      )}
    </div>
  )

  const extraControlsNode = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%' }}>
      <select
        value={filterDept}
        onChange={e => { setFilterDept(e.target.value); setCurrentPage(1) }}
        style={{ ...selStyle, width: isMobile ? 'calc(50% - 5px)' : 180, flex: isMobile ? '1 1 calc(50% - 5px)' : 'none' }}
      >
        <option value="">All Departments</option>
        {departments.map(d => <option key={d.department_id} value={String(d.department_id)}>{d.name}</option>)}
      </select>
      <select
        value={filterType}
        onChange={e => { setFilterType(e.target.value); setCurrentPage(1) }}
        style={{ ...selStyle, width: isMobile ? 'calc(50% - 5px)' : 160, flex: isMobile ? '1 1 calc(50% - 5px)' : 'none' }}
      >
        <option value="">All Types</option>
        {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {(search || filterDept || filterStatus || filterType) && (
        <button
          onClick={() => { setSearch(''); setFilterDept(''); setFilterStatus(''); setFilterType(''); setCurrentPage(1) }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5',
            borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#dc2626',
            fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s ease'
          }}
        >
          <FiX size={13} /> Clear filters
        </button>
      )}
      <span style={{
        marginLeft: 'auto', fontSize: 12, color: '#7D8597', fontWeight: 600,
        background: '#ffffff', padding: '4px 12px', borderRadius: 20, border: '1px solid #E3E7EE'
      }}>
        {filtered.length} of {employees.length} employees
      </span>
    </div>
  )

  // ── Render ──
  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF', color: '#001233', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="employees" />
      <Toast toasts={toasts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: isMobile ? '16px 12px' : '24px 32px', overflowY: 'auto', overflowX: 'hidden', background: '#FFFFFF' }}>

        {/* Header */}
        <PageHeader
          icon={FiUsers}
          title="Employees"
          subtitle="Manage your workforce — add, edit, and control employee status."
          actions={
            <>
              {!isMobile && (
                <button onClick={exportPDF} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', background: '#ffffff',
                  border: '1px solid #E3E7EE', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#7D8597', fontFamily: 'inherit',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EEF8FF'; e.currentTarget.style.borderColor = '#C9DDF3'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#E3E7EE'; e.currentTarget.style.color = '#7D8597' }}
                ><FiDownload size={14} /> Export PDF</button>
              )}
              <button onClick={() => { setShowImport(true); setImportRows([]); setImportResult(null) }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', background: '#ffffff',
                border: '1px solid #E3E7EE', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#7D8597', fontFamily: 'inherit',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease',
                flex: isMobile ? 1 : 'none', justifyContent: 'center',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EEF8FF'; e.currentTarget.style.borderColor = '#C9DDF3'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#E3E7EE'; e.currentTarget.style.color = '#7D8597' }}
              ><FiUpload size={14} /> Bulk Import</button>
              <button onClick={() => navigate('/client-admin/employees/add')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                padding: '9px 18px', background: 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(4, 102, 200, 0.3)', transition: 'all 0.2s ease',
                flex: isMobile ? 1 : 'none',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              ><AddIcon size={20} /><span style={{ color: '#ffffff', fontWeight: 700 }}>Add Employee</span></button>
            </>
          }
        />

        <Table
          columns={columns}
          data={paginated}
          rowKey={(emp) => emp.employee_id}
          tabs={tabs}
          activeTab={filterStatus || 'all'}
          onTabChange={(k) => {
            setFilterStatus(k === 'all' ? '' : k)
            setCurrentPage(1)
          }}
          searchable={true}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v)
            setCurrentPage(1)
          }}
          searchPlaceholder="Search name, code, email…"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          loading={loading}
          emptyState={emptyStateNode}
          extraControls={extraControlsNode}
          pagination={{
            currentPage: safePage,
            totalPages,
            totalItems: sorted.length,
            pageSize: PAGE_SIZE,
            onPageChange: setCurrentPage,
          }}
        />
        </main>
      </div>

      {/* Status Popup */}
      {statusPop && (
        <div ref={statusRef} style={{
          position: 'fixed', left: statusPop.x, top: statusPop.y, zIndex: 2000,
          background: '#ffffff', border: '1px solid #E3E7EE',
          borderRadius: 12, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          minWidth: 150,
        }}>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <button key={k} onClick={() => changeStatus(statusPop.empId, k)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px', background: k === statusPop.current ? 'var(--card-active-bg, #EEF8FF)' : 'none',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: k === statusPop.current ? 'var(--primary-color, #0466C8)' : v.color,
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
            background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: 16,
            padding: 24, width: 620, maxWidth: '95vw', maxHeight: '85vh',
            overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#001233' }}>{generatedCredentials.title}</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: '#7D8597' }}>
                  Share these temporary passwords with employees for their first sign-in. They will be asked to change the password after OTP verification.
                </p>
              </div>
              <button onClick={() => setGeneratedCredentials(null)} style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(0,0,0,0.05)',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                color: '#7D8597', fontSize: '16px',
              }}><FiX size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {generatedCredentials.credentials.map((c, i) => (
                <div key={`${c.email}-${i}`} style={{ padding: 14, background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#001233' }}>{c.name || 'Employee'}</div>
                      <div style={{ fontSize: 11, color: '#7D8597' }}>{c.employeeCode || 'No code'} · {c.email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: c.emailSent === false ? '#b91c1c' : '#15803d', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {c.emailSent === false ? 'Email failed' : c.emailSent === true ? 'Email sent' : 'Password generated'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#F1F4F8', border: '1px solid #E3E7EE', borderRadius: 8 }}>
                    <code style={{ color: 'var(--primary-color, #0466C8)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em' }}>{c.tempPassword}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(c.tempPassword)}
                      style={{ padding: '6px 10px', background: 'var(--card-active-bg, #EEF8FF)', border: '1px solid var(--card-active-border, #C9DDF3)', borderRadius: 8, color: 'var(--primary-color, #0466C8)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
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
                style={{ padding: '9px 16px', background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: 10, color: '#7D8597', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: '600' }}
              >
                Copy All
              </button>
              <button onClick={() => setGeneratedCredentials(null)} style={{ padding: '9px 18px', background: 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div style={BD} onClick={() => setShowImport(false)}>
          <div style={{
            background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: 20,
            padding: 32, width: 700, maxWidth: '95vw', maxHeight: '88vh',
            overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#001233' }}>Bulk Import Employees</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7D8597' }}>Upload a CSV to add multiple employees at once.</p>
              </div>
              <button onClick={() => setShowImport(false)} style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(0,0,0,0.05)',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                color: '#7D8597', fontSize: '16px',
              }}><FiX size={16} /></button>
            </div>

            <div style={{ padding: 16, background: 'var(--card-active-bg, #EEF8FF)', border: '1px solid var(--card-active-border, #C9DDF3)', borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-color, #0466C8)', marginBottom: 6 }}>Step 1 — Download the CSV template</div>
              <div style={{ fontSize: 12, color: '#7D8597', marginBottom: 12 }}>
                The template has the exact column names required. Fill it with your employee data and save as CSV.
              </div>
              <div style={{ fontSize: 11, color: '#33415C', marginBottom: 10, fontFamily: 'monospace', background: '#f8fafc', border: '1px solid #E3E7EE', padding: '8px 12px', borderRadius: 8 }}>
                {CSV_HEADERS.join(', ')}
              </div>
              <button onClick={downloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#ffffff', border: '1px solid var(--card-active-border, #C9DDF3)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--primary-color, #0466C8)', fontFamily: 'inherit' }}>
                <FiDownload size={13} /> Download Template
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7D8597', marginBottom: 12 }}>Step 2 — Upload your CSV file</div>
              <div
                style={{ border: '2px dashed var(--card-active-border, #C9DDF3)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'var(--card-active-bg, #EEF8FF)' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleCSVSelect(e.dataTransfer.files[0]) }}
              >
                <FiUploadCloud size={28} color="var(--primary-color, #0466C8)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: '#7D8597' }}>
                  {importRows.length > 0
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#15803d', fontWeight: 600 }}><FiCheckCircle size={14} /> {importRows.length} row{importRows.length !== 1 ? 's' : ''} loaded</span>
                    : 'Click or drag & drop your CSV file here'}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleCSVSelect(e.target.files[0])} />
            </div>

            {importRows.length > 0 && !importResult && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7D8597', marginBottom: 8 }}>Preview (first 5 rows)</div>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E3E7EE' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {Object.keys(importRows[0]).map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#7D8597', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1px solid #E3E7EE' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #E3E7EE' }}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} style={{ padding: '7px 12px', color: '#33415C', whiteSpace: 'nowrap' }}>{v || '—'}</td>
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
              <button onClick={() => setShowImport(false)} style={{ padding: '9px 18px', background: 'rgba(0,0,0,0.04)', border: '1px solid #E3E7EE', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#7D8597', fontFamily: 'inherit', fontWeight: '600' }}>Close</button>
              {importRows.length > 0 && !importResult && (
                <button onClick={handleImport} disabled={importing} style={{
                  padding: '9px 22px', background: importing ? 'rgba(4, 102, 200, 0.5)' : 'var(--navbar-active-gradient, linear-gradient(135deg, #0466C8 0%, #023E7D 100%))',
                  border: 'none', borderRadius: 10, cursor: importing ? 'default' : 'pointer',
                  fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                  boxShadow: importing ? 'none' : '0 4px 14px rgba(4, 102, 200, 0.3)',
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
