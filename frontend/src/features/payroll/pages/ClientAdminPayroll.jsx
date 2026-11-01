import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'
import { FiSettings, FiUploadCloud, FiClipboard, FiClock, FiCheckCircle, FiXCircle, FiDownload, FiDollarSign } from 'react-icons/fi'

// Axios configuration will be initialized inside the component function to ensure sa_token is read correctly.

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  main: { flex: 1, padding: '32px 36px', overflowY: 'auto' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: '24px', fontWeight: '800', color: '#001233', marginBottom: '4px', margin: 0 },
  sub: { fontSize: '13px', color: '#33415C', margin: 0, fontWeight: 500 },
  tabs: { display: 'flex', gap: '8px', borderBottom: '1px solid #E3E7EE', marginBottom: '24px', paddingBottom: '8px' },
  tabBtn: (active) => ({
    padding: '8px 16px', background: active ? 'rgba(4, 102, 200,0.06)' : 'transparent',
    border: 'none', color: active ? '#0466C8' : '#7D8597',
    fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
    borderBottom: active ? '2px solid #0466C8' : 'none',
    borderRadius: active ? '8px 8px 0 0' : '8px',
    fontFamily: 'inherit'
  }),
  card: {
    background: '#ffffff', border: '1px solid #E3E7EE',
    borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)', marginBottom: '24px'
  },
  sectionTitle: { margin: '0 0 16px 0', color: '#001233', fontSize: '16px', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#33415C', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    padding: '10px 14px', background: '#ffffff',
    border: '1px solid #E3E7EE', borderRadius: '10px',
    fontSize: '13px', color: '#001233', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s ease'
  },
  select: {
    padding: '10px 14px', background: '#ffffff',
    border: '1px solid #E3E7EE', borderRadius: '10px',
    fontSize: '13px', color: '#001233', outline: 'none', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'border-color 0.15s ease'
  },
  btn: {
    padding: '10px 20px', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
    border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#ffffff',
    cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(4, 102, 200, 0.35)',
    display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontFamily: 'inherit'
  },
  btnSec: {
    padding: '10px 20px', background: '#ffffff',
    border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#7D8597',
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
  },
  btnDanger: {
    padding: '6px 12px', background: 'rgba(185,28,28,0.06)',
    border: '1px solid rgba(185,28,28,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#b91c1c',
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  th: {
    padding: '12px 16px', color: '#33415C', fontWeight: '700',
    borderBottom: '1px solid #E3E7EE',
    textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em',
    background: '#f8fafc'
  },
  tr: { borderBottom: '1px solid #E3E7EE', transition: 'background 0.2s' },
  td: { padding: '12px 16px', color: '#001233', fontWeight: '500' },
  badge: (status) => {
    let bg = '#F1F4F8'; let color = '#33415C'; let border = 'rgba(71,85,105,0.2)';
    if (status === 'APPROVED' || status === 'EFFECTIVE') { bg = '#dcfce7'; color = '#15803d'; border = 'rgba(21,128,61,0.2)'; }
    else if (status === 'LOCKED' || status === 'CANCELLED') { bg = '#fee2e2'; color = '#b91c1c'; border = 'rgba(185,28,28,0.2)'; }
    else if (status === 'DRAFT' || status === 'GENERATED' || status === 'PENDING') { bg = '#fef3c7'; color = '#b45309'; border = 'rgba(180,83,9,0.2)'; }
    return {
      display: 'inline-block', fontSize: '11px', fontWeight: '700',
      padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase',
      background: bg, color: color, border: `1px solid ${border}`
    }
  },
  error: { color: '#b91c1c', fontSize: '13px', marginTop: '10px', fontWeight: '700' },
  success: { color: '#15803d', fontSize: '13px', marginTop: '10px', fontWeight: '700' },
  modalBackdrop: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  },
  modalContent: {
    background: '#ffffff', border: '1px solid #E3E7EE',
    borderRadius: '16px', width: '90%', maxWidth: '800px', padding: '28px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)',
    maxHeight: '90vh', overflowY: 'auto'
  },
  kpiContainer: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' },
  kpiCard: {
    background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: '12px',
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  kpiLabel: { fontSize: '11px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValue: { fontSize: '20px', fontWeight: '800', color: '#001233' }
}

export default function ClientAdminPayroll() {
  const navigate = useNavigate()
  const location = useLocation()

  const token = sessionStorage.getItem('sa_token')
  const api = axios.create({
    baseURL: '/api',
    headers: { Authorization: `Bearer ${token}` }
  })

  const [activeTab, setActiveTab] = useState('runs')
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [toast, setToast] = useState({ msg: '', type: '' })

  // Data States
  const [runs, setRuns] = useState([])
  const [components, setComponents] = useState([])
  const [weekOffDays, setWeekOffDays] = useState([])
  const [revisions, setRevisions] = useState([])
  const [revisionStats, setRevisionStats] = useState({
    totalEmployees: 0, upcomingRevisions: 0, thisMonthRevisions: 0, avgIncrementPercent: 0, totalIncrementCost: 0
  })

  // Overtime States
  const [otSettings, setOtSettings] = useState({
    is_enabled: false,
    requires_approval: true,
    calculation_method: 'SALARY_MULTIPLIER',
    hourly_rate_basis: 'GROSS_STANDARD_HOURS',
    standard_monthly_hours: 208,
    weekday_multiplier: 1.50,
    weekend_multiplier: 2.00,
    holiday_multiplier: 2.50,
    weekday_hourly_rate: 0,
    weekend_hourly_rate: 0,
    holiday_hourly_rate: 0,
    minimum_ot_minutes: 0,
    rounding_rule: 'EXACT'
  })
  const [otLogs, setOtLogs] = useState([])

  // Selected details
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [runDetails, setRunDetails] = useState(null)
  const [selectedEmpId, setSelectedEmpId] = useState('')

  // Filter States
  const [filterEmpId, setFilterEmpId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Modals & Form States
  const [showGenModal, setShowGenModal] = useState(false)
  const [genForm, setGenForm] = useState({ month: '6', year: '2026', start: '2026-06-01', end: '2026-06-30' })
  const [showCompModal, setShowCompModal] = useState(false)
  const [editingCompId, setEditingCompId] = useState(null)
  const [compForm, setCompForm] = useState({
    name: '', code: '', type: 'EARNING', category: 'ALLOWANCE',
    basis: 'FIXED_AMOUNT', ref_id: '', default_value: '0', display_order: '0',
    is_taxable: false, include_ctc: true, include_gross: true, is_mandatory: false, is_active: true
  })

  // Salary Config states
  const [salaryType, setSalaryType] = useState('MONTHLY_GROSS')
  const [salaryAmt, setSalaryAmt] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState('2026-07-01')
  const [configComponents, setConfigComponents] = useState([])

  // Revision Modal Form states
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [revForm, setRevForm] = useState({
    employee_id: '', salary_type: 'MONTHLY_GROSS', new_salary_amount: '',
    effective_from: new Date().toISOString().split('T')[0], reason: 'Annual Appraisal', remarks: ''
  })
  const [revCurrentConfig, setRevCurrentConfig] = useState(null)
  const [revComponents, setRevComponents] = useState([])
  const [otherReason, setOtherReason] = useState('')

  const [showAdjModal, setShowAdjModal] = useState(false)
  const [showBulkAdjModal, setShowBulkAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState({ employee_id: '', type: 'ADDITION', name: '', amount: '', remarks: '' })

  useEffect(() => {
    const path = location.pathname
    if (path.endsWith('/salary-structures')) {
      setActiveTab('structures')
    } else if (path.endsWith('/runs')) {
      setActiveTab('runs')
    } else if (path === '/client-admin/payroll' || path === '/client-admin/payroll/') {
      setActiveTab(prev => ['revisions', 'settings', 'overtime'].includes(prev) ? prev : 'runs')
    }
  }, [location.pathname])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'structures') {
      navigate('/client-admin/payroll/salary-structures')
    } else if (tab === 'runs') {
      navigate('/client-admin/payroll/runs')
    } else {
      navigate('/client-admin/payroll')
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

  // --- API Fetches ---
  useEffect(() => {
    api.get('/client-admin/employees')
      .then(res => setEmployees(res.data || []))
      .catch(err => console.error('Failed to load employees', err))

    api.get('/client-admin/departments')
      .then(res => setDepartments(res.data || []))
      .catch(err => console.error('Failed to load departments', err))

    loadWeekOffSettings()
    loadComponents()
    loadRuns()
    loadRevisions()
    loadOvertimeSettings()
    loadOvertimeHistory()
  }, [])

  function loadOvertimeSettings() {
    api.get('/v1/payroll/overtime/settings')
      .then(res => {
        if (res.data?.data) {
          setOtSettings(res.data.data)
        }
      })
      .catch(err => console.error('Failed to load overtime settings', err))
  }

  function loadOvertimeHistory() {
    api.get('/v1/payroll/overtime/history')
      .then(res => setOtLogs(res.data?.data || []))
      .catch(err => console.error('Failed to load overtime logs', err))
  }

  async function handleSaveOvertimeSettings(e) {
    e.preventDefault()
    try {
      await api.put('/v1/payroll/overtime/settings', {
        ...otSettings,
        standard_monthly_hours: parseInt(otSettings.standard_monthly_hours) || 208,
        weekday_multiplier: parseFloat(otSettings.weekday_multiplier) || 1.5,
        weekend_multiplier: parseFloat(otSettings.weekend_multiplier) || 2.0,
        holiday_multiplier: parseFloat(otSettings.holiday_multiplier) || 2.5,
        weekday_hourly_rate: parseFloat(otSettings.weekday_hourly_rate) || 0,
        weekend_hourly_rate: parseFloat(otSettings.weekend_hourly_rate) || 0,
        holiday_hourly_rate: parseFloat(otSettings.holiday_hourly_rate) || 0,
        minimum_ot_minutes: parseInt(otSettings.minimum_ot_minutes) || 0
      })
      showToast('Overtime settings updated successfully!')
      loadOvertimeSettings()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update overtime settings', 'error')
    }
  }

  function loadWeekOffSettings() {
    api.get('/v1/payroll/settings/week-off')
      .then(res => setWeekOffDays(res.data?.data?.week_off_days || []))
      .catch(err => console.error('Failed to load week offs', err))
  }

  function loadComponents() {
    api.get('/v1/payroll/components')
      .then(res => setComponents(res.data?.data || []))
      .catch(err => console.error('Failed to load components', err))
  }

  function loadRuns() {
    api.get('/v1/payroll/runs')
      .then(res => setRuns(res.data?.data || []))
      .catch(err => console.error('Failed to load runs', err))
  }

  function loadRunDetails(runId) {
    api.get(`/v1/payroll/runs/${runId}`)
      .then(res => {
        setRunDetails(res.data?.data)
        setSelectedRunId(runId)
      })
      .catch(err => showToast(err.response?.data?.message || 'Failed to load run details', 'error'))
  }

  function loadRevisions() {
    const params = {}
    if (filterEmpId) params.employee_id = filterEmpId
    if (filterStatus) params.status = filterStatus
    if (filterDate) params.effective_from = filterDate

    api.get('/v1/payroll/revisions', { params })
      .then(res => {
        setRevisions(res.data?.data || [])
        if (res.data?.stats) {
          setRevisionStats(res.data.stats)
        }
      })
      .catch(err => console.error('Failed to load revisions', err))
  }

  // Reload revisions when filters change
  useEffect(() => {
    if (activeTab === 'revisions') {
      loadRevisions()
    }
  }, [filterEmpId, filterStatus, filterDate, activeTab])

  // Load configuration for employee salary setup
  const loadEmployeeSalaryConfig = (empId) => {
    if (!empId) {
      setConfigComponents([])
      return
    }
    api.get(`/v1/payroll/employees/${empId}/salary-config`)
      .then(res => {
        const data = res.data?.data
        if (data) {
          setSalaryType(data.salary_type || 'MONTHLY_GROSS')
          setSalaryAmt(data.salary_type === 'ANNUAL_CTC' ? parseFloat(data.ctc_amount) : parseFloat(data.gross_salary))
          setEffectiveFrom(data.effective_from ? data.effective_from.split('T')[0] : '2026-07-01')
          setConfigComponents(data.components || [])
        } else {
          setSalaryType('MONTHLY_GROSS')
          setSalaryAmt('')
          setEffectiveFrom('2026-07-01')
          // Set defaults based on organization payroll components
          const defaults = components.map(c => ({
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
          }))
          setConfigComponents(defaults)
        }
      })
      .catch(err => console.error('Failed to load salary config', err))
  }

  // Load configuration details for Revision Creation
  const loadRevisionCurrentConfig = (empId) => {
    if (!empId) {
      setRevCurrentConfig(null)
      setRevComponents([])
      return
    }
    api.get(`/v1/payroll/employees/${empId}/salary-config`)
      .then(res => {
        const data = res.data?.data
        setRevCurrentConfig(data || null)
        if (data) {
          const loadedGross = parseFloat(data.gross_salary) || 0
          setRevForm(p => ({
            ...p,
            salary_type: data.salary_type || 'MONTHLY_GROSS',
            new_salary_amount: data.salary_type === 'ANNUAL_CTC' ? parseFloat(data.ctc_amount) : parseFloat(data.gross_salary)
          }))
          setRevComponents(computeBalancedComponents(data.components || [], loadedGross))
        } else {
          setRevForm(p => ({ ...p, salary_type: 'MONTHLY_GROSS', new_salary_amount: '' }))
          // Fetch components
          const defaults = components.map(c => ({
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
          }))
          setRevComponents(defaults)
        }
      })
  }

  // --- Live Calculations ---
  const computeBalancedComponents = (list, targetGross) => {
    const updated = list.map(c => {
      let calculated_val = 0
      if (c.is_manual_override) {
        calculated_val = parseFloat(c.manual_amount) || 0
      } else if (c.calculation_basis === 'FIXED_AMOUNT') {
        calculated_val = parseFloat(c.fixed_amount) || 0
      } else if (c.calculation_basis === 'GROSS') {
        calculated_val = ((parseFloat(c.percentage) || 0) / 100) * targetGross
      }
      return { ...c, calculated_amount: calculated_val }
    })

    const basicComp = updated.find(c => c.component_code === 'BASIC')
    const basicVal = basicComp ? basicComp.calculated_amount : 0

    updated.forEach(c => {
      if (!c.is_manual_override && c.calculation_basis === 'BASIC') {
        c.calculated_amount = ((parseFloat(c.percentage) || 0) / 100) * basicVal
      }
    })

    updated.forEach(c => {
      if (!c.is_manual_override && c.calculation_basis === 'COMPONENT') {
        const refComp = updated.find(rc => rc.component_id === c.reference_component_id)
        const refVal = refComp ? refComp.calculated_amount : 0
        c.calculated_amount = ((parseFloat(c.percentage) || 0) / 100) * refVal
      }
    })

    // Balance Special Allowance to reach targetGross
    const otherEarningsSum = updated
      .filter(c => c.component_type === 'EARNING' && c.component_code !== 'SPECIAL_ALLOWANCE')
      .reduce((sum, c) => sum + (parseFloat(c.calculated_amount) || 0), 0)

    const specialAllowanceVal = Math.max(0, targetGross - otherEarningsSum)

    const specialCompIndex = updated.findIndex(c => c.component_code === 'SPECIAL_ALLOWANCE')
    if (specialCompIndex !== -1) {
      updated[specialCompIndex].calculated_amount = specialAllowanceVal
      updated[specialCompIndex].fixed_amount = specialAllowanceVal
    }

    // Re-verify dependent components (PF / PT / ESI / Ref components) in case they depend on updated earnings
    updated.forEach(c => {
      if (!c.is_manual_override && c.calculation_basis === 'BASIC') {
        c.calculated_amount = ((parseFloat(c.percentage) || 0) / 100) * basicVal
      }
    })

    updated.forEach(c => {
      if (!c.is_manual_override && c.calculation_basis === 'COMPONENT') {
        const refComp = updated.find(rc => rc.component_id === c.reference_component_id)
        const refVal = refComp ? refComp.calculated_amount : 0
        c.calculated_amount = ((parseFloat(c.percentage) || 0) / 100) * refVal
      }
    })

    return updated
  }

  const fetchPreviewComponents = async (amount, type, comps, targetSetter) => {
    const amt = parseFloat(amount) || 0
    if (amt <= 0) return
    try {
      const { data } = await api.post('/v1/payroll/employees/salary-config/preview', {
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
      if (data?.success && data?.data?.components) {
        const roundedComps = data.data.components.map(bc => {
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
        targetSetter(roundedComps)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateComponentField = (index, field, value) => {
    const updated = [...configComponents]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'fixed_amount') {
      updated[index].is_fixed_override = true
    }
    setConfigComponents(updated)
    fetchPreviewComponents(salaryAmt, salaryType, updated, setConfigComponents)
  }

  const handleSalaryChange = (amtVal, typeVal) => {
    setSalaryAmt(amtVal)
    setSalaryType(typeVal)
    fetchPreviewComponents(amtVal, typeVal, configComponents, setConfigComponents)
  }

  // --- Live calculations for Revisions ---
  const handleUpdateRevComponentField = (index, field, value) => {
    const updated = [...revComponents]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'fixed_amount') {
      updated[index].is_fixed_override = true
    }
    setRevComponents(updated)
    fetchPreviewComponents(revForm.new_salary_amount, revForm.salary_type, updated, setRevComponents)
  }

  const handleRevSalaryChange = (amtVal, typeVal) => {
    setRevForm(p => ({ ...p, new_salary_amount: amtVal, salary_type: typeVal }))
    fetchPreviewComponents(amtVal, typeVal, revComponents, setRevComponents)
  }

  // --- Submissions ---
  async function handleUpdateWeekOff(e) {
    e.preventDefault()
    try {
      await api.put('/v1/payroll/settings/week-off', { week_off_days: weekOffDays })
      showToast('Week off settings saved successfully!')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update settings', 'error')
    }
  }

  function handleToggleWeekDay(dayNum) {
    if (weekOffDays.includes(dayNum)) {
      setWeekOffDays(weekOffDays.filter(d => d !== dayNum))
    } else {
      setWeekOffDays([...weekOffDays, dayNum].sort())
    }
  }

  async function handleSaveComponent(e) {
    e.preventDefault()
    const payload = {
      component_name: compForm.name,
      component_code: compForm.code,
      component_type: compForm.type,
      category: compForm.category,
      calculation_basis: compForm.basis,
      reference_component_id: compForm.ref_id || null,
      default_value: parseFloat(compForm.default_value) || 0,
      display_order: parseInt(compForm.display_order) || 0,
      is_taxable: !!compForm.is_taxable,
      include_in_ctc: !!compForm.include_ctc,
      include_in_gross: !!compForm.include_gross,
      is_mandatory: !!compForm.is_mandatory,
      is_active: !!compForm.is_active
    }
    try {
      if (editingCompId) {
        await api.put(`/v1/payroll/components/${editingCompId}`, payload)
        showToast('Payroll component updated successfully!')
      } else {
        await api.post('/v1/payroll/components', payload)
        showToast('Payroll component created successfully!')
      }
      loadComponents()
      setShowCompModal(false)
      setEditingCompId(null)
      setCompForm({
        name: '', code: '', type: 'EARNING', category: 'ALLOWANCE',
        basis: 'FIXED_AMOUNT', ref_id: '', default_value: '0', display_order: '0',
        is_taxable: false, include_ctc: true, include_gross: true, is_mandatory: false, is_active: true
      })
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save component', 'error')
    }
  }

  async function handleDeleteComponent(id) {
    if (!window.confirm('Are you sure you want to delete this payroll component?')) return
    try {
      await api.delete(`/v1/payroll/components/${id}`)
      showToast('Payroll component deleted.')
      loadComponents()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete component', 'error')
    }
  }

  async function handleSaveEmployeeSalaryConfig(e) {
    e.preventDefault()
    if (!selectedEmpId) return
    
    const amt = parseFloat(salaryAmt) || 0
    const gross = salaryType === 'ANNUAL_CTC' ? amt / 12 : amt
    
    const earningsSum = configComponents.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + parseFloat(c.calculated_amount), 0)
    const employerContribSum = configComponents.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount), 0)
    const ctcAmount = (earningsSum + employerContribSum) * (salaryType === 'ANNUAL_CTC' ? 12 : 1)

    try {
      await api.post(`/v1/payroll/employees/${selectedEmpId}/salary-config`, {
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
      })
      showToast('Salary configuration saved and versioned successfully!')
      loadEmployeeSalaryConfig(selectedEmpId)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save salary config', 'error')
    }
  }

  // Create salary revision log and config copies
  async function handleCreateSalaryRevision(e) {
    e.preventDefault()
    if (!revForm.employee_id) return

    try {
      const selectedReason = revForm.reason === 'Other' ? otherReason : revForm.reason;
      await api.post('/v1/payroll/revisions', {
        employee_id: revForm.employee_id,
        salary_type: revForm.salary_type,
        new_salary_amount: parseFloat(revForm.new_salary_amount) || 0,
        effective_from: revForm.effective_from,
        reason: selectedReason,
        remarks: revForm.remarks,
        components: revComponents.map(c => ({
          component_id: c.component_id,
          percentage: parseFloat(c.percentage) || 0,
          fixed_amount: parseFloat(c.fixed_amount) || 0,
          calculated_amount: parseFloat(c.calculated_amount) || 0,
          is_manual_override: !!c.is_manual_override,
          manual_amount: c.is_manual_override ? parseFloat(c.manual_amount || 0) : null
        }))
      })
      showToast('Salary revision created successfully!')
      setShowRevisionModal(false)
      loadRevisions()
      setRevForm({
        employee_id: '', salary_type: 'MONTHLY_GROSS', new_salary_amount: '',
        effective_from: new Date().toISOString().split('T')[0], reason: 'Annual Appraisal', remarks: ''
      })
      setOtherReason('')
      setRevCurrentConfig(null)
      setRevComponents([])
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save salary revision', 'error')
    }
  }

  async function handleCancelRevision(revisionId) {
    if (!window.confirm('Are you sure you want to cancel this revision? This will also remove the pending configuration.')) return
    try {
      await api.post(`/v1/payroll/revisions/${revisionId}/cancel`)
      showToast('Salary revision cancelled.')
      loadRevisions()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel revision', 'error')
    }
  }

  // --- Payroll Runs helpers ---
  async function handleGeneratePayroll(e) {
    e.preventDefault()
    try {
      const res = await api.post('/v1/payroll/runs/generate', {
        payroll_month: parseInt(genForm.month),
        payroll_year: parseInt(genForm.year),
        payroll_start_date: genForm.start,
        payroll_end_date: genForm.end
      })
      showToast('Payroll run generated successfully!')
      loadRuns()
      setShowGenModal(false)
      loadRunDetails(res.data.data.payroll_run_id)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate payroll', 'error')
    }
  }

  async function handleApproveRun() {
    if (!window.confirm('Are you sure you want to approve this payroll run?')) return
    try {
      await api.post(`/v1/payroll/runs/${selectedRunId}/approve`)
      showToast('Payroll run approved!')
      loadRunDetails(selectedRunId)
      loadRuns()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve payroll', 'error')
    }
  }

  async function handleLockRun() {
    if (!window.confirm('Are you sure you want to lock this payroll run? This action CANNOT be undone and will freeze all edits.')) return
    try {
      await api.post(`/v1/payroll/runs/${selectedRunId}/lock`)
      showToast('Payroll run locked successfully!')
      loadRunDetails(selectedRunId)
      loadRuns()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to lock payroll', 'error')
    }
  }

  async function handleAddAdjustment(e) {
    e.preventDefault()
    try {
      await api.post(`/v1/payroll/runs/${selectedRunId}/adjustments`, {
        employee_id: adjForm.employee_id,
        adjustment_type: adjForm.type,
        adjustment_name: adjForm.name,
        amount: parseFloat(adjForm.amount) || 0,
        remarks: adjForm.remarks
      })
      showToast('Adjustment added successfully!')
      setShowAdjModal(false)
      setAdjForm({ employee_id: '', type: 'ADDITION', name: '', amount: '', remarks: '' })
      loadRunDetails(selectedRunId)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add adjustment', 'error')
    }
  }

  async function handleDeleteAdjustment(adjId) {
    if (!window.confirm('Are you sure you want to delete this adjustment?')) return
    try {
      await api.delete(`/v1/payroll/runs/${selectedRunId}/adjustments/${adjId}`)
      showToast('Adjustment deleted.')
      loadRunDetails(selectedRunId)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete adjustment', 'error')
    }
  }

  async function handleDownloadPayslip(employeePayrollId) {
    try {
      const response = await api.get(`/v1/payroll/my-payslips/${employeePayrollId}/download`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payslip_${employeePayrollId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast('Payslip PDF downloaded successfully!')
    } catch (err) {
      showToast('Failed to download payslip PDF.', 'error')
    }
  }

  const downloadAdjustmentTemplate = () => {
    const headers = 'employee_code,adjustment_type,amount,remarks\n'
    const sample = 'EMP001,ADDITION,1500.00,Performance Bonus\nEMP002,LOP,2.5,Unpaid Leaves Override\nEMP003,DEDUCTION,500.00,Device Recovery\n'
    const blob = new Blob([headers + sample], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'payroll_adjustments_template.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line)
        if (lines.length <= 1) {
          showToast('CSV is empty or contains only headers.', 'error')
          return
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
        const rows = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
          if (cols.length < headers.length) continue
          const row = {}
          headers.forEach((h, idx) => {
            row[h] = cols[idx]
          })
          rows.push(row)
        }
        await api.post(`/v1/payroll/runs/${selectedRunId}/adjustments/bulk`, { rows })
        showToast('Bulk adjustments uploaded successfully!')
        setShowBulkAdjModal(false)
        loadRunDetails(selectedRunId)
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to import bulk adjustments', 'error')
      }
    }
    reader.readAsText(file)
  }

  // --- Helpers ---
  function getEmpName(empId) {
    const emp = employees.find(e => e.employee_id === empId)
    return emp ? `${emp.first_name} ${emp.last_name}` : '—'
  }

  function getEmpDept(empId) {
    const emp = employees.find(e => e.employee_id === empId)
    if (!emp) return '—'
    const dept = departments.find(d => String(d.department_id) === String(emp.department_id))
    return dept ? dept.name : '—'
  }

  // Auto-calculated totals preview
  const grossTotal = Math.round(configComponents.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) * 100) / 100
  const deductionsTotal = Math.round(configComponents.filter(c => c.component_type === 'DEDUCTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) * 100) / 100
  const employerContribTotal = Math.round(configComponents.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) * 100) / 100
  const netTakeHome = Math.max(0, Math.round((grossTotal - deductionsTotal) * 100) / 100)
  const calculatedCTC = Math.round((grossTotal + employerContribTotal) * 100) / 100

  // Live calculations for revision comparison
  const revGross = Math.round(revComponents.filter(c => c.component_type === 'EARNING').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) * 100) / 100
  const revDeductions = Math.round(revComponents.filter(c => c.component_type === 'DEDUCTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) * 100) / 100
  const revEmployerContrib = Math.round(revComponents.filter(c => c.component_type === 'EMPLOYER_CONTRIBUTION').reduce((sum, c) => sum + parseFloat(c.calculated_amount || 0), 0) * 100) / 100
  const revNetTakeHome = Math.max(0, Math.round((revGross - revDeductions) * 100) / 100)
  const revCalculatedCTC = Math.round((revGross + revEmployerContrib) * 100) / 100

  // Current baseline comparison values
  const currentBase = revCurrentConfig ? parseFloat(revCurrentConfig.salary_type === 'ANNUAL_CTC' ? revCurrentConfig.ctc_amount : revCurrentConfig.gross_salary) : 0
  const currentMonthlyGross = revCurrentConfig ? parseFloat(revCurrentConfig.gross_salary) : 0
  const currentMonthlyCTC = revCurrentConfig ? parseFloat(revCurrentConfig.ctc_amount) / 12 : 0

  const newBase = parseFloat(revForm.new_salary_amount) || 0
  const newMonthlyGross = revForm.salary_type === 'ANNUAL_CTC' ? newBase / 12 : newBase

  const baseDiff = newBase - currentBase
  const baseDiffPercent = currentBase > 0 ? (baseDiff / currentBase) * 100 : 0
  const monthlyGrossDiff = newMonthlyGross - currentMonthlyGross

  // Lock status check for selected employee
  const selectedEmpObj = employees.find(e => e.employee_id === selectedEmpId)
  const isDirectEditLocked = selectedEmpObj && selectedEmpObj.status === 'active'

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="pms-page" style={s.page}>
      <ClientAdminSidebar active="payroll" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={s.main}>
        {/* Header */}
        <PageHeader
          icon={FiDollarSign}
          title="Payroll & Revisions"
          subtitle="Define dynamic templates, manage versioned salary configs, track app-wide week offs, and record revisions"
          actions={
            toast.msg ? (
              <div style={{
                padding: '10px 20px', borderRadius: '10px',
                background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
                border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                color: toast.type === 'error' ? '#b91c1c' : '#15803d', fontSize: '13px', fontWeight: '700'
              }}>
                {toast.msg}
              </div>
            ) : null
          }
        />

        {/* Navigation Tabs */}
        <div style={s.tabs}>
          <button style={s.tabBtn(activeTab === 'runs')} onClick={() => { handleTabChange('runs'); setSelectedRunId(null); }}>Payroll Runs</button>
          <button style={s.tabBtn(activeTab === 'structures')} onClick={() => handleTabChange('structures')}>Payroll Components</button>
          <button style={s.tabBtn(activeTab === 'revisions')} onClick={() => handleTabChange('revisions')}>Salary Revisions & Increments</button>
          <button style={s.tabBtn(activeTab === 'settings')} onClick={() => handleTabChange('settings')}>Week Off Settings</button>
          <button style={s.tabBtn(activeTab === 'overtime')} onClick={() => handleTabChange('overtime')}>Overtime Configuration & Audit</button>
        </div>

        {/* Tab content: Payroll Runs */}
        {activeTab === 'runs' && (
          <div>
            {!selectedRunId ? (
              <div style={s.card}>
                <div style={s.sectionTitle}>
                  <span>Generated Runs History</span>
                  <button style={s.btn} onClick={() => setShowGenModal(true)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <FiSettings size={14} /> Generate Run
                  </button>
                </div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Period</th>
                      <th style={s.th}>Start Date</th>
                      <th style={s.th}>End Date</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ ...s.td, textAlign: 'center', padding: '32px', fontWeight: 600, color: '#7D8597' }}>
                          No payroll runs generated yet. Click "Generate Run" above.
                        </td>
                      </tr>
                    ) : (
                      runs.map(r => (
                        <tr key={r.payroll_run_id} style={s.tr}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ ...s.td, fontWeight: '700' }}>
                            {new Date(2000, r.payroll_month - 1).toLocaleString('default', { month: 'long' })} {r.payroll_year}
                          </td>
                          <td style={s.td}>{r.payroll_start_date.split('T')[0]}</td>
                          <td style={s.td}>{r.payroll_end_date.split('T')[0]}</td>
                          <td style={s.td}>
                            <span style={s.badge(r.current_status)}>{r.current_status}</span>
                          </td>
                          <td style={s.td}>
                            <button style={s.btnSec} onClick={() => loadRunDetails(r.payroll_run_id)}
                              onMouseEnter={e => { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.color = '#001233' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#7D8597' }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <div style={{ ...s.card, marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button style={s.btnSec} onClick={() => setSelectedRunId(null)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.color = '#001233' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#7D8597' }}
                      >
                        ← Back
                      </button>
                      <div>
                        <h3 style={{ color: '#001233', margin: 0, fontSize: '18px', fontWeight: '800' }}>
                          Payroll Run: {new Date(2000, runDetails?.run?.payroll_month - 1).toLocaleString('default', { month: 'long' })} {runDetails?.run?.payroll_year}
                        </h3>
                        <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: 600 }}>
                          Period: {runDetails?.run?.payroll_start_date?.split('T')[0]} to {runDetails?.run?.payroll_end_date?.split('T')[0]}
                        </span>
                      </div>
                      <span style={s.badge(runDetails?.run?.current_status)}>{runDetails?.run?.current_status}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      {runDetails?.run?.current_status !== 'APPROVED' && runDetails?.run?.current_status !== 'LOCKED' && (
                        <button style={s.btn} onClick={handleApproveRun}> Approve Run</button>
                      )}
                      {runDetails?.run?.current_status === 'APPROVED' && (
                        <button style={{ ...s.btn, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }} onClick={handleLockRun}> Lock Run</button>
                      )}
                      {runDetails?.run?.current_status !== 'LOCKED' && (
                        <>
                          <button style={{ ...s.btn, background: 'rgba(4, 102, 200,0.06)', border: '1px solid rgba(4, 102, 200,0.15)', color: '#0466C8', boxShadow: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(4, 102, 200,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(4, 102, 200,0.06)'}
                            onClick={() => setShowAdjModal(true)}
                          >
                            <AddIcon size={18} /> Add Adjustment
                          </button>
                          <button style={{ ...s.btn, background: 'rgba(4, 102, 200,0.06)', border: '1px solid rgba(4, 102, 200,0.15)', color: '#023E7D', boxShadow: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(4, 102, 200,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(4, 102, 200,0.06)'}
                            onClick={() => setShowBulkAdjModal(true)}
                          >
                            <FiUploadCloud size={14} /> Bulk Adjustments
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <h4 style={{ color: '#001233', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800' }}>Calculated Salaries</h4>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Employee</th>
                          <th style={s.th}>Work Days</th>
                          <th style={s.th}>Present/Leaves</th>
                          <th style={s.th}>LOP Days</th>
                          <th style={s.th}>Gross / CTC</th>
                          <th style={s.th}>Employer Benefits</th>
                          <th style={s.th}>PF / ESI</th>
                          <th style={s.th}>PT / Tax</th>
                          <th style={s.th}>Earnings / Deductions</th>
                          <th style={s.th}>Net Salary</th>
                          {runDetails?.run?.current_status === 'LOCKED' && <th style={s.th}>Payslip</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {runDetails?.employeePayrolls?.map(ep => {
                          const gross = parseFloat(ep.gross_salary) || 0
                          const benefits = parseFloat(ep.benefits_amount) || 0
                          const ctc = gross + benefits
                          const pf = parseFloat(ep.pf_amount) || 0
                          const esi = parseFloat(ep.esi_amount) || 0
                          const pt = parseFloat(ep.professional_tax) || 0
                          const tax = parseFloat(ep.income_tax) || 0
                          return (
                            <tr key={ep.employee_payroll_id} style={s.tr}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ ...s.td, fontWeight: '700' }}>{getEmpName(ep.employee_id)}</td>
                              <td style={s.td}>{parseFloat(ep.working_days)}</td>
                              <td style={s.td}>{parseFloat(ep.present_days)} / {parseFloat(ep.paid_leave_days)}</td>
                              <td style={{ ...s.td, color: parseFloat(ep.lop_days) > 0 ? '#b91c1c' : '#001233', fontWeight: parseFloat(ep.lop_days) > 0 ? '700' : '500' }}>
                                <div>{parseFloat(ep.lop_days)}</div>
                                {(parseFloat(ep.lop_days_absence) > 0 || parseFloat(ep.lop_days_late) > 0) && (
                                  <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '500', marginTop: '2px', fontStyle: 'italic' }}>
                                    (Abs: {parseFloat(ep.lop_days_absence).toFixed(1)} / Late: {parseFloat(ep.lop_days_late).toFixed(1)})
                                  </div>
                                )}
                              </td>
                              <td style={s.td}>
                                <div>₹{gross.toFixed(2)}</div>
                                <div style={{ fontSize: '10px', color: '#0466C8', fontWeight: '700' }}>CTC: ₹{ctc.toFixed(2)}</div>
                              </td>
                              <td style={s.td}>₹{benefits.toFixed(2)}</td>
                              <td style={s.td}>₹{pf.toFixed(2)} / ₹{esi.toFixed(2)}</td>
                              <td style={s.td}>₹{pt.toFixed(2)} / ₹{tax.toFixed(2)}</td>
                              <td style={s.td}>
                                <div style={{ color: '#15803d', fontWeight: '600' }}>+ ₹{parseFloat(ep.total_earnings).toFixed(2)}</div>
                                <div style={{ color: '#b91c1c', fontWeight: '600' }}>- ₹{parseFloat(ep.total_deductions).toFixed(2)}</div>
                              </td>
                              <td style={{ ...s.td, fontWeight: '800', color: '#15803d', fontSize: '14px' }}>₹{parseFloat(ep.net_salary).toFixed(2)}</td>
                              {runDetails?.run?.current_status === 'LOCKED' && (
                                <td style={s.td}>
                                  <button style={{ ...s.btnSec, padding: '4px 10px', fontSize: '12px' }} onClick={() => handleDownloadPayslip(ep.employee_payroll_id)}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.color = '#001233' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#7D8597' }}
                                  >
                                    ⬇️ Download
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
                  <div style={s.card}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#001233', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800' }}>
                      <FiClipboard size={15} /> Manual Adjustments
                    </h4>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Employee</th>
                          <th style={s.th}>Type</th>
                          <th style={s.th}>Name</th>
                          <th style={s.th}>Amount</th>
                          <th style={s.th}>Remarks</th>
                          {runDetails?.run?.current_status !== 'LOCKED' && <th style={s.th}>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {runDetails?.adjustments?.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ ...s.td, textAlign: 'center', padding: '24px', color: '#7D8597', fontWeight: 600 }}>
                              No adjustments added to this run.
                            </td>
                          </tr>
                        ) : (
                          runDetails?.adjustments?.map(adj => (
                            <tr key={adj.adjustment_id} style={s.tr}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={s.td}>{getEmpName(adj.employee_id)}</td>
                              <td style={s.td}>
                                <span style={{
                                  fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                                  background: adj.adjustment_type === 'ADDITION' ? '#dcfce7' : '#fee2e2',
                                  color: adj.adjustment_type === 'ADDITION' ? '#15803d' : '#b91c1c',
                                  border: `1px solid ${adj.adjustment_type === 'ADDITION' ? 'rgba(21,128,61,0.2)' : 'rgba(185,28,28,0.2)'}`
                                }}>{adj.adjustment_type}</span>
                              </td>
                              <td style={{ ...s.td, fontWeight: '700' }}>{adj.adjustment_name}</td>
                              <td style={s.td}>₹{parseFloat(adj.amount).toFixed(2)}</td>
                              <td style={s.td}>{adj.remarks || '—'}</td>
                              {runDetails?.run?.current_status !== 'LOCKED' && (
                                <td style={s.td}>
                                  <button style={s.btnDanger} onClick={() => handleDeleteAdjustment(adj.adjustment_id)}>Delete</button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={s.card}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#001233', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800' }}>
                      <FiClock size={15} /> Action Audit Log
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                      {runDetails?.logs?.length === 0 ? (
                        <div style={{ color: '#7D8597', fontSize: '13px', fontWeight: 600 }}>No logs recorded.</div>
                      ) : (
                        runDetails?.logs?.map(log => (
                          <div key={log.log_id} style={{
                            padding: '12px', background: '#f8fafc', border: '1px solid #E3E7EE',
                            borderRadius: '10px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0466C8', textTransform: 'uppercase' }}>{log.action}</span>
                              <span style={{ fontSize: '10px', color: '#7D8597', fontWeight: '600' }}>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#33415C', fontWeight: '500' }}>{log.remarks}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab content: Payroll Components */}
        {activeTab === 'structures' && (
          <div style={s.card}>
            <div style={s.sectionTitle}>
              <span>Payroll Components Management</span>
              <button style={s.btn} onClick={() => {
                setEditingCompId(null)
                setCompForm({
                  name: '', code: '', type: 'EARNING', category: 'ALLOWANCE',
                  basis: 'FIXED_AMOUNT', ref_id: '', default_value: '0', display_order: '0',
                  is_taxable: false, include_ctc: true, include_gross: true, is_mandatory: false, is_active: true
                })
                setShowCompModal(true)
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <AddIcon size={20} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Define Component</span>
              </button>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Component Details</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Calculation Basis</th>
                  <th style={s.th}>Default Val / Order</th>
                  <th style={s.th}>Gross / CTC / Tax</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {components.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ ...s.td, textAlign: 'center', padding: '32px', color: '#7D8597', fontWeight: 600 }}>
                      No components defined yet. Click "+ Define Component" above.
                    </td>
                  </tr>
                ) : (
                  components.map(c => {
                    let refName = ''
                    if (c.calculation_basis === 'COMPONENT' && c.reference_component_id) {
                      const ref = components.find(comp => comp.component_id === c.reference_component_id)
                      refName = ref ? ` (${ref.component_code})` : ''
                    }
                    return (
                      <tr key={c.component_id} style={s.tr}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={s.td}>
                          <div style={{ fontWeight: '700', color: '#001233' }}>{c.component_name}</div>
                          <div style={{ fontSize: '10px', color: '#0466C8', fontWeight: '700' }}>CODE: {c.component_code}</div>
                        </td>
                        <td style={s.td}>
                          <span style={{
                            fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                            background: c.component_type === 'EARNING' ? '#dcfce7' : c.component_type === 'DEDUCTION' ? '#fee2e2' : '#f3e8ff',
                            color: c.component_type === 'EARNING' ? '#15803d' : c.component_type === 'DEDUCTION' ? '#b91c1c' : '#6d28d9',
                            border: `1px solid ${c.component_type === 'EARNING' ? 'rgba(21,128,61,0.2)' : c.component_type === 'DEDUCTION' ? 'rgba(185,28,28,0.2)' : 'rgba(109,40,217,0.2)'}`
                          }}>{c.component_type}</span>
                        </td>
                        <td style={{ ...s.td, fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', color: '#7D8597' }}>
                          {c.category}
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: '600' }}>{c.calculation_basis}{refName}</div>
                        </td>
                        <td style={s.td}>
                          <div>Val: {parseFloat(c.default_value).toFixed(2)}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Order: {c.display_order}</div>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '11px', fontWeight: '600', color: '#33415C' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: c.include_in_gross ? '#15803d' : '#b91c1c' }}>
                              {c.include_in_gross ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />} Gross
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: c.include_in_ctc ? '#15803d' : '#b91c1c' }}>
                              {c.include_in_ctc ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />} CTC
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                            {c.is_taxable ? 'Taxable' : 'Non-Taxable'}
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={{
                            fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                            background: c.is_active ? '#dcfce7' : '#F1F4F8',
                            color: c.is_active ? '#15803d' : '#7D8597'
                          }}>{c.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ ...s.btnSec, padding: '4px 10px', fontSize: '11px' }} onClick={() => {
                              setEditingCompId(c.component_id)
                              setCompForm({
                                name: c.component_name,
                                code: c.component_code,
                                type: c.component_type,
                                category: c.category,
                                basis: c.calculation_basis,
                                ref_id: c.reference_component_id || '',
                                default_value: String(c.default_value),
                                display_order: String(c.display_order),
                                is_taxable: !!c.is_taxable,
                                include_ctc: !!c.include_in_ctc,
                                include_gross: !!c.include_in_gross,
                                is_mandatory: !!c.is_mandatory,
                                is_active: !!c.is_active
                              })
                              setShowCompModal(true)
                            }}>Edit</button>
                            <button style={s.btnDanger} onClick={() => handleDeleteComponent(c.component_id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab content: Salary Revisions & Increments Dashboard */}
        {activeTab === 'revisions' && (
          <div>
            {/* KPI Container */}
            <div style={s.kpiContainer}>
              <div style={s.kpiCard}>
                <span style={s.kpiLabel}>Total Employees</span>
                <span style={s.kpiValue}>{revisionStats.totalEmployees}</span>
              </div>
              <div style={s.kpiCard}>
                <span style={s.kpiLabel}>Upcoming Revisions</span>
                <span style={s.kpiValue}>{revisionStats.upcomingRevisions}</span>
              </div>
              <div style={s.kpiCard}>
                <span style={s.kpiLabel}>This Month Revisions</span>
                <span style={s.kpiValue}>{revisionStats.thisMonthRevisions}</span>
              </div>
              <div style={s.kpiCard}>
                <span style={s.kpiLabel}>Average Increment %</span>
                <span style={s.kpiValue}>{parseFloat(revisionStats.avgIncrementPercent).toFixed(1)}%</span>
              </div>
              <div style={s.kpiCard}>
                <span style={s.kpiLabel}>Total Increment Cost</span>
                <span style={s.kpiValue}>₹{parseFloat(revisionStats.totalIncrementCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Revisions Dashboard filters and list */}
            <div style={s.card}>
              <div style={s.sectionTitle}>
                <span>Salary Revisions Log</span>
                <button style={s.btn} onClick={() => {
                  setRevForm({
                    employee_id: '', salary_type: 'MONTHLY_GROSS', new_salary_amount: '',
                    effective_from: new Date().toISOString().split('T')[0], reason: 'Annual Appraisal', remarks: ''
                  })
                  setRevCurrentConfig(null)
                  setRevComponents([])
                  setShowRevisionModal(true)
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <AddIcon size={20} />
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>Create Salary Revision</span>
                </button>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Employee</label>
                  <select value={filterEmpId} onChange={e => setFilterEmpId(e.target.value)} style={s.select}>
                    <option value="">All Employees</option>
                    {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={s.select}>
                    <option value="">All Statuses</option>
                    <option value="PENDING">PENDING</option>
                    <option value="EFFECTIVE">EFFECTIVE</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Effective Date</label>
                  <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={s.input} />
                </div>
              </div>

              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Employee</th>
                    <th style={s.th}>Reason</th>
                    <th style={s.th}>Current Salary</th>
                    <th style={s.th}>New Salary</th>
                    <th style={s.th}>Increment Amount</th>
                    <th style={s.th}>Increment %</th>
                    <th style={s.th}>Effective Date</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ ...s.td, textAlign: 'center', padding: '24px', color: '#7D8597', fontWeight: 600 }}>
                        No revisions matches standard filters.
                      </td>
                    </tr>
                  ) : (
                    revisions.map(r => {
                      const isPending = r.status === 'PENDING'
                      const oldAmt = r.old_salary_type === 'ANNUAL_CTC' ? parseFloat(r.old_ctc) : parseFloat(r.old_gross)
                      const newAmt = r.salary_type === 'ANNUAL_CTC' ? parseFloat(r.new_ctc) : parseFloat(r.new_gross)
                      return (
                        <tr key={r.revision_id} style={s.tr}>
                          <td style={{ ...s.td, fontWeight: '700' }}>
                            <div>{r.first_name} {r.last_name}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.employee_code} · {r.department_name || '—'}</div>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: '600' }}>{r.reason}</div>
                            <div style={{ fontSize: '11px', color: '#7D8597' }}>{r.remarks || '—'}</div>
                          </td>
                          <td style={s.td}>
                            <div>₹{parseFloat(oldAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.old_salary_type === 'ANNUAL_CTC' ? 'CTC' : 'Gross'}</div>
                          </td>
                          <td style={s.td}>
                            <div>₹{parseFloat(newAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.salary_type === 'ANNUAL_CTC' ? 'CTC' : 'Gross'}</div>
                          </td>
                          <td style={{ ...s.td, color: '#15803d', fontWeight: '700' }}>
                            + ₹{parseFloat(r.increment_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ ...s.td, color: '#15803d', fontWeight: '700' }}>
                            {parseFloat(r.increment_percentage).toFixed(1)}%
                          </td>
                          <td style={s.td}>{r.effective_from.split('T')[0]}</td>
                          <td style={s.td}>
                            <span style={s.badge(r.status)}>{r.status}</span>
                          </td>
                          <td style={s.td}>
                            {isPending ? (
                              <button style={s.btnDanger} onClick={() => handleCancelRevision(r.revision_id)}>Cancel</button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>read-only</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content: Settings */}
        {activeTab === 'settings' && (
          <div style={s.card}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px 0', color: '#001233', fontSize: '16px', fontWeight: '800' }}>
              <FiSettings size={16} /> Organization Week Off Configuration
            </h3>
            <p style={{ color: '#7D8597', fontSize: '13px', marginBottom: '24px', fontWeight: 500 }}>
              Select which days of the week are considered week-offs (non-working days) in your company.
            </p>
            <form onSubmit={handleUpdateWeekOff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {daysOfWeek.map((day, index) => {
                  const isChecked = weekOffDays.includes(index)
                  return (
                    <div
                      key={day}
                      onClick={() => handleToggleWeekDay(index)}
                      style={{
                        padding: '16px', borderRadius: '12px', cursor: 'pointer',
                        background: isChecked ? 'rgba(4, 102, 200,0.06)' : '#ffffff',
                        border: `1px solid ${isChecked ? '#0466C8' : '#E3E7EE'}`,
                        color: isChecked ? '#0466C8' : '#001233',
                        display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div click
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color, #0466C8)' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{day}</span>
                    </div>
                  )
                })}
              </div>
              <button type="submit" style={{ ...s.btn, width: '180px', marginTop: '16px' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Save Settings
              </button>
            </form>
          </div>
        )}

        {/* Tab content: Overtime Settings & Audit Logs */}
        {activeTab === 'overtime' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Overtime Settings Configuration */}
            <div style={s.card}>
              <h3 style={{ margin: '0 0 20px 0', color: '#001233', fontSize: '16px', fontWeight: '800' }}>
                ⏰ Overtime Settings
              </h3>
              <form onSubmit={handleSaveOvertimeSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#33415C' }}>
                    <input
                      type="checkbox"
                      checked={otSettings.is_enabled}
                      onChange={e => setOtSettings({ ...otSettings, is_enabled: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color, #0466C8)' }}
                    />
                    Enable Overtime Tracking
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#33415C' }}>
                    <input
                      type="checkbox"
                      checked={otSettings.requires_approval}
                      onChange={e => setOtSettings({ ...otSettings, requires_approval: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color, #0466C8)' }}
                    />
                    Requires Manager Approval
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Calculation Method</label>
                    <select
                      value={otSettings.calculation_method}
                      onChange={e => setOtSettings({ ...otSettings, calculation_method: e.target.value })}
                      style={s.select}
                      required
                    >
                      <option value="SALARY_MULTIPLIER">SALARY MULTIPLIER</option>
                      <option value="HOURLY_RATE">FIXED HOURLY RATE</option>
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Hourly Rate Basis</label>
                    <select
                      value={otSettings.hourly_rate_basis}
                      onChange={e => setOtSettings({ ...otSettings, hourly_rate_basis: e.target.value })}
                      style={s.select}
                      required
                    >
                      <option value="GROSS_STANDARD_HOURS">Gross / Standard Hours</option>
                      <option value="GROSS_ACTUAL_HOURS">Gross / Actual Working Hours</option>
                      <option value="FIXED_RATE">Fixed Hourly Amount</option>
                    </select>
                  </div>
                </div>

                {otSettings.hourly_rate_basis === 'GROSS_STANDARD_HOURS' && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Standard Monthly Hours</label>
                    <input
                      type="number"
                      value={otSettings.standard_monthly_hours}
                      onChange={e => setOtSettings({ ...otSettings, standard_monthly_hours: parseInt(e.target.value) || 0 })}
                      style={s.input}
                      required
                      min="1"
                    />
                  </div>
                )}

                {otSettings.calculation_method === 'SALARY_MULTIPLIER' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Weekday Multiplier</label>
                      <input
                        type="number"
                        step="0.05"
                        value={otSettings.weekday_multiplier}
                        onChange={e => setOtSettings({ ...otSettings, weekday_multiplier: parseFloat(e.target.value) || 0 })}
                        style={s.input}
                        required
                        min="0"
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Weekend Multiplier</label>
                      <input
                        type="number"
                        step="0.05"
                        value={otSettings.weekend_multiplier}
                        onChange={e => setOtSettings({ ...otSettings, weekend_multiplier: parseFloat(e.target.value) || 0 })}
                        style={s.input}
                        required
                        min="0"
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Holiday Multiplier</label>
                      <input
                        type="number"
                        step="0.05"
                        value={otSettings.holiday_multiplier}
                        onChange={e => setOtSettings({ ...otSettings, holiday_multiplier: parseFloat(e.target.value) || 0 })}
                        style={s.input}
                        required
                        min="0"
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Weekday Rate (₹/hr)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={otSettings.weekday_hourly_rate}
                        onChange={e => setOtSettings({ ...otSettings, weekday_hourly_rate: parseFloat(e.target.value) || 0 })}
                        style={s.input}
                        required
                        min="0"
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Weekend Rate (₹/hr)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={otSettings.weekend_hourly_rate}
                        onChange={e => setOtSettings({ ...otSettings, weekend_hourly_rate: parseFloat(e.target.value) || 0 })}
                        style={s.input}
                        required
                        min="0"
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Holiday Rate (₹/hr)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={otSettings.holiday_hourly_rate}
                        onChange={e => setOtSettings({ ...otSettings, holiday_hourly_rate: parseFloat(e.target.value) || 0 })}
                        style={s.input}
                        required
                        min="0"
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Minimum OT threshold (Mins)</label>
                    <input
                      type="number"
                      value={otSettings.minimum_ot_minutes}
                      onChange={e => setOtSettings({ ...otSettings, minimum_ot_minutes: parseInt(e.target.value) || 0 })}
                      style={s.input}
                      required
                      min="0"
                    />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Rounding Rule</label>
                    <select
                      value={otSettings.rounding_rule}
                      onChange={e => setOtSettings({ ...otSettings, rounding_rule: e.target.value })}
                      style={s.select}
                      required
                    >
                      <option value="EXACT">EXACT</option>
                      <option value="NEAREST_15_MIN">NEAREST 15 MINUTES</option>
                      <option value="NEAREST_30_MIN">NEAREST 30 MINUTES</option>
                    </select>
                  </div>
                </div>

                <button type="submit" style={{ ...s.btn, width: '180px', marginTop: '10px' }}>
                  Save Settings
                </button>
              </form>
            </div>

            {/* Overtime Logs History Audit */}
            <div style={s.card}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px 0', color: '#001233', fontSize: '16px', fontWeight: '800' }}>
                <FiClipboard size={16} /> Overtime Request Logs & Audit
              </h3>
              <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Employee</th>
                      <th style={s.th}>Date / Type</th>
                      <th style={s.th}>Requested / Approved</th>
                      <th style={s.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ ...s.td, textAlign: 'center', padding: '32px', color: '#7D8597', fontWeight: 600 }}>
                          No overtime requests logs recorded.
                        </td>
                      </tr>
                    ) : (
                      otLogs.map(log => {
                        const requestedHrs = (log.requested_ot_minutes / 60).toFixed(1)
                        const approvedHrs = log.approved_ot_minutes !== null ? (log.approved_ot_minutes / 60).toFixed(1) : '—'
                        return (
                          <tr key={log.overtime_request_id} style={s.tr}>
                            <td style={s.td}>
                              <div style={{ fontWeight: '700' }}>{log.first_name} {log.last_name}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{log.employee_code} · {log.department_name || '—'}</div>
                            </td>
                            <td style={s.td}>
                              <div>{log.attendance_date.split('T')[0]}</div>
                              <span style={{
                                fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px',
                                background: log.day_type === 'HOLIDAY' ? '#fef3c7' : log.day_type === 'WEEKEND' ? '#ede9fe' : '#F1F4F8',
                                color: log.day_type === 'HOLIDAY' ? '#b45309' : log.day_type === 'WEEKEND' ? '#6d28d9' : '#33415C'
                              }}>{log.day_type}</span>
                            </td>
                            <td style={s.td}>
                              <div>Req: {requestedHrs} hrs</div>
                              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>App: {approvedHrs} hrs</div>
                            </td>
                            <td style={s.td}>
                              <span style={s.badge(log.approval_status)}>{log.approval_status}</span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Add Salary Revision / Increment */}
      {showRevisionModal && (
        <div style={s.modalBackdrop} onClick={() => setShowRevisionModal(false)}>
          <div style={{ ...s.modalContent, maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#001233', fontSize: '17px', fontWeight: '800' }}>Create Salary Revision</h3>
              <button style={{ background: 'none', border: 'none', color: '#7D8597', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowRevisionModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateSalaryRevision} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Form Input fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Target Employee</label>
                  <select
                    value={revForm.employee_id}
                    onChange={e => {
                      setRevForm({ ...revForm, employee_id: e.target.value })
                      loadRevisionCurrentConfig(e.target.value)
                    }}
                    style={s.select}
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(e => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.first_name} {e.last_name} ({e.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Salary Type</label>
                    <select
                      value={revForm.salary_type}
                      onChange={e => handleRevSalaryChange(revForm.new_salary_amount, e.target.value)}
                      style={s.select}
                      required
                    >
                      <option value="MONTHLY_GROSS">Monthly Gross</option>
                      <option value="ANNUAL_CTC">Annual CTC</option>
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>
                      {revForm.salary_type === 'ANNUAL_CTC' ? 'New Annual CTC (₹)' : 'New Monthly Gross (₹)'}
                    </label>
                    <input
                      type="number"
                      placeholder="Enter new value"
                      value={revForm.new_salary_amount}
                      onChange={e => handleRevSalaryChange(e.target.value, revForm.salary_type)}
                      style={s.input}
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Effective From Date</label>
                    <input
                      type="date"
                      value={revForm.effective_from}
                      onChange={e => setRevForm({ ...revForm, effective_from: e.target.value })}
                      style={s.input}
                      required
                    />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Revision Reason</label>
                    <select
                      value={revForm.reason}
                      onChange={e => setRevForm({ ...revForm, reason: e.target.value })}
                      style={s.select}
                      required
                    >
                      <option value="Annual Appraisal">Annual Appraisal</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Market Correction">Market Correction</option>
                      <option value="Retention">Retention</option>
                      <option value="Salary Correction">Salary Correction</option>
                      <option value="Probation Confirmation">Probation Confirmation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {revForm.reason === 'Other' && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Specify Other Reason</label>
                    <input
                      type="text"
                      placeholder="Enter custom revision reason..."
                      value={otherReason}
                      onChange={e => setOtherReason(e.target.value)}
                      style={s.input}
                      required
                    />
                  </div>
                )}

                <div style={s.formGroup}>
                  <label style={s.label}>Remarks / Description</label>
                  <textarea
                    placeholder="Provide context regarding this salary revision..."
                    value={revForm.remarks}
                    onChange={e => setRevForm({ ...revForm, remarks: e.target.value })}
                    style={{ ...s.input, minHeight: '60px', resize: 'vertical' }}
                  />
                </div>

                {/* KPI comparison cards inside modal */}
                {newBase > 0 && (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #E3E7EE', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#7D8597', textTransform: 'uppercase' }}>Revision Analysis & Timeline</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E3E7EE', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase' }}>Current Salary</span>
                        <div style={{ fontSize: '14px', fontWeight: '800' }}>₹{currentBase.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Eff: {revCurrentConfig?.effective_from ? new Date(revCurrentConfig.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                      </div>
                      <div style={{ fontSize: '20px', color: '#E3E7EE', fontWeight: 'bold' }}>↓</div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase' }}>New Salary</span>
                        <div style={{ fontSize: '14px', fontWeight: '800' }}>₹{newBase.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Eff: {revForm.effective_from ? new Date(revForm.effective_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E3E7EE' }}>
                        <div style={{ fontSize: '9px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase' }}>Previous Annual CTC</div>
                        <div style={{ fontSize: '13px', fontWeight: '800' }}>₹{(currentMonthlyCTC * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E3E7EE' }}>
                        <div style={{ fontSize: '9px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase' }}>New Annual CTC</div>
                        <div style={{ fontSize: '13px', fontWeight: '800' }}>₹{(revCalculatedCTC * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E3E7EE' }}>
                        <div style={{ fontSize: '9px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase' }}>Annual Increment</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>
                          + ₹{((revCalculatedCTC * 12) - (currentMonthlyCTC * 12)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({(currentMonthlyCTC > 0 ? (((revCalculatedCTC * 12) - (currentMonthlyCTC * 12)) / (currentMonthlyCTC * 12)) * 100 : 0).toFixed(1)}%)
                        </div>
                      </div>
                      <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E3E7EE' }}>
                        <div style={{ fontSize: '9px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase' }}>Monthly Increment</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>
                          + ₹{(revCalculatedCTC - currentMonthlyCTC).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" style={{ ...s.btn, width: '100%', marginTop: '10px' }}>
                  Save Salary Revision
                </button>
              </div>

              {/* Dynamic Components Allocation Preview inside modal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#7D8597', textTransform: 'uppercase' }}>Components Allocation Preview</span>
                {newBase === 0 ? (
                  <div style={{ color: '#7D8597', fontSize: '13px', padding: '40px 0', textAlign: 'center', fontWeight: '600' }}>
                    Enter a new salary amount to preview component breakdowns.
                  </div>
                ) : (
                  <div>
                    <div style={{ overflowX: 'auto', maxHeight: '380px', border: '1px solid #E3E7EE', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={{ ...s.th, background: '#fff' }}>Component</th>
                            <th style={{ ...s.th, background: '#fff' }}>Formula / Basis</th>
                            <th style={{ ...s.th, background: '#fff', textAlign: 'right' }}>Monthly Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revComponents.map((c, index) => {
                            const isFixed = c.calculation_basis === 'FIXED_AMOUNT'
                            let formulaTxt = c.calculation_basis
                            if (c.calculation_basis === 'GROSS') formulaTxt = `${c.percentage}% of Gross`
                            else if (c.calculation_basis === 'BASIC') formulaTxt = `${c.percentage}% of Basic`
                            else if (c.calculation_basis === 'COMPONENT') formulaTxt = `${c.percentage}% of Ref`
                            else formulaTxt = 'Fixed Allowance (Editable)'

                            return (
                              <tr key={c.component_id} style={{ borderBottom: '1px solid #E3E7EE' }}>
                                <td style={{ ...s.td, padding: '8px' }}>
                                  <div style={{ fontWeight: '700' }}>{c.component_name}</div>
                                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>{c.component_code} · {c.component_type}</div>
                                </td>
                                <td style={{ ...s.td, padding: '8px', fontSize: '11px', color: '#7D8597', textTransform: 'uppercase' }}>
                                  {formulaTxt}
                                </td>
                                <td style={{ ...s.td, padding: '8px', textAlign: 'right' }}>
                                  {isFixed ? (
                                    <input
                                      type="number"
                                      value={c.fixed_amount !== null && c.fixed_amount !== undefined ? c.fixed_amount : ''}
                                      onChange={e => handleUpdateRevComponentField(index, 'fixed_amount', e.target.value)}
                                      style={{ ...s.input, padding: '4px 8px', width: '80px', fontSize: '12px', textAlign: 'right' }}
                                    />
                                  ) : (
                                    <strong style={{ color: c.component_type === 'DEDUCTION' ? '#b91c1c' : '#15803d', fontSize: '12px' }}>
                                      ₹{parseFloat(c.calculated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </strong>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Summary Breakdown Box */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', background: '#F1F4F8', padding: '12px', borderRadius: '10px', marginTop: '12px', border: '1px solid #E3E7EE', textAlign: 'center' }}>
                      <div>
                        <span style={{ fontSize: '8px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gross Salary</span>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#001233', marginTop: '2px' }}>₹{revGross.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '8px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deductions</span>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#b91c1c', marginTop: '2px' }}>-₹{revDeductions.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '8px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Employer Cont.</span>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#6d28d9', marginTop: '2px' }}>₹{revEmployerContrib.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '8px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net Take-Home</span>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>₹{revNetTakeHome.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '8px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CTC (Monthly)</span>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#0466C8', marginTop: '2px' }}>₹{revCalculatedCTC.toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Payroll Run */}
      {showGenModal && (
        <div style={s.modalBackdrop} onClick={() => setShowGenModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#001233', fontSize: '16px', fontWeight: '800' }}>Generate Payroll Run</h3>
              <button style={{ background: 'none', border: 'none', color: '#7D8597', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowGenModal(false)}>×</button>
            </div>
            <form onSubmit={handleGeneratePayroll} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Month (1-12)</label>
                  <select
                    value={genForm.month}
                    onChange={e => setGenForm({ ...genForm, month: e.target.value })}
                    style={s.select}
                    required
                  >
                    {[...Array(12)].map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {new Date(2000, idx).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Year</label>
                  <input
                    type="number"
                    value={genForm.year}
                    onChange={e => setGenForm({ ...genForm, year: e.target.value })}
                    style={s.input}
                    required
                    min="2000"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Start Date</label>
                  <input
                    type="date"
                    value={genForm.start}
                    onChange={e => setGenForm({ ...genForm, start: e.target.value })}
                    style={s.input}
                    required
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>End Date</label>
                  <input
                    type="date"
                    value={genForm.end}
                    onChange={e => setGenForm({ ...genForm, end: e.target.value })}
                    style={s.input}
                    required
                  />
                </div>
              </div>

              <button type="submit" style={{ ...s.btn, width: '100%', marginTop: '12px' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Generate Run
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Define/Edit Component */}
      {showCompModal && (
        <div style={s.modalBackdrop} onClick={() => setShowCompModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#001233', fontSize: '16px', fontWeight: '800' }}>
                {editingCompId ? 'Edit Payroll Component' : 'Define Payroll Component'}
              </h3>
              <button style={{ background: 'none', border: 'none', color: '#7D8597', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowCompModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveComponent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Component Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Basic Salary"
                    value={compForm.name}
                    onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                    style={s.input}
                    required
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Component Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BASIC"
                    value={compForm.code}
                    onChange={e => setCompForm({ ...compForm, code: e.target.value })}
                    style={s.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Component Type</label>
                  <select
                    value={compForm.type}
                    onChange={e => setCompForm({ ...compForm, type: e.target.value })}
                    style={s.select}
                    required
                  >
                    <option value="EARNING">EARNING</option>
                    <option value="DEDUCTION">DEDUCTION</option>
                    <option value="EMPLOYER_CONTRIBUTION">EMPLOYER CONTRIBUTION</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Category</label>
                  <select
                    value={compForm.category}
                    onChange={e => setCompForm({ ...compForm, category: e.target.value })}
                    style={s.select}
                    required
                  >
                    <option value="ALLOWANCE">ALLOWANCE</option>
                    <option value="STATUTORY">STATUTORY</option>
                    <option value="TAX">TAX</option>
                    <option value="BONUS">BONUS</option>
                    <option value="OVERTIME">OVERTIME</option>
                    <option value="REIMBURSEMENT">REIMBURSEMENT</option>
                    <option value="LOAN">LOAN</option>
                    <option value="RECOVERY">RECOVERY</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Calculation Basis</label>
                  <select
                    value={compForm.basis}
                    onChange={e => setCompForm({ ...compForm, basis: e.target.value })}
                    style={s.select}
                    required
                  >
                    <option value="FIXED_AMOUNT">FIXED AMOUNT</option>
                    <option value="GROSS">PERCENTAGE OF GROSS</option>
                    <option value="BASIC">PERCENTAGE OF BASIC</option>
                    <option value="COMPONENT">PERCENTAGE OF COMPONENT</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Default Value / Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 40.00 or 200.00"
                    value={compForm.default_value}
                    onChange={e => setCompForm({ ...compForm, default_value: e.target.value })}
                    style={s.input}
                    required
                  />
                </div>
              </div>

              {compForm.basis === 'COMPONENT' && (
                <div style={s.formGroup}>
                  <label style={s.label}>Reference Component</label>
                  <select
                    value={compForm.ref_id}
                    onChange={e => setCompForm({ ...compForm, ref_id: e.target.value })}
                    style={s.select}
                    required
                  >
                    <option value="">-- Select Reference Component --</option>
                    {components.map(c => (
                      <option key={c.component_id} value={c.component_id}>
                        {c.component_name} ({c.component_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Display Order</label>
                  <input
                    type="number"
                    value={compForm.display_order}
                    onChange={e => setCompForm({ ...compForm, display_order: e.target.value })}
                    style={s.input}
                    required
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Status</label>
                  <select
                    value={compForm.is_active ? 'true' : 'false'}
                    onChange={e => setCompForm({ ...compForm, is_active: e.target.value === 'true' })}
                    style={s.select}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#33415C' }}>
                  <input
                    type="checkbox"
                    checked={compForm.include_gross}
                    onChange={e => setCompForm({ ...compForm, include_gross: e.target.checked })}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary-color, #0466C8)' }}
                  />
                  Include in Gross Salary
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#33415C' }}>
                  <input
                    type="checkbox"
                    checked={compForm.include_ctc}
                    onChange={e => setCompForm({ ...compForm, include_ctc: e.target.checked })}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary-color, #0466C8)' }}
                  />
                  Include in CTC
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#33415C' }}>
                  <input
                    type="checkbox"
                    checked={compForm.is_taxable}
                    onChange={e => setCompForm({ ...compForm, is_taxable: e.target.checked })}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary-color, #0466C8)' }}
                  />
                  Is Taxable Component
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#33415C' }}>
                  <input
                    type="checkbox"
                    checked={compForm.is_mandatory}
                    onChange={e => setCompForm({ ...compForm, is_mandatory: e.target.checked })}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary-color, #0466C8)' }}
                  />
                  Is Mandatory Component
                </label>
              </div>

              <button type="submit" style={{ ...s.btn, width: '100%', marginTop: '12px' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {editingCompId ? 'Update Component' : 'Create Component'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Manual Adjustment */}
      {showAdjModal && (
        <div style={s.modalBackdrop} onClick={() => setShowAdjModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#001233', fontSize: '16px', fontWeight: '800' }}>Add Manual Adjustment</h3>
              <button style={{ background: 'none', border: 'none', color: '#7D8597', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowAdjModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={s.formGroup}>
                <label style={s.label}>Target Employee</label>
                <select
                  value={adjForm.employee_id}
                  onChange={e => setAdjForm({ ...adjForm, employee_id: e.target.value })}
                  style={s.select}
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {runDetails?.employeePayrolls?.map(ep => (
                    <option key={ep.employee_id} value={ep.employee_id}>
                      {getEmpName(ep.employee_id)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Adjustment Type</label>
                  <select
                    value={adjForm.type}
                    onChange={e => setAdjForm({ ...adjForm, type: e.target.value })}
                    style={s.select}
                    required
                  >
                    <option value="ADDITION">ADDITION (+)</option>
                    <option value="DEDUCTION">DEDUCTION (-)</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={adjForm.amount}
                    onChange={e => setAdjForm({ ...adjForm, amount: e.target.value })}
                    style={s.input}
                    required
                    min="0.01"
                  />
                </div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Adjustment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Performance Bonus, Tax Adjustment"
                  value={adjForm.name}
                  onChange={e => setAdjForm({ ...adjForm, name: e.target.value })}
                  style={s.input}
                  required
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Remarks / Explanation</label>
                <textarea
                  placeholder="Additional context..."
                  value={adjForm.remarks}
                  onChange={e => setAdjForm({ ...adjForm, remarks: e.target.value })}
                  style={{ ...s.input, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" style={{ ...s.btn, width: '100%', marginTop: '8px' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Save Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Adjustments Import */}
      {showBulkAdjModal && (
        <div style={s.modalBackdrop} onClick={() => setShowBulkAdjModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#001233', fontSize: '16px', fontWeight: '800' }}>Bulk Import Adjustments / LOP</h3>
              <button style={{ background: 'none', border: 'none', color: '#7D8597', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowBulkAdjModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: '#33415C', fontSize: '13px', margin: 0, fontWeight: 500 }}>
                Upload a CSV file to apply additions, deductions, or LOP overrides for this month's payroll.
              </p>
              
              <button style={s.btnSec} onClick={downloadAdjustmentTemplate}>
                <FiDownload size={13} /> Download CSV Template
              </button>

              <div style={{ border: '2px dashed #E3E7EE', borderRadius: '12px', padding: '24px', textAlign: 'center', background: '#f8fafc' }}>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0466C8' }}>Choose CSV File</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    style={{ display: 'none' }}
                  />
                  <p style={{ fontSize: '11px', color: '#7D8597', marginTop: '6px', margin: 0, fontWeight: 600 }}>Supports ADDITION, DEDUCTION, and LOP</p>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
