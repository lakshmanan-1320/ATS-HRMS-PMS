import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import {
  FiDownload, FiChevronLeft, FiChevronRight,
  FiCalendar, FiClock, FiFilter, FiX, FiSearch
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

function formatDuration(mins) {
  if (mins === null || mins === undefined) return 'In Progress'
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hrs === 0) return `${remMins}m`
  return `${hrs}h ${remMins}m`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(tString) {
  if (!tString) return '—'
  try {
    return new Date(tString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return tString }
}

const PAGE_SIZES = [10, 25, 50]

const STATUS_OPTIONS = [
  { value: 'all',         label: 'All' },
  { value: 'completed',   label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'inside',      label: 'Inside Fence' },
  { value: 'outside',     label: 'Outside Fence' },
]

function getLateArrivalText(row) {
  if (!row.attendance_result) return null;
  if (row.attendance_result !== 'LATE_ARRIVAL') {
    return row.attendance_result.replace(/_/g, ' ');
  }

  let lateMins = row.late_minutes;
  if ((lateMins == null || lateMins <= 0) && row.check_in_time && row.shift_start_time) {
    try {
      const checkInDate = new Date(row.check_in_time);
      const [sH, sM] = row.shift_start_time.split(':').map(Number);
      const shiftStartDate = new Date(checkInDate);
      shiftStartDate.setHours(sH, sM, 0, 0);
      const diffMs = checkInDate - shiftStartDate;
      if (diffMs > 0) {
        lateMins = Math.floor(diffMs / 60000);
      }
    } catch (e) {}
  }

  if (lateMins && lateMins > 0) {
    const hrs = Math.floor(lateMins / 60);
    const mins = lateMins % 60;
    let durStr = '';
    if (hrs > 0 && mins > 0) durStr = `${hrs}h ${mins}m`;
    else if (hrs > 0) durStr = `${hrs}h`;
    else durStr = `${mins}m`;
    return `LATE ARRIVAL (${durStr})`;
  }

  return 'LATE ARRIVAL';
}

function renderLocationStatusBadge(row) {
  const status = row.location_status;
  const isRemote = row.matched_office_name === 'Remote' || row.zone_name === 'Remote';

  if (status === 'INSIDE_FENCE' || row.is_within_fence === true) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#059669', background: 'rgba(5,150,105,0.09)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(5,150,105,0.2)' }}>
        Inside Fence
      </span>
    )
  }
  if (status === 'OUTSIDE_FENCE' || (row.is_within_fence === false && row.distance_from_office != null)) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#dc2626', background: 'rgba(239,68,68,0.07)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.2)' }}>
        Outside Fence
      </span>
    )
  }
  if (status === 'REMOTE' || isRemote) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#4338ca', background: '#e0e7ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(67,56,202,0.2)' }}>
        Remote Check-in
      </span>
    )
  }
  if (status === 'GPS_CAPTURED' || (row.gps_accuracy != null || row.check_in_latitude != null)) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(3,105,161,0.2)' }}>
        GPS Captured
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px', border: '1px solid #cbd5e1' }}>
      Location Not Verified
    </span>
  )
}

export default function MyAttendance() {
  const [history, setHistory]       = useState([])
  const [policy, setPolicy]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [startDate, setStartDate]   = useState('')
  const [endDate, setEndDate]       = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [zoneFilter, setZone]       = useState('all')
  const [currentPage, setPage]      = useState(1)
  const [pageSize, setPageSize]     = useState(10)
  const [showFilters, setShowFilters] = useState(true)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const params = {}
      if (startDate) params.start_date = startDate
      if (endDate)   params.end_date   = endDate
      const res = await api.get('/attendance/my-history', { params })
      setHistory(res.data || [])
    } catch (e) {
      console.error('Failed to fetch attendance', e)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await api.get('/attendance/my-policy')
      setPolicy(res.data?.data || null)
    } catch (e) {
      console.error('Failed to fetch employee policy', e)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
    fetchPolicy()
  }, [fetchHistory, fetchPolicy])
  useEffect(() => { setPage(1) }, [statusFilter, zoneFilter, pageSize])

  const uniqueZones = useMemo(() => (
    [...new Set(history.map(r => r.zone_name).filter(Boolean))]
  ), [history])

  const filtered = useMemo(() => history.filter(r => {
    if (statusFilter === 'in_progress' && r.check_out_time)    return false
    if (statusFilter === 'completed'   && !r.check_out_time)   return false
    if (statusFilter === 'inside'      && r.is_within_fence !== true)  return false
    if (statusFilter === 'outside'     && r.is_within_fence !== false) return false
    if (zoneFilter !== 'all' && r.zone_name !== zoneFilter)    return false
    return true
  }), [history, statusFilter, zoneFilter])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated      = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalMins      = filtered.reduce((s, r) => s + (r.work_duration_minutes || 0), 0)
  const totalHrs       = Math.floor(totalMins / 60)
  const remMins        = totalMins % 60
  const hasFilters     = startDate || endDate || statusFilter !== 'all' || zoneFilter !== 'all'
  const activeCount    = [startDate || endDate, statusFilter !== 'all', zoneFilter !== 'all'].filter(Boolean).length

  function clearAll() {
    setStartDate('')
    setEndDate('')
    setStatus('all')
    setZone('all')
  }

  function handleExportPDF() {
    const doc          = new jsPDF()
    const employeeName = sessionStorage.getItem('user_name')    || 'Employee'
    const companyName  = sessionStorage.getItem('company_name') || 'Company'

    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text('Attendance Report', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`${companyName}  ·  ${employeeName}`, 14, 29)
    doc.text(
      startDate || endDate ? `Period: ${startDate || 'Start'} → ${endDate || 'Today'}` : 'All Records',
      14, 36
    )
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 43)

    doc.setDrawColor(226, 232, 240)
    doc.line(14, 47, 196, 47)

    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text(`Days Present: ${filtered.length}`, 14, 55)
    doc.text(`Total Hours: ${totalHrs}h ${remMins}m`, 80, 55)

    autoTable(doc, {
      startY: 62,
      head: [['Date', 'Check In', 'Check Out', 'Duration', 'Location Status', 'Office Location', 'Distance', 'GPS Accuracy']],
      body: filtered.map(r => [
        fmtDate(r.attendance_date),
        fmtTime(r.check_in_time),
        r.check_out_time ? fmtTime(r.check_out_time) : 'Still In',
        formatDuration(r.work_duration_minutes),
        r.location_status === 'INSIDE_FENCE' ? 'Inside Fence' : r.location_status === 'OUTSIDE_FENCE' ? 'Outside Fence' : 'Location Not Verified',
        r.matched_office_name || r.zone_name || 'Standard',
        r.distance_from_office != null ? `${Number(r.distance_from_office).toFixed(1)}m` : '—',
        r.gps_accuracy != null ? `±${Number(r.gps_accuracy).toFixed(0)}m` : '—',
      ]),
      headStyles:          { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles:          { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles:  { fillColor: [248, 250, 252] },
      styles:              { cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.1 },
    })

    doc.save(`attendance-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function pageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 4)              return [1, 2, 3, 4, 5, '…', totalPages]
    if (currentPage >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages]
  }

  /* ───── styles ───── */
  const card = {
    background: '#fff',
    border: '1px solid #e8eaf0',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  }

  const inputBase = {
    height: '38px',
    padding: '0 12px',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const label = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '6px',
    display: 'block',
  }

  const thStyle = {
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#64748b',
    background: '#f8fafc',
    borderBottom: '1.5px solid #e8eaf0',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <EmployeeSidebar active="attendance" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Attendance" />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* ── Page Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                My Attendance
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                Your personal attendance punch history
              </p>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={filtered.length === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px',
                background: filtered.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: filtered.length === 0 ? '#94a3b8' : '#fff',
                border: 'none', borderRadius: '12px',
                fontSize: '13px', fontWeight: '700',
                cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: filtered.length === 0 ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}
            >
              <FiDownload size={15} />
              Export PDF
            </button>
          </div>

          {/* ── Summary Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px', maxWidth: '780px' }}>
            {/* Days Present */}
            <div style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg,rgba(5,150,105,0.12),rgba(16,185,129,0.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FiCalendar size={20} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', lineHeight: 1 }}>
                  {loading ? '—' : filtered.length}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>Days Present</div>
              </div>
            </div>

            {/* Total Hours */}
            <div style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FiClock size={20} color="#6366f1" />
              </div>
              <div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#6366f1', lineHeight: 1 }}>
                  {loading ? '—' : `${totalHrs}h ${remMins}m`}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>Total Hours</div>
              </div>
            </div>

            {/* Late LOP progress */}
            {policy && policy.enable_late_arrival_lop && (
              <div style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #d97706' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.06))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FiClock size={20} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#d97706', lineHeight: 1.1 }}>
                    {history.filter(r => r.attendance_result === 'LATE_ARRIVAL').length} Late(s)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
                    {(() => {
                      const lates = history.filter(r => r.attendance_result === 'LATE_ARRIVAL').length;
                      const thresh = parseInt(policy.late_arrivals_threshold) || 3;
                      const nextTh = thresh - (lates % thresh);
                      return `${nextTh} more late(s) to LOP`;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Filter Panel ── */}
          <div style={{ ...card, marginBottom: '20px', overflow: 'hidden' }}>
            {/* Filter header bar */}
            <div
              onClick={() => setShowFilters(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 18px',
                borderBottom: showFilters ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiFilter size={14} color="#6366f1" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Advanced Filters</span>
                {activeCount > 0 && (
                  <span style={{
                    minWidth: '20px', height: '20px', borderRadius: '10px',
                    background: '#6366f1', color: '#fff',
                    fontSize: '11px', fontWeight: '700',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                  }}>
                    {activeCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {hasFilters && (
                  <button
                    onClick={e => { e.stopPropagation(); clearAll() }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', border: 'none', borderRadius: '8px',
                      background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <FiX size={11} /> Clear All
                  </button>
                )}
                <span style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1, transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>
                  ⌄
                </span>
              </div>
            </div>

            {/* Filter body */}
            {showFilters && (
              <div style={{ padding: '16px 18px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Date From */}
                <div>
                  <span style={label}>From Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={inputBase}
                  />
                </div>

                {/* Date To */}
                <div>
                  <span style={label}>To Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={inputBase}
                  />
                </div>

                {/* Status pills */}
                <div>
                  <span style={label}>Status</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: statusFilter === opt.value ? 'none' : '1.5px solid #e2e8f0',
                          background: statusFilter === opt.value ? '#6366f1' : '#fff',
                          color: statusFilter === opt.value ? '#fff' : '#64748b',
                          fontSize: '12px', fontWeight: '600',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zone */}
                {uniqueZones.length > 0 && (
                  <div>
                    <span style={label}>Zone</span>
                    <select
                      value={zoneFilter}
                      onChange={e => setZone(e.target.value)}
                      style={{ ...inputBase, paddingRight: '32px', cursor: 'pointer' }}
                    >
                      <option value="all">All Zones</option>
                      {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {/* Table toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafbfc',
            }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                {loading
                  ? 'Loading records…'
                  : filtered.length === 0
                  ? 'No records found'
                  : `Showing ${Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} records`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  style={{ ...inputBase, height: '32px', padding: '0 8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Check In', 'Check Out', 'Duration', 'Shift', 'Result', 'Location Status', 'Office Location', 'Distance', 'GPS Accuracy'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Loading attendance records…</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <FiSearch size={32} color="#cbd5e1" />
                          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>No attendance records found</span>
                          {hasFilters && (
                            <button onClick={clearAll} style={{ marginTop: '4px', fontSize: '13px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row, i) => (
                      <tr
                        key={row.attendance_punch_id}
                        style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbff', transition: 'background 0.12s' }}
                        onMouseEnter={e  => e.currentTarget.style.background = '#f0f4ff'}
                        onMouseLeave={e  => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbff'}
                      >
                        <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {fmtDate(row.attendance_date)}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 12px', borderRadius: '20px',
                            background: 'rgba(5,150,105,0.09)', color: '#059669',
                            fontWeight: '700', fontSize: '12px', letterSpacing: '0.02em',
                          }}>
                            ● {fmtTime(row.check_in_time)}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {row.check_out_time ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '4px 12px', borderRadius: '20px',
                              background: 'rgba(239,68,68,0.07)', color: '#dc2626',
                              fontWeight: '700', fontSize: '12px', letterSpacing: '0.02em',
                            }}>
                              ● {fmtTime(row.check_out_time)}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '4px 12px', borderRadius: '20px',
                              background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                              fontWeight: '700', fontSize: '12px',
                            }}>
                              ◌ Still In
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '700', color: row.check_out_time ? '#334155' : '#6366f1' }}>
                          {formatDuration(row.work_duration_minutes)}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {row.shift_name ? (
                            <span style={{
                              background: row.shift_color_code || '#6366f1', color: '#fff',
                              padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              textShadow: '0 1px 2px rgba(0,0,0,0.15)', whiteSpace: 'nowrap'
                            }}>
                              {row.shift_name} ({row.shift_code})
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {row.attendance_result ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px',
                              background: (row.attendance_result === 'ON_TIME' || row.attendance_result === 'COMPLETED_SHIFT')
                                ? '#dcfce7'
                                : row.attendance_result === 'LATE_ARRIVAL'
                                  ? '#ffedd5'
                                  : '#fee2e2',
                              color: (row.attendance_result === 'ON_TIME' || row.attendance_result === 'COMPLETED_SHIFT')
                                ? '#15803d'
                                : row.attendance_result === 'LATE_ARRIVAL'
                                  ? '#c2410c'
                                  : '#b91c1c',
                              whiteSpace: 'nowrap'
                            }}>
                              {getLateArrivalText(row)}
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {renderLocationStatusBadge(row)}
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>
                          {row.matched_office_name || row.zone_name || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                          {row.distance_from_office != null ? `${Number(row.distance_from_office).toFixed(1)}m` : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px', fontSize: '12px', color: '#64748b' }}>
                          {row.gps_accuracy != null ? `±${Number(row.gps_accuracy).toFixed(0)}m` : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '4px', padding: '16px',
                borderTop: '1px solid #f1f5f9',
              }}>
                {/* Prev */}
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={currentPage === 1}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '34px', height: '34px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: currentPage === 1 ? '#f8fafc' : '#fff',
                    color: currentPage === 1 ? '#cbd5e1' : '#475569',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <FiChevronLeft size={15} />
                </button>

                {pageNumbers().map((pg, i) =>
                  pg === '…' ? (
                    <span key={`el-${i}`} style={{ width: '34px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>…</span>
                  ) : (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        border: pg === currentPage ? 'none' : '1.5px solid #e2e8f0',
                        background: pg === currentPage ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
                        color: pg === currentPage ? '#fff' : '#475569',
                        fontSize: '13px', fontWeight: pg === currentPage ? '700' : '500',
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: pg === currentPage ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      }}
                    >
                      {pg}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '34px', height: '34px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: currentPage === totalPages ? '#f8fafc' : '#fff',
                    color: currentPage === totalPages ? '#cbd5e1' : '#475569',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <FiChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Spinner keyframe */}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        </main>
      </div>
    </div>
  )
}
