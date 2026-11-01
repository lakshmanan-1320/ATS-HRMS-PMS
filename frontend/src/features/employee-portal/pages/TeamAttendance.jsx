import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { FiUsers, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

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
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(tString) {
  if (!tString) return '—'
  try {
    const d = new Date(tString)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch (err) {
    return tString
  }
}

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
      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid rgba(21,128,61,0.2)', fontSize: '11px', fontWeight: '700' }}>
        Inside Fence
      </span>
    )
  }
  if (status === 'OUTSIDE_FENCE' || (row.is_within_fence === false && row.distance_from_office != null)) {
    return (
      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.2)', fontSize: '11px', fontWeight: '700' }}>
        Outside Fence
      </span>
    )
  }
  if (status === 'REMOTE' || isRemote) {
    return (
      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#E3EEFA', color: '#023E7D', border: '1px solid rgba(67,56,202,0.2)', fontSize: '11px', fontWeight: '700' }}>
        Remote Check-in
      </span>
    )
  }
  if (status === 'GPS_CAPTURED' || (row.gps_accuracy != null || row.check_in_latitude != null)) {
    return (
      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid rgba(3,105,161,0.2)', fontSize: '11px', fontWeight: '700' }}>
        GPS Captured
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#F1F4F8', color: '#7D8597', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}>
      Location Not Verified
    </span>
  )
}

export default function TeamAttendance() {
  const [members, setMembers] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [selectedMember, setSelectedMember] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  const isManager = sessionStorage.getItem('is_manager') === 'true'

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedMember) params.employee_id = selectedMember
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const res = await api.get('/attendance/team-history', { params })
      setHistory(res.data || [])
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to load team attendance history', err)
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }, [selectedMember, startDate, endDate])

  useEffect(() => {
    if (!isManager) {
      setLoading(false)
      return
    }
    // Fetch unique direct/indirect subordinates for dropdown
    api.get('/attendance/team-members')
      .then(res => setMembers(res.data || []))
      .catch(err => {
        console.error(err)
        if (err.response?.status === 401) {
          sessionStorage.clear()
          window.location.href = '/login'
        }
      })
  }, [isManager])

  useEffect(() => {
    if (isManager) {
      fetchHistory()
    }
  }, [fetchHistory, isManager])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMember, startDate, endDate, itemsPerPage])

  function handleReset() {
    setSelectedMember('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  // Pagination Math
  const totalItems = history.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedHistory = history.slice(startIndex, endIndex)

  const getPageNumbers = () => {
    const pages = []
    const maxButtons = 5
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2))
    let end = Math.min(totalPages, start + maxButtons - 1)
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1)
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const selectStyle = {
    padding: '9px 13px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    color: '#001233',
    fontSize: '13px',
    outline: 'none',
    width: '200px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  }

  const dateInputStyle = {
    padding: '9px 13px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    color: '#001233',
    fontSize: '13px',
    outline: 'none',
    width: '140px',
    fontFamily: 'inherit',
    cursor: 'pointer'
  }

  const thStyle = {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#ffffff',
    padding: '14px 16px',
    borderBottom: 'none',
    background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)'
  }

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <EmployeeSidebar active="team-attendance" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Team Attendance" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#001233', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiUsers size={20} color="#0466C8" strokeWidth={2.5} />
            </div>
            Team Attendance History
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7D8597', fontWeight: 500 }}>
            View and monitor attendance logs for your direct and indirect reports
          </p>
        </div>

        {!isManager ? (
          <div style={{
            background: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            color: '#7D8597',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
          }}>
            You do not have permission to view team attendance.
          </div>
        ) : (
          <>
            {/* Filters */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#33415C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</span>
                <select 
                  value={selectedMember} 
                  onChange={e => setSelectedMember(e.target.value)} 
                  style={selectStyle}
                >
                  <option value="">All Team Members</option>
                  {members.map(m => (
                    <option key={m.employee_id} value={m.employee_id}>
                      {m.first_name} {m.last_name} ({m.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#33415C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Date</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={dateInputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#33415C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>End Date</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={dateInputStyle}
                />
              </div>

              {(selectedMember || startDate || endDate) && (
                <button 
                  onClick={handleReset} 
                  style={{
                    alignSelf: 'flex-end',
                    padding: '9px 16px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#7D8597',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.color = '#001233'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.color = '#7D8597'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* List/Table */}
            <div style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Employee</th>
                      <th style={thStyle}>Check In</th>
                      <th style={thStyle}>Check Out</th>
                      <th style={thStyle}>Work Duration</th>
                      <th style={thStyle}>Shift</th>
                      <th style={thStyle}>Result</th>
                      <th style={thStyle}>Location Status</th>
                      <th style={thStyle}>Office Location</th>
                      <th style={thStyle}>Distance</th>
                      <th style={thStyle}>GPS Accuracy</th>
                      <th style={thStyle}>Device & Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="12" style={{ padding: '48px', textAlign: 'center', color: '#7D8597', fontSize: '14px', fontWeight: 600 }}>
                          Loading team records...
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan="12" style={{ padding: '48px', textAlign: 'center', color: '#7D8597', fontSize: '14px', fontWeight: 600 }}>
                          No attendance punch logs found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map(row => {
                        const platform = row.device_info?.platform || 'Web'
                        const browser = row.device_info?.browser || 'Unknown'
                        
                        return (
                          <tr 
                            key={row.attendance_punch_id}
                            style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Date */}
                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#001233' }}>
                              {fmtDate(row.attendance_date)}
                            </td>
                            {/* Employee */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#001233' }}>
                                {row.first_name} {row.last_name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#7D8597', marginTop: '2px', fontWeight: 500 }}>
                                {row.employee_code} · {row.designation}
                              </div>
                            </td>
                            {/* Check In */}
                            <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                              <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid rgba(21,128,61,0.2)', fontWeight: '700' }}>
                                {fmtTime(row.check_in_time)}
                              </span>
                            </td>
                            {/* Check Out */}
                            <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                              {row.check_out_time ? (
                                <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.2)', fontWeight: '700' }}>
                                  {fmtTime(row.check_out_time)}
                                </span>
                              ) : (
                                <span style={{ color: '#7D8597', fontWeight: '600' }}>—</span>
                              )}
                            </td>
                            {/* Work Duration */}
                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: row.check_out_time ? '#001233' : '#0466C8' }}>
                              {formatDuration(row.work_duration_minutes)}
                            </td>
                            {/* Shift */}
                            <td style={{ padding: '14px 16px' }}>
                              {row.shift_name ? (
                                <span style={{
                                  background: row.shift_color_code || '#0466C8', color: '#fff',
                                  padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                  textShadow: '0 1px 2px rgba(0,0,0,0.15)', whiteSpace: 'nowrap'
                                }}>
                                  {row.shift_name} ({row.shift_code})
                                </span>
                              ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* Result */}
                            <td style={{ padding: '14px 16px' }}>
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
                            {/* Location Status */}
                            <td style={{ padding: '14px 16px' }}>
                              {renderLocationStatusBadge(row)}
                            </td>
                            {/* Office Location */}
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#001233', fontWeight: '600' }}>
                              {row.matched_office_name || row.zone_name || <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* Distance */}
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#33415C', fontFamily: 'monospace' }}>
                              {row.distance_from_office != null ? `${Number(row.distance_from_office).toFixed(1)}m` : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* GPS Accuracy */}
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#7D8597' }}>
                              {row.gps_accuracy != null ? `±${Number(row.gps_accuracy).toFixed(0)}m` : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* Device & Platform */}
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#7D8597', fontWeight: '500' }}>
                              {platform} ({browser})
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {history.length > 0 && (
                <div style={{
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderTop: '1px solid #edf2f7',
                  background: '#ffffff'
                }}>
                  {/* Left: Summary */}
                  <div style={{ fontSize: '13px', color: '#7D8597', fontWeight: '500' }}>
                    Showing <strong style={{ color: '#001233', fontWeight: '700' }}>{totalItems === 0 ? 0 : startIndex + 1}</strong> to{' '}
                    <strong style={{ color: '#001233', fontWeight: '700' }}>{endIndex}</strong> of{' '}
                    <strong style={{ color: '#001233', fontWeight: '700' }}>{totalItems}</strong> entries
                  </div>

                  {/* Right: Items per page selector + Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Rows per page dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#7D8597', fontWeight: '500' }}>Rows per page:</span>
                      <select
                        value={itemsPerPage}
                        onChange={e => setItemsPerPage(Number(e.target.value))}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#001233',
                          background: '#ffffff',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    {/* Pagination buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* First Page */}
                      <button
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage(1)}
                        title="First Page"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #E3E7EE',
                          background: safePage === 1 ? '#f8fafc' : '#ffffff',
                          color: safePage === 1 ? '#cbd5e1' : '#33415C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <FiChevronsLeft size={16} color={safePage === 1 ? '#cbd5e1' : '#33415C'} />
                      </button>

                      {/* Prev Page */}
                      <button
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        title="Previous Page"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #E3E7EE',
                          background: safePage === 1 ? '#f8fafc' : '#ffffff',
                          color: safePage === 1 ? '#cbd5e1' : '#33415C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <FiChevronLeft size={16} color={safePage === 1 ? '#cbd5e1' : '#33415C'} />
                      </button>

                      {/* Page Numbers */}
                      {getPageNumbers().map(pageNum => {
                        const isActive = pageNum === safePage
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            style={{
                              minWidth: 32,
                              height: 32,
                              padding: '0 8px',
                              borderRadius: 8,
                              border: isActive ? 'none' : '1px solid #E3E7EE',
                              background: isActive ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : '#ffffff',
                              color: isActive ? '#ffffff' : '#33415C',
                              fontWeight: isActive ? '700' : '600',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: isActive ? '0 2px 8px rgba(4, 102, 200,0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {pageNum}
                          </button>
                        )
                      })}

                      {/* Next Page */}
                      <button
                        disabled={safePage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        title="Next Page"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #E3E7EE',
                          background: safePage === totalPages ? '#f8fafc' : '#ffffff',
                          color: safePage === totalPages ? '#cbd5e1' : '#33415C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <FiChevronRight size={16} color={safePage === totalPages ? '#cbd5e1' : '#33415C'} />
                      </button>

                      {/* Last Page */}
                      <button
                        disabled={safePage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        title="Last Page"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid #E3E7EE',
                          background: safePage === totalPages ? '#f8fafc' : '#ffffff',
                          color: safePage === totalPages ? '#cbd5e1' : '#33415C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <FiChevronsRight size={16} color={safePage === totalPages ? '#cbd5e1' : '#33415C'} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  </div>
  )
}

