import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiUsers, FiInfo, FiCheck, FiX, FiSettings, FiCalendar, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const PAGE_SIZE = 10
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

export default function ShiftsSchedules() {
  const {
    shifts,
    loadingShifts,
    error,
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,
    toggleShiftStatus,
    assignShift,
    metadataDepartments,
    metadataEmployees,
    loadAssignmentMetadata
  } = useAttendanceStore()

  // Modal states
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [assigningShift, setAssigningShift] = useState(null)
  const [modalError, setModalError] = useState('')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Form states
  const [crudForm, setCrudForm] = useState({
    shiftName: '',
    shiftCode: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    earlyExitGraceMinutes: 5,
    minimumHours: 8.0,
    colorCode: '#C2071A',
    isActive: true
  })

  // Assignment form states
  const [assignType, setAssignType] = useState('employees')
  const [assignmentMode, setAssignmentMode] = useState('permanent')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [effectiveTo, setEffectiveTo] = useState('')

  useEffect(() => {
    fetchShifts()
    loadAssignmentMetadata()
  }, [fetchShifts, loadAssignmentMetadata])

  const handleOpenCreate = () => {
    setEditingShift(null)
    setCrudForm({
      shiftName: '',
      shiftCode: '',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      earlyExitGraceMinutes: 5,
      minimumHours: 8.0,
      colorCode: '#C2071A',
      isActive: true
    })
    setModalError('')
    setIsCrudModalOpen(true)
  }

  const handleOpenEdit = (shift) => {
    setEditingShift(shift)
    const start = shift.start_time ? shift.start_time.substring(0, 5) : '09:00'
    const end = shift.end_time ? shift.end_time.substring(0, 5) : '18:00'

    setCrudForm({
      shiftName: shift.shift_name,
      shiftCode: shift.shift_code,
      startTime: start,
      endTime: end,
      graceMinutes: parseInt(shift.grace_minutes, 10) || 0,
      earlyExitGraceMinutes: parseInt(shift.early_exit_grace_minutes, 10) || 0,
      minimumHours: parseFloat(shift.minimum_hours) || 8.0,
      colorCode: shift.color_code || '#C2071A',
      isActive: shift.is_active
    })
    setModalError('')
    setIsCrudModalOpen(true)
  }

  const handleOpenAssign = (shift) => {
    setAssigningShift(shift)
    setSelectedEmployees([])
    setSelectedDepartments([])
    setEffectiveFrom(new Date().toISOString().split('T')[0])
    setEffectiveTo('')
    setAssignmentMode('permanent')
    setAssignType('employees')
    setModalError('')
    setIsAssignModalOpen(true)
  }

  const handleCrudSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    try {
      if (editingShift) {
        await updateShift(editingShift.shift_id, crudForm)
      } else {
        await createShift(crudForm)
      }
      setIsCrudModalOpen(false)
    } catch (err) {
      setModalError(err.message || 'Action failed.')
    }
  }

  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    try {
      if (assignmentMode === 'temporary') {
        if (!effectiveTo) {
          setModalError('Please select Effective To date for temporary assignment.')
          return
        }
        if (effectiveTo < effectiveFrom) {
          setModalError('Effective To date cannot be earlier than Effective From date.')
          return
        }
      }

      const payload = {
        effectiveFrom,
        effectiveTo: assignmentMode === 'temporary' ? effectiveTo : null,
        isTemporary: assignmentMode === 'temporary',
        employeeIds: assignType === 'employees' ? selectedEmployees : [],
        departmentIds: assignType === 'departments' ? selectedDepartments : []
      }

      if (assignType === 'employees' && selectedEmployees.length === 0) {
        setModalError('Select at least one employee.')
        return
      }
      if (assignType === 'departments' && selectedDepartments.length === 0) {
        setModalError('Select at least one department.')
        return
      }

      await assignShift(assigningShift.shift_id, payload)
      setIsAssignModalOpen(false)
    } catch (err) {
      setModalError(err.message || 'Assignment failed.')
    }
  }

  const handleDelete = async (shift) => {
    if (window.confirm(`Are you sure you want to delete shift "${shift.shift_name}"?`)) {
      try {
        await deleteShift(shift.shift_id)
      } catch (err) {
        alert(err.message || 'Failed to delete shift.')
      }
    }
  }

  const handleToggle = async (shift) => {
    try {
      await toggleShiftStatus(shift.shift_id, !shift.is_active)
    } catch (err) {
      alert(err.message || 'Failed to toggle status.')
    }
  }

  const filteredShifts = useMemo(() => {
    if (!search) return shifts
    const q = search.toLowerCase()
    return shifts.filter(s =>
      s.shift_name.toLowerCase().includes(q) ||
      (s.shift_code || '').toLowerCase().includes(q)
    )
  }, [shifts, search])

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / PAGE_SIZE))
  const paginatedShifts = filteredShifts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="shifts-schedules" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Header */}
          <PageHeader
            icon={FiClock}
            title="Shifts & Schedules"
            subtitle="Configure work shifts, grace periods, minimum hours, and assign schedules"
            actions={
              <button
                onClick={handleOpenCreate}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                  color: '#ffffff', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <AddIcon size={20} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Create Shift</span>
              </button>
            }
          />

          {/* Container Card */}
          <div style={{
            background: '#ffffff', border: 'none', borderRadius: '16px',
            padding: '24px', boxShadow: cardShadow
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search shift name or code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: '34px', padding: '8px 12px 8px 34px',
                    borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc',
                    fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <span style={{
                background: '#FEECEE', color: '#C2071A', padding: '5px 14px',
                borderRadius: 20, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.02em',
              }}>
                {filteredShifts.length} Shift Configurations
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shift Name</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shift Hours</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grace Period</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingShifts ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading shifts...</td></tr>
                  ) : paginatedShifts.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No shift configurations found.</td></tr>
                  ) : paginatedShifts.map((shift, i) => (
                    <tr key={shift.shift_id} style={{ borderBottom: '1px solid #edf2f7', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                        <Link to={`/client-admin/attendance/shifts-schedules/${shift.shift_id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                          {shift.shift_name}
                        </Link>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <CodeBadge code={shift.shift_code} />
                      </td>
                      <td style={{ padding: '14px 16px', color: '#1e293b', fontWeight: 600 }}>
                        {shift.start_time ? shift.start_time.substring(0, 5) : '—'} - {shift.end_time ? shift.end_time.substring(0, 5) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>
                        {shift.grace_minutes || 0} mins
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          onClick={() => handleToggle(shift)}
                          style={{
                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                            background: shift.is_active ? '#e8fbf0' : '#feecee',
                            color: shift.is_active ? '#0fa958' : '#dc2626'
                          }}
                        >
                          {shift.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => handleOpenAssign(shift)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#e0f2fe', color: '#0284c7', cursor: 'pointer' }}>
                            <FiUsers size={14} />
                          </button>
                          <button onClick={() => handleOpenEdit(shift)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer' }}>
                            <FiEdit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(shift)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#feecee', color: '#dc2626', cursor: 'pointer' }}>
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </div>

      {/* CRUD Modal */}
      {isCrudModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}
              </h3>
              <button onClick={() => setIsCrudModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><FiX size={18} /></button>
            </div>

            {modalError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#feecee', color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCrudSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Name *</label>
                  <input type="text" value={crudForm.shiftName} onChange={e => setCrudForm({ ...crudForm, shiftName: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Code *</label>
                  <input type="text" value={crudForm.shiftCode} onChange={e => setCrudForm({ ...crudForm, shiftCode: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Time *</label>
                  <input type="time" value={crudForm.startTime} onChange={e => setCrudForm({ ...crudForm, startTime: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>End Time *</label>
                  <input type="time" value={crudForm.endTime} onChange={e => setCrudForm({ ...crudForm, endTime: e.target.value })} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Late Grace (Mins)</label>
                  <input type="number" value={crudForm.graceMinutes} onChange={e => setCrudForm({ ...crudForm, graceMinutes: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Minimum Hours</label>
                  <input type="number" step="0.5" value={crudForm.minimumHours} onChange={e => setCrudForm({ ...crudForm, minimumHours: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsCrudModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)' }}>
                  {editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Assign "{assigningShift?.shift_name}"
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><FiX size={18} /></button>
            </div>

            {modalError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#feecee', color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
                <button type="button" onClick={() => setAssignType('employees')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: assignType === 'employees' ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : 'transparent', color: assignType === 'employees' ? '#ffffff' : '#64748b', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  Employees
                </button>
                <button type="button" onClick={() => setAssignType('departments')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: assignType === 'departments' ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : 'transparent', color: assignType === 'departments' ? '#ffffff' : '#64748b', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  Departments
                </button>
              </div>

              {assignType === 'employees' ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Select Employees *</label>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    {metadataEmployees.map(e => (
                      <label key={e.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', fontSize: '13px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(e.employee_id)}
                          onChange={ev => {
                            if (ev.target.checked) setSelectedEmployees(p => [...p, e.employee_id])
                            else setSelectedEmployees(p => p.filter(id => id !== e.employee_id))
                          }}
                        />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{e.first_name} {e.last_name}</span>
                        <CodeBadge code={e.employee_code} />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Select Departments *</label>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    {metadataDepartments.map(d => (
                      <label key={d.department_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', fontSize: '13px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(d.department_id)}
                          onChange={ev => {
                            if (ev.target.checked) setSelectedDepartments(p => [...p, d.department_id])
                            else setSelectedDepartments(p => p.filter(id => id !== d.department_id))
                          }}
                        />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{d.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Effective From Date</label>
                <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)' }}>
                  Assign Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
