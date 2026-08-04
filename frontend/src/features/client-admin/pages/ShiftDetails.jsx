import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiChevronLeft, FiClock, FiUsers, FiInfo, FiFolder, FiSearch } from 'react-icons/fi'

export default function ShiftDetails() {
  const { id } = useParams()
  const { currentShift, loadingShifts, error, fetchShiftDetails } = useAttendanceStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (id) {
      fetchShiftDetails(id)
    }
  }, [id, fetchShiftDetails])

  // Filter employees by search
  const filteredEmployees = currentShift?.assignedEmployees?.filter(emp => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase()
    const code = (emp.employee_code || '').toLowerCase()
    const dept = (emp.department_name || '').toLowerCase()
    const query = searchTerm.toLowerCase()
    return fullName.includes(query) || code.includes(query) || dept.includes(query)
  }) || []

  // Time format helper (converts "09:00:00" to "09:00 AM")
  const formatTimeStr = (t) => {
    if (!t) return '—'
    const parts = t.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`
  }

  // Styles
  const s = {
    container: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '"Outfit", "Inter", sans-serif' },
    content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    pageBody: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 16 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
    colorTag: (c) => ({ width: 14, height: 14, borderRadius: '50%', background: c || '#6366f1' }),
    shiftCode: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: 8 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 },
    metricCard: {
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 14
    },
    metricIcon: (bg, color) => ({
      width: 42, height: 42, borderRadius: 12, background: bg, color: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }),
    metricValue: { fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 },
    metricLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 600 },
    sectionTitle: { fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
    flexContainer: { display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, alignItems: 'start' },
    mainCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    searchWrapper: { position: 'relative', width: 220 },
    searchInput: {
      width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #e2e8f0', borderRadius: 10,
      fontSize: 12, outline: 'none', color: '#1e293b', fontFamily: 'inherit'
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
    th: { background: '#f8fafc', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' },
    td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
    deptCard: {
      padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', marginBottom: 10
    }
  }

  if (loadingShifts) {
    return (
      <div style={s.container}>
        <ClientAdminSidebar active="shifts-schedules" />
        <div style={s.content}>
          <ClientAdminTopBar />
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: 12, fontWeight: 500 }}>Loading shift details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !currentShift) {
    return (
      <div style={s.container}>
        <ClientAdminSidebar active="shifts-schedules" />
        <div style={s.content}>
          <ClientAdminTopBar />
          <div style={s.pageBody}>
            <Link to="/client-admin/attendance/shifts-schedules" style={s.backBtn}>
              <FiChevronLeft /> Back to Shifts
            </Link>
            <div style={{ padding: 24, background: '#fee2e2', color: '#b91c1c', borderRadius: 12, fontWeight: 600 }}>
              {error || 'Shift not found.'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.container}>
      <ClientAdminSidebar active="shifts-schedules" />

      <div style={s.content}>
        <ClientAdminTopBar />

        <div style={s.pageBody}>
          <Link to="/client-admin/attendance/shifts-schedules" style={s.backBtn}>
            <FiChevronLeft /> Back to Shifts
          </Link>

          {/* Header */}
          <div style={s.header}>
            <div>
              <h1 style={s.title}>
                <span style={s.colorTag(currentShift.color_code)} />
                {currentShift.shift_name}
                <span style={s.shiftCode}>{currentShift.shift_code}</span>
              </h1>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={s.grid}>
            <div style={s.metricCard}>
              <div style={s.metricIcon('#eef2ff', '#6366f1')}>
                <FiClock size={18} />
              </div>
              <div>
                <p style={s.metricValue}>{formatTimeStr(currentShift.start_time)} - {formatTimeStr(currentShift.end_time)}</p>
                <p style={s.metricLabel}>Shift Timings</p>
              </div>
            </div>

            <div style={s.metricCard}>
              <div style={s.metricIcon('#ecfdf5', '#10b981')}>
                <FiInfo size={18} />
              </div>
              <div>
                <p style={s.metricValue}>{currentShift.grace_minutes} mins</p>
                <p style={s.metricLabel}>Grace Minutes</p>
              </div>
            </div>

            <div style={s.metricCard}>
              <div style={s.metricIcon('#fef3c7', '#f59e0b')}>
                <FiInfo size={18} />
              </div>
              <div>
                <p style={s.metricValue}>{currentShift.early_exit_grace_minutes} mins</p>
                <p style={s.metricLabel}>Early Exit Grace</p>
              </div>
            </div>

            <div style={s.metricCard}>
              <div style={s.metricIcon('#f0fdfa', '#14b8a6')}>
                <FiClock size={18} />
              </div>
              <div>
                <p style={s.metricValue}>{currentShift.minimum_hours} Hours</p>
                <p style={s.metricLabel}>Min working hours</p>
              </div>
            </div>

            <div style={s.metricCard}>
              <div style={s.metricIcon('#fdf2f8', '#ec4899')}>
                <FiUsers size={18} />
              </div>
              <div>
                <p style={s.metricValue}>{currentShift.assigned_employees_count}</p>
                <p style={s.metricLabel}>Active Employees</p>
              </div>
            </div>
          </div>

          {/* Double Column Container */}
          <div style={s.flexContainer}>
            {/* Left: Employees Table */}
            <div style={s.mainCard}>
              <div style={s.cardHeader}>
                <h3 style={s.sectionTitle}>
                  <FiUsers size={16} color="#6366f1" /> Assigned Employees
                </h3>
                <div style={s.searchWrapper}>
                  <FiSearch size={12} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    id="employee-list-search"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={s.searchInput}
                  />
                </div>
              </div>

              {filteredEmployees.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No assigned employees match the filter criteria.</p>
                </div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Employee</th>
                      <th style={s.th}>Code</th>
                      <th style={s.th}>Department</th>
                      <th style={s.th}>Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(emp => (
                      <tr key={emp.employee_id}>
                        <td style={{ ...s.td, fontWeight: 700, color: '#0f172a' }}>{emp.first_name} {emp.last_name}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>{emp.employee_code}</td>
                        <td style={s.td}>{emp.department_name || '—'}</td>
                        <td style={s.td}>{emp.designation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right: Assigned Departments */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 style={s.sectionTitle}>
                  <FiFolder size={16} color="#6366f1" /> Assigned Departments
                </h3>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {currentShift.assignedDepartments?.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>No departments assigned.</p>
                ) : (
                  currentShift.assignedDepartments?.map(dept => (
                    <div key={dept.department_id} style={s.deptCard}>
                      <FiFolder size={14} color="#6366f1" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{dept.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
