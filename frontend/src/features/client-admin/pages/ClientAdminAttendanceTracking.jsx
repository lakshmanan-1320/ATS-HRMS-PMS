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

/* ─── Avatar Palette ─── */
const AVATAR_COLORS = [
  ['#6366f1', '#e0e7ff'], ['#8b5cf6', '#ede9fe'], ['#ec4899', '#fce7f3'],
  ['#f59e0b', '#fef3c7'], ['#10b981', '#d1fae5'], ['#0ea5e9', '#e0f2fe'],
  ['#ef4444', '#fee2e2'], ['#14b8a6', '#ccfbf1'],
]
function avatarColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

/* ─── Sub-Components ─── */
function StatusBadge({ status }) {
  const cfg = status === 'present'
    ? { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', label: 'Present' }
    : { bg: '#fee2e2', color: '#b91c1c', dot: '#dc2626', label: 'Absent' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '4px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
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
    bg = '#dcfce7'
    color = '#15803d'
    label = 'Inside Fence'
  } else if (status === 'OUTSIDE_FENCE') {
    bg = '#fee2e2'
    color = '#b91c1c'
    label = 'Outside Fence'
  }

  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '4px 8px', borderRadius: 8, background: bg, color: color,
      textTransform: 'uppercase', letterSpacing: '0.02em', border: `1px solid ${status === 'INSIDE_FENCE' ? '#bbf7d0' : status === 'OUTSIDE_FENCE' ? '#fecaca' : '#cbd5e1'}`
    }}>
      {label}
    </span>
  )
}

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="attendance-tracking" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          
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
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)', opacity: (exporting || records.length === 0) ? 0.7 : 1
                }}
              >
                <FiDownload size={14} /> {exporting ? 'Exporting...' : 'Export Filtered CSV'}
              </button>

              <button
                id="btn-refresh-tracking"
                onClick={loadOverview}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                }}
              >
                <FiRefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Grid Layout: Left Filter Panel, Right Table Log */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Sidebar Filters Panel */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiFilter size={14} /> Filters
                </span>
                <button
                  onClick={clearFilters}
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>

              {/* Date Filters */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date Range</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); resetPageAndFilter() }}
                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); resetPageAndFilter() }}
                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Department</label>
                <select
                  value={selectedDept}
                  onChange={e => { setSelectedDept(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.department_id} value={d.department_id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Attendance Policy Selector */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Attendance Policy</label>
                <select
                  value={selectedPolicy}
                  onChange={e => { setSelectedPolicy(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="">All Policies</option>
                  {policies.map(p => (
                    <option key={p.attendance_policy_id} value={p.attendance_policy_id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Shift Selector */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Shift</label>
                <select
                  value={selectedShift}
                  onChange={e => { setSelectedShift(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="">All Shifts</option>
                  {shifts.map(s => (
                    <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.shift_code})</option>
                  ))}
                </select>
              </div>

              {/* Result Selector */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Attendance Result</label>
                <select
                  value={selectedResult}
                  onChange={e => { setSelectedResult(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="">All Results</option>
                  <option value="ON_TIME">On Time</option>
                  <option value="LATE_ARRIVAL">Late Arrival</option>
                  <option value="EARLY_EXIT">Early Exit</option>
                  <option value="COMPLETED_SHIFT">Completed Shift</option>
                </select>
              </div>

              {/* Location Status Selector */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Location Status</label>
                <select
                  value={selectedLocation}
                  onChange={e => { setSelectedLocation(e.target.value); resetPageAndFilter() }}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="">All Locations</option>
                  <option value="INSIDE_FENCE">Inside Fence</option>
                  <option value="OUTSIDE_FENCE">Outside Fence</option>
                  <option value="LOCATION_NOT_VERIFIED">Location Not Verified</option>
                </select>
              </div>
            </div>

            {/* Right Panel: Table and Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Search Control */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative'
              }}>
                <FiSearch size={16} color="#94a3b8" style={{ position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  placeholder="Search by Employee name, code, or email..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); resetPageAndFilter() }}
                  style={{
                    width: '100%', padding: '10px 14px 10px 40px',
                    border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px',
                    color: '#1e293b', outline: 'none', background: '#f8fafc',
                    fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Table Container */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {loadingOverview ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                    <FiRefreshCw className="spin-anim" size={24} style={{ marginBottom: '8px' }} />
                    <div>Loading records...</div>
                  </div>
                ) : records.length === 0 ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                    <FiSearch size={28} style={{ marginBottom: '8px' }} />
                    <div>No tracking records found. Try modifying filters or search text.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '14px 18px' }}>Employee</th>
                          <th style={{ padding: '14px 18px' }}>Date</th>
                          <th style={{ padding: '14px 18px' }}>Policy</th>
                          <th style={{ padding: '14px 18px' }}>Shift</th>
                          <th style={{ padding: '14px 18px' }}>Check In</th>
                          <th style={{ padding: '14px 18px' }}>Check Out</th>
                          <th style={{ padding: '14px 18px' }}>Duration</th>
                          <th style={{ padding: '14px 18px' }}>Result</th>
                          <th style={{ padding: '14px 18px' }}>Location</th>
                          <th style={{ padding: '14px 18px' }}>Matched Location</th>
                          <th style={{ padding: '14px 18px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r, idx) => {
                          const [fg, bg] = avatarColor(r.first_name || 'E')
                          return (
                            <tr
                              key={r.attendance_punch_id || idx}
                              style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafbfc', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                              onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafbfc'}
                            >
                              {/* Employee */}
                              <td style={{ padding: '12px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', background: bg, color: fg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px'
                                  }}>
                                    {(r.first_name?.[0] || '') + (r.last_name?.[0] || '')}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.first_name} {r.last_name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{r.employee_code || '—'}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Date */}
                              <td style={{ padding: '12px 18px', fontWeight: 600, color: '#1e293b' }}>
                                {r.attendance_date ? r.attendance_date.slice(0, 10) : '—'}
                              </td>

                              {/* Policy */}
                              <td style={{ padding: '12px 18px', color: '#475569' }}>
                                {r.policy_name || 'General Policy'}
                              </td>

                              {/* Shift */}
                              <td style={{ padding: '12px 18px' }}>
                                {r.shift_name ? (
                                  <span style={{
                                    background: r.shift_color_code || '#6366f1', color: '#fff',
                                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}>
                                    {r.shift_code}
                                  </span>
                                ) : <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>

                              {/* In */}
                              <td style={{ padding: '12px 18px', color: '#16a34a', fontWeight: 600 }}>
                                {formatTime(r.check_in_time)}
                              </td>

                              {/* Out */}
                              <td style={{ padding: '12px 18px', color: '#ef4444', fontWeight: 600 }}>
                                {formatTime(r.check_out_time)}
                              </td>

                              {/* Duration */}
                              <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                                {formatDuration(r.work_duration_minutes)}
                              </td>

                              {/* Result */}
                              <td style={{ padding: '12px 18px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                  {r.attendance_result ? (
                                    <span style={{
                                      fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                                      background: (r.attendance_result === 'ON_TIME' || r.attendance_result === 'COMPLETED_SHIFT') ? '#dcfce7' : r.attendance_result === 'LATE_ARRIVAL' ? '#ffedd5' : '#fee2e2',
                                      color: (r.attendance_result === 'ON_TIME' || r.attendance_result === 'COMPLETED_SHIFT') ? '#15803d' : r.attendance_result === 'LATE_ARRIVAL' ? '#c2410c' : '#b91c1c'
                                    }}>
                                      {r.attendance_result.replace('_', ' ')}
                                    </span>
                                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                  
                                  {r.adjustment_status && (
                                    <span style={{
                                      fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                      background: r.adjustment_status === 'Regularized' ? '#e0e7ff' : r.adjustment_status === 'Permission Approved' ? '#dbeafe' : r.adjustment_status === 'Pending Approval' ? '#fef3c7' : '#fee2e2',
                                      color: r.adjustment_status === 'Regularized' ? '#4f46e5' : r.adjustment_status === 'Permission Approved' ? '#2563eb' : r.adjustment_status === 'Pending Approval' ? '#d97706' : '#b91c1c',
                                      border: `1px solid ${r.adjustment_status === 'Regularized' ? '#c7d2fe' : r.adjustment_status === 'Permission Approved' ? '#bfdbfe' : r.adjustment_status === 'Pending Approval' ? '#fde68a' : '#fca5a5'}`
                                    }}>
                                      {r.adjustment_status}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Location Badge */}
                              <td style={{ padding: '12px 18px' }}>
                                <LocationStatusBadge status={r.location_status} />
                              </td>

                              {/* Matched Location */}
                              <td style={{ padding: '12px 18px', color: '#64748b' }}>
                                {r.matched_office_name || r.zone_name || '—'}
                              </td>

                              {/* Action */}
                              <td style={{ padding: '12px 18px' }}>
                                <button
                                  onClick={() => handleRowClick(r)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none',
                                    color: '#6366f1', fontWeight: 700, fontSize: '12px', cursor: 'pointer', outline: 'none'
                                  }}
                                >
                                  View details <FiArrowRight size={12} />
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

              {/* Pagination controls */}
              {!loadingOverview && pagination.totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
                  padding: '12px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                    Showing page <strong style={{ color: '#0f172a' }}>{page}</strong> of <strong style={{ color: '#0f172a' }}>{pagination.totalPages}</strong> ({pagination.totalCount} total records)
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : '#ffffff',
                        cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569'
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === pagination.totalPages}
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === pagination.totalPages ? '#f8fafc' : '#ffffff',
                        cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Drawer Detail */}
      {drawerOpen && selectedEmployee && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999 }}
          />

          {/* Slide Over Panel */}
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '420px', background: '#ffffff',
            boxShadow: '-10px 0 30px rgba(15,23,42,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.25s ease-out', boxSizing: 'border-box'
          }}>
            <style>{`
              @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>

            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: avatarColor(selectedEmployee.first_name || 'E')[1],
                  color: avatarColor(selectedEmployee.first_name || 'E')[0],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px'
                }}>
                  {(selectedEmployee.first_name?.[0] || '') + (selectedEmployee.last_name?.[0] || '')}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{selectedEmployee.employee_code} • {selectedEmployee.department || 'General'}</span>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', outline: 'none' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Context Summary */}
              <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assignment Context</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Attendance Policy:</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{selectedEmployee.policy_name || 'General Policy'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Assigned Shift:</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>
                    {selectedEmployee.shift_name ? `${selectedEmployee.shift_name} (${selectedEmployee.shift_start_time}-${selectedEmployee.shift_end_time})` : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Office Location:</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{selectedEmployee.matched_office_name || selectedEmployee.zone_name || '—'}</span>
                </div>

                {selectedEmployee.enable_late_arrival_lop && (
                  <>
                    <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>Late LOP Rule:</span>
                      <span style={{ color: '#b45309', fontWeight: 700 }}>
                        Every {selectedEmployee.late_arrivals_threshold} Lates = {selectedEmployee.lop_days_per_threshold} LOP Day(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>Period Lates:</span>
                      <span style={{ color: '#b45309', fontWeight: 700 }}>
                        {(() => {
                          const lates = employeeHistory.filter(r => r.attendance_result === 'LATE_ARRIVAL').length;
                          const thresh = parseInt(selectedEmployee.late_arrivals_threshold) || 3;
                          const nextTh = thresh - (lates % thresh);
                          return `${lates} Late(s) (${nextTh} more to LOP)`;
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Punch Logs Timeline */}
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Punches & Logs</h4>
                
                {loadingHistory ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                    <FiRefreshCw className="spin-anim" size={20} style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px' }}>Loading timeline...</div>
                  </div>
                ) : employeeHistory.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No punch logs for this date range.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {employeeHistory.map((punch, pIdx) => (
                      <div key={punch.attendance_punch_id || pIdx} style={{
                        borderLeft: '2px solid #e2e8f0', paddingLeft: '16px', position: 'relative', paddingBottom: '4px'
                      }}>
                        {/* Dot indicator */}
                        <div style={{
                          position: 'absolute', left: '-5px', top: '2px', width: '8px', height: '8px', borderRadius: '50%',
                          background: punch.attendance_result === 'ON_TIME' ? '#10b981' : punch.attendance_result === 'LATE_ARRIVAL' ? '#f59e0b' : '#ef4444'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{punch.attendance_date ? punch.attendance_date.slice(0, 10) : ''}</span>
                          {punch.attendance_result && (
                            <span style={{
                              fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                              background: punch.attendance_result === 'ON_TIME' ? '#dcfce7' : punch.attendance_result === 'LATE_ARRIVAL' ? '#ffedd5' : '#fee2e2',
                              color: punch.attendance_result === 'ON_TIME' ? '#15803d' : punch.attendance_result === 'LATE_ARRIVAL' ? '#c2410c' : '#b91c1c'
                            }}>
                              {punch.attendance_result.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {/* Punch In Details */}
                        <div style={{ fontSize: '12px', color: '#1e293b', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600 }}>Punch In:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              {punch.check_in_time ? new Date(punch.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </span>
                            {punch.is_regularized && punch.original_check_in_time && (
                              <span style={{ fontSize: '10px', color: '#64748b', textDecoration: 'line-through' }}>
                                Original: {new Date(punch.original_check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Punch Out Details */}
                        <div style={{ fontSize: '12px', color: '#1e293b', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600 }}>Punch Out:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ color: punch.check_out_time ? '#1d4ed8' : '#dc2626', fontWeight: 700 }}>
                              {punch.check_out_time ? new Date(punch.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Missing Punch Out'}
                            </span>
                            {punch.is_regularized && punch.original_check_out_time && (
                              <span style={{ fontSize: '10px', color: '#64748b', textDecoration: 'line-through' }}>
                                Original: {new Date(punch.original_check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Office Matched location */}
                        {punch.matched_office_name && (
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                            <FiMapPin size={11} /> Checked in at {punch.matched_office_name} ({punch.location_status?.replace('_', ' ')})
                          </div>
                        )}

                        {punch.work_duration_minutes != null && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                            Duration: {formatDuration(punch.work_duration_minutes)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
