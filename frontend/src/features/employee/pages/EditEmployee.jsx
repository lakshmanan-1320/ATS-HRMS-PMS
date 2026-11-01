import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { FiXCircle, FiAlertTriangle } from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'

const STATUS_META = {
  active:     { label: 'Active' },
  inactive:   { label: 'Inactive' },
  exit:       { label: 'Exit' },
  terminated: { label: 'Terminated' },
}

const iStyle = (err) => ({
  padding: '9px 13px', background: '#ffffff',
  border: `1px solid ${err ? '#ef4444' : '#E3E7EE'}`,
  borderRadius: 10, color: '#001233', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
})

const selStyle = {
  padding: '9px 13px', background: '#ffffff', border: '1px solid #E3E7EE',
  borderRadius: 10, color: '#001233', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer',
}

function Field({ label, required, error, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}{required && <span style={{ color: '#0466C8', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: '#7D8597' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>}
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7D8597', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #E3E7EE' }}>
      {title}
    </div>
  )
}

export default function EditEmployee() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [empName, setEmpName] = useState('')
  const [form, setFormState] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState([])
  const [hierarchyLevels, setHierarchyLevels] = useState([])
  const [employees, setEmployees] = useState([])
  const [toast, setToast] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [policies, setPolicies] = useState([])

  // Salary Config Versioning states
  const [salaryType, setSalaryType] = useState('MONTHLY_GROSS')
  const [salaryAmt, setSalaryAmt] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [configComponents, setConfigComponents] = useState([])
  const [previewSummary, setPreviewSummary] = useState(null)

  const getToken = () => sessionStorage.getItem('sa_token') || sessionStorage.getItem('token') || localStorage.getItem('sa_token') || localStorage.getItem('token') || ''
  const api = axios.create({ baseURL: '/api/client-admin' })
  api.interceptors.request.use((config) => {
    const t = getToken()
    if (t) config.headers.Authorization = `Bearer ${t}`
    return config
  })

  useEffect(() => {
    const redirect = (err) => { if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' } }
    const authHeaders = { headers: { Authorization: `Bearer ${getToken()}` } }
    Promise.all([
      api.get(`/employees/${id}`),
      api.get('/departments'),
      api.get('/hierarchy-levels'),
      api.get('/employees/managers', { params: { exclude_id: id } }),
      axios.get('/api/attendance/policies', authHeaders),
      axios.get(`/api/v1/payroll/employees/${id}/salary-config`, authHeaders).catch(() => null)
    ]).then(([empRes, deptRes, hlRes, mgrRes, policyRes, salaryRes]) => {
      const e = empRes.data
      setEmpName(`${e.first_name || ''} ${e.last_name || ''}`.trim())
      setFormState({
        employee_code:        e.employee_code || '',
        first_name:           e.first_name || '',
        last_name:            e.last_name || '',
        email:                e.email || '',
        phone:                e.phone || '',
        gender:               e.gender || '',
        date_of_birth:        e.date_of_birth ? e.date_of_birth.slice(0, 10) : '',
        date_of_joining:      e.date_of_joining ? e.date_of_joining.slice(0, 10) : '',
        department_id:        e.department_id ? String(e.department_id) : '',
        designation:          e.designation || '',
        employment_type:      e.employment_type || 'full_time',
        status:               e.status || 'active',
        manager_id:           e.manager_id ? String(e.manager_id) : '',
        secondary_manager_id: e.secondary_manager_id ? String(e.secondary_manager_id) : '',
        hierarchy_level_id:   e.hierarchy_level_id ? String(e.hierarchy_level_id) : '',
        father_name:          e.father_name || '',
        mother_name:          e.mother_name || '',
        blood_group:          e.blood_group || '',
        emergency_contact:    e.emergency_contact || '',
        bank_name:            e.bank_name || '',
        bank_account_number:  e.bank_account_number || '',
        bank_ifsc:            e.bank_ifsc || '',
        bank_account_holder:  e.bank_account_holder || '',
        uan_number:           e.uan_number || '',
        esi_number:           e.esi_number || '',
        attendance_policy_id: e.attendance_policy_id ? String(e.attendance_policy_id) : '',
      })
      setDepartments(deptRes.data)
      setHierarchyLevels(hlRes.data)
      setEmployees(mgrRes.data)
      setPolicies(policyRes.data?.data || [])

      const salaryData = salaryRes?.data?.data
      if (salaryData) {
        setSalaryType(salaryData.salary_type || 'MONTHLY_GROSS')
        setSalaryAmt(salaryData.salary_type === 'ANNUAL_CTC' ? parseFloat(salaryData.ctc_amount) : parseFloat(salaryData.gross_salary))
        setEffectiveFrom(salaryData.effective_from ? salaryData.effective_from.split('T')[0] : new Date().toISOString().split('T')[0])
        setConfigComponents(salaryData.components || [])
      } else {
        // Fallback to load default templates if no custom salary assignment exists
        axios.get('/api/v1/payroll/components', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => {
            const list = r.data?.data || []
            setConfigComponents(list.map(c => ({
              component_id: c.component_id,
              component_name: c.component_name,
              component_code: c.component_code,
              component_type: c.component_type,
              category: c.category,
              calculation_basis: c.calculation_basis,
              reference_component_id: c.reference_component_id,
              percentage: c.default_value,
              fixed_amount: c.default_value,
              calculated_amount: 0,
              is_manual_override: false,
              manual_amount: 0
            })))
          })
      }
    }).catch(err => {
      if (err.response?.status === 401) redirect()
    }).finally(() => setLoading(false))
  }, [id])

  function setField(k, v) {
    setFormState(p => {
      const updated = { ...p, [k]: v }
      if (k === 'department_id') {
        updated.manager_id = ''
        updated.secondary_manager_id = ''
      }
      return updated
    })
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  const previewTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [])

  const fetchPreviewComponents = async (amount, type, comps) => {
    const amt = parseFloat(amount) || 0
    if (amt <= 0) {
      setPreviewSummary(null)
      return
    }
    try {
      const { data } = await api.post('/payroll/employees/salary-config/preview', {
        salary_type: type,
        salary_amount: amt,
        components: comps.map(c => ({
          component_id: c.component_id,
          fixed_amount: c.fixed_amount !== undefined && c.fixed_amount !== null && c.fixed_amount !== '' ? parseFloat(c.fixed_amount) : null,
          percentage: c.percentage !== undefined && c.percentage !== null && c.percentage !== '' ? parseFloat(c.percentage) : null,
          is_manual_override: !!c.is_manual_override,
          manual_amount: c.manual_amount !== undefined && c.manual_amount !== null && c.manual_amount !== '' ? parseFloat(c.manual_amount) : 0,
          is_fixed_override: !!c.is_fixed_override
        }))
      })
      if (data?.success && data?.data) {
        const roundedComps = (data.data.components || []).map(bc => {
          const userComp = comps.find(c => c.component_id === bc.component_id)
          return {
            ...bc,
            fixed_amount: bc.fixed_amount !== null && bc.fixed_amount !== undefined ? Math.round(bc.fixed_amount * 100) / 100 : bc.fixed_amount,
            percentage: bc.percentage !== null && bc.percentage !== undefined ? Math.round(bc.percentage * 100) / 100 : bc.percentage,
            calculated_amount: Math.round(bc.calculated_amount * 100) / 100,
            is_manual_override: userComp?.is_manual_override ?? bc.is_manual_override,
            manual_amount: userComp?.manual_amount !== undefined ? userComp.manual_amount : bc.manual_amount,
            is_fixed_override: userComp?.is_fixed_override ?? bc.is_fixed_override
          }
        })
        setConfigComponents(roundedComps)
        setPreviewSummary(data.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const triggerPreviewDebounced = (amt, type, comps) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      fetchPreviewComponents(amt, type, comps)
    }, 300)
  }

  const handleUpdateComponentField = (index, field, value) => {
    const updated = [...configComponents]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'fixed_amount') {
      updated[index].is_fixed_override = true
    }
    setConfigComponents(updated)
    triggerPreviewDebounced(salaryAmt, salaryType, updated)
  }

  const handleSalaryChange = (amtVal, typeVal) => {
    setSalaryAmt(amtVal)
    setSalaryType(typeVal)
    triggerPreviewDebounced(amtVal, typeVal, configComponents)
  }

  function validate() {
    const e = {}
    if (!form.first_name?.trim()) e.first_name = 'Required.'
    if (!form.last_name?.trim()) e.last_name = 'Required.'
    if (!form.employee_code?.trim()) e.employee_code = 'Required.'
    if (form.uan_number && (form.uan_number.length < 3 || form.uan_number.length > 30)) e.uan_number = 'Must be between 3 and 30 characters.'
    if (form.esi_number && (form.esi_number.length < 3 || form.esi_number.length > 30)) e.esi_number = 'Must be between 3 and 30 characters.'
    if (!salaryAmt) e.salaryAmt = 'Salary Amount is required.'
    return e
  }

  async function handleResetPassword() {
    setResetting(true)
    try {
      const { data } = await api.post(`/employees/${id}/reset-password`)
      setResetOpen(false)
      setCredentials({
        name: `${data.data.first_name} ${data.data.last_name}`,
        email: data.data.email,
        employeeCode: data.data.employee_code,
        tempPassword: data.data.tempPassword,
        isReset: true,
      })
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Failed to reset password.', type: 'error' })
      setTimeout(() => setToast(null), 4500)
    } finally {
      setResetting(false)
    }
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        department_id:        form.department_id || null,
        manager_id:           form.manager_id || null,
        secondary_manager_id: form.secondary_manager_id || null,
        hierarchy_level_id:   form.hierarchy_level_id || null,
        date_of_birth:        form.date_of_birth || null,
        date_of_joining:      form.date_of_joining || null,
      }
      await api.put(`/employees/${id}`, payload)
      
      // Save salary configuration
      if (salaryAmt && id && String(id) !== 'undefined') {
        try {
          const amt = parseFloat(salaryAmt) || 0
          const gross = salaryType === 'ANNUAL_CTC' ? amt / 12 : amt
          const earningsSum = configComponents.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0)
          const employerContribSum = configComponents.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0)
          const ctcAmount = (earningsSum + employerContribSum) * (salaryType === 'ANNUAL_CTC' ? 12 : 1)

          await axios.post(`/api/v1/payroll/employees/${id}/salary-config`, {
            salary_type: salaryType,
            gross_salary: gross,
            ctc_amount: ctcAmount,
            effective_from: effectiveFrom,
            components: configComponents.map(c => ({
              component_id: c.component_id,
              percentage: parseFloat(c.percentage) || 0,
              fixed_amount: parseFloat(c.fixed_amount) || 0,
              calculated_amount: parseFloat(c.calculated_amount) || 0,
              is_manual_override: !!c.is_manual_override,
              manual_amount: c.is_manual_override ? parseFloat(c.manual_amount || 0) : null
            }))
          }, { headers: { Authorization: `Bearer ${getToken()}` } })
        } catch (salaryErr) {
          console.warn('Salary config update note:', salaryErr?.response?.data?.message || salaryErr.message)
        }
      }

      navigate(`/client-admin/employees/${id}`)
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Failed to save.', type: 'error' })
      setTimeout(() => setToast(null), 4500)
    } finally {
      setSaving(false)
    }
  }

  const inputFocus = e => { e.target.style.borderColor = '#0466C8' }
  const inputBlur  = e => { e.target.style.borderColor = '#E3E7EE' }

  const filteredManagerEmployees = employees.filter(e => {
    if (!form.department_id) return false
    return e.department_id === form.department_id
  })

  // Calculations breakdown summary preview (100% backend-driven from API response)
  const grossTotal = previewSummary ? previewSummary.gross_salary : 0
  const deductionsTotal = previewSummary ? previewSummary.total_deductions : 0
  const employerContribTotal = previewSummary ? previewSummary.total_benefits : 0
  const netTakeHome = previewSummary ? previewSummary.net_salary : 0
  const calculatedCTC = previewSummary ? (salaryType === 'ANNUAL_CTC' ? previewSummary.annual_ctc : previewSummary.monthly_ctc) : 0

  if (credentials) {
    return (
      <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Roboto, system-ui, sans-serif' }}>
        <ClientAdminSidebar active="employees" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <main style={{ flex: 1, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 36, maxWidth: 520, width: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #E3E7EE' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#001233', marginBottom: 6 }}>{credentials.isReset ? 'Password Reset' : 'Login Created'}</div>
              <p style={{ fontSize: 13, color: '#7D8597', marginBottom: 24 }}>
                {credentials.isReset
                  ? 'A new temporary password has been generated. Share it with the employee for their next sign-in.'
                  : 'A login was created for this employee. Share the temporary password for their first sign-in.'}
              </p>
              <div style={{ padding: 16, background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: 12, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#001233', marginBottom: 4 }}>{credentials.name}</div>
                <div style={{ fontSize: 12, color: '#7D8597', marginBottom: 14 }}>{credentials.employeeCode} · {credentials.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: '#F1F4F8', border: '1px solid #E3E7EE', borderRadius: 8 }}>
                  <code style={{ color: '#0466C8', fontSize: 16, fontWeight: 700 }}>{credentials.tempPassword}</code>
                  <button onClick={() => navigator.clipboard?.writeText(credentials.tempPassword)}
                    style={{ padding: '6px 12px', background: 'rgba(4, 102, 200,0.08)', border: '1px solid rgba(4, 102, 200,0.2)', borderRadius: 8, color: '#0466C8', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    Copy
                  </button>
                </div>
              </div>
              <button onClick={() => navigate(`/client-admin/employees/${id}`)}
                style={{ width: '100%', padding: '11px 0', background: 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Done — View Employee
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Roboto, system-ui, sans-serif' }}>
        <ClientAdminSidebar active="employees" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ClientAdminTopBar />
          <main style={{ flex: 1, padding: '32px 36px', color: '#7D8597', fontSize: 14 }}>Loading employee…</main>
        </div>
      </div>
    )
  }

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#001233', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="employees" />
      {toast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500, minWidth: 280, background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <FiXCircle size={16} /> {toast.msg}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflow: 'auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
            <button onClick={() => navigate('/client-admin/employees')} style={{ background: 'none', border: 'none', color: '#0466C8', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>Employees</button>
            <span style={{ color: '#94a3b8' }}>/</span>
            <button onClick={() => navigate(`/client-admin/employees/${id}`)} style={{ background: 'none', border: 'none', color: '#0466C8', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>{empName}</button>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#001233', fontWeight: 600 }}>Edit</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#001233' }}>Edit Employee</h1>
            <p style={{ margin: '6px 0 0', color: '#7D8597', fontSize: 13 }}>Editing {empName}</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E3E7EE', padding: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.03)', maxWidth: 920 }}>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Personal Information" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="First Name" required error={errors.first_name}>
                  <input value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="John" style={iStyle(errors.first_name)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Last Name" required error={errors.last_name}>
                  <input value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="Doe" style={iStyle(errors.last_name)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Gender">
                  <select value={form.gender} onChange={e => setField('gender', e.target.value)} style={selStyle}>
                    <option value="">— Select —</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </Field>
                <Field label="Email">
                  <input value={form.email} onChange={e => setField('email', e.target.value)} type="email" placeholder="john@example.com" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="9876543210" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Date of Birth">
                  <input value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} type="date" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Employment Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Employee Code" required error={errors.employee_code} hint="Auto-generated, can be changed.">
                  <input value={form.employee_code} onChange={e => setField('employee_code', e.target.value.toUpperCase())} placeholder="EMP0001"
                    style={{ ...iStyle(errors.employee_code), textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Department">
                  <select value={form.department_id} onChange={e => setField('department_id', e.target.value)} style={selStyle}>
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.department_id} value={String(d.department_id)}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Designation">
                  <input value={form.designation} onChange={e => setField('designation', e.target.value)} placeholder="Software Engineer" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Hierarchy Level" hint="e.g. L1, L2, L3 — from Hierarchy settings.">
                  <select value={form.hierarchy_level_id} onChange={e => {
                    const newId = e.target.value
                    const newLevel = hierarchyLevels.find(hl => String(hl.hierarchy_level_id) === newId)
                    const newSortOrder = newLevel ? newLevel.sort_order : null
                    const updates = { hierarchy_level_id: newId }
                    if (newSortOrder !== null) {
                      if (form.manager_id) {
                        const mgr = employees.find(emp => String(emp.employee_id) === form.manager_id)
                        const mgrLevel = mgr && hierarchyLevels.find(hl => String(hl.hierarchy_level_id) === String(mgr.hierarchy_level_id))
                        if (!mgrLevel || mgrLevel.sort_order >= newSortOrder) updates.manager_id = ''
                      }
                      if (form.secondary_manager_id) {
                        const smgr = employees.find(emp => String(emp.employee_id) === form.secondary_manager_id)
                        const smgrLevel = smgr && hierarchyLevels.find(hl => String(hl.hierarchy_level_id) === String(smgr.hierarchy_level_id))
                        if (!smgrLevel || smgrLevel.sort_order >= newSortOrder) updates.secondary_manager_id = ''
                      }
                    }
                    setFormState(p => ({ ...p, ...updates }))
                  }} style={selStyle}>
                    <option value="">— None —</option>
                    {hierarchyLevels.map(hl => (
                      <option key={hl.hierarchy_level_id} value={String(hl.hierarchy_level_id)}>
                        {hl.level_code} — {hl.designation}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Employment Type">
                  <select value={form.employment_type} onChange={e => setField('employment_type', e.target.value)} style={selStyle}>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </Field>
                <Field label="Date of Joining">
                  <input value={form.date_of_joining} onChange={e => setField('date_of_joining', e.target.value)} type="date" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => setField('status', e.target.value)} style={selStyle}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
                <Field label="Reporting Manager (Primary)" hint="Direct / solid-line manager.">
                  <select value={form.manager_id} onChange={e => setField('manager_id', e.target.value)} style={selStyle}>
                    <option value="">— None —</option>
                    {filteredManagerEmployees.map(e => (
                      <option key={e.employee_id} value={String(e.employee_id)}>
                        {e.first_name} {e.last_name} ({e.employee_code}){e.level_code ? ` · ${e.level_code}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Secondary Manager (Dotted Line)" hint="Cross-functional / matrix manager.">
                  <select value={form.secondary_manager_id} onChange={e => setField('secondary_manager_id', e.target.value)} style={selStyle}>
                    <option value="">— None —</option>
                    {filteredManagerEmployees.map(e => (
                      <option key={e.employee_id} value={String(e.employee_id)}>
                        {e.first_name} {e.last_name} ({e.employee_code}){e.level_code ? ` · ${e.level_code}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Attendance Policy" hint="Assigned attendance rules.">
                  <select value={form.attendance_policy_id} onChange={e => setField('attendance_policy_id', e.target.value)} style={selStyle}>
                    <option value="">— None —</option>
                    {policies.filter(p => p.is_active || String(p.attendance_policy_id) === String(form.attendance_policy_id)).map(p => (
                      <option key={p.attendance_policy_id} value={p.attendance_policy_id}>
                        {p.name} ({p.policy_type})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* Salary Configuration Editing Section */}
            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Salary & Payroll Configuration" />
              {form.status === 'active' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef3c7', border: '1px solid #f59e0b', color: '#b45309', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                  <FiAlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Direct salary revisions are disabled for active employees to preserve history. Revisions must be created through the <strong>Salary Revisions & Increments</strong> tab in Payroll dashboard.</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <Field label="Salary Type" required>
                  <select value={salaryType} onChange={e => handleSalaryChange(salaryAmt, e.target.value)} style={selStyle} disabled={form.status === 'active'}>
                    <option value="MONTHLY_GROSS">Monthly Gross</option>
                    <option value="ANNUAL_CTC">Annual CTC</option>
                  </select>
                </Field>
                <Field label="Salary Amount (INR)" required error={errors.salaryAmt}>
                  <div className="groww-input-box" style={{ width: '100%', height: 42, opacity: form.status === 'active' ? 0.7 : 1, borderColor: errors.salaryAmt ? '#ef4444' : undefined }}>
                    <span className="groww-prefix" style={{ fontSize: 15 }}>₹</span>
                    <input
                      type="number"
                      value={salaryAmt}
                      onChange={e => handleSalaryChange(e.target.value, salaryType)}
                      placeholder="e.g. 50000"
                      style={{ fontSize: 14 }}
                      disabled={form.status === 'active'}
                    />
                  </div>
                </Field>
                <Field label="Effective From Date" required>
                  <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} disabled={form.status === 'active'} />
                </Field>
              </div>
              
              {parseFloat(salaryAmt) > 0 && (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #E3E7EE' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', marginBottom: 12 }}>Salary Component Breakdown Preview</div>
                  
                  {previewSummary && previewSummary.is_valid === false && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiAlertTriangle size={16} />
                      <span>{previewSummary.error_message}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '20px', background: '#F1F4F8', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #E3E7EE', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#7D8597', fontWeight: '600' }}>Gross: </span>
                      <strong style={{ color: '#001233' }}>₹{grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#7D8597', fontWeight: '600' }}>Deductions: </span>
                      <strong style={{ color: '#b91c1c' }}>- ₹{deductionsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#7D8597', fontWeight: '600' }}>Benefits: </span>
                      <strong style={{ color: '#6d28d9' }}>₹{employerContribTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#7D8597', fontWeight: '600' }}>Net Take-Home: </span>
                      <strong style={{ color: '#15803d' }}>₹{netTakeHome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#7D8597', fontWeight: '600' }}>CTC: </span>
                      <strong style={{ color: '#0466C8' }}>₹{calculatedCTC.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>Component</th>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>Formula/Basis</th>
                        <th style={{ textAlign: 'center', padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>Auto</th>
                        <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>Config Rate / Amount</th>
                        <th style={{ textAlign: 'right', padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>Calculated Monthly Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configComponents.map((c, index) => {
                        let formulaTxt = c.calculation_basis
                        if (c.calculation_basis === 'GROSS') formulaTxt = '% of Gross'
                        else if (c.calculation_basis === 'BASIC') formulaTxt = '% of Basic'
                        else if (c.calculation_basis === 'COMPONENT') formulaTxt = '% of Ref'
                        
                        const isFixed = c.calculation_basis === 'FIXED_AMOUNT'
                        const isAuto = !c.is_manual_override && !isFixed

                        return (
                          <tr key={c.component_id}>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #E3E7EE', fontWeight: 600 }}>{c.component_name} ({c.component_code})</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #E3E7EE' }}>{c.component_type}</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textTransform: 'uppercase', fontSize: 10, color: '#7D8597' }}>{formulaTxt}</td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textAlign: 'center' }}>
                              {isFixed ? (
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>—</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isAuto}
                                  disabled={form.status === 'active'}
                                  onChange={e => {
                                    const manualOverrideVal = !e.target.checked
                                    const defaultManualAmt = c.calculated_amount || 0
                                    const updated = [...configComponents]
                                    updated[index] = {
                                      ...updated[index],
                                      is_manual_override: manualOverrideVal,
                                      manual_amount: manualOverrideVal ? defaultManualAmt : null
                                    }
                                    setConfigComponents(updated)
                                    handleUpdateComponentField(index, 'is_manual_override', manualOverrideVal)
                                  }}
                                  style={{ width: '14px', height: '14px', cursor: form.status === 'active' ? 'not-allowed' : 'pointer' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #E3E7EE' }}>
                              {isFixed ? (
                                <div className="groww-input-box" style={{ width: 105, height: 30, opacity: form.status === 'active' ? 0.7 : 1 }}>
                                  <span className="groww-prefix">₹</span>
                                  <input
                                    type="number"
                                    value={c.fixed_amount !== null && c.fixed_amount !== undefined ? (Math.round(c.fixed_amount * 100) / 100) : ''}
                                    disabled={form.status === 'active'}
                                    onChange={e => handleUpdateComponentField(index, 'fixed_amount', e.target.value)}
                                  />
                                </div>
                              ) : !isAuto ? (
                                <div className="groww-input-box" style={{ width: 105, height: 30, background: '#EEF8FF', borderColor: '#C9DDF3', opacity: form.status === 'active' ? 0.7 : 1 }}>
                                  <span className="groww-prefix" style={{ color: '#0466C8' }}>₹</span>
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={c.manual_amount !== null && c.manual_amount !== undefined ? (Math.round(c.manual_amount * 100) / 100) : ''}
                                    disabled={form.status === 'active'}
                                    onChange={e => handleUpdateComponentField(index, 'manual_amount', e.target.value)}
                                    style={{ color: '#0466C8' }}
                                  />
                                </div>
                              ) : (
                                <div className="groww-input-box" style={{ width: 75, height: 30, opacity: form.status === 'active' ? 0.7 : 1 }}>
                                  <input
                                    type="number"
                                    value={c.percentage !== null && c.percentage !== undefined ? c.percentage : ''}
                                    disabled={form.status === 'active'}
                                    onChange={e => handleUpdateComponentField(index, 'percentage', e.target.value)}
                                  />
                                  <span className="groww-suffix">%</span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '6px 12px', borderBottom: '1px solid #E3E7EE', textAlign: 'right', fontWeight: 700, color: c.component_type === 'DEDUCTION' ? '#b91c1c' : '#15803d' }}>
                              ₹{parseFloat(c.calculated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })}
                      <tr style={{ background: '#F1F4F8' }}>
                        <td colSpan="5" style={{ padding: '8px 12px', fontWeight: 700 }}>Cost to Company (CTC):</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0466C8' }}>
                          ₹{calculatedCTC.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Personal Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Father Name">
                  <input value={form.father_name} onChange={e => setField('father_name', e.target.value)} placeholder="Father's full name" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Mother Name">
                  <input value={form.mother_name} onChange={e => setField('mother_name', e.target.value)} placeholder="Mother's full name" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Blood Group">
                  <select value={form.blood_group} onChange={e => setField('blood_group', e.target.value)} style={selStyle}>
                    <option value="">— Select —</option>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </Field>
                <Field label="Emergency Contact">
                  <input value={form.emergency_contact} onChange={e => setField('emergency_contact', e.target.value)} placeholder="Emergency phone number" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Bank Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Bank Name">
                  <input value={form.bank_name} onChange={e => setField('bank_name', e.target.value)} placeholder="e.g. State Bank of India" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="Account Number">
                  <input value={form.bank_account_number} onChange={e => setField('bank_account_number', e.target.value)} placeholder="Account number" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
                <Field label="IFSC Code">
                  <input value={form.bank_ifsc} onChange={e => setField('bank_ifsc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="e.g. SBIN0001234"
                    style={{ ...iStyle(false), textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }} onFocus={inputFocus} onBlur={inputBlur} maxLength={11} />
                </Field>
                <Field label="Account Holder Name" hint="As per bank records.">
                  <input value={form.bank_account_holder} onChange={e => setField('bank_account_holder', e.target.value)} placeholder="Full name on bank account" style={iStyle(false)} onFocus={inputFocus} onBlur={inputBlur} />
                </Field>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <SectionTitle title="Compliance Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="UAN Number" error={errors.uan_number} hint="Exactly 12 digits.">
                  <input value={form.uan_number} onChange={e => setField('uan_number', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 100987654321" style={iStyle(errors.uan_number)} onFocus={inputFocus} onBlur={inputBlur} maxLength={12} />
                </Field>
                <Field label="ESI Number" error={errors.esi_number} hint="10 to 20 digits.">
                  <input value={form.esi_number} onChange={e => setField('esi_number', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 31001234567890" style={iStyle(errors.esi_number)} onFocus={inputFocus} onBlur={inputBlur} maxLength={20} />
                </Field>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <SectionTitle title="Account Security" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#fafafa', border: '1px solid #E3E7EE', borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#001233' }}>Reset Login Password</div>
                  <div style={{ fontSize: 12, color: '#7D8597', marginTop: 2 }}>Generate a new temporary password and send it to the employee's email.</div>
                </div>
                <button onClick={() => setResetOpen(true)} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Reset Password
                </button>
              </div>
            </div>

            {resetOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#001233', marginBottom: 8 }}>Reset Password?</div>
                  <p style={{ fontSize: 13, color: '#7D8597', margin: '0 0 24px' }}>
                    This will invalidate <strong>{empName}'s</strong> current password and generate a new temporary one.
                    They will be prompted to change it on next login.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setResetOpen(false)} disabled={resetting} style={{ padding: '9px 18px', background: 'rgba(0,0,0,0.04)', border: '1px solid #E3E7EE', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#7D8597', fontFamily: 'inherit', fontWeight: 600 }}>
                      Cancel
                    </button>
                    <button onClick={handleResetPassword} disabled={resetting} style={{ padding: '9px 18px', background: resetting ? 'rgba(220,38,38,0.4)' : '#dc2626', border: 'none', borderRadius: 8, cursor: resetting ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit' }}>
                      {resetting ? 'Resetting…' : 'Yes, Reset'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28, paddingTop: 20, borderTop: '1px solid #E3E7EE' }}>
              <button onClick={() => navigate(`/client-admin/employees/${id}`)} style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.04)', border: '1px solid #E3E7EE', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#7D8597', fontFamily: 'inherit', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: saving ? 'rgba(4, 102, 200,0.5)' : 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: 10, cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 14px rgba(4, 102, 200,0.35)' }}>
                {saving ? 'Saving…' : 'Update Employee'}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
