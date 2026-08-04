import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import {
  FiClipboard, FiCalendar, FiUsers, FiClock, FiMapPin,
  FiAlertTriangle, FiTrendingUp, FiSearch, FiChevronLeft,
  FiChevronRight, FiDownload, FiCheckCircle, FiXCircle,
  FiFilter, FiRefreshCw, FiMail
} from 'react-icons/fi'

/* ─── API Setup ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const REPORT_TYPES = [
  { id: 'summary', title: 'Attendance Summary', desc: 'Aggregated totals, present/absent stats, and overall compliance.', icon: FiTrendingUp, bg: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  { id: 'daily', title: 'Daily Attendance', desc: 'Detailed log lists of daily checkins/checkouts, hours, and results.', icon: FiCalendar, bg: 'linear-gradient(135deg,#10b981,#34d399)' },
  { id: 'monthly', title: 'Monthly Attendance', desc: 'Monthly summary view of present, absent, and late tallies per employee.', icon: FiUsers, bg: 'linear-gradient(135deg,#06b6d4,#22d3ee)' },
  { id: 'late-arrivals', title: 'Late Arrivals', desc: 'Track employees who clock in past the shift start & grace periods.', icon: FiClock, bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  { id: 'early-exits', title: 'Early Exits', desc: 'Track employees who clock out before the shift expected exit time.', icon: FiAlertTriangle, bg: 'linear-gradient(135deg,#f43f5e,#fda4af)' },
  { id: 'geofence', title: 'Geofence Compliance', desc: 'Verify fence verification status, office locations, and GPS accuracy.', icon: FiMapPin, bg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
  { id: 'departments', title: 'Department Summaries', desc: 'Department-wise averages, total active headcount, and present ratios.', icon: FiUsers, bg: 'linear-gradient(135deg,#ec4899,#f472b6)' },
  { id: 'payroll', title: 'Monthly Payroll Attendance', desc: 'Track LOP days, leaves, and overtime hours for payroll calculations.', icon: FiClipboard, bg: 'linear-gradient(135deg,#14b8a6,#2dd4bf)' },
  { id: 'exceptions', title: 'Attendance Exceptions', desc: 'Flags missing punch ins/outs, outside geofence, and missing shifts.', icon: FiAlertTriangle, bg: 'linear-gradient(135deg,#e11d48,#fb7185)' },
  { id: 'employee', title: 'Employee History', desc: 'Chronological timeline log showing single employee attendance.', icon: FiSearch, bg: 'linear-gradient(135deg,#4b5563,#9ca3af)' }
]

export default function AttendanceReports() {
  const [activeReport, setActiveReport] = useState(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedResult, setSelectedResult] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedMode, setSelectedMode] = useState('ALL') // future placeholder

  // Data state
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(null) // 'csv' | 'xlsx' | 'pdf' | null

  // Dropdown options
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const { policies, shifts, fetchPolicies, fetchShifts } = useAttendanceStore()

  useEffect(() => {
    fetchPolicies()
    fetchShifts()
    api.get('/client-admin/departments').then(r => setDepartments(r.data?.departments || r.data || [])).catch(() => {})
    api.get('/client-admin/employees').then(r => setEmployees(r.data || [])).catch(() => {})
  }, [fetchPolicies, fetchShifts])

  const loadReport = async () => {
    if (!activeReport) return
    if (activeReport === 'employee' && !selectedEmployeeId) {
      setReportData(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)

    const params = {
      start_date: startDate,
      end_date: endDate,
      department_id: selectedDept || undefined,
      policy_id: selectedPolicy || undefined,
      shift_id: selectedShift || undefined,
      attendance_result: selectedResult || undefined,
      location_status: selectedLocation || undefined,
      employee_id: selectedEmployeeId || undefined,
      search: search || undefined
    }

    try {
      const url = activeReport === 'employee'
        ? `/attendance/reports/employee/${selectedEmployeeId || 'all'}`
        : `/attendance/reports/${activeReport}`

      const res = await api.get(url, { params })
      setReportData(res.data?.data || res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }

  // Reload report when active selection or dates change
  useEffect(() => {
    loadReport()
  }, [activeReport, startDate, endDate, selectedEmployeeId])

  const handleExport = async (format) => {
    setExporting(format)
    try {
      const params = {
        reportType: activeReport,
        start_date: startDate,
        end_date: endDate,
        department_id: selectedDept || undefined,
        policy_id: selectedPolicy || undefined,
        shift_id: selectedShift || undefined,
        attendance_result: selectedResult || undefined,
        location_status: selectedLocation || undefined,
        employee_id: selectedEmployeeId || undefined,
        search: search || undefined
      }

      const res = await api.get(`/attendance/reports/export/${format}`, {
        params,
        responseType: 'blob'
      })

      const blobType = format === 'pdf'
        ? 'application/pdf'
        : format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'

      const blob = new Blob([res.data], { type: blobType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance-${activeReport}-report.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export to ${format.toUpperCase()} failed.`)
    } finally {
      setExporting(null)
    }
  }

  // Columns & Headers setup based on Report
  const { columns, headers } = useMemo(() => {
    if (!activeReport || !reportData) return { columns: [], headers: [] }
    let dataList = Array.isArray(reportData) ? reportData : (reportData.records || [])
    if (dataList.length === 0) return { columns: [], headers: [] }
    
    const firstItem = dataList[0]
    const columns = Object.keys(firstItem)
    const headers = columns.map(col => col.replace(/_/g, ' ').toUpperCase())
    return { columns, headers }
  }, [activeReport, reportData])

  const displayList = useMemo(() => {
    if (!reportData) return []
    return Array.isArray(reportData) ? reportData : (reportData.records || [])
  }, [reportData])

  // Style Tokens
  const pageStyle = { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }
  const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const containerStyle = { flex: 1, padding: '24px 32px', overflowY: 'auto' }
  
  return (
    <div style={pageStyle}>
      <ClientAdminSidebar active="attendance-reports" />

      <div style={mainStyle}>
        <ClientAdminTopBar />

        <div style={containerStyle}>
          
          {/* Back Trigger */}
          {activeReport && (
            <button
              onClick={() => { setActiveReport(null); setReportData(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
                color: '#6366f1', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '16px', padding: 0
              }}
            >
              <FiChevronLeft size={16} /> Back to Reports Dashboard
            </button>
          )}

          {/* Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiClipboard style={{ color: '#6366f1' }} /> 
                {activeReport ? REPORT_TYPES.find(r => r.id === activeReport)?.title : 'Attendance Reports'}
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
                {activeReport 
                  ? REPORT_TYPES.find(r => r.id === activeReport)?.desc
                  : 'Select and download localized attendance summaries, geofence compliance matrices, and payroll audit sheets.'}
              </p>
            </div>
            
            {activeReport && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  id="export-csv"
                  onClick={() => handleExport('csv')}
                  disabled={exporting || displayList.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f1f5f9',
                    border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer'
                  }}
                >
                  <FiDownload size={14} /> {exporting === 'csv' ? 'CSV...' : 'CSV'}
                </button>
                <button
                  id="export-xlsx"
                  onClick={() => handleExport('xlsx')}
                  disabled={exporting || displayList.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f1f5f9',
                    border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer'
                  }}
                >
                  <FiDownload size={14} /> {exporting === 'xlsx' ? 'XLSX...' : 'Excel'}
                </button>
                <button
                  id="export-pdf"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting || displayList.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f1f5f9',
                    border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer'
                  }}
                >
                  <FiDownload size={14} /> {exporting === 'pdf' ? 'PDF...' : 'PDF'}
                </button>
              </div>
            )}
          </div>

          <style>{`
            .report-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.08), 0 4px 6px -2px rgba(99, 102, 241, 0.04) !important;
            }
          `}</style>

          {/* Dashboard Mode */}
          {!activeReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Scheduled Reports Coming Soon placeholder */}
              <div style={{
                background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifycontent: 'center', flexShrink: 0 }}>
                    <FiMail size={20} style={{ margin: 'auto' }} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e1b4b' }}>Scheduled Reports</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#4338ca', fontWeight: 500 }}>Auto-deliver daily shifts or geofence compliance audits directly to managers' mailboxes.</p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#6366f1', color: '#fff', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Coming Soon
                </span>
              </div>

              {/* Grid Report Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {REPORT_TYPES.map(report => (
                  <div
                    key={report.id}
                    className="report-card"
                    onClick={() => setActiveReport(report.id)}
                    style={{
                      background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
                      padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: report.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <report.icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{report.title}</h3>
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{report.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewer Mode */}
          {activeReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Unified Filter Toolbar */}
              <div style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
                padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '13px', fontWeight: 700 }}>
                  <FiFilter size={14} /> Filters:
                </div>

                {/* Date range */}
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
                />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
                />

                {/* Employee select (for employee history) */}
                {activeReport === 'employee' && (
                  <select
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(e => (
                      <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                    ))}
                  </select>
                )}

                {/* Department dropdown */}
                {activeReport !== 'employee' && (
                  <select
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>{d.name}</option>
                    ))}
                  </select>
                )}

                {/* Policies dropdown */}
                {activeReport !== 'employee' && (
                  <select
                    value={selectedPolicy}
                    onChange={e => setSelectedPolicy(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">All Policies</option>
                    {policies.map(p => (
                      <option key={p.attendance_policy_id} value={p.attendance_policy_id}>{p.name}</option>
                    ))}
                  </select>
                )}

                {/* Shifts dropdown */}
                {activeReport !== 'employee' && (
                  <select
                    value={selectedShift}
                    onChange={e => setSelectedShift(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">All Shifts</option>
                    {shifts.map(s => (
                      <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.shift_code})</option>
                    ))}
                  </select>
                )}

                {/* Results dropdown */}
                {['daily', 'late-arrivals', 'early-exits'].includes(activeReport) && (
                  <select
                    value={selectedResult}
                    onChange={e => setSelectedResult(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">All Results</option>
                    <option value="ON_TIME">On Time</option>
                    <option value="LATE_ARRIVAL">Late Arrival</option>
                    <option value="EARLY_EXIT">Early Exit</option>
                    <option value="COMPLETED_SHIFT">Completed Shift</option>
                  </select>
                )}

                {/* Geofence location status */}
                {activeReport === 'geofence' && (
                  <select
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">All Geofence Status</option>
                    <option value="INSIDE_FENCE">Inside Geofence</option>
                    <option value="OUTSIDE_FENCE">Outside Geofence</option>
                    <option value="LOCATION_NOT_VERIFIED">Location Not Verified</option>
                  </select>
                )}

                {/* Future WFH/On-Duty Filter */}
                <select
                  value={selectedMode}
                  onChange={e => setSelectedMode(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer', background: '#f8fafc' }}
                >
                  <option value="ALL">All Modes (Future-ready)</option>
                  <option value="OFFICE">Office Punch</option>
                  <option value="WFH">WFH Remote</option>
                  <option value="ON_DUTY">On Duty</option>
                </select>

                {/* Search Text */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <FiSearch size={12} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                  <input
                    placeholder="Search name/code..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: '6px 10px 6px 28px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
                  />
                </div>

                <button
                  onClick={loadReport}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', background: '#6366f1',
                    border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer'
                  }}
                >
                  <FiRefreshCw size={12} /> Apply
                </button>
              </div>

              {/* Summary Cards Panel for Specific Report Types */}
              {activeReport === 'summary' && reportData && !Array.isArray(reportData) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Employees</span>
                    <strong style={{ fontSize: '22px', color: '#0f172a' }}>{reportData.totalEmployees}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Punched Present</span>
                    <strong style={{ fontSize: '22px', color: '#10b981' }}>{reportData.present}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Absent Days</span>
                    <strong style={{ fontSize: '22px', color: '#ef4444' }}>{reportData.absent}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Late Arrivals</span>
                    <strong style={{ fontSize: '22px', color: '#f59e0b' }}>{reportData.lateArrivals}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Early Exits</span>
                    <strong style={{ fontSize: '22px', color: '#f43f5e' }}>{reportData.earlyExits}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Compliance Rate</span>
                    <strong style={{ fontSize: '22px', color: '#6366f1' }}>{reportData.complianceRate}%</strong>
                  </div>
                </div>
              )}

              {activeReport === 'geofence' && reportData && reportData.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Inside Geofence Count</span>
                    <strong style={{ fontSize: '22px', color: '#10b981' }}>{reportData.summary.insideFenceCount}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Outside Geofence Count</span>
                    <strong style={{ fontSize: '22px', color: '#ef4444' }}>{reportData.summary.outsideFenceCount}</strong>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Location Not Verified Count</span>
                    <strong style={{ fontSize: '22px', color: '#64748b' }}>{reportData.summary.locationNotVerifiedCount}</strong>
                  </div>
                </div>
              )}

              {/* Scrollable Report Table Card */}
              <div style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {loading ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                    <FiRefreshCw className="spin-anim" size={24} style={{ marginBottom: '8px', animation: 'spin 1.5s infinite linear' }} />
                    <div>Loading report lines...</div>
                  </div>
                ) : error ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
                    {error}
                  </div>
                ) : displayList.length === 0 ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                    {activeReport === 'employee' && !selectedEmployeeId
                      ? 'Please select an employee from the filter dropdown above to view their attendance history.'
                      : 'No matching report data lines. Try modifying filter ranges or parameters.'}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                          {headers.map((h, i) => (
                            <th key={i} style={{ padding: '14px 18px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayList.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: rIdx % 2 === 0 ? '#ffffff' : '#fafbfc'
                            }}
                          >
                            {columns.map((col, cIdx) => {
                              let val = row[col]
                              if (val === null || val === undefined) val = '—'
                              return (
                                <td key={cIdx} style={{ padding: '12px 18px', color: '#1e293b', fontWeight: 500 }}>
                                  {/* Result / status stylings */}
                                  {col === 'result' || col === 'location_status' || col === 'exception_type' ? (
                                    <span style={{
                                      fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                                      background: ['ON_TIME', 'COMPLETED_SHIFT', 'INSIDE_FENCE', 'PRESENT'].includes(val) ? '#dcfce7' : ['LATE_ARRIVAL', 'OUTSIDE_FENCE', 'Missing Punch Out', 'Missing Punch In'].includes(val) ? '#ffedd5' : '#fee2e2',
                                      color: ['ON_TIME', 'COMPLETED_SHIFT', 'INSIDE_FENCE', 'PRESENT'].includes(val) ? '#15803d' : ['LATE_ARRIVAL', 'OUTSIDE_FENCE', 'Missing Punch Out', 'Missing Punch In'].includes(val) ? '#c2410c' : '#b91c1c'
                                    }}>
                                      {String(val).replace(/_/g, ' ')}
                                    </span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
