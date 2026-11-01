import React, { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'
import {
  FiGift, FiPlus, FiUpload, FiDownload, FiEdit2, FiTrash2,
  FiLock, FiSearch, FiX, FiCalendar, FiFilter, FiCheckCircle,
  FiAlertCircle, FiLoader, FiCheck
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const TYPE_BADGE = {
  PUBLIC:   { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  OPTIONAL: { bg: '#f3e8ff', color: '#6d28d9', border: '#e9d5ff' },
}

const PAGE_SIZE = 10

const CSV_TEMPLATE = `holiday_name,holiday_date,holiday_type,description
Independence Day,2026-08-15,PUBLIC,National Independence Day celebration
Diwali,2026-11-12,PUBLIC,Festival of Lights
Optional Holiday,2026-10-02,OPTIONAL,Gandhi Jayanti (Optional)`

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'holidays_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row.' }
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const requiredCols = ['holiday_name', 'holiday_date']
  for (const col of requiredCols) {
    if (!header.includes(col)) return { rows: [], error: `Missing required column: "${col}"` }
  }
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    header.forEach((h, idx) => { row[h] = vals[idx] || '' })
    const errors = []
    if (!row.holiday_name) errors.push('holiday_name required')
    if (!row.holiday_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.holiday_date)) errors.push('holiday_date must be YYYY-MM-DD')
    if (row.holiday_type && !['PUBLIC', 'OPTIONAL'].includes(row.holiday_type.toUpperCase())) errors.push('holiday_type must be PUBLIC or OPTIONAL')
    rows.push({ ...row, holiday_type: (row.holiday_type || 'PUBLIC').toUpperCase(), _errors: errors, _line: i + 1 })
  }
  return { rows, error: null }
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

export default function HolidayManagement() {
  const [holidays, setHolidays]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [yearFilter, setYearFilter]   = useState(new Date().getFullYear().toString())
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [page, setPage]               = useState(1)

  // Create / Edit modal
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [formError, setFormError]         = useState('')
  const [formSaving, setFormSaving]       = useState(false)
  const [name, setName]                   = useState('')
  const [date, setDate]                   = useState('')
  const [type, setType]                   = useState('PUBLIC')
  const [description, setDescription]     = useState('')

  // Bulk Import modal
  const [importOpen, setImportOpen]       = useState(false)
  const [importRows, setImportRows]       = useState([])
  const [importParseError, setImportParseError] = useState('')
  const [importState, setImportState]     = useState('idle') // idle | importing | done
  const [importResults, setImportResults] = useState([])
  const fileInputRef = useRef(null)

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())

  useEffect(() => { fetchHolidays() }, [yearFilter])

  function fetchHolidays() {
    setLoading(true)
    api.get('/v1/holidays', { params: { year: yearFilter } })
      .then(res => setHolidays(res.data?.data || []))
      .catch(err => { if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' } })
      .finally(() => setLoading(false))
  }

  function isPast(dateVal) {
    if (!dateVal) return false
    return dateVal.split('T')[0] < todayStr
  }

  function getDayOfWeek(dateStr) {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('T')[0].split('-')
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Create / Edit handlers
  function handleOpenCreate() {
    setEditingHoliday(null); setName(''); setDate(''); setType('PUBLIC'); setDescription(''); setFormError(''); setFormSaving(false); setModalOpen(true)
  }

  function handleOpenEdit(h) {
    if (isPast(h.holiday_date)) return
    setEditingHoliday(h); setName(h.holiday_name); setDate(h.holiday_date?.split('T')[0] || '')
    setType(h.holiday_type); setDescription(h.description || ''); setFormError(''); setFormSaving(false); setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setFormError('Holiday name is required.')
    if (!date) return setFormError('Holiday date is required.')
    setFormSaving(true); setFormError('')
    const payload = { holiday_name: name, holiday_date: date, holiday_type: type, description }
    try {
      if (editingHoliday) { await api.put(`/v1/holidays/${editingHoliday.holiday_id}`, payload) }
      else { await api.post('/v1/holidays', payload) }
      setModalOpen(false); fetchHolidays()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed.')
      if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setFormSaving(false) }
  }

  async function handleDelete(holidayId) {
    if (!window.confirm('Delete this holiday? This cannot be undone.')) return
    try { await api.delete(`/v1/holidays/${holidayId}`); fetchHolidays() }
    catch (err) { alert(err.response?.data?.message || 'Delete failed.') }
  }

  async function handleToggleStatus(h) {
    if (isPast(h.holiday_date)) return
    try { await api.patch(`/v1/holidays/${h.holiday_id}/status`, { is_active: !h.is_active }); fetchHolidays() }
    catch (err) { alert(err.response?.data?.message || 'Status toggle failed.') }
  }

  // Bulk Import handlers
  function handleOpenImport() {
    setImportRows([]); setImportParseError(''); setImportState('idle'); setImportResults([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    setImportOpen(true)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows, error } = parseCSV(ev.target.result)
      setImportParseError(error || '')
      setImportRows(rows)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importRows.length) return
    const validRows = importRows.filter(r => r._errors.length === 0)
    if (!validRows.length) return
    setImportState('importing')
    const results = []
    for (const row of validRows) {
      try {
        await api.post('/v1/holidays', {
          holiday_name: row.holiday_name,
          holiday_date: row.holiday_date,
          holiday_type: row.holiday_type,
          description: row.description || ''
        })
        results.push({ name: row.holiday_name, ok: true })
      } catch (err) {
        results.push({ name: row.holiday_name, ok: false, msg: err.response?.data?.message || 'Failed' })
      }
    }
    setImportResults(results)
    setImportState('done')
    if (results.some(r => r.ok)) fetchHolidays()
  }

  // Filtered + paginated
  const filtered = useMemo(() => {
    return holidays.filter(h => {
      if (search) {
        const q = search.toLowerCase()
        if (!h.holiday_name.toLowerCase().includes(q)) return false
      }
      if (typeFilter && h.holiday_type !== typeFilter) return false
      return true
    })
  }, [holidays, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    total:    holidays.length,
    pub:      holidays.filter(h => h.holiday_type === 'PUBLIC').length,
    optional: holidays.filter(h => h.holiday_type === 'OPTIONAL').length,
    upcoming: holidays.filter(h => !isPast(h.holiday_date) && h.is_active).length,
  }), [holidays])

  const hasFilters = search || typeFilter
  const validImportCount = importRows.filter(r => r._errors.length === 0).length

  const yearOptions = ['2024', '2025', '2026', '2027', '2028']

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#F1F4F8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="holidays" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Header */}
          <PageHeader
            icon={FiGift}
            title="Holiday Management"
            subtitle="Create and configure organizational holidays for leave and attendance tracking"
            actions={
              <>
                <button
                  onClick={handleOpenImport}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#374151', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <FiUpload size={14} color="#0466C8" /> Bulk Import
                </button>
                <button
                  onClick={handleOpenCreate}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(4, 102, 200,0.3)' }}
                >
                  <AddIcon size={20} />
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>Create Holiday</span>
                </button>
              </>
            }
          />

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Holidays', value: stats.total,    icon: <FiGift size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { label: 'Public',         value: stats.pub,      icon: <FiCheckCircle size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { label: 'Optional',       value: stats.optional, icon: <FiCalendar size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { label: 'Upcoming',       value: stats.upcoming, icon: <FiCalendar size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#0466C8', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '12px', color: '#7D8597', fontWeight: '600', marginTop: 3 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year:</span>
              <select
                value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1) }}
                style={{ padding: '8px 12px', border: '1px solid #E3E7EE', borderRadius: '9px', fontSize: '13px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700' }}
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div style={{ width: '1px', height: '28px', background: '#E3E7EE' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 220px', minWidth: '160px', maxWidth: '220px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '9px', padding: '0 11px' }}>
              <FiSearch size={13} color="#94a3b8" />
              <input
                placeholder="Search holidays…"
                value={search}
                className="ca-borderless-input"
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#001233', outline: 'none', fontFamily: 'inherit', width: '100%' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  <FiX size={12} />
                </button>
              )}
            </div>

            <select
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', border: '1px solid #E3E7EE', borderRadius: '9px', fontSize: '13px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
            >
              <option value="">All Types</option>
              <option value="PUBLIC">Public</option>
              <option value="OPTIONAL">Optional</option>
            </select>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setTypeFilter(''); setPage(1) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}
              >
                <FiX size={11} /> Clear
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiFilter size={12} color="#94a3b8" />
              <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: '600' }}>
                {filtered.length} of {holidays.length} holiday{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #E3E7EE', borderTopColor: '#0466C8', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#7D8597', fontSize: '13px', fontWeight: '600' }}>Loading holidays…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiGift size={22} color="#ffffff" />
                </div>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>
                  {hasFilters ? 'No holidays match your search' : `No holidays configured for ${yearFilter}`}
                </div>
                {hasFilters
                  ? <span onClick={() => { setSearch(''); setTypeFilter('') }} style={{ color: '#0466C8', fontSize: '13px', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Clear filters</span>
                  : <span style={{ color: '#94a3b8', fontSize: '13px' }}>Click "Create Holiday" to add one.</span>
                }
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #E3E7EE' }}>
                      {['Holiday Name', 'Date', 'Day of Week', 'Type', 'Description', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '13px 18px', color: '#7D8597', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((h, idx) => {
                      const past = isPast(h.holiday_date)
                      const badge = TYPE_BADGE[h.holiday_type] || TYPE_BADGE.PUBLIC
                      const dateStr = h.holiday_date?.split('T')[0] || ''
                      return (
                        <tr key={h.holiday_id}
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F1F4F8' : 'none', transition: 'background 0.15s', opacity: past ? 0.75 : 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '8px', background: `linear-gradient(135deg, ${past ? '#94a3b8' : badge.color} 0%, ${past ? '#94a3b8' : badge.color} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {past ? <FiLock size={14} color="#ffffff" /> : <FiGift size={14} color="#ffffff" />}
                              </div>
                              <span style={{ fontWeight: '700', color: '#001233' }}>{h.holiday_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0466C8', whiteSpace: 'nowrap' }}>{fmtDate(h.holiday_date)}</td>
                          <td style={{ padding: '14px 18px', color: '#374151', fontWeight: '500' }}>{getDayOfWeek(h.holiday_date)}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', textTransform: 'uppercase', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: '0.04em' }}>
                              {h.holiday_type}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#7D8597', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.description || <span style={{ color: '#E3E7EE' }}>—</span>}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <button
                              disabled={past}
                              onClick={() => handleToggleStatus(h)}
                              style={{
                                padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: '700', cursor: past ? 'not-allowed' : 'pointer', border: '1px solid',
                                background: past ? '#F1F4F8' : h.is_active ? '#f0fdf4' : '#fef2f2',
                                color:      past ? '#94a3b8' : h.is_active ? '#15803d'  : '#b91c1c',
                                borderColor: past ? '#E3E7EE' : h.is_active ? '#bbf7d0' : '#fecaca',
                              }}
                            >
                              {past ? 'Locked (Past)' : h.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {past ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                                <FiLock size={12} /> Locked
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => handleOpenEdit(h)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#0466C8', color: '#ffffff', border: '1px solid #0466C8', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#023E7D'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#0466C8'}
                                >
                                  <FiEdit2 size={11} color="#ffffff" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(h.holiday_id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#b91c1c', color: '#ffffff', border: '1px solid #b91c1c', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#b91c1c'}
                                >
                                  <FiTrash2 size={11} color="#ffffff" /> Delete
                                </button>
                              </div>
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
          {!loading && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: '12px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: '500' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong style={{ color: '#374151' }}>{filtered.length}</strong> holidays
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #E3E7EE', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#E3E7EE' : '#374151' }}
                >‹ Prev</button>

                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`d${i}`} style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '13px' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: page === p ? 'none' : '1px solid #E3E7EE', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg,#0466C8,#023E7D)' : '#fff', color: page === p ? '#fff' : '#374151', boxShadow: page === p ? '0 2px 8px rgba(4, 102, 200,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >{p}</button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #E3E7EE', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#E3E7EE' : '#374151' }}
                >Next ›</button>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '500px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingHoliday ? <FiEdit2 size={16} color="#fff" /> : <FiPlus size={18} color="#fff" />}
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#001233' }}>
                  {editingHoliday ? 'Edit Holiday' : 'Create Holiday'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7D8597' }}>
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {[
                { label: 'Holiday Name *', el: <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Independence Day" required style={inputStyle} /> },
                { label: 'Holiday Date *', el: <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} /> },
                { label: 'Holiday Type *', el: (
                  <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="PUBLIC">Public</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                )},
                { label: 'Description', el: <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief details about the holiday…" rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} /> },
              ].map(({ label, el }) => (
                <div key={label} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#7D8597', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  {el}
                </div>
              ))}

              {formError && (
                <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '14px' }}>
                  {formError}
                </div>
              )}

              <button type="submit" disabled={formSaving}
                style={{ width: '100%', padding: '11px', background: formSaving ? 'rgba(4, 102, 200,0.5)' : 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: formSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(4, 102, 200,0.3)', marginTop: '4px' }}>
                {formSaving ? 'Saving…' : editingHoliday ? 'Save Changes' : 'Create Holiday'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => importState !== 'importing' && setImportOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '680px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiUpload size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#001233' }}>Bulk Import Holidays</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#7D8597' }}>Upload a CSV file to import multiple holidays at once</p>
                </div>
              </div>
              {importState !== 'importing' && (
                <button onClick={() => setImportOpen(false)}
                  style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7D8597' }}>
                  <FiX size={14} />
                </button>
              )}
            </div>

            {importState === 'done' ? (
              /* Results */
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803d' }}>{importResults.filter(r => r.ok).length}</div>
                      <div style={{ fontSize: '12px', color: '#7D8597', fontWeight: '600' }}>Imported</div>
                    </div>
                    <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#b91c1c' }}>{importResults.filter(r => !r.ok).length}</div>
                      <div style={{ fontSize: '12px', color: '#7D8597', fontWeight: '600' }}>Failed</div>
                    </div>
                  </div>
                  <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: '10px', border: '1px solid #E3E7EE' }}>
                    {importResults.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < importResults.length - 1 ? '1px solid #F1F4F8' : 'none', background: r.ok ? '#f0fdf4' : '#fef2f2' }}>
                        {r.ok ? <FiCheckCircle size={14} color="#15803d" /> : <FiAlertCircle size={14} color="#b91c1c" />}
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: '#374151' }}>{r.name}</span>
                        {!r.ok && <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>{r.msg}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setImportOpen(false)}
                  style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Template download + file upload */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ flex: 1, border: '2px dashed #C9DDF3', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#fafbff', cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}>
                    <FiUpload size={22} color="#0466C8" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: 4 }}>
                      {importRows.length > 0 ? `${importRows.length} row${importRows.length !== 1 ? 's' : ''} loaded` : 'Click to upload CSV'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Only .csv files are supported</div>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                  </div>
                  <button onClick={downloadTemplate}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 20px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '12px', cursor: 'pointer', color: '#374151', fontSize: '12px', fontWeight: '700' }}>
                    <FiDownload size={18} color="#0466C8" />
                    Download<br />Template
                  </button>
                </div>

                {/* CSV format hint */}
                <div style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: '#33415C' }}>
                  <strong style={{ color: '#374151' }}>Required columns:</strong>{' '}
                  <code style={{ background: '#E3E7EE', padding: '1px 5px', borderRadius: 4, fontSize: '11px' }}>holiday_name</code>,{' '}
                  <code style={{ background: '#E3E7EE', padding: '1px 5px', borderRadius: 4, fontSize: '11px' }}>holiday_date</code> (YYYY-MM-DD){' '}
                  &nbsp;|&nbsp; <strong style={{ color: '#374151' }}>Optional:</strong>{' '}
                  <code style={{ background: '#E3E7EE', padding: '1px 5px', borderRadius: 4, fontSize: '11px' }}>holiday_type</code> (PUBLIC/OPTIONAL),{' '}
                  <code style={{ background: '#E3E7EE', padding: '1px 5px', borderRadius: 4, fontSize: '11px' }}>description</code>
                </div>

                {importParseError && (
                  <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', padding: '10px 14px', background: '#fef2f2', borderRadius: '9px', border: '1px solid #fecaca', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FiAlertCircle size={13} /> {importParseError}
                  </div>
                )}

                {/* Preview table */}
                {importRows.length > 0 && !importParseError && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>Preview ({importRows.length} rows)</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', fontWeight: '700' }}>{validImportCount} valid</span>
                        {importRows.length - validImportCount > 0 && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '700' }}>{importRows.length - validImportCount} error{importRows.length - validImportCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: '10px', border: '1px solid #E3E7EE', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #E3E7EE' }}>
                            {['Row', 'Name', 'Date', 'Type', 'Description', 'Status'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#7D8597', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: i < importRows.length - 1 ? '1px solid #F1F4F8' : 'none', background: r._errors.length ? '#fff7f7' : 'transparent' }}>
                              <td style={{ padding: '8px 12px', color: '#94a3b8', fontFamily: 'monospace' }}>{r._line}</td>
                              <td style={{ padding: '8px 12px', fontWeight: '600', color: '#374151' }}>{r.holiday_name || <span style={{ color: '#fca5a5' }}>—</span>}</td>
                              <td style={{ padding: '8px 12px', color: '#374151', fontFamily: 'monospace' }}>{r.holiday_date || <span style={{ color: '#fca5a5' }}>—</span>}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '5px', background: TYPE_BADGE[r.holiday_type]?.bg || '#F1F4F8', color: TYPE_BADGE[r.holiday_type]?.color || '#7D8597', border: `1px solid ${TYPE_BADGE[r.holiday_type]?.border || '#E3E7EE'}` }}>
                                  {r.holiday_type}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: '#7D8597', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {r._errors.length === 0
                                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontWeight: '700', fontSize: '11px' }}><FiCheck size={11} /> Valid</span>
                                  : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b91c1c', fontWeight: '700', fontSize: '10px' }} title={r._errors.join(', ')}><FiX size={11} /> {r._errors[0]}</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setImportOpen(false)}
                    style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#33415C', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validImportCount === 0 || importState === 'importing'}
                    style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: validImportCount === 0 ? 'not-allowed' : 'pointer', background: validImportCount === 0 ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', boxShadow: validImportCount > 0 ? '0 4px 12px rgba(16,185,129,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    {importState === 'importing'
                      ? <><FiLoader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Importing…</>
                      : <><FiUpload size={13} /> Import {validImportCount > 0 ? `${validImportCount} Holiday${validImportCount !== 1 ? 's' : ''}` : 'Holidays'}</>
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 13px', border: '1px solid #E3E7EE', borderRadius: '9px',
  fontSize: '13px', color: '#001233', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', background: '#f8fafc'
}
