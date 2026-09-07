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

const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

const REPORT_TYPES = [
  { id: 'summary', title: 'Attendance Summary', desc: 'Aggregated totals, present/absent stats, and overall compliance.', icon: FiTrendingUp },
  { id: 'daily', title: 'Daily Attendance', desc: 'Detailed log lists of daily checkins/checkouts, hours, and results.', icon: FiCalendar },
  { id: 'monthly', title: 'Monthly Attendance', desc: 'Monthly summary view of present, absent, and late tallies per employee.', icon: FiUsers },
  { id: 'late-arrivals', title: 'Late Arrivals', desc: 'Track employees who clock in past the shift start & grace periods.', icon: FiClock },
  { id: 'early-exits', title: 'Early Exits', desc: 'Track employees who clock out before the shift expected exit time.', icon: FiAlertTriangle },
  { id: 'geofence', title: 'Geofence Compliance', desc: 'Verify fence verification status, office locations, and GPS accuracy.', icon: FiMapPin },
  { id: 'departments', title: 'Department Summaries', desc: 'Department-wise averages, total active headcount, and present ratios.', icon: FiUsers },
  { id: 'payroll', title: 'Monthly Payroll Attendance', desc: 'Track LOP days, leaves, and overtime hours for payroll calculations.', icon: FiClipboard },
  { id: 'exceptions', title: 'Attendance Exceptions', desc: 'Flags missing punch ins/outs, outside geofence, and missing shifts.', icon: FiAlertTriangle },
  { id: 'employee', title: 'Employee History', desc: 'Chronological timeline log showing single employee attendance.', icon: FiSearch }
]

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

  // Data state
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(null)

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

  useEffect(() => {
    loadReport()
  }, [activeReport, startDate, endDate, selectedDept, selectedPolicy, selectedShift, selectedResult, selectedLocation, selectedEmployeeId])

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

  const selectedReportInfo = REPORT_TYPES.find(r => r.id === activeReport)

  const records = useMemo(() => {
    if (!reportData) return []
    if (Array.isArray(reportData)) return reportData
    if (Array.isArray(reportData.records)) return reportData.records
    if (Array.isArray(reportData.data)) return reportData.data
    if (Array.isArray(reportData.rows)) return reportData.rows
    return []
  }, [reportData])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="attendance-reports" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FiClipboard size={20} color="#C2071A" strokeWidth={2.5} />
                </div>
                Attendance Reports
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
                Generate, inspect, and export comprehensive attendance compliance logs & analytics
              </p>
            </div>

            {activeReport && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting !== null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#ffffff', border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  <FiDownload size={14} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} />
                  Export CSV
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting !== null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    color: '#ffffff', border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  <FiDownload size={14} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} />
                  Export PDF
                </button>

                <button
                  onClick={loadReport}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    color: '#ffffff', border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  <FiRefreshCw size={14} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} className={loading ? 'spin' : ''} />
                  Refresh
                </button>
              </div>
            )}
          </div>

          {/* Report Selection Grid */}
          {!activeReport ? (
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Select Report Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {REPORT_TYPES.map(r => {
                  const Icon = r.icon
                  return (
                    <div
                      key={r.id}
                      onClick={() => setActiveReport(r.id)}
                      style={{
                        background: '#ffffff', border: 'none', borderRadius: '16px',
                        padding: '20px', cursor: 'pointer', boxShadow: cardShadow,
                        transition: 'all 0.18s ease', display: 'flex', gap: '14px', alignItems: 'flex-start'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: '#FEECEE', color: '#C2071A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Icon size={20} color="#C2071A" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{r.title}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{r.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              {/* Active Report Header & Filters */}
              <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '20px 24px', boxShadow: cardShadow, marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => setActiveReport(null)}
                      style={{
                        background: '#f1f5f9', border: 'none', borderRadius: '8px',
                        padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                        color: '#475569', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: '6px', transition: 'all 0.15s ease'
                      }}
                    >
                      <FiChevronLeft size={16} strokeWidth={2.5} />
                      Back to All Reports
                    </button>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{selectedReportInfo?.title}</h2>
                  </div>
                </div>

                {/* Filter Controls */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Department</label>
                    <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}>
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d.department_id || d.id} value={d.department_id || d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  {activeReport === 'employee' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Employee *</label>
                      <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}>
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Search</label>
                    <input type="text" placeholder="Search keywords..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px' }} />
                  </div>
                </div>

                {/* Summary Stat Cards for Attendance Summary */}
                {activeReport === 'summary' && reportData && !Array.isArray(reportData) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Employees</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{reportData.totalEmployees ?? 0}</div>
                    </div>
                    <div style={{ background: '#dcfce7', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Present</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{reportData.present ?? 0}</div>
                    </div>
                    <div style={{ background: '#fee2e2', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>Absent</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{reportData.absent ?? 0}</div>
                    </div>
                    <div style={{ background: '#fef3c7', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>Late Arrivals</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{reportData.lateArrivals ?? 0}</div>
                    </div>
                    <div style={{ background: '#ffedd5', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#9a3412', fontWeight: 600 }}>Early Exits</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>{reportData.earlyExits ?? 0}</div>
                    </div>
                    <div style={{ background: '#e0f2fe', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#075985', fontWeight: 600 }}>Compliance Rate</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{reportData.complianceRate ?? 100}%</div>
                    </div>
                  </div>
                )}

                {/* Summary Stat Cards for Geofence Compliance */}
                {activeReport === 'geofence' && reportData?.summary && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ background: '#dcfce7', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Inside Geofence</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{reportData.summary.insideFenceCount ?? 0}</div>
                    </div>
                    <div style={{ background: '#fee2e2', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>Outside Geofence</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{reportData.summary.outsideFenceCount ?? 0}</div>
                    </div>
                    <div style={{ background: '#f1f5f9', padding: '12px 14px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Location Not Verified</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#334155', marginTop: '2px' }}>{reportData.summary.locationNotVerifiedCount ?? 0}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: '24px', boxShadow: cardShadow }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading report data...</div>
                ) : error ? (
                  <div style={{ padding: '20px', background: '#feecee', color: '#dc2626', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}>{error}</div>
                ) : activeReport === 'employee' && !selectedEmployeeId ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>Please select an employee from the filter dropdown above to view their attendance history.</div>
                ) : !records || records.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No records found for the selected parameters.</div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', textAlign: 'left' }}>
                          {Object.keys(records[0] || {}).map(key => (
                            <th key={key} style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {key.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #edf2f7', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                            {Object.entries(row).map(([k, val], i) => (
                              <td key={i} style={{ padding: '14px 16px', color: '#1e293b' }}>
                                {k.includes('code') ? <CodeBadge code={String(val)} /> : String(val ?? '—')}
                              </td>
                            ))}
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
