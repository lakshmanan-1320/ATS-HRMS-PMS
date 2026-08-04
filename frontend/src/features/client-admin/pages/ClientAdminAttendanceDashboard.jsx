import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import {
  FiUsers, FiCheckCircle, FiXCircle, FiClock,
  FiAlertTriangle, FiTrendingUp, FiMapPin, FiCalendar, FiRefreshCw
} from 'react-icons/fi'

/* ─── Helpers ─── */
function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ClientAdminAttendanceDashboard() {
  const navigate = useNavigate()
  
  // Quick Filters: 'today' | 'yesterday' | '7days' | 'current_month'
  const [activeFilter, setActiveFilter] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)

  const {
    dashboardSummary,
    trends,
    departmentsSummary,
    adminOverview,
    loadingDashboard,
    loadingTrends,
    loadingDeptSummary,
    loadingOverview,
    error,
    fetchDashboardSummary,
    fetchTrends,
    fetchDepartmentsSummary,
    fetchAdminOverview
  } = useAttendanceStore()

  // Calculate target dates
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const selectedDate = activeFilter === 'yesterday' ? yesterdayStr : todayStr

  // Load data on filter or refresh change
  useEffect(() => {
    // 1. Fetch dashboard summary for the selected day
    fetchDashboardSummary(selectedDate)
    
    // 2. Fetch departments summary for the selected day
    fetchDepartmentsSummary(selectedDate)

    // 3. Fetch trends based on the active tab/filter
    const trendRange = activeFilter === 'current_month' ? 'current_month' : activeFilter === '7days' ? '7days' : '7days'
    fetchTrends(trendRange)

    // 4. Fetch admin overview for exceptions list
    fetchAdminOverview({ date: selectedDate, limit: 'all' })
  }, [activeFilter, selectedDate, refreshKey, fetchDashboardSummary, fetchDepartmentsSummary, fetchTrends, fetchAdminOverview])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Aggregate stats depending on current tab
  const stats = useMemo(() => {
    const isPeriodMode = activeFilter === '7days' || activeFilter === 'current_month'
    
    if (isPeriodMode && trends && trends.length > 0) {
      // Aggregate over period
      const totalPoints = trends.length
      const sumTotalEmployees = trends.reduce((sum, p) => sum + (p.totalEmployees || 0), 0)
      const sumPresent = trends.reduce((sum, p) => sum + (p.present || 0), 0)
      const sumAbsent = trends.reduce((sum, p) => sum + (p.absent || 0), 0)
      const sumOnTime = trends.reduce((sum, p) => sum + (p.onTime || 0), 0)
      const sumLate = trends.reduce((sum, p) => sum + (p.lateArrivals || 0), 0)
      const sumEarly = trends.reduce((sum, p) => sum + (p.earlyExits || 0), 0)

      const avgTotal = Math.round(sumTotalEmployees / totalPoints)
      const avgPresent = Math.round(sumPresent / totalPoints)
      const avgAbsent = Math.round(sumAbsent / totalPoints)
      const avgOnTime = Math.round(sumOnTime / totalPoints)
      const avgLate = Math.round(sumLate / totalPoints)
      const avgEarly = Math.round(sumEarly / totalPoints)
      const avgPct = avgTotal > 0 ? Number(((avgPresent / avgTotal) * 100).toFixed(1)) : 0.0

      return {
        totalEmployees: avgTotal,
        present: avgPresent,
        absent: avgAbsent,
        attendancePercentage: avgPct,
        onTime: avgOnTime,
        lateArrivals: avgLate,
        earlyExits: avgEarly,
        labelSuffix: ' (Period Avg)'
      }
    } else {
      // Single day mode
      return {
        totalEmployees: dashboardSummary?.totalEmployees || 0,
        present: dashboardSummary?.present || 0,
        absent: dashboardSummary?.absent || 0,
        attendancePercentage: dashboardSummary?.attendancePercentage || 0.0,
        onTime: dashboardSummary?.onTime || 0,
        lateArrivals: dashboardSummary?.lateArrivals || 0,
        earlyExits: dashboardSummary?.earlyExits || 0,
        labelSuffix: ''
      }
    }
  }, [activeFilter, trends, dashboardSummary])

  // Extract exceptions from overview records
  const exceptions = useMemo(() => {
    const records = adminOverview?.records || []
    return {
      lateArrivals: records.filter(r => r.attendance_result === 'LATE_ARRIVAL'),
      outsideFence: records.filter(r => r.location_status === 'OUTSIDE_FENCE'),
      earlyExits: records.filter(r => r.attendance_result === 'EARLY_EXIT')
    }
  }, [adminOverview])

  const [activeExceptionTab, setActiveExceptionTab] = useState('late')

  const loading = loadingDashboard || loadingTrends || loadingDeptSummary || loadingOverview

  // Inline CSS Styles
  const pageContainerStyle = {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#1e293b'
  }

  const contentWrapperStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }

  const mainContentStyle = {
    flex: 1,
    padding: '24px 32px',
    overflowY: 'auto'
  }

  const headerContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  }

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const dateSubStyle = {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
    fontWeight: 500
  }

  const filterGroupStyle = {
    display: 'flex',
    background: '#e2e8f0',
    padding: '4px',
    borderRadius: '10px',
    gap: '4px'
  }

  const filterButtonStyle = (active) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#0f172a' : '#475569',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.15s ease'
  })

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  }

  const cardStyle = (colorAccent) => ({
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    position: 'relative',
    overflow: 'hidden'
  })

  const cardIndicatorStyle = (color) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: color
  })

  const iconContainerStyle = (bg, color) => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  })

  const widgetsGridStyle = {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr',
    gap: '24px',
    marginBottom: '24px'
  }

  // Media Query handling for responsiveness
  useEffect(() => {
    const handleResize = () => {
      const grid = document.getElementById('widgets-grid')
      if (grid) {
        if (window.innerWidth < 1024) {
          grid.style.gridTemplateColumns = '1fr'
        } else {
          grid.style.gridTemplateColumns = '2fr 1.2fr'
        }
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={pageContainerStyle}>
      <ClientAdminSidebar active="attendance-dashboard" />

      <div style={contentWrapperStyle}>
        <ClientAdminTopBar />

        <div style={mainContentStyle}>
          {/* Header */}
          <div style={headerContainerStyle}>
            <div>
              <h1 style={titleStyle}>
                <FiClock style={{ color: '#6366f1' }} /> Attendance Dashboard
              </h1>
              <p style={dateSubStyle}>
                Real-time tracking, metrics, and compliance logs •{' '}
                <span style={{ color: '#6366f1', fontWeight: 700 }}>
                  {formatDisplayDate(selectedDate)}
                </span>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={filterGroupStyle}>
                <button
                  id="filter-today"
                  style={filterButtonStyle(activeFilter === 'today')}
                  onClick={() => setActiveFilter('today')}
                >
                  Today
                </button>
                <button
                  id="filter-yesterday"
                  style={filterButtonStyle(activeFilter === 'yesterday')}
                  onClick={() => setActiveFilter('yesterday')}
                >
                  Yesterday
                </button>
                <button
                  id="filter-7days"
                  style={filterButtonStyle(activeFilter === '7days')}
                  onClick={() => setActiveFilter('7days')}
                >
                  Last 7 Days
                </button>
                <button
                  id="filter-month"
                  style={filterButtonStyle(activeFilter === 'current_month')}
                  onClick={() => setActiveFilter('current_month')}
                >
                  Current Month
                </button>
              </div>

              <button
                id="btn-refresh"
                onClick={handleRefresh}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  cursor: 'pointer',
                  color: '#475569',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <FiRefreshCw className={loading ? 'spin-anim' : ''} size={16} />
              </button>
            </div>
          </div>

          <style>{`
            .spin-anim { animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .card-hover:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            }
          `}</style>

          {/* Stats Cards */}
          <div style={statsGridStyle}>
            {/* Total Employees */}
            <div className="card-hover" style={{ ...cardStyle('#6366f1'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#6366f1')} />
              <div style={iconContainerStyle('#e0e7ff', '#6366f1')}>
                <FiUsers size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Employees{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.totalEmployees}</div>
              </div>
            </div>

            {/* Attendance % */}
            <div className="card-hover" style={{ ...cardStyle('#10b981'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#10b981')} />
              <div style={iconContainerStyle('#d1fae5', '#10b981')}>
                <FiTrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Attendance %{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.attendancePercentage}%</div>
              </div>
            </div>

            {/* Present */}
            <div className="card-hover" style={{ ...cardStyle('#22c55e'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#22c55e')} />
              <div style={iconContainerStyle('#dcfce7', '#22c55e')}>
                <FiCheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Present{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.present}</div>
              </div>
            </div>

            {/* Absent */}
            <div className="card-hover" style={{ ...cardStyle('#ef4444'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#ef4444')} />
              <div style={iconContainerStyle('#fee2e2', '#ef4444')}>
                <FiXCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Absent{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.absent}</div>
              </div>
            </div>

            {/* On Time */}
            <div className="card-hover" style={{ ...cardStyle('#3b82f6'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#3b82f6')} />
              <div style={iconContainerStyle('#dbeafe', '#3b82f6')}>
                <FiCheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>On Time{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.onTime}</div>
              </div>
            </div>

            {/* Late Arrivals */}
            <div className="card-hover" style={{ ...cardStyle('#f59e0b'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#f59e0b')} />
              <div style={iconContainerStyle('#fef3c7', '#f59e0b')}>
                <FiClock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Late Arrivals{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.lateArrivals}</div>
              </div>
            </div>

            {/* Early Exits */}
            <div className="card-hover" style={{ ...cardStyle('#f43f5e'), transition: 'all 0.2s ease' }}>
              <div style={cardIndicatorStyle('#f43f5e')} />
              <div style={iconContainerStyle('#ffe4e6', '#f43f5e')}>
                <FiAlertTriangle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Early Exits{stats.labelSuffix}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stats.earlyExits}</div>
              </div>
            </div>
          </div>

          {/* Widgets Layout */}
          <div id="widgets-grid" style={widgetsGridStyle}>
            
            {/* Left Column: Exceptions Widget & Trend Charts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Exceptions Widget */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Today's Exceptions</h3>
                  <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setActiveExceptionTab('late')}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        background: activeExceptionTab === 'late' ? '#ffffff' : 'transparent',
                        color: activeExceptionTab === 'late' ? '#c2410c' : '#64748b',
                        boxShadow: activeExceptionTab === 'late' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Late Arrivals ({exceptions.lateArrivals.length})
                    </button>
                    <button
                      onClick={() => setActiveExceptionTab('geofence')}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        background: activeExceptionTab === 'geofence' ? '#ffffff' : 'transparent',
                        color: activeExceptionTab === 'geofence' ? '#b91c1c' : '#64748b',
                        boxShadow: activeExceptionTab === 'geofence' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Outside Fence ({exceptions.outsideFence.length})
                    </button>
                    <button
                      onClick={() => setActiveExceptionTab('early')}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        background: activeExceptionTab === 'early' ? '#ffffff' : 'transparent',
                        color: activeExceptionTab === 'early' ? '#b91c1c' : '#64748b',
                        boxShadow: activeExceptionTab === 'early' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Early Exits ({exceptions.earlyExits.length})
                    </button>
                  </div>
                </div>

                {/* Exception List */}
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {activeExceptionTab === 'late' && (
                    exceptions.lateArrivals.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No late arrivals today 🎉</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Employee</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Shift</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Check In</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Policy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptions.lateArrivals.map(r => (
                            <tr key={r.employee_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                                {r.first_name} {r.last_name}
                                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 400 }}>{r.employee_code}</span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                  {r.shift_name}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 700 }}>
                                {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b' }}>{r.policy_name || 'General Policy'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  {activeExceptionTab === 'geofence' && (
                    exceptions.outsideFence.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No outside geofence alerts today 👍</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Employee</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Office Zone</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Check In Distance</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>GPS Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptions.outsideFence.map(r => (
                            <tr key={r.employee_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                                {r.first_name} {r.last_name}
                                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 400 }}>{r.employee_code}</span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontWeight: 600 }}>
                                  <FiMapPin size={12} /> {r.matched_office_name || 'Geofenced area'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 700 }}>
                                {r.distance_from_office != null ? `${Number(r.distance_from_office).toFixed(0)}m outside` : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                {r.gps_accuracy != null ? `±${Number(r.gps_accuracy).toFixed(0)}m` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  {activeExceptionTab === 'early' && (
                    exceptions.earlyExits.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No early exits today ✅</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Employee</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Shift Duration</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Check Out</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Shift Target</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptions.earlyExits.map(r => (
                            <tr key={r.employee_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                                {r.first_name} {r.last_name}
                                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 400 }}>{r.employee_code}</span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#475569' }}>
                                {r.work_duration_minutes != null ? `${Math.floor(r.work_duration_minutes / 60)}h ${r.work_duration_minutes % 60}m` : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 700 }}>
                                {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                {r.shift_start_time} - {r.shift_end_time}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}
                </div>
              </div>

              {/* Trend Charts Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Attendance Trends</h3>
                
                {trends.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No trend data found.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* SVG Chart 1: Daily Attendance % */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Attendance Rate Trend (%)</h4>
                      <div style={{ position: 'relative', width: '100%', height: '160px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px' }}>
                        <svg viewBox="0 0 300 130" style={{ width: '100%', height: '100%' }}>
                          {/* Grid Lines */}
                          <line x1="30" y1="20" x2="290" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                          <line x1="30" y1="60" x2="290" y2="60" stroke="#e2e8f0" strokeDasharray="3,3" />
                          <line x1="30" y1="100" x2="290" y2="100" stroke="#e2e8f0" strokeDasharray="3,3" />
                          
                          {/* Y-Axis Labels */}
                          <text x="5" y="24" fontSize="8" fill="#94a3b8" fontWeight="600">100%</text>
                          <text x="5" y="64" fontSize="8" fill="#94a3b8" fontWeight="600">50%</text>
                          <text x="5" y="104" fontSize="8" fill="#94a3b8" fontWeight="600">0%</text>

                          {/* Render Trend Line */}
                          {(() => {
                            const paddingLeft = 35
                            const widthRange = 250
                            const heightRange = 90
                            const points = trends.map((t, idx) => {
                              const rate = t.totalEmployees > 0 ? (t.present / t.totalEmployees) * 100 : 0
                              const x = paddingLeft + (idx / (trends.length - 1)) * widthRange
                              const y = 110 - (rate / 100) * heightRange
                              return { x, y, date: t.date }
                            })
                            const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                            const areaData = `${pathData} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`
                            return (
                              <>
                                <path d={areaData} fill="url(#grad1)" opacity="0.15" />
                                <path d={pathData} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                {points.map((p, idx) => (
                                  <circle key={idx} cx={p.x} cy={p.y} r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                                ))}
                                <defs>
                                  <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                              </>
                            )
                          })()}
                        </svg>
                      </div>
                    </div>

                    {/* SVG Chart 2: Exception Counts */}
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Late Arrival Exceptions</h4>
                      <div style={{ position: 'relative', width: '100%', height: '160px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px' }}>
                        <svg viewBox="0 0 300 130" style={{ width: '100%', height: '100%' }}>
                          {/* Grid Lines */}
                          <line x1="30" y1="20" x2="290" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                          <line x1="30" y1="60" x2="290" y2="60" stroke="#e2e8f0" strokeDasharray="3,3" />
                          <line x1="30" y1="100" x2="290" y2="100" stroke="#e2e8f0" strokeDasharray="3,3" />

                          {/* Render Bars */}
                          {(() => {
                            const paddingLeft = 35
                            const widthRange = 250
                            const maxVal = Math.max(...trends.map(t => t.lateArrivals || 0), 5)
                            const barWidth = Math.max(5, 120 / trends.length)
                            return trends.map((t, idx) => {
                              const val = t.lateArrivals || 0
                              const x = paddingLeft + (idx / (trends.length - 1)) * widthRange - barWidth / 2
                              const h = (val / maxVal) * 90
                              const y = 110 - h
                              return (
                                <g key={idx}>
                                  <rect x={x} y={y} width={barWidth} height={h} rx="2" fill="#f59e0b" opacity="0.85" />
                                  <text x={x + barWidth / 2} y={Math.max(10, y - 4)} fontSize="6" fill="#475569" fontWeight="700" textAnchor="middle">{val}</text>
                                </g>
                              )
                            })
                          })()}
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Department Summaries Widget */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Department Statistics</h3>
              
              {departmentsSummary.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No department statistics found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, maxHeight: '420px' }}>
                  {departmentsSummary.map(d => {
                    const presentPercent = d.totalEmployees > 0 ? (d.presentCount / d.totalEmployees) * 100 : 0
                    return (
                      <div key={d.departmentId} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{d.departmentName}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            {d.presentCount}/{d.totalEmployees} Present
                          </span>
                        </div>
                        
                        {/* Custom visual progress bar */}
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '6px' }}>
                          <div style={{ width: `${presentPercent}%`, height: '100%', background: '#10b981' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                          <span style={{ color: '#ef4444' }}>{d.absentCount} Absent</span>
                          {d.lateCount > 0 && (
                            <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 5px', borderRadius: '4px' }}>
                              {d.lateCount} Late
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
