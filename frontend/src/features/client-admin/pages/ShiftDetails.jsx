import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiArrowLeft, FiClock, FiUsers, FiInfo, FiFolder, FiSearch } from 'react-icons/fi'

const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

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

export default function ShiftDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentShift, loadingShifts, error, fetchShiftDetails } = useAttendanceStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (id) {
      fetchShiftDetails(id)
    }
  }, [id, fetchShiftDetails])

  const filteredEmployees = currentShift?.assignedEmployees?.filter(emp => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase()
    const code = (emp.employee_code || '').toLowerCase()
    const dept = (emp.department_name || '').toLowerCase()
    const query = searchTerm.toLowerCase()
    return fullName.includes(query) || code.includes(query) || dept.includes(query)
  }) || []

  const formatTimeStr = (t) => {
    if (!t) return '—'
    const parts = t.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`
  }

  if (loadingShifts) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
        <ClientAdminSidebar active="shifts-schedules" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #cbd5e1', borderTopColor: '#C2071A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 12, fontWeight: 500 }}>Loading shift details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !currentShift) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
        <ClientAdminSidebar active="shifts-schedules" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <div style={{ padding: '28px 32px' }}>
            <button onClick={() => navigate('/client-admin/attendance/shifts-schedules')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C2071A', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
              <FiArrowLeft size={14} color="#C2071A" strokeWidth={2.5} /> Back to Shifts
            </button>
            <div style={{ padding: 24, background: '#feecee', color: '#dc2626', borderRadius: 12, fontWeight: 600 }}>
              {error || 'Shift not found.'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="shifts-schedules" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <button onClick={() => navigate('/client-admin/attendance/shifts-schedules')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C2071A', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
            <FiArrowLeft size={14} color="#C2071A" strokeWidth={2.5} /> Back to Shifts
          </button>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: currentShift.color_code || '#C2071A' }} />
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                {currentShift.shift_name}
              </h1>
              <CodeBadge code={currentShift.shift_code} />
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div style={{ background: '#ffffff', border: 'none', borderRadius: 16, padding: 18, boxShadow: cardShadow, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FEECEE', color: '#C2071A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiClock size={18} color="#C2071A" strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{formatTimeStr(currentShift.start_time)} - {formatTimeStr(currentShift.end_time)}</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 600 }}>Shift Timings</p>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: 'none', borderRadius: 16, padding: 18, boxShadow: cardShadow, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e8fbf0', color: '#0fa958', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiInfo size={18} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentShift.grace_minutes || 0} Mins</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 600 }}>Grace Period</p>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: 'none', borderRadius: 16, padding: 18, boxShadow: cardShadow, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiClock size={18} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentShift.minimum_hours || 8.0} Hours</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 600 }}>Min Hours Required</p>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: 'none', borderRadius: 16, padding: 18, boxShadow: cardShadow, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiUsers size={18} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>{currentShift.assignedEmployees?.length || 0}</p>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 600 }}>Assigned Employees</p>
              </div>
            </div>
          </div>

          {/* Members & Departments Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* Table of Employees */}
            <div style={{ background: '#ffffff', border: 'none', borderRadius: 16, boxShadow: cardShadow, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiUsers color="#C2071A" size={16} /> Assigned Employees ({filteredEmployees.length})
                </h3>
                <div style={{ position: 'relative', width: 220 }}>
                  <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: 10,
                      fontSize: 12, outline: 'none', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff' }}>
                      <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</th>
                      <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</th>
                      <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department</th>
                      <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effective From</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No employees assigned to this shift.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp, i) => (
                        <tr key={emp.employee_id} style={{ borderBottom: '1px solid #edf2f7', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <CodeBadge code={emp.employee_code} />
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {emp.department_name || '—'}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#64748b' }}>
                            {emp.effective_from ? new Date(emp.effective_from).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar Departments list */}
            <div style={{ background: '#ffffff', border: 'none', borderRadius: 16, padding: 20, boxShadow: cardShadow }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiFolder color="#C2071A" size={16} /> Departments ({currentShift?.assignedDepartments?.length || 0})
              </h3>
              {(!currentShift?.assignedDepartments || currentShift.assignedDepartments.length === 0) ? (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No departments assigned.</p>
              ) : (
                currentShift.assignedDepartments.map(dept => (
                  <div key={dept.department_id} style={{ padding: '10px 12px', borderRadius: 10, background: '#f8fafc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{dept.department_name}</span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
