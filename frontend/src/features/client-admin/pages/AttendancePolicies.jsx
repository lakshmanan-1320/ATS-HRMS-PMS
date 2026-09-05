import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import {
  FiSettings, FiPlus, FiEdit2, FiTrash2, FiEye,
  FiSearch, FiX, FiCheckCircle, FiXCircle, FiFilter,
  FiAlertCircle, FiLoader, FiUserPlus, FiMapPin, FiClock
} from 'react-icons/fi'

const PAGE_SIZE = 10

const TYPE_BADGE = {
  OFFICE: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  REMOTE: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  HYBRID: { bg: '#faf5ff', color: '#6d28d9', border: '#e9d5ff' },
}

export default function AttendancePolicies() {
  const navigate = useNavigate()
  
  // Zustand Store
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
  const [assignMode, setAssignMode] = useState('DEPARTMENT') // DEPARTMENT | EMPLOYEE
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [policyAssignedDeptIds, setPolicyAssignedDeptIds] = useState([])
  const [policyAssignedEmpIds, setPolicyAssignedEmpIds] = useState([])

  // Search inside checklist
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
      name: name.trim(),
      policy_type: policyType,
      description: description.trim(),
      enable_location_validation: enableLocation,
      enable_shift_validation: enableShift,
      is_active: isActive,
      office_location_ids: selectedOfficeLocationIds,
      enable_late_arrival_lop: enableLateArrivalLop,
      late_arrivals_threshold: parseInt(lateArrivalsLimit) || 0,
      lop_days_per_threshold: parseFloat(lopDaysDeduction) || 0.00
    }

    try {
      if (editingPolicy) {
        await updatePolicy(editingPolicy.attendance_policy_id, payload)
      } else {
        await createPolicy(payload)
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(err.message || 'Operation failed.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = deletePolicy
  const handleToggleStatus = togglePolicyStatus

  async function handleAssignSubmit(e) {
    e.preventDefault()
    setAssignSaving(true)
    setAssignError('')

    const payload = {
      effective_from: effectiveFrom,
      department_id: assignMode === 'DEPARTMENT' ? selectedDeptId : null,
      employee_ids: assignMode === 'EMPLOYEE' ? selectedEmployeeIds : [],
    }

    if (assignMode === 'DEPARTMENT' && !selectedDeptId) {
      setAssignSaving(false)
      return setAssignError('Please select a department.')
    }

    if (assignMode === 'EMPLOYEE' && selectedEmployeeIds.length === 0) {
      setAssignSaving(false)
      return setAssignError('Please select at least one employee.')
    }

    try {
      await assignPolicy(assigningPolicy.attendance_policy_id, payload)
      setAssignOpen(false)
    } catch (err) {
      setAssignError(err.message || 'Assignment failed.')
    } finally {
      setAssignSaving(false)
    }
  }

  function handleToggleEmployeeSelection(empId) {
    setSelectedEmployeeIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  // Filtered and paginated policies
  const filtered = useMemo(() => {
    return policies.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false
      }
      if (typeFilter && p.policy_type !== typeFilter) return false
      return true
    })
  }, [policies, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const filteredEmployees = useMemo(() => {
    if (!empSearch) return metadataEmployees
    const q = empSearch.toLowerCase()
    return metadataEmployees.filter(e => 
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.employee_code || '').toLowerCase().includes(q)
    )
  }, [metadataEmployees, empSearch])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="attendance-policies" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Page Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiSettings size={18} color="#fff" />
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Attendance Policies</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Configure working formats, geofence, and validation policies for employees
              </p>
            </div>
            
            <button
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              <FiPlus size={15} /> Create Policy
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: '200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px' }}>
              <FiSearch size={13} color="#94a3b8" />
              <input
                placeholder="Search policies by name or description…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', width: '100%' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  <FiX size={12} />
                </button>
              )}
            </div>

            <select
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
            >
              <option value="">All Formats</option>
              <option value="OFFICE">Office</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
            </select>

            {(search || typeFilter) && (
              <button
                onClick={() => { setSearch(''); setTypeFilter(''); setPage(1) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}
              >
                <FiX size={11} /> Clear
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiFilter size={12} color="#94a3b8" />
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                {filtered.length} configured policy{filtered.length !== 1 ? 'ies' : ''}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading policies…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚙️</div>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>
                  No attendance policies found
                </div>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Click "Create Policy" to define a new policy schema.</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {['Policy Name', 'Format Type', 'Location Validation', 'Shift Validation', 'Assigned Count', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p, idx) => {
                      const badge = TYPE_BADGE[p.policy_type] || TYPE_BADGE.OFFICE
                      return (
                        <tr key={p.attendance_policy_id}
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{p.name}</span>
                              <span style={{ fontSize: '12px', color: '#64748b', marginTop: 2, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.description || 'No description provided'}
                              </span>
                              {p.enable_late_arrival_lop && (
                                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                  ⚠️ LOP Rule: {p.late_arrivals_threshold} Lates = {p.lop_days_per_threshold} LOP Day(s)
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', textTransform: 'uppercase', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: '0.04em' }}>
                              {p.policy_type}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {p.enable_location_validation ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontWeight: '600' }}><FiCheckCircle /> Enabled</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}><FiXCircle /> Disabled</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {p.enable_shift_validation ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontWeight: '600' }}><FiCheckCircle /> Enabled</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}><FiXCircle /> Disabled</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f172a' }}>
                            {p.usage_count} Employee{p.usage_count !== 1 ? 's' : ''}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <button
                              onClick={() => handleToggleStatus(p)}
                              style={{
                                padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: '1px solid',
                                background: p.is_active ? '#f0fdf4' : '#fef2f2',
                                color:      p.is_active ? '#15803d'  : '#b91c1c',
                                borderColor: p.is_active ? '#bbf7d0' : '#fecaca',
                              }}
                            >
                              {p.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => navigate(`/client-admin/attendance/policies/${p.attendance_policy_id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                <FiEye size={12} /> View
                              </button>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                <FiEdit2 size={11} /> Edit
                              </button>
                              <button
                                onClick={() => handleOpenAssign(p)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                <FiUserPlus size={12} /> Assign
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', border: '1px solid', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                                  background: '#fef2f2',
                                  color:      '#b91c1c',
                                  borderColor: '#fecaca',
                                  cursor: 'pointer'
                                }}
                                title={p.usage_count > 0 ? `Cannot delete policy with active members (${p.usage_count} assigned)` : ""}
                              >
                                <FiTrash2 size={11} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong style={{ color: '#374151' }}>{filtered.length}</strong> policies
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151' }}
                >‹ Prev</button>
                <button
                  disabled
                  style={{ width: '38px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >{page}</button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151' }}
                >Next ›</button>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Create / Edit Policy Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '560px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingPolicy ? <FiEdit2 size={16} color="#fff" /> : <FiPlus size={18} color="#fff" />}
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  {editingPolicy ? 'Edit Attendance Policy' : 'Create Attendance Policy'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Policy Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office Employees Policy" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Policy Format Type *</label>
                <select value={policyType} onChange={e => setPolicyType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="OFFICE">Office (In-Office Rules)</option>
                  <option value="REMOTE">Remote (Flexible WFH)</option>
                  <option value="HYBRID">Hybrid (Mix of Office & Remote)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the working rules or target groups for this policy…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Validation settings section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Validation Settings</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                    <input type="checkbox" checked={enableLocation} onChange={e => setEnableLocation(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Enable Location Validation (Saves option)
                  </label>

                  {enableLocation && (
                    <div style={{ paddingLeft: '26px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Allowed Office Locations:</span>
                      {officeLocations.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                          No active office locations configured.{' '}
                          <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/client-admin/attendance/office-locations`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontWeight: '600', textDecoration: 'underline' }}>
                            Configure locations
                          </a>{' '}
                          first.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                          {officeLocations.filter(loc => loc.is_active).map(loc => (
                            <label key={loc.office_location_id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '12.5px', color: '#334155', fontWeight: '500' }}>
                              <input
                                type="checkbox"
                                checked={selectedOfficeLocationIds.includes(loc.office_location_id)}
                                onChange={() => {
                                  setSelectedOfficeLocationIds(prev =>
                                    prev.includes(loc.office_location_id)
                                      ? prev.filter(id => id !== loc.office_location_id)
                                      : [...prev, loc.office_location_id]
                                  )
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{loc.location_name}</span>
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>({loc.radius_meters}m)</span>
                            </label>
                          ))}
                          {officeLocations.filter(loc => loc.is_active).length === 0 && (
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No active locations available.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                    <input type="checkbox" checked={enableShift} onChange={e => setEnableShift(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Enable Shift Validation (Saves option)
                  </label>
                </div>
              </div>

              {/* Late Arrival to LOP Configuration */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Late Arrival LOP Rules</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                    <input type="checkbox" checked={enableLateArrivalLop} onChange={e => setEnableLateArrivalLop(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Enable Late Arrival to LOP Deduction Rule
                  </label>

                  {enableLateArrivalLop && (
                    <div style={{ paddingLeft: '26px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Late Arrival Threshold</label>
                          <input
                            type="number"
                            min="1"
                            value={lateArrivalsLimit}
                            onChange={e => setLateArrivalsLimit(Math.max(1, parseInt(e.target.value) || 1))}
                            placeholder="e.g. 3"
                            style={{ ...inputStyle, width: '100%' }}
                            required
                          />
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Every X late arrivals...</span>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>LOP Days Deduction</label>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={lopDaysDeduction}
                            onChange={e => setLopDaysDeduction(e.target.value)}
                            placeholder="e.g. 1.0"
                            style={{ ...inputStyle, width: '100%' }}
                            required
                          />
                          <span style={{ fontSize: '11px', color: '#64748b' }}>...deduct Y LOP day(s)</span>
                        </div>
                      </div>

                      {/* Rule Preview & Examples */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Rule Preview</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                          Every <span style={{ color: '#ca8a04' }}>{lateArrivalsLimit}</span> Late Arrivals = <span style={{ color: '#ef4444' }}>{Number((parseFloat(lopDaysDeduction) || 0).toFixed(2))}</span> LOP Day(s)
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: '500' }}>Examples:</span>
                          <span>• {lateArrivalsLimit} Lates ➔ {Number(((parseFloat(lopDaysDeduction) || 0) * 1).toFixed(2))} LOP Day</span>
                          <span>• {lateArrivalsLimit * 2} Lates ➔ {Number(((parseFloat(lopDaysDeduction) || 0) * 2).toFixed(2))} LOP Days</span>
                          <span>• {lateArrivalsLimit * 3} Lates ➔ {Number(((parseFloat(lopDaysDeduction) || 0) * 3).toFixed(2))} LOP Days</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <label style={{ cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  Policy is Active
                </label>
              </div>

              {formError && (
                <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '14px' }}>
                  {formError}
                </div>
              )}

              <button type="submit" disabled={formSaving}
                style={{ width: '100%', padding: '11px', background: formSaving ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: formSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', marginTop: '4px' }}>
                {formSaving ? 'Saving…' : editingPolicy ? 'Save Changes' : 'Create Policy'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Policy Assignment Modal */}
      {assignOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => !assignSaving && setAssignOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '580px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  Assign Policy: {assigningPolicy?.name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Enforce this policy by assigning it to a department or specific employees
                </p>
              </div>
              {!assignSaving && (
                <button onClick={() => setAssignOpen(false)}
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                  <FiX size={14} />
                </button>
              )}
            </div>

            <form onSubmit={handleAssignSubmit}>
              {/* Assignment Mode Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: 3, marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => { setAssignMode('DEPARTMENT'); setSelectedEmployeeIds([]) }}
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '700', transition: 'all 0.15s',
                    background: assignMode === 'DEPARTMENT' ? '#fff' : 'transparent',
                    color: assignMode === 'DEPARTMENT' ? '#6366f1' : '#64748b',
                    boxShadow: assignMode === 'DEPARTMENT' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Department Assignment
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignMode('EMPLOYEE'); setSelectedDeptId('') }}
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '700', transition: 'all 0.15s',
                    background: assignMode === 'EMPLOYEE' ? '#fff' : 'transparent',
                    color: assignMode === 'EMPLOYEE' ? '#6366f1' : '#64748b',
                    boxShadow: assignMode === 'EMPLOYEE' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Individual Assignment
                </button>
              </div>

              {/* Department Dropdown */}
              {assignMode === 'DEPARTMENT' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Target Department *</label>
                  <select
                    value={selectedDeptId}
                    onChange={e => setSelectedDeptId(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Select Department —</option>
                    {metadataDepartments.map(d => {
                      const isAssigned = policyAssignedDeptIds.includes(d.department_id)
                      return (
                        <option key={d.department_id} value={d.department_id}>
                          {d.name} {isAssigned ? '✓ (Already Assigned)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {selectedDeptId && policyAssignedDeptIds.includes(selectedDeptId) && (
                    <div style={{ marginTop: '8px', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '9px', fontSize: '12.5px', color: '#1e40af', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span>ℹ️</span> All active employees in this department are already assigned to <strong>{assigningPolicy?.name}</strong>.
                    </div>
                  )}
                </div>
              )}

              {/* Employee Checklist */}
              {assignMode === 'EMPLOYEE' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Select Employees *</label>
                  
                  {/* Search inside checklist */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px', marginBottom: 10 }}>
                    <FiSearch size={13} color="#94a3b8" />
                    <input
                      placeholder="Search employees…"
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', padding: '7px 0', fontSize: '13px', color: '#0f172a', outline: 'none', width: '100%' }}
                    />
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px' }}>
                    {filteredEmployees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>No employees found</div>
                    ) : (
                      filteredEmployees.map(e => {
                        const isAssigned = policyAssignedEmpIds.includes(e.employee_id)
                        return (
                          <label key={e.employee_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmployeeIds.includes(e.employee_id)}
                              onChange={() => handleToggleEmployeeSelection(e.employee_id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{e.first_name} {e.last_name}</span>
                                {isAssigned && (
                                  <span style={{ fontSize: '10px', color: '#4338ca', background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    Already Assigned
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{e.employee_code} · {e.department_name || 'No Dept'}</span>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: 6, fontWeight: 500 }}>
                    Selected {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              {/* Effective Date */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Effective From Date *</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={e => setEffectiveFrom(e.target.value)}
                  required
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: 4 }}>
                  Future dates can be selected for scheduled changes.
                </span>
              </div>

              {assignError && (
                <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '14px' }}>
                  {assignError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  disabled={assignSaving}
                  onClick={() => setAssignOpen(false)}
                  style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSaving}
                  style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: assignSaving ? 'not-allowed' : 'pointer', background: assignSaving ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: assignSaving ? 'none' : '0 4px 12px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  {assignSaving ? <><FiLoader style={{ animation: 'spin 0.8s linear infinite' }} /> Assigning…</> : 'Assign Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '700',
  color: '#64748b',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
}

const inputStyle = {
  width: '100%',
  padding: '10px 13px',
  border: '1px solid #e2e8f0',
  borderRadius: '9px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#f8fafc'
}

const soonBadgeStyle = {
  fontSize: '10px',
  background: '#f1f5f9',
  color: '#64748b',
  padding: '1px 6px',
  borderRadius: '5px',
  fontWeight: '700',
  letterSpacing: '0.02em',
  border: '1px solid #e2e8f0'
}

const selStyle = {
  width: '100%',
  padding: '10px 13px',
  border: '1px solid #e2e8f0',
  borderRadius: '9px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#f8fafc',
  cursor: 'pointer'
}
