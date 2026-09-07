import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import {
  FiSearch, FiUsers, FiCheckCircle, FiXCircle, FiClock,
  FiFilter, FiDownload, FiChevronLeft, FiChevronRight,
  FiCalendar, FiMapPin, FiRefreshCw, FiInfo, FiChevronRight as FiArrowRight, FiX
} from 'react-icons/fi'

/* ─── CSV Export Function ─── */
function triggerCSVDownload(rows, filename) {
  const headers = [
    'Employee', 'Code', 'Department', 'Date', 'Policy', 'Shift',
    'Check In', 'Check Out', 'Hours Worked', 'Result', 'Location Status',
    'Matched Location', 'Distance (m)', 'Accuracy (m)'
  ]
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      `"${(r.first_name || '') + ' ' + (r.last_name || '')}"`,
      r.employee_code || '',
      `"${r.department || ''}"`,
      r.attendance_date ? r.attendance_date.slice(0, 10) : '',
      `"${r.policy_name || ''}"`,
      `"${r.shift_name || ''}"`,
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      r.work_duration_minutes != null ? `${Math.floor(r.work_duration_minutes / 60)}h ${r.work_duration_minutes % 60}m` : '',
      r.attendance_result || '',
      r.location_status || 'LOCATION_NOT_VERIFIED',
      `"${r.matched_office_name || ''}"`,
      r.distance_from_office != null ? Number(r.distance_from_office).toFixed(1) : '',
      r.gps_accuracy != null ? Number(r.gps_accuracy).toFixed(0) : '',
    ].join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ─── Code Badge ─── */
function CodeBadge({ code }) {
  if (!code || code === '—') return <span style={{ color: '#94a3b8' }}>—</span>
  return (
    <span style={{
      background: '#f1f5f9', color: '#334155', padding: '3px 8px',
      borderRadius: 6, fontSize: 11.5, fontWeight: 700, fontFamily: 'monospace',
      border: '1px solid #e2e8f0', letterSpacing: '0.03em', display: 'inline-block'
    }}>
      {code}
    </span>
  )
}

/* ─── Sub-Components ─── */
function StatusBadge({ status }) {
  const cfg = status === 'present'
    ? { bg: '#e8fbf0', color: '#0fa958', dot: '#10b981', label: 'Present' }
    : { bg: '#feecee', color: '#dc2626', dot: '#ef4444', label: 'Absent' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '4px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      fontFamily: "'Inter', sans-serif"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function LocationStatusBadge({ status }) {
  let bg = '#f1f5f9'
  let color = '#64748b'
  let label = 'Location Not Verified'

  if (status === 'INSIDE_FENCE') {
    bg = '#e8fbf0'
    color = '#0fa958'
    label = 'Inside Fence'
  } else if (status === 'OUTSIDE_FENCE') {
    bg = '#feecee'
    color = '#dc2626'
    label = 'Outside Fence'
  }

  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '4px 8px', borderRadius: 8, background: bg, color: color,
      textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: "'Inter', sans-serif"
    }}>
      {label}
    </span>
  )
}

const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

export default function ClientAdminAttendanceTracking() {
  const {
    adminOverview,
    policies,
    shifts,
    employeeHistory,
    loadingOverview,
    loadingHistory,
    fetchAdminOverview,
    fetchPolicies,
    fetchShifts,
    fetchEmployeeHistory
  } = useAttendanceStore()

  // Filter States
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedResult, setSelectedResult] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  
  // Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Meta Lists
  const [departments, setDepartments] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Fetch initial meta dropdown values
  useEffect(() => {
    fetchPolicies()
    fetchShifts()
    const token = sessionStorage.getItem('sa_token')
    axios.get('/api/client-admin/departments', {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(r => setDepartments(r.data?.departments || r.data || []))
      .catch(() => {})
  }, [fetchPolicies, fetchShifts])

  // Assemble full filters object
  const activeFilters = useMemo(() => ({
    page,
    limit: pageSize,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    search: search || undefined,
    department_id: selectedDept || undefined,
    policy_id: selectedPolicy || undefined,
    shift_id: selectedShift || undefined,
    attendance_result: selectedResult || undefined,
    location_status: selectedLocation || undefined
  }), [page, pageSize, startDate, endDate, search, selectedDept, selectedPolicy, selectedShift, selectedResult, selectedLocation])

  // Fetch overview list when active filters change
  const loadOverview = useCallback(() => {
    fetchAdminOverview(activeFilters)
  }, [activeFilters, fetchAdminOverview])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // Reset page to 1 whenever filters other than page change
  const resetPageAndFilter = () => {
    setPage(1)
  }

  // Handle Export: queries server bypassing limit parameters
  const handleExport = async () => {
    setExporting(true)
    try {
      const exportFilters = { ...activeFilters, limit: 'all' }
      delete exportFilters.page
      
      const token = sessionStorage.getItem('sa_token')
      const res = await axios.get('/api/attendance/admin/overview', {
        params: exportFilters,
        headers: { Authorization: `Bearer ${token}` }
      })
      const records = res.data?.records || []
      triggerCSVDownload(records, `attendance-tracking-${startDate}-to-${endDate}.csv`)
    } catch (err) {
      alert('Failed to export CSV. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Open Drawer Detail
  const handleRowClick = (employee) => {
    setSelectedEmployee(employee)
    setDrawerOpen(true)
    fetchEmployeeHistory(employee.employee_id, startDate, endDate)
  }

  // Formatting Helpers
  const formatTime = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatDuration = (mins) => {
    if (!mins && mins !== 0) return '—'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedDept('')
    setSelectedPolicy('')
    setSelectedShift('')
    setSelectedResult('')
    setSelectedLocation('')
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate(new Date().toISOString().slice(0, 10))
    setPage(1)
  }

  const records = adminOverview?.records || []
  const pagination = adminOverview?.pagination || { totalCount: 0, totalPages: 1 }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="attendance-tracking" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Attendance Tracking
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
                Monitor shift completions, compliance checks, and geofence verification
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                id="btn-export-csv"
                onClick={handleExport}
                disabled={exporting || records.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '9px 16px', background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)', opacity: (exporting || records.length === 0) ? 0.7 : 1,
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <FiDownload size={14} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} />
                {exporting ? 'Exporting...' : 'Export Filtered CSV'}
              </button>

              <button
                id="btn-refresh-tracking"
                onClick={loadOverview}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '9px 16px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <FiRefreshCw size={14} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} className={loadingOverview ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Grid Layout: Left Filter Panel, Right Table Log */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Sidebar Filters Panel */}
            <div style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: cardShadow,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiFilter size={14} color="#C2071A" strokeWidth={2.5} /> Filters
                </span>
                <button
                  onClick={clearFilters}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reset All
                </button>
              </div>

              {/* Date Pickers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Range</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Department */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                <select
                  value={selectedDept}
                  onChange={e => { setSelectedDept(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.department_id || d.id} value={d.department_id || d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Policy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policy</label>
                <select
                  value={selectedPolicy}
                  onChange={e => { setSelectedPolicy(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">All Policies</option>
                  {policies.map(p => (
                    <option key={p.policy_id} value={p.policy_id}>{p.policy_name}</option>
                  ))}
                </select>
              </div>

              {/* Shift */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shift</label>
                <select
                  value={selectedShift}
                  onChange={e => { setSelectedShift(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">All Shifts</option>
                  {shifts.map(s => (
                    <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>
                  ))}
                </select>
              </div>

              {/* Result */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Result</label>
                <select
                  value={selectedResult}
                  onChange={e => { setSelectedResult(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">All Results</option>
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE_ARRIVAL">LATE_ARRIVAL</option>
                  <option value="EARLY_EXIT">EARLY_EXIT</option>

                  <option value="ABSENT">ABSENT</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                </select>
              </div>

              {/* Location Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Status</label>
                <select
                  value={selectedLocation}
                  onChange={e => { setSelectedLocation(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">All Statuses</option>
                  <option value="INSIDE_FENCE">INSIDE_FENCE</option>
                  <option value="OUTSIDE_FENCE">OUTSIDE_FENCE</option>
                  <option value="LOCATION_NOT_VERIFIED">NOT_VERIFIED</option>
                </select>
              </div>
            </div>

            {/* Right Main Table Log Container */}
            <div style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: cardShadow
            }}>
              {/* Top Search & Count Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ position: 'relative', minWidth: '280px' }}>
                  <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search employee, code, department..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); resetPageAndFilter() }}
                    style={{
                      width: '100%', paddingLeft: '34px', padding: '8px 12px 8px 34px',
                      borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc',
                      fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    background: '#FEECEE', color: '#C2071A', padding: '5px 14px',
                    borderRadius: 20, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.02em',
                  }}>
                    {pagination.totalCount || records.length} records found
                  </span>
                </div>
              </div>

              {/* Main Log Table */}
              <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shift & Policy</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check In</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check Out</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Result</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Geofence</th>
                      <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingOverview ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                          Loading tracking records...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No tracking records found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      records.map((r, i) => (
                        <tr
                          key={r.attendance_id || r.employee_id + '_' + i}
                          onClick={() => handleRowClick(r)}
                          style={{
                            borderBottom: '1px solid #edf2f7',
                            background: i % 2 === 0 ? '#ffffff' : '#fafafa',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#fafafa'}
                        >
                          {/* Employee Name */}
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                            {r.first_name} {r.last_name}
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 500 }}>{r.department || 'No Dept'}</span>
                          </td>

                          {/* Code */}
                          <td style={{ padding: '14px 16px' }}>
                            <CodeBadge code={r.employee_code} />
                          </td>

                          {/* Shift & Policy */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.shift_name || 'Standard Shift'}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{r.policy_name || 'Default Policy'}</div>
                          </td>

                          {/* Check In */}
                          <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 600 }}>
                            {formatTime(r.check_in_time)}
                          </td>

                          {/* Check Out */}
                          <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 600 }}>
                            {formatTime(r.check_out_time)}
                          </td>

                          {/* Duration */}
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>
                            {formatDuration(r.work_duration_minutes)}
                          </td>

                          {/* Result Badge */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                              background: r.attendance_result === 'PRESENT' ? '#e8fbf0' : r.attendance_result === 'LATE_ARRIVAL' ? '#fef3c7' : '#feecee',
                              color: r.attendance_result === 'PRESENT' ? '#0fa958' : r.attendance_result === 'LATE_ARRIVAL' ? '#d97706' : '#dc2626'
                            }}>
                              {r.attendance_result || 'PENDING'}
                            </span>
                          </td>

                          {/* Location Status */}
                          <td style={{ padding: '14px 16px' }}>
                            <LocationStatusBadge status={r.location_status} />
                          </td>

                          {/* Action Icon */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#94a3b8' }}>
                            <FiArrowRight size={16} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    Page {page} of {pagination.totalPages}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}
                    >
                      <FiChevronLeft size={16} />
                    </button>

                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', opacity: page === pagination.totalPages ? 0.4 : 1 }}
                    >
                      <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
