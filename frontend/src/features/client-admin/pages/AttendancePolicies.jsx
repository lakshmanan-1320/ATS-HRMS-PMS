import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'
import {
  FiSettings, FiPlus, FiEdit2, FiTrash2, FiEye,
  FiSearch, FiX, FiCheckCircle, FiXCircle, FiFilter,
  FiAlertCircle, FiLoader, FiUserPlus, FiMapPin, FiClock, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'

const PAGE_SIZE = 10
const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

const TYPE_BADGE = {
  OFFICE: { bg: '#e0f2fe', color: '#0284c7' },
  REMOTE: { bg: '#e8fbf0', color: '#0fa958' },
  HYBRID: { bg: '#f3e8ff', color: '#7c3aed' },
}

function CodeBadge({ code }) {
  if (!code || code === '—') return <span style={{ color: '#94a3b8' }}>—</span>
  return (
    <span style={{
      background: '#F1F4F8', color: '#33415C', padding: '3px 8px',
      borderRadius: 6, fontSize: 11.5, fontWeight: 700, fontFamily: 'monospace',
      border: '1px solid #E3E7EE', letterSpacing: '0.03em', display: 'inline-block'
    }}>
      {code}
    </span>
  )
}

export default function AttendancePolicies() {
  const navigate = useNavigate()
  
  const {
    policies,
    loading,
    metadataDepartments,
    metadataEmployees,
    officeLocations,
    fetchPolicies,
    loadAssignmentMetadata,
    fetchOfficeLocations,
    createPolicy,
    updatePolicy,
    deletePolicy,
    togglePolicyStatus,
    assignPolicy
  } = useAttendanceStore()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  // Policy Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [policyType, setPolicyType] = useState('OFFICE')
  const [description, setDescription] = useState('')
  const [enableLocation, setEnableLocation] = useState(false)
  const [enableShift, setEnableShift] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [selectedOfficeLocationIds, setSelectedOfficeLocationIds] = useState([])
  const [enableLateArrivalLop, setEnableLateArrivalLop] = useState(false)
  const [lateArrivalsLimit, setLateArrivalsLimit] = useState(3)
  const [lopDaysDeduction, setLopDaysDeduction] = useState('1.0')

  // Assignment Modal
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningPolicy, setAssigningPolicy] = useState(null)
  const [assignMode, setAssignMode] = useState('DEPARTMENT')
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [policyAssignedDeptIds, setPolicyAssignedDeptIds] = useState([])
  const [policyAssignedEmpIds, setPolicyAssignedEmpIds] = useState([])

  const [empSearch, setEmpSearch] = useState('')

  useEffect(() => {
    fetchPolicies()
    loadAssignmentMetadata()
    fetchOfficeLocations()
  }, [])

  function handleOpenCreate() {
    setEditingPolicy(null)
    setName('')
    setPolicyType('OFFICE')
    setDescription('')
    setEnableLocation(false)
    setEnableShift(false)
    setIsActive(true)
    setSelectedOfficeLocationIds([])
    setEnableLateArrivalLop(false)
    setLateArrivalsLimit(3)
    setLopDaysDeduction('1.0')
    setFormError('')
    setFormSaving(false)
    setModalOpen(true)
  }

  function handleOpenEdit(p) {
    setEditingPolicy(p)
    setName(p.name)
    setPolicyType(p.policy_type)
    setDescription(p.description || '')
    setEnableLocation(p.enable_location_validation)
    setEnableShift(p.enable_shift_validation)
    setIsActive(p.is_active)
    setSelectedOfficeLocationIds(p.office_location_ids || [])
    setEnableLateArrivalLop(!!p.enable_late_arrival_lop)
    setLateArrivalsLimit(p.late_arrivals_threshold || 3)
    setLopDaysDeduction(String(p.lop_days_per_threshold ?? '1.0'))
    setFormError('')
    setFormSaving(false)
    setModalOpen(true)
  }

  async function handleOpenAssign(p) {
    setAssigningPolicy(p)
    setAssignMode('DEPARTMENT')
    setSelectedDeptId('')
    setSelectedEmployeeIds([])
    setEffectiveFrom(new Date().toISOString().slice(0, 10))
    setAssignError('')
    setAssignSaving(false)
    setEmpSearch('')
    setPolicyAssignedDeptIds([])
    setPolicyAssignedEmpIds([])
    setAssignOpen(true)

    try {
      const token = sessionStorage.getItem('sa_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [dRes, mRes] = await Promise.all([
        axios.get(`/api/attendance/policies/${p.attendance_policy_id}/departments`, { headers }),
        axios.get(`/api/attendance/policies/${p.attendance_policy_id}/members`, { headers })
      ])
      setPolicyAssignedDeptIds((dRes.data?.data || []).map(d => d.department_id))
      setPolicyAssignedEmpIds((mRes.data?.data || []).map(m => m.employee_id))
    } catch (err) {
      console.error('Failed to load existing policy assignments:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setFormError('Policy name is required.')
    
    setFormSaving(true)
    setFormError('')

    const payload = {
      name,
      policy_type: policyType,
      description,
      enable_location_validation: enableLocation,
      enable_shift_validation: enableShift,
      is_active: isActive,
      office_location_ids: selectedOfficeLocationIds,
      enable_late_arrival_lop: enableLateArrivalLop,
      late_arrivals_threshold: enableLateArrivalLop ? Number(lateArrivalsLimit) : 3,
      lop_days_per_threshold: enableLateArrivalLop ? Number(lopDaysDeduction) : 1.0
    }

    try {
      if (editingPolicy) {
        await updatePolicy(editingPolicy.attendance_policy_id, payload)
      } else {
        await createPolicy(payload)
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save policy.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleAssignSubmit(e) {
    e.preventDefault()
    if (assignMode === 'DEPARTMENT' && !selectedDeptId) {
      return setAssignError('Please select a department.')
    }
    if (assignMode === 'EMPLOYEE' && selectedEmployeeIds.length === 0) {
      return setAssignError('Please select at least one employee.')
    }

    setAssignSaving(true)
    setAssignError('')

    const payload = {
      assignment_type: assignMode,
      department_id: assignMode === 'DEPARTMENT' ? selectedDeptId : undefined,
      employee_ids: assignMode === 'EMPLOYEE' ? selectedEmployeeIds : undefined,
      effective_from: effectiveFrom
    }

    try {
      await assignPolicy(assigningPolicy.attendance_policy_id, payload)
      setAssignOpen(false)
    } catch (err) {
      setAssignError(err.message || err.response?.data?.message || 'Failed to assign policy.')
    } finally {
      setAssignSaving(false)
    }
  }

  async function handleDelete(p) {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"?`)) return
    try {
      await deletePolicy(p.attendance_policy_id)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete policy.')
    }
  }

  async function handleToggleStatus(p) {
    try {
      await togglePolicyStatus(p.attendance_policy_id, !p.is_active)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status.')
    }
  }

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      if (typeFilter && p.policy_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [policies, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE))
  const paginatedPolicies = filteredPolicies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const filteredEmpMetadata = useMemo(() => {
    if (!empSearch) return metadataEmployees
    const q = empSearch.toLowerCase()
    return metadataEmployees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_code || '').toLowerCase().includes(q)
    )
  }, [metadataEmployees, empSearch])

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="attendance-policies" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div className="pms-content" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Header */}
          <PageHeader
            icon={FiSettings}
            title="Attendance Policies"
            subtitle="Configure rules, geofence, shifts, and assign policy coverage across teams"
            actions={
              <button
                onClick={handleOpenCreate}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '9px 18px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
                  color: '#ffffff', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <AddIcon size={20} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Create Policy</span>
              </button>
            }
          />

          {/* Card Container */}
          <div style={{
            background: '#ffffff', border: 'none', borderRadius: '16px',
            padding: '24px', boxShadow: cardShadow
          }}>
            
            {/* Filter controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: '34px', padding: '8px 12px 8px 34px',
                    borderRadius: '10px', border: '1.5px solid #E3E7EE', background: '#f8fafc',
                    fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #E3E7EE', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  <option value="">All Types</option>
                  <option value="OFFICE">Office</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
                <span style={{
                  background: '#EEF8FF', color: '#0466C8', padding: '5px 14px',
                  borderRadius: 20, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.02em',
                }}>
                  {filteredPolicies.length} Policies
                </span>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid #E3E7EE', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Policy Name</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Validations</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Late LOP Rule</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#7D8597' }}>Loading policies...</td></tr>
                  ) : paginatedPolicies.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No attendance policies found.</td></tr>
                  ) : paginatedPolicies.map((p, i) => {
                    const badge = TYPE_BADGE[p.policy_type] || TYPE_BADGE.OFFICE
                    return (
                      <tr
                        key={p.attendance_policy_id}
                        style={{ borderBottom: '1px solid #edf2f7', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F1F4F8'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#fafafa'}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#001233' }}>
                          {p.name}
                          {p.description && <span style={{ fontSize: '11px', color: '#7D8597', display: 'block', fontWeight: 400 }}>{p.description}</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: badge.bg, color: badge.color }}>
                            {p.policy_type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#33415C' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {p.enable_location_validation && <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>Geofence</span>}
                            {p.enable_shift_validation && <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>Shift</span>}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                          {p.enable_late_arrival_lop ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>{p.late_arrivals_threshold} Late = {p.lop_days_per_threshold} LOP</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Disabled</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            onClick={() => handleToggleStatus(p)}
                            style={{
                              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              background: p.is_active ? '#e8fbf0' : '#EEF8FF',
                              color: p.is_active ? '#0fa958' : '#dc2626'
                            }}
                          >
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              title="View Policy Details"
                              onClick={() => navigate(`/client-admin/attendance/policies/${p.attendance_policy_id}`)}
                              style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#F1F4F8', color: '#33415C', cursor: 'pointer' }}
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              title="Assign Coverage"
                              onClick={() => handleOpenAssign(p)}
                              style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#e0f2fe', color: '#0284c7', cursor: 'pointer' }}
                            >
                              <FiUserPlus size={14} />
                            </button>
                            <button
                              title="Edit Policy"
                              onClick={() => handleOpenEdit(p)}
                              style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer' }}
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              title="Delete Policy"
                              onClick={() => handleDelete(p)}
                              style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#EEF8FF', color: '#dc2626', cursor: 'pointer' }}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: 600 }}>Page {page} of {totalPages}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#F1F4F8', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                    <FiChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#F1F4F8', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Create / Edit Policy */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', width: '540px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#001233' }}>
                {editingPolicy ? 'Edit Attendance Policy' : 'Create Attendance Policy'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#7D8597', cursor: 'pointer' }}><FiX size={18} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#EEF8FF', color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#33415C', display: 'block', marginBottom: '4px' }}>Policy Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E3E7EE', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#33415C', display: 'block', marginBottom: '4px' }}>Policy Format</label>
                <select value={policyType} onChange={e => setPolicyType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E3E7EE', fontSize: '13px' }}>
                  <option value="OFFICE">Office</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#33415C', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E3E7EE', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={enableLocation} onChange={e => setEnableLocation(e.target.checked)} />
                  Enable Geofence Validation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={enableShift} onChange={e => setEnableShift(e.target.checked)} />
                  Enable Shift Validation
                </label>
              </div>

              {/* Late Arrival LOP Rules */}
              <div style={{ borderTop: '1px solid #E3E7EE', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#001233', cursor: 'pointer', marginBottom: '12px' }}>
                  <input type="checkbox" checked={enableLateArrivalLop} onChange={e => setEnableLateArrivalLop(e.target.checked)} />
                  Enable Late Arrival LOP Deduction
                </label>

                {enableLateArrivalLop && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#33415C' }}>Late Arrivals Count</label>
                      <input type="number" min="1" max="30" value={lateArrivalsLimit} onChange={e => setLateArrivalsLimit(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#33415C' }}>LOP Days Deducted</label>
                      <select value={lopDaysDeduction} onChange={e => setLopDaysDeduction(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '4px' }}>
                        <option value="0.5">0.5 Day LOP</option>
                        <option value="1.0">1.0 Day LOP</option>
                        <option value="1.5">1.5 Days LOP</option>
                        <option value="2.0">2.0 Days LOP</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#F1F4F8', color: '#33415C', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={formSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)' }}>
                  {formSaving ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Policy Coverage */}
      {assignOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#001233' }}>
                Assign "{assigningPolicy?.name}"
              </h3>
              <button onClick={() => setAssignOpen(false)} style={{ background: 'none', border: 'none', color: '#7D8597', cursor: 'pointer' }}><FiX size={18} /></button>
            </div>

            {assignError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#EEF8FF', color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
                <button type="button" onClick={() => setAssignMode('DEPARTMENT')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: assignMode === 'DEPARTMENT' ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : 'transparent', color: assignMode === 'DEPARTMENT' ? '#ffffff' : '#7D8597', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  Department Wise
                </button>
                <button type="button" onClick={() => setAssignMode('EMPLOYEE')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: assignMode === 'EMPLOYEE' ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : 'transparent', color: assignMode === 'EMPLOYEE' ? '#ffffff' : '#7D8597', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  Employee Wise
                </button>
              </div>

              {assignMode === 'DEPARTMENT' ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#33415C', display: 'block', marginBottom: '4px' }}>Select Department *</label>
                  <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E3E7EE', fontSize: '13px' }}>
                    <option value="">Choose department</option>
                    {metadataDepartments.map(d => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.name} {policyAssignedDeptIds.includes(d.department_id) ? '(Assigned)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#33415C', display: 'block', marginBottom: '6px' }}>Select Employees *</label>
                  <input type="text" placeholder="Search employees..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E3E7EE', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }} />
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E3E7EE', borderRadius: '8px', padding: '8px' }}>
                    {filteredEmpMetadata.map(e => (
                      <label key={e.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', fontSize: '13px', borderBottom: '1px solid #F1F4F8', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(e.employee_id)}
                          onChange={ev => {
                            if (ev.target.checked) setSelectedEmployeeIds(p => [...p, e.employee_id])
                            else setSelectedEmployeeIds(p => p.filter(id => id !== e.employee_id))
                          }}
                        />
                        <span style={{ fontWeight: 600, color: '#001233' }}>{e.first_name} {e.last_name}</span>
                        <CodeBadge code={e.employee_code} />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#33415C', display: 'block', marginBottom: '4px' }}>Effective From Date</label>
                <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E3E7EE', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setAssignOpen(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#F1F4F8', color: '#33415C', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={assignSaving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)' }}>
                  {assignSaving ? 'Assigning...' : 'Assign Coverage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
