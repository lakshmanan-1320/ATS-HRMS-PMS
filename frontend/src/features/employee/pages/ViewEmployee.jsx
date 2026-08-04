import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'

const STATUS_META = {
  active:     { label: 'Active',      color: '#15803d', bg: '#dcfce7' },
  inactive:   { label: 'Inactive',    color: '#475569', bg: '#f1f5f9' },
  exit:       { label: 'Exit',        color: '#7c3aed', bg: '#ede9fe' },
  terminated: { label: 'Terminated',  color: '#b91c1c', bg: '#fee2e2' },
}

const TYPE_META = {
  full_time: { label: 'Full-time', color: '#6366f1', bg: 'rgba(37,99,235,0.08)' },
  part_time: { label: 'Part-time', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
  contract:  { label: 'Contract',  color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  intern:    { label: 'Intern',    color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
}

const getLevelColor = (level) => {
  if (!level) return '#64748b'
  const l = level.toUpperCase()
  if (l.includes('L1')) return '#6366f1'
  if (l.includes('L2')) return '#3b82f6'
  if (l.includes('L3')) return '#06b6d4'
  if (l.includes('L4')) return '#0ea5e9'
  return '#64748b'
}

const initials = (first, last) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: value ? '#1e293b' : '#cbd5e1' }}>{value || '—'}</span>
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
      {title}
    </div>
  )
}

export default function ViewEmployee() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [emp, setEmp] = useState(null)
  const [departments, setDepartments] = useState([])
  const [hierarchyLevels, setHierarchyLevels] = useState([])
  const [employees, setEmployees] = useState([])
  const [salaryConfig, setSalaryConfig] = useState(null)
  const [revisionHistory, setRevisionHistory] = useState([])
  const [shiftHistory, setShiftHistory] = useState([])

  const token = sessionStorage.getItem('sa_token')
  const api = axios.create({ baseURL: '/api/client-admin', headers: { Authorization: `Bearer ${token}` } })

  useEffect(() => {
    Promise.all([
      api.get(`/employees/${id}`),
      api.get('/departments'),
      api.get('/hierarchy-levels'),
      api.get('/employees'),
      axios.get(`/api/v1/payroll/employees/${id}/salary-config`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      axios.get(`/api/v1/payroll/revisions/employee/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      axios.get(`/api/v1/attendance/shifts/employees/${id}/history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
    ]).then(([empRes, deptRes, hlRes, allRes, salaryRes, revisionRes, shiftHistRes]) => {
      setEmp(empRes.data)
      setDepartments(deptRes.data)
      setHierarchyLevels(hlRes.data)
      setEmployees(allRes.data)
      setSalaryConfig(salaryRes?.data?.data || null)
      setRevisionHistory(revisionRes?.data?.data || [])
      setShiftHistory(shiftHistRes?.data?.data || [])
    }).catch(err => {
      if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
      if (err.response?.status === 404) navigate('/client-admin/employees')
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Roboto, system-ui, sans-serif' }}>
        <ClientAdminSidebar active="employees" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <main style={{ flex: 1, padding: '32px 36px', color: '#64748b', fontSize: 14 }}>Loading employee…</main>
        </div>
      </div>
    )
  }

  if (!emp) return null

  const sm = STATUS_META[emp.status] || STATUS_META.active
  const tm = TYPE_META[emp.employment_type] || TYPE_META.full_time
  const lc = getLevelColor(emp.level_code)
  const dept = departments.find(d => String(d.department_id) === String(emp.department_id))
  const hlevel = hierarchyLevels.find(h => String(h.hierarchy_level_id) === String(emp.hierarchy_level_id))
  const manager = employees.find(e => String(e.employee_id) === String(emp.manager_id))
  const secondaryManager = employees.find(e => String(e.employee_id) === String(emp.secondary_manager_id))

  // Calculation parameters for displays
  const grossTotal = salaryConfig ? salaryConfig.components?.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) : 0
  const deductionsTotal = salaryConfig ? salaryConfig.components?.filter(c => c.component_type === 'DEDUCTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) : 0
  const employerContribTotal = salaryConfig ? salaryConfig.components?.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) : 0
  const netTakeHome = Math.max(0, grossTotal - deductionsTotal)
  const calculatedCTC = grossTotal + employerContribTotal

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="employees" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflow: 'auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
            <button onClick={() => navigate('/client-admin/employees')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>Employees</button>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>{emp.first_name} {emp.last_name}</span>
          </div>

          {/* Profile header card */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 28, marginBottom: 20, boxShadow: '0 4px 6px rgba(0,0,0,0.03)', maxWidth: 920 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${lc}12`, border: `3px solid ${lc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: lc, flexShrink: 0 }}>
                  {initials(emp.first_name, emp.last_name)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{emp.first_name} {emp.last_name}</h1>
                    {emp.level_code && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: lc, background: `${lc}15`, padding: '2px 7px', borderRadius: 6 }}>{emp.level_code}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#475569', fontFamily: 'monospace' }}>
                      {emp.employee_code}
                    </span>
                    <span style={{ display: 'inline-block', padding: '3px 10px', background: sm.bg, borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color }}>
                      {sm.label}
                    </span>
                    <span style={{ display: 'inline-block', padding: '3px 10px', background: tm.bg, borderRadius: 20, fontSize: 11, fontWeight: 700, color: tm.color }}>
                      {tm.label}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate(`/client-admin/employees/${id}/edit`)} style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  ✏️ Edit Employee
                </button>
              </div>
            </div>
          </div>

          {/* Details card */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.03)', maxWidth: 920 }}>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Personal Information" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <InfoRow label="Email" value={emp.email} />
                <InfoRow label="Phone" value={emp.phone} />
                <InfoRow label="Gender" value={emp.gender} />
                <InfoRow label="Date of Birth" value={fmtDate(emp.date_of_birth)} />
                <InfoRow label="Father's Name" value={emp.father_name} />
                <InfoRow label="Mother's Name" value={emp.mother_name} />
                <InfoRow label="Blood Group" value={emp.blood_group} />
                <InfoRow label="Emergency Contact" value={emp.emergency_contact} />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Employment Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <InfoRow label="Department" value={dept?.name || emp.department_name} />
                <InfoRow label="Designation" value={emp.designation} />
                <InfoRow label="Hierarchy Level" value={hlevel ? `${hlevel.level_code} — ${hlevel.designation}` : (emp.level_code ? `${emp.level_code} — ${emp.level_designation || ''}` : null)} />
                <InfoRow label="Date of Joining" value={fmtDate(emp.date_of_joining)} />
                <InfoRow label="Primary Manager" value={manager ? `${manager.first_name} ${manager.last_name} (${manager.employee_code})` : emp.manager_name} />
                <InfoRow label="Secondary Manager" value={secondaryManager ? `${secondaryManager.first_name} ${secondaryManager.last_name} (${secondaryManager.employee_code})` : emp.secondary_manager_name} />
                <InfoRow label="Work Mode" value={
                  (emp.attendance_policy_type === 'REMOTE' || emp.office_location_name === 'Remote') ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, background: '#e0e7ff', color: '#4338ca', fontSize: 11, fontWeight: 700 }}>
                      🏠 Remote
                    </span>
                  ) : emp.attendance_policy_type === 'HYBRID' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 700 }}>
                      🏢/🏠 Hybrid
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700 }}>
                      🏢 Office
                    </span>
                  )
                } />
                <InfoRow label="Attendance Policy" value={emp.attendance_policy_name} />
                <InfoRow label="Work Shift" value={emp.shift_name} />
                <InfoRow label="Office Location" value={emp.office_location_name || (emp.attendance_policy_type === 'REMOTE' ? 'Remote' : null)} />
              </div>
            </div>

            {/* Salary Configuration Display Section */}
            {salaryConfig && (
              <div style={{ marginBottom: 28 }}>
                <SectionTitle title="Salary & Payroll Details" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16 }}>
                  <InfoRow label="Salary Type" value={salaryConfig.salary_type === 'MONTHLY_GROSS' ? 'Monthly Gross' : 'Annual CTC'} />
                  <InfoRow label="Monthly Gross Salary" value={`₹${grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  <InfoRow label="Cost to Company (CTC)" value={`₹${calculatedCTC.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Month (₹${(calculatedCTC * 12).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Annual)`} />
                </div>
                
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1', marginTop: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12, display: 'inline-block' }}>Component Breakdown</span>
                  
                  <div style={{ display: 'flex', gap: '20px', background: '#f1f5f9', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Gross: </span>
                      <strong style={{ color: '#1e293b' }}>₹{grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Deductions: </span>
                      <strong style={{ color: '#b91c1c' }}>- ₹{deductionsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Benefits: </span>
                      <strong style={{ color: '#6d28d9' }}>₹{employerContribTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Net Take-Home: </span>
                      <strong style={{ color: '#15803d' }}>₹{netTakeHome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>CTC: </span>
                      <strong style={{ color: '#6366f1' }}>₹{calculatedCTC.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', fontSize: 10, color: '#64748b' }}>Component</th>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', fontSize: 10, color: '#64748b' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', fontSize: 10, color: '#64748b' }}>Formula/Basis</th>
                        <th style={{ textAlign: 'center', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', fontSize: 10, color: '#64748b' }}>Auto</th>
                        <th style={{ textAlign: 'right', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', fontSize: 10, color: '#64748b' }}>Monthly Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryConfig.components?.map(c => {
                        let formulaTxt = c.calculation_basis
                        if (c.calculation_basis === 'GROSS') formulaTxt = `${parseFloat(c.percentage)}% of Gross`
                        else if (c.calculation_basis === 'BASIC') formulaTxt = `${parseFloat(c.percentage)}% of Basic`
                        else if (c.calculation_basis === 'COMPONENT') formulaTxt = `${parseFloat(c.percentage)}% of Ref`
                        else formulaTxt = 'Fixed Amount'

                        const isFixed = c.calculation_basis === 'FIXED_AMOUNT'

                        return (
                          <tr key={c.component_id}>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{c.component_name} ({c.component_code})</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>{c.component_type}</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: 10, color: '#64748b' }}>{formulaTxt}</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                              {isFixed ? '—' : c.is_manual_override ? '❌ Override' : '✅ Auto'}
                            </td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: c.component_type === 'DEDUCTION' ? '#b91c1c' : '#15803d' }}>
                              ₹{parseFloat(c.calculated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Bank Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <InfoRow label="Bank Name" value={emp.bank_name} />
                <InfoRow label="Account Number" value={emp.bank_account_number} />
                <InfoRow label="IFSC Code" value={emp.bank_ifsc} />
                <InfoRow label="Account Holder" value={emp.bank_account_holder} />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Compliance Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <InfoRow label="UAN Number" value={emp.uan_number} />
                <InfoRow label="ESI Number" value={emp.esi_number} />
              </div>
            </div>

            {/* Salary Revision History Timeline */}
            {revisionHistory && revisionHistory.length > 0 && (
              <div style={{ marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 28 }}>
                <SectionTitle title="Salary Revision History" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 12, borderLeft: '3px solid #6366f1' }}>
                  {revisionHistory.map((rev) => {
                    const isCTC = rev.new_salary_type === 'ANNUAL_CTC';
                    const amt = isCTC ? parseFloat(rev.new_ctc) : parseFloat(rev.new_gross);
                    const oldAmt = rev.old_salary_type === 'ANNUAL_CTC' ? parseFloat(rev.old_ctc) : parseFloat(rev.old_gross);
                    const increase = amt - oldAmt;

                    return (
                      <div key={rev.revision_id} style={{ position: 'relative', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{rev.reason}</span>
                            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>• Effective from {fmtDate(rev.effective_from)}</span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            background: rev.status === 'EFFECTIVE' ? '#dcfce7' : rev.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                            color: rev.status === 'EFFECTIVE' ? '#15803d' : rev.status === 'CANCELLED' ? '#b91c1c' : '#b45309',
                            textTransform: 'uppercase', border: `1px solid ${rev.status === 'EFFECTIVE' ? 'rgba(21,128,61,0.2)' : rev.status === 'CANCELLED' ? 'rgba(185,28,28,0.2)' : 'rgba(180,83,9,0.2)'}`
                          }}>{rev.status}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Previous Salary</span>
                            <strong style={{ color: '#1e293b' }}>₹{parseFloat(oldAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>({rev.old_salary_type === 'ANNUAL_CTC' ? 'CTC' : 'Gross'})</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>New Salary</span>
                            <strong style={{ color: '#1e293b' }}>₹{parseFloat(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>({rev.new_salary_type === 'ANNUAL_CTC' ? 'CTC' : 'Gross'})</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Revision Increase</span>
                            <strong style={{ color: '#15803d' }}>+ ₹{parseFloat(rev.increment_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            <span style={{ fontSize: 10, color: '#15803d', marginLeft: 4 }}>({parseFloat(rev.increment_percentage).toFixed(1)}%)</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Created By</span>
                            <span style={{ fontWeight: 600, color: '#475569' }}>
                              {rev.creator_first ? `${rev.creator_first} ${rev.creator_last}` : 'System Admin'}
                            </span>
                          </div>
                        </div>
                        {rev.remarks && (
                          <div style={{ marginTop: 10, fontSize: 11, fontStyle: 'italic', color: '#64748b', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            Remarks: {rev.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shift Assignments & Timeline Section */}
            {shiftHistory && shiftHistory.length > 0 && (
              <div style={{ marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 28 }}>
                <SectionTitle title="Shift Assignments & Timeline" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 14, borderLeft: '3px solid #3b82f6', position: 'relative' }}>
                  {shiftHistory.map((sh, idx) => {
                    const isCurrent = sh.status === 'ACTIVE'
                    const isScheduled = sh.status === 'SCHEDULED'
                    const statusBg = isCurrent ? '#dcfce7' : isScheduled ? '#fef3c7' : '#f1f5f9'
                    const statusColor = isCurrent ? '#15803d' : isScheduled ? '#b45309' : '#475569'
                    const statusBorder = isCurrent ? 'rgba(21,128,61,0.2)' : isScheduled ? 'rgba(180,83,9,0.2)' : '#cbd5e1'

                    return (
                      <div key={sh.shift_assignment_id || idx} style={{ position: 'relative', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                        <div style={{ position: 'absolute', left: -22, top: 20, width: 12, height: 12, borderRadius: '50%', background: sh.color_code || '#3b82f6', border: '2px solid #fff', boxShadow: '0 0 0 2px #cbd5e1' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{sh.shift_name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, border: '1px solid #bfdbfe' }}>{sh.shift_code}</span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
                            background: statusBg, color: statusColor, textTransform: 'uppercase', border: `1px solid ${statusBorder}`
                          }}>{sh.status}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Effective From</span>
                            <strong style={{ color: '#1e293b' }}>{fmtDate(sh.effective_from)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Effective To</span>
                            <strong style={{ color: sh.effective_to ? '#1e293b' : '#15803d' }}>{sh.effective_to ? fmtDate(sh.effective_to) : 'Current / Ongoing'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Shift Hours</span>
                            <strong style={{ color: '#475569' }}>{sh.start_time?.substring(0,5)} - {sh.end_time?.substring(0,5)} ({sh.minimum_hours || 8} hrs)</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Assignment Status</span>
                            <span style={{ fontWeight: 700, color: statusColor }}>{sh.status === 'ACTIVE' ? 'Active Shift' : sh.status === 'SCHEDULED' ? 'Scheduled Future Shift' : 'Previous Assignment'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
