import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiUsers, FiInfo, FiCheck, FiX, FiSettings, FiCalendar } from 'react-icons/fi'

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

  // Form states
  const [crudForm, setCrudForm] = useState({
    shiftName: '',
    shiftCode: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    earlyExitGraceMinutes: 5,
    minimumHours: 8.0,
    colorCode: '#3b82f6',
    isActive: true
  })

  // Assignment form states
  const [assignType, setAssignType] = useState('employees') // 'employees' or 'departments'
  const [assignmentMode, setAssignmentMode] = useState('permanent') // 'permanent' or 'temporary'
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [effectiveTo, setEffectiveTo] = useState('')

  useEffect(() => {
    fetchShifts()
    loadAssignmentMetadata()
  }, [fetchShifts, loadAssignmentMetadata])

  // Open creation modal
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
      colorCode: '#3b82f6',
      isActive: true
    })
    setModalError('')
    setIsCrudModalOpen(true)
  }

  // Open edit modal
  const handleOpenEdit = (shift) => {
    setEditingShift(shift)
    // start_time / end_time are usually returned as "09:00:00". Strip seconds for time input
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
      colorCode: shift.color_code || '#3b82f6',
      isActive: shift.is_active
    })
    setModalError('')
    setIsCrudModalOpen(true)
  }

  // Open assign modal
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

  // Handle CRUD submit
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

  // Handle Assign submit
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
        setModalError('Please select at least one employee.')
        return
      }
      if (assignType === 'departments' && selectedDepartments.length === 0) {
        setModalError('Please select at least one department.')
        return
      }

      await assignShift(assigningShift.shift_id, payload)
      setIsAssignModalOpen(false)
      fetchShifts()
    } catch (err) {
      setModalError(err.message || 'Assignment failed.')
    }
  }

  // Delete shift handler
  const handleDeleteShift = async (shift) => {
    if (shift.assigned_employees_count > 0) {
      alert(`Cannot delete shift "${shift.shift_name}" because it is currently assigned to ${shift.assigned_employees_count} active employees. Please reassign them first.`)
      return
    }
    if (!window.confirm(`Are you sure you want to delete the shift "${shift.shift_name}"?`)) return
    try {
      await deleteShift(shift.shift_id)
    } catch (err) {
      alert(err.message || 'Failed to delete shift.')
    }
  }

  // Toggle active status
  const handleToggleStatus = async (shift) => {
    try {
      await toggleShiftStatus(shift.shift_id, !shift.is_active)
    } catch (err) {
      alert(err.message || 'Failed to toggle status.')
    }
  }

  const colorSwatches = [
    { label: 'Blue', hex: '#3b82f6' },
    { label: 'Purple', hex: '#8b5cf6' },
    { label: 'Green', hex: '#10b981' },
    { label: 'Orange', hex: '#f59e0b' },
    { label: 'Teal', hex: '#14b8a6' },
    { label: 'Pink', hex: '#ec4899' }
  ]

  // Time format helper (e.g. converts "09:00:00" to "09:00 AM")
  const formatTimeStr = (t) => {
    if (!t) return '—'
    const parts = t.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`
  }

  // Styles object
  const s = {
    container: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '"Outfit", "Inter", sans-serif' },
    content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    pageBody: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
    subTitle: { fontSize: 13, color: '#64748b', margin: 0, marginTop: 4, fontWeight: 500 },
    createBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#818cf8)',
      color: '#fff', border: 'none', borderRadius: 12,
      fontSize: 13, fontWeight: 700, cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)', transition: 'all 0.15s'
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 32 },
    card: {
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
      padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex',
      flexDirection: 'column', position: 'relative', transition: 'all 0.15s'
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    colorTag: (c) => ({ width: 12, height: 12, borderRadius: '50%', background: c, marginRight: 8 }),
    shiftCode: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: 8 },
    shiftName: { fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center' },
    metaRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', marginBottom: 8 },
    metaValue: { fontWeight: 600, color: '#1e293b' },
    cardDivider: { height: 1, background: '#f1f5f9', margin: '14px 0' },
    cardActions: { display: 'flex', gap: 10, marginTop: 'auto' },
    secondaryBtn: {
      flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 10,
      background: '#fff', color: '#334155', fontSize: 12, fontWeight: 700,
      textAlign: 'center', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s'
    },
    actionIconBtn: (color) => ({
      padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 10,
      background: '#fff', color: color || '#334155', fontSize: 14, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
    }),
    badge: (active) => ({
      fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
      background: active ? '#dcfce7' : '#fee2e2', color: active ? '#15803d' : '#b91c1c',
      cursor: 'pointer', border: 'none'
    }),
    // Modal Overlay
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: 20
    },
    modal: {
      background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column'
    },
    modalHeader: {
      padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    modalBody: { padding: '24px', overflowY: 'auto', maxHeight: '70vh' },
    modalFooter: {
      padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
      display: 'flex', justifyContent: 'flex-end', gap: 12
    },
    formGroup: { marginBottom: 16 },
    label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 },
    input: {
      width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 10,
      fontSize: 13, outline: 'none', color: '#1e293b', boxSizing: 'border-box',
      fontFamily: 'inherit', transition: 'border-color 0.15s'
    },
    select: {
      width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 10,
      fontSize: 13, outline: 'none', color: '#1e293b', boxSizing: 'border-box',
      background: '#fff', cursor: 'pointer', fontFamily: 'inherit'
    },
    checkboxList: {
      maxHeight: 180, overflowY: 'auto', border: '1px solid #cbd5e1',
      borderRadius: 10, padding: 8, background: '#f8fafc'
    },
    checkboxItem: {
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
      fontSize: 13, color: '#334155', cursor: 'pointer', borderRadius: 6
    },
    tabBtn: (active) => ({
      flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 700, borderRadius: 8, transition: 'all 0.15s',
      background: active ? '#fff' : 'transparent',
      color: active ? '#6366f1' : '#64748b',
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
    }),
    comingSoonCard: {
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none', borderRadius: 16,
      padding: 24, boxShadow: '0 4px 20px rgba(15,23,42,0.15)', color: '#94a3b8',
      display: 'flex', flexDirection: 'column', justifyContent: 'center'
    }
  }

  return (
    <div style={s.container}>
      <ClientAdminSidebar active="shifts-schedules" />

      <div style={s.content}>
        <ClientAdminTopBar />

        <div style={s.pageBody}>
          {/* Header */}
          <div style={s.header}>
            <div>
              <h1 style={s.title}>Shifts & Schedules</h1>
              <p style={s.subTitle}>Configure working shifts, assign rules, and view employee schedules.</p>
            </div>
            <button
              id="create-shift-btn"
              onClick={handleOpenCreate}
              style={s.createBtn}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              <FiPlus size={16} /> Create Shift
            </button>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, color: '#b91c1c', fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {loadingShifts ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: 12, fontWeight: 500, fontSize: 14 }}>Loading configured shifts...</p>
            </div>
          ) : (
            <div style={s.grid}>
              {shifts.map(shift => (
                <div key={shift.shift_id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={s.colorTag(shift.color_code)} />
                      <h3 style={s.shiftName}>{shift.shift_name}</h3>
                    </div>
                    <span style={s.shiftCode}>{shift.shift_code}</span>
                  </div>

                  <div style={s.metaRow}>
                    <FiClock size={14} color="#64748b" />
                    <span>Timing: <strong style={s.metaValue}>{formatTimeStr(shift.start_time)} - {formatTimeStr(shift.end_time)}</strong></span>
                  </div>

                  <div style={s.metaRow}>
                    <FiInfo size={14} color="#64748b" />
                    <span>Grace Period: <strong style={s.metaValue}>{shift.grace_minutes} Minutes</strong></span>
                  </div>

                  <div style={s.metaRow}>
                    <FiInfo size={14} color="#64748b" />
                    <span>Early Exit Limit: <strong style={s.metaValue}>{shift.early_exit_grace_minutes} Minutes</strong></span>
                  </div>

                  <div style={s.metaRow}>
                    <FiUsers size={14} color="#64748b" />
                    <span>Assigned: <strong style={s.metaValue}>{shift.assigned_employees_count} active employees</strong></span>
                  </div>

                  <div style={s.cardDivider} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Shift Status:</span>
                    <button
                      id={`status-toggle-${shift.shift_id}`}
                      onClick={() => handleToggleStatus(shift)}
                      style={s.badge(shift.is_active)}
                    >
                      {shift.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div style={s.cardActions}>
                    <Link
                      id={`view-details-${shift.shift_id}`}
                      to={`/client-admin/attendance/shifts-schedules/${shift.shift_id}`}
                      style={s.secondaryBtn}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155' }}
                    >
                      View Details
                    </Link>

                    <button
                      id={`assign-shift-btn-${shift.shift_id}`}
                      onClick={() => handleOpenAssign(shift)}
                      style={{
                        ...s.secondaryBtn,
                        borderColor: '#6366f1',
                        color: '#6366f1',
                        background: '#eef2ff'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = 0.85 }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = 1 }}
                    >
                      Assign
                    </button>

                    <button
                      id={`edit-shift-btn-${shift.shift_id}`}
                      onClick={() => handleOpenEdit(shift)}
                      style={s.actionIconBtn('#475569')}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569' }}
                    >
                      <FiEdit2 size={13} />
                    </button>

                    <button
                      id={`delete-shift-btn-${shift.shift_id}`}
                      onClick={() => handleDeleteShift(shift)}
                      style={s.actionIconBtn('#ef4444')}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = '#fef2f2' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fff' }}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}


            </div>
          )}
        </div>
      </div>

      {/* CRUD MODAL */}
      {isCrudModalOpen && (
        <div style={s.overlay}>
          <form style={s.modal} onSubmit={handleCrudSubmit}>
            <div style={s.modalHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}
              </h3>
              <button
                type="button"
                id="close-crud-modal-btn"
                onClick={() => setIsCrudModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div style={s.modalBody}>
              {modalError && (
                <div style={{ padding: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#b91c1c', fontSize: 12, marginBottom: 14, fontWeight: 600 }}>
                  {modalError}
                </div>
              )}

              <div style={s.formGroup}>
                <label style={s.label}>Shift Name *</label>
                <input
                  id="shift-name-input"
                  type="text"
                  required
                  placeholder="e.g. General Shift"
                  value={crudForm.shiftName}
                  onChange={e => setCrudForm(prev => ({ ...prev, shiftName: e.target.value }))}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Shift Code * (Descriptive tag in logs)</label>
                <input
                  id="shift-code-input"
                  type="text"
                  required
                  placeholder="e.g. GEN, NIGHT"
                  value={crudForm.shiftCode}
                  onChange={e => setCrudForm(prev => ({ ...prev, shiftCode: e.target.value }))}
                  style={s.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Start Time *</label>
                  <input
                    id="shift-start-time"
                    type="time"
                    required
                    value={crudForm.startTime}
                    onChange={e => setCrudForm(prev => ({ ...prev, startTime: e.target.value }))}
                    style={s.input}
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>End Time *</label>
                  <input
                    id="shift-end-time"
                    type="time"
                    required
                    value={crudForm.endTime}
                    onChange={e => setCrudForm(prev => ({ ...prev, endTime: e.target.value }))}
                    style={s.input}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Grace Minutes *</label>
                  <input
                    id="shift-grace-minutes"
                    type="number"
                    min="0"
                    required
                    value={crudForm.graceMinutes}
                    onChange={e => setCrudForm(prev => ({ ...prev, graceMinutes: parseInt(e.target.value, 10) || 0 }))}
                    style={s.input}
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Early Exit Grace * (mins)</label>
                  <input
                    id="shift-early-exit-grace"
                    type="number"
                    min="0"
                    required
                    value={crudForm.earlyExitGraceMinutes}
                    onChange={e => setCrudForm(prev => ({ ...prev, earlyExitGraceMinutes: parseInt(e.target.value, 10) || 0 }))}
                    style={s.input}
                  />
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Minimum Hours Required (will be used in Phase 5)</label>
                <input
                  id="shift-minimum-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  required
                  value={crudForm.minimumHours}
                  onChange={e => setCrudForm(prev => ({ ...prev, minimumHours: parseFloat(e.target.value) || 8.0 }))}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Shift Color Theme</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {colorSwatches.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCrudForm(prev => ({ ...prev, colorCode: c.hex }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c.hex,
                        border: crudForm.colorCode === c.hex ? '3px solid #0f172a' : '1px solid #cbd5e1',
                        cursor: 'pointer', transform: crudForm.colorCode === c.hex ? 'scale(1.1)' : 'none',
                        transition: 'all 0.15s'
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <input
                  id="shift-status-checkbox"
                  type="checkbox"
                  checked={crudForm.isActive}
                  onChange={e => setCrudForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="shift-status-checkbox" style={{ fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  Mark this shift as Active
                </label>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button
                type="button"
                id="cancel-crud-btn"
                onClick={() => setIsCrudModalOpen(false)}
                style={{ ...s.secondaryBtn, flex: 'none', width: 90 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-crud-btn"
                style={{
                  ...s.createBtn,
                  padding: '9px 20px',
                  boxShadow: 'none',
                  fontSize: 13
                }}
              >
                {editingShift ? 'Save Changes' : 'Create Shift'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ASSIGNMENT MODAL */}
      {isAssignModalOpen && (
        <div style={s.overlay}>
          <form style={s.modal} onSubmit={handleAssignSubmit}>
            <div style={s.modalHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Assign "{assigningShift?.shift_name}"
              </h3>
              <button
                type="button"
                id="close-assign-modal-btn"
                onClick={() => setIsAssignModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div style={s.modalBody}>
              {modalError && (
                <div style={{ padding: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#b91c1c', fontSize: 12, marginBottom: 14, fontWeight: 600 }}>
                  {modalError}
                </div>
              )}

              {/* Assignment Switch */}
              <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 16 }}>
                <button
                  type="button"
                  id="assign-switch-employees"
                  onClick={() => setAssignType('employees')}
                  style={s.tabBtn(assignType === 'employees')}
                >
                  Employees
                </button>
                <button
                  type="button"
                  id="assign-switch-departments"
                  onClick={() => setAssignType('departments')}
                  style={s.tabBtn(assignType === 'departments')}
                >
                  Departments
                </button>
              </div>

              {/* Assignment Mode Toggle */}
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Assignment Mode</label>
                <div style={{ display: 'flex', gap: 20, marginTop: 8, background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: assignmentMode === 'permanent' ? '#4f46e5' : '#475569', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="assignmentMode"
                      value="permanent"
                      checked={assignmentMode === 'permanent'}
                      onChange={() => {
                        setAssignmentMode('permanent')
                        setEffectiveTo('')
                      }}
                      style={{ accentColor: '#4f46e5' }}
                    />
                    <span>● Permanent Assignment</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: assignmentMode === 'temporary' ? '#d97706' : '#475569', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="assignmentMode"
                      value="temporary"
                      checked={assignmentMode === 'temporary'}
                      onChange={() => setAssignmentMode('temporary')}
                      style={{ accentColor: '#d97706' }}
                    />
                    <span>○ Temporary Assignment</span>
                  </label>
                </div>
              </div>

              {/* Date Inputs */}
              {assignmentMode === 'permanent' ? (
                <div style={s.formGroup}>
                  <label style={s.label}>Effective From *</label>
                  <input
                    id="shift-assign-effective-from"
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={e => setEffectiveFrom(e.target.value)}
                    style={s.input}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={s.label}>Effective From *</label>
                    <input
                      id="shift-assign-effective-from"
                      type="date"
                      required
                      value={effectiveFrom}
                      onChange={e => setEffectiveFrom(e.target.value)}
                      style={s.input}
                    />
                  </div>
                  <div>
                    <label style={s.label}>Effective To *</label>
                    <input
                      id="shift-assign-effective-to"
                      type="date"
                      required
                      value={effectiveTo}
                      onChange={e => setEffectiveTo(e.target.value)}
                      style={s.input}
                    />
                  </div>
                </div>
              )}

              {/* Informational Info Box */}
              {assignmentMode === 'permanent' ? (
                <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, color: '#1e40af', fontSize: 12, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Permanent Shift Assignment:</strong> Setting <code>{effectiveFrom || 'Effective From'}</code> will automatically close the previous active permanent assignment on <strong>{effectiveFrom ? new Date(new Date(effectiveFrom).getTime() - 86400000).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the previous day'}</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e', fontSize: 12, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Temporary Shift Overlay:</strong> Active from <code>{effectiveFrom || 'Start'}</code> to <code>{effectiveTo || 'End'}</code>. After <strong>{effectiveTo ? new Date(effectiveTo).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Effective To'}</strong>, the system will automatically revert back to the employee's permanent shift assignment.
                  </div>
                </div>
              )}

              {/* Selection Lists */}
              {assignType === 'employees' ? (
                <div style={s.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={s.label}>Select Employees * ({selectedEmployees.length} selected)</label>
                    {metadataEmployees.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedEmployees.length === metadataEmployees.length) {
                            setSelectedEmployees([])
                          } else {
                            setSelectedEmployees(metadataEmployees.map(e => e.employee_id))
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        {selectedEmployees.length === metadataEmployees.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div style={s.checkboxList}>
                    {metadataEmployees.length === 0 ? (
                      <div style={{ padding: 10, fontSize: 12, color: '#64748b' }}>No employees found.</div>
                    ) : (
                      metadataEmployees.map(emp => {
                        const isChecked = selectedEmployees.includes(emp.employee_id)
                        return (
                          <label
                            key={emp.employee_id}
                            style={{
                              ...s.checkboxItem,
                              background: isChecked ? '#eef2ff' : 'transparent'
                            }}
                          >
                            <input
                              id={`checkbox-employee-${emp.employee_id}`}
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedEmployees(prev => prev.filter(id => id !== emp.employee_id))
                                } else {
                                  setSelectedEmployees(prev => [...prev, emp.employee_id])
                                }
                              }}
                            />
                            <span>{emp.first_name} {emp.last_name} ({emp.employee_code})</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div style={s.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={s.label}>Select Departments * ({selectedDepartments.length} selected)</label>
                    {metadataDepartments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedDepartments.length === metadataDepartments.length) {
                            setSelectedDepartments([])
                          } else {
                            setSelectedDepartments(metadataDepartments.map(d => d.department_id))
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        {selectedDepartments.length === metadataDepartments.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div style={s.checkboxList}>
                    {metadataDepartments.length === 0 ? (
                      <div style={{ padding: 10, fontSize: 12, color: '#64748b' }}>No departments found.</div>
                    ) : (
                      metadataDepartments.map(dept => {
                        const isChecked = selectedDepartments.includes(dept.department_id)
                        return (
                          <label
                            key={dept.department_id}
                            style={{
                              ...s.checkboxItem,
                              background: isChecked ? '#eef2ff' : 'transparent'
                            }}
                          >
                            <input
                              id={`checkbox-dept-${dept.department_id}`}
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedDepartments(prev => prev.filter(id => id !== dept.department_id))
                                } else {
                                  setSelectedDepartments(prev => [...prev, dept.department_id])
                                }
                              }}
                            />
                            <span>{dept.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={s.modalFooter}>
              <button
                type="button"
                id="cancel-assign-btn"
                onClick={() => setIsAssignModalOpen(false)}
                style={{ ...s.secondaryBtn, flex: 'none', width: 90 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-assign-btn"
                style={{
                  ...s.createBtn,
                  padding: '9px 20px',
                  boxShadow: 'none',
                  fontSize: 13
                }}
              >
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
