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
  OFFICE: { bg: '#e0f2fe', color: '#0284c7', label: 'Office Format' },
  REMOTE: { bg: '#e8fbf0', color: '#0fa958', label: 'Remote Format' },
  HYBRID: { bg: '#f3e8ff', color: '#7c3aed', label: 'Hybrid Format' },
}

const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'

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
  
  const [activeTab, setActiveTab] = useState('EMPLOYEES')
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
      <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
        <ClientAdminSidebar active="attendance-policies" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <main style={{ flex: 1, padding: '32px 36px', color: '#7D8597', fontSize: 14 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #E3E7EE', borderTopColor: '#0466C8', borderRadius: '50%', margin: '60px auto 14px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ color: '#7D8597', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>Loading policy details…</div>
          </main>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!policy) return null
  const badge = TYPE_BADGE[policy.policy_type] || TYPE_BADGE.OFFICE

  const sectionHeaderStyle = {
    margin: '0 0 12px 0', fontSize: '12px', fontWeight: 800, color: '#33415C', textTransform: 'uppercase', letterSpacing: '0.05em'
  }

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", color: '#001233' }}>
      <ClientAdminSidebar active="attendance-policies" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* Breadcrumb / Back button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13 }}>
            <button
              onClick={() => navigate('/client-admin/attendance/policies')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#0466C8', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}
            >
              <FiArrowLeft size={14} color="#0466C8" strokeWidth={2.5} /> Policies
            </button>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#001233', fontWeight: 700 }}>{policy.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* Left: Policy Info Card */}
            <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: 24, boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: '800', padding: '4px 9px', borderRadius: '6px', textTransform: 'uppercase', background: badge.bg, color: badge.color, letterSpacing: '0.04em' }}>
                  {badge.label}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
                  background: policy.is_active ? '#e8fbf0' : '#EEF8FF',
                  color:      policy.is_active ? '#0fa958'  : '#dc2626',
                }}>
                  {policy.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#001233' }}>{policy.name}</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#7D8597', lineHeight: 1.4 }}>{policy.description || 'No description provided.'}</p>

              {/* Validation settings summary */}
              <div style={{ borderTop: '1px solid #F1F4F8', paddingTop: 16, marginBottom: 20 }}>
                <h4 style={sectionHeaderStyle}>Validation Rules</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#33415C', fontWeight: 500 }}>Location Validation</span>
                    {policy.enable_location_validation ? (
                      <span style={{ color: '#0fa958', fontWeight: 700 }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Disabled</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#33415C', fontWeight: 500 }}>Shift Validation</span>
                    {policy.enable_shift_validation ? (
                      <span style={{ color: '#0fa958', fontWeight: 700 }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Disabled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Late Arrival LOP Rule Summary */}
              <div style={{ borderTop: '1px solid #F1F4F8', paddingTop: 16, marginBottom: 20 }}>
                <h4 style={sectionHeaderStyle}>Late Arrival LOP Rules</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#33415C', fontWeight: 500 }}>LOP Rule Status</span>
                    {policy.enable_late_arrival_lop ? (
                      <span style={{ color: '#0fa958', fontWeight: 700 }}>Enabled</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Disabled</span>
                    )}
                  </div>
                  {policy.enable_late_arrival_lop && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#33415C', fontWeight: 500 }}>Late Threshold</span>
                        <span style={{ color: '#d97706', fontWeight: 700 }}>{policy.late_arrivals_threshold} Late Arrivals</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#33415C', fontWeight: 500 }}>Deduction Rate</span>
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>{policy.lop_days_per_threshold} LOP Days</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Members / Departments Card */}
            <div style={{ background: '#ffffff', border: 'none', borderRadius: '16px', padding: 24, boxShadow: cardShadow }}>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 6, background: '#f8fafc', padding: 4, borderRadius: 10 }}>
                  <button
                    onClick={() => setActiveTab('EMPLOYEES')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: activeTab === 'EMPLOYEES' ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : 'transparent',
                      color: activeTab === 'EMPLOYEES' ? '#ffffff' : '#7D8597',
                      fontSize: 13, fontWeight: activeTab === 'EMPLOYEES' ? 700 : 600, cursor: 'pointer',
                      boxShadow: activeTab === 'EMPLOYEES' ? '0 2px 6px rgba(4, 102, 200, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FiUsers size={14} color={activeTab === 'EMPLOYEES' ? '#ffffff' : '#7D8597'} />
                    Assigned Employees ({members.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('DEPARTMENTS')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: activeTab === 'DEPARTMENTS' ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : 'transparent',
                      color: activeTab === 'DEPARTMENTS' ? '#ffffff' : '#7D8597',
                      fontSize: 13, fontWeight: activeTab === 'DEPARTMENTS' ? 700 : 600, cursor: 'pointer',
                      boxShadow: activeTab === 'DEPARTMENTS' ? '0 2px 6px rgba(4, 102, 200, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FiFolder size={14} color={activeTab === 'DEPARTMENTS' ? '#ffffff' : '#7D8597'} />
                    Assigned Departments ({departments.length})
                  </button>
                </div>

                {activeTab === 'EMPLOYEES' && (
                  <div style={{ position: 'relative', width: 220 }}>
                    <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search member..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%', paddingLeft: 30, padding: '7px 10px 7px 30px',
                        border: '1.5px solid #E3E7EE', borderRadius: 8, fontSize: 13,
                        background: '#f8fafc', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Tab Content */}
              {activeTab === 'EMPLOYEES' ? (
                <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E3E7EE', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</th>
                        <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</th>
                        <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Designation</th>
                        <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effective From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No members assigned directly to this policy.</td></tr>
                      ) : filteredMembers.map((m, i) => (
                        <tr key={m.member_id || m.employee_id} style={{ borderBottom: '1px solid #edf2f7', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#001233' }}>{m.first_name} {m.last_name}</td>
                          <td style={{ padding: '14px 16px' }}><CodeBadge code={m.employee_code} /></td>
                          <td style={{ padding: '14px 16px', color: '#33415C' }}>{m.designation || '—'}</td>
                          <td style={{ padding: '14px 16px', color: '#7D8597' }}>{fmtDate(m.effective_from)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E3E7EE', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', background: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department Name</th>
                        <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effective From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.length === 0 ? (
                        <tr><td colSpan={2} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No departments assigned to this policy.</td></tr>
                      ) : departments.map((d, i) => (
                        <tr key={d.assignment_id || d.department_id} style={{ borderBottom: '1px solid #edf2f7', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#001233' }}>{d.name}</td>
                          <td style={{ padding: '14px 16px', color: '#7D8597' }}>{fmtDate(d.effective_from)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
