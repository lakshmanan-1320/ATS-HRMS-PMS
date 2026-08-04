import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import {
  FiArrowLeft, FiSettings, FiUsers, FiFolder,
  FiCheckCircle, FiXCircle, FiCalendar, FiSearch, FiMapPin, FiClock
} from 'react-icons/fi'

const TYPE_BADGE = {
  OFFICE: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', label: 'Office Format' },
  REMOTE: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'Remote Format' },
  HYBRID: { bg: '#faf5ff', color: '#6d28d9', border: '#e9d5ff', label: 'Hybrid Format' },
}

export default function AttendancePolicyDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const {
    currentPolicy: policy,
    members,
    departments,
    loading,
    fetchPolicyDetails
  } = useAttendanceStore()
  
  const [activeTab, setActiveTab] = useState('EMPLOYEES') // EMPLOYEES | DEPARTMENTS
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPolicyDetails(id).catch(err => {
      if (err.response?.status === 404) {
        navigate('/client-admin/attendance/policies')
      }
    })
  }, [id, fetchPolicyDetails, navigate])

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) || 
           (m.employee_code || '').toLowerCase().includes(q) ||
           (m.designation || '').toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <ClientAdminSidebar active="attendance-policies" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <main style={{ flex: 1, padding: '32px 36px', color: '#64748b', fontSize: 14 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', margin: '60px auto 14px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>Loading policy details…</div>
          </main>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!policy) return null
  const badge = TYPE_BADGE[policy.policy_type] || TYPE_BADGE.OFFICE

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
      <ClientAdminSidebar active="attendance-policies" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* Breadcrumb / Back button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13 }}>
            <button
              onClick={() => navigate('/client-admin/attendance/policies')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
            >
              <FiArrowLeft size={14} /> Policies
            </button>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>{policy.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* Left: Policy Info Card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: '0.04em' }}>
                  {badge.label}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', border: '1px solid',
                  background: policy.is_active ? '#f0fdf4' : '#fef2f2',
                  color:      policy.is_active ? '#15803d'  : '#b91c1c',
                  borderColor: policy.is_active ? '#bbf7d0' : '#fecaca',
                }}>
                  {policy.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{policy.name}</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{policy.description || 'No description provided.'}</p>

              {/* Validation settings summary */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 20 }}>
                <h4 style={sectionHeaderStyle}>Validation Rules</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Location Validation</span>
                    {policy.enable_location_validation ? (
                      <span style={{ color: '#15803d', fontWeight: 600 }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Disabled</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Shift Validation</span>
                    {policy.enable_shift_validation ? (
                      <span style={{ color: '#15803d', fontWeight: 600 }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Disabled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Late Arrival LOP Rule Summary */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 20 }}>
                <h4 style={sectionHeaderStyle}>Late Arrival LOP Rules</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>LOP Rule Status</span>
                    {policy.enable_late_arrival_lop ? (
                      <span style={{ color: '#15803d', fontWeight: 600 }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Disabled</span>
                    )}
                  </div>
                  {policy.enable_late_arrival_lop && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569', fontWeight: 500 }}>Lates Threshold</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{policy.late_arrivals_threshold} Arrivals</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569', fontWeight: 500 }}>Deduction Days</span>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>{policy.lop_days_per_threshold} LOP Day(s)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Date Metadata */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Created: {fmtDate(policy.created_at)}</div>
                <div>Last Updated: {fmtDate(policy.updated_at)}</div>
              </div>
            </div>

            {/* Right: Assignments details */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px' }}>
                {[
                  { id: 'EMPLOYEES', label: 'Assigned Employees', count: members.length, icon: <FiUsers size={14} /> },
                  { id: 'DEPARTMENTS', label: 'Assigned Departments', count: departments.length, icon: <FiFolder size={14} /> }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '16px 20px', border: 'none', borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                      cursor: 'pointer', fontSize: 13, fontWeight: '700', fontFamily: 'inherit',
                      color: activeTab === t.id ? '#6366f1' : '#64748b', background: 'transparent',
                      transition: 'color 0.15s'
                    }}
                  >
                    {t.icon}
                    {t.label}
                    <span style={{
                      fontSize: 10, fontWeight: 800, background: activeTab === t.id ? '#eef2ff' : '#f1f5f9',
                      color: activeTab === t.id ? '#6366f1' : '#64748b', padding: '2px 6px', borderRadius: 10, marginLeft: 4
                    }}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, padding: 20 }}>
                {activeTab === 'EMPLOYEES' ? (
                  <>
                    {/* Search inside members list */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 11px', marginBottom: 16, maxWidth: 320 }}>
                      <FiSearch size={13} color="#94a3b8" />
                      <input
                        placeholder="Search assigned employees…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#0f172a', outline: 'none', width: '100%' }}
                      />
                    </div>

                    {filteredMembers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 13 }}>
                        No employees currently assigned to this policy.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              {['Employee', 'Code', 'Department', 'Designation', 'Effective From', 'Date Assigned'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMembers.map((m, i) => (
                              <tr key={m.employee_id} style={{ borderBottom: i < filteredMembers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={tdStyle}>
                                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{m.first_name} {m.last_name}</span>
                                </td>
                                <td style={{ ...tdStyle, color: '#6366f1', fontFamily: 'monospace', fontWeight: '700' }}>
                                  {m.employee_code}
                                </td>
                                <td style={tdStyle}>{m.department_name || '—'}</td>
                                <td style={tdStyle}>{m.designation || '—'}</td>
                                <td style={{ ...tdStyle, fontWeight: '600', color: '#0f172a' }}>
                                  {fmtDate(m.effective_from)}
                                </td>
                                <td style={{ ...tdStyle, color: '#64748b' }}>
                                  {fmtDate(m.assigned_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  /* DEPARTMENTS Tab */
                  <div>
                    {departments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 13 }}>
                        No departments currently assigned to this policy.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {departments.map(d => (
                          <div key={d.department_id} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px',
                            background: '#fafbfc'
                          }}>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FiFolder size={16} />
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{d.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

const sectionHeaderStyle = {
  margin: '0 0 12px',
  fontSize: '11px',
  color: '#64748b',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const thStyle = {
  padding: '10px 14px',
  color: '#64748b',
  fontWeight: '700',
  textAlign: 'left',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap'
}

const tdStyle = {
  padding: '12px 14px',
  color: '#475569',
  fontSize: '13px'
}
