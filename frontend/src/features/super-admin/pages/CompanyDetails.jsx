import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  FiBriefcase, FiMapPin, FiFileText, FiSettings, FiCheckCircle,
  FiX, FiSave, FiUploadCloud
} from 'react-icons/fi'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'

const INDUSTRIES = [
  'Information Technology', 'Banking & Finance', 'Healthcare', 'Manufacturing',
  'Retail & E-commerce', 'Education', 'Construction & Real Estate', 'Logistics & Transportation',
  'Media & Entertainment', 'Hospitality & Tourism', 'Consulting', 'Legal Services',
  'Pharmaceuticals', 'Telecommunications', 'Government / Public Sector', 'Other',
]

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1000', '1001–5000', '5000+']

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD']

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
  'West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra & Nagar Haveli',
  'Daman and Diu','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '40px', overflowY: 'auto', maxWidth: 'calc(100vw - 240px)' },
  header: { marginBottom: '32px' },
  h1: { fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#64748b' },

  section: {
    background: '#ffffff',
    border: 'none',
    borderRadius: '16px', padding: '28px 32px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
  },
  sectionHead: {
    display: 'flex', alignItems: 'center', gap: '12px',
    marginBottom: '24px', paddingBottom: '16px',
    borderBottom: '1px solid #e8eaf0',
  },
  sectionIcon: {
    width: '38px', height: '38px', borderRadius: '10px',
    background: 'rgba(194, 7, 26, 0.08)',
    border: '1px solid rgba(194, 7, 26, 0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  sectionDesc: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' },
  full: { gridColumn: '1 / -1' },

  field: { marginBottom: '0' },
  label: {
    display: 'block', fontSize: '11px', fontWeight: '600',
    color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '7px',
  },
  input: {
    width: '100%', padding: '10px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px', fontSize: '13px',
    color: '#1e293b', outline: 'none',
    transition: 'all 0.2s', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '10px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px', fontSize: '13px',
    color: '#1e293b', outline: 'none',
    transition: 'all 0.2s', fontFamily: 'inherit',
    cursor: 'pointer', boxSizing: 'border-box',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: '36px',
  },
  textarea: {
    width: '100%', padding: '10px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px', fontSize: '13px',
    color: '#1e293b', outline: 'none',
    transition: 'all 0.2s', fontFamily: 'inherit',
    resize: 'vertical', minHeight: '80px',
    boxSizing: 'border-box',
  },

  toast: (type) => ({
    position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
    padding: '14px 20px', borderRadius: '12px',
    fontSize: '13px', fontWeight: '600',
    display: 'flex', alignItems: 'center', gap: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    background: type === 'success' ? '#f0fdf4' : '#fef2f2',
    border: `1px solid ${type === 'success' ? '#86efac' : '#fca5a5'}`,
    color: type === 'success' ? '#16a34a' : '#dc2626',
  }),

  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '12px', marginTop: '8px',
  },
  saveBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
    border: 'none', borderRadius: '10px',
    fontSize: '14px', fontWeight: '700', color: '#ffffff',
    cursor: 'pointer', letterSpacing: '0.02em',
    boxShadow: '0 4px 15px rgba(194, 7, 26, 0.35)',
    transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  lastSaved: { fontSize: '12px', color: '#94a3b8' },
}

const emptyForm = {
  name: '', logo_base64: '', industry: '', company_size: '', founded_year: '',
  email: '', phone: '', website: '',
  address: '', city: '', state: '', pincode: '', country: 'India',
  gst_number: '', pan_number: '', cin_number: '', tan_number: '',
  fiscal_year_start: '4', payroll_day: '28', currency: 'INR',
  work_days_per_week: '5', work_hours_per_day: '8',
  probation_months: '6', notice_days: '30', emp_code_prefix: 'EMP',
}

export default function CompanyDetails() {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const fileRef = useRef()
  const token = sessionStorage.getItem('sa_token')

  useEffect(() => {
    axios.get('/api/super-admin/company', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const d = res.data
        setForm({
          name: d.name || '',
          logo_base64: d.logo_base64 || '',
          industry: d.industry || '',
          company_size: d.company_size || '',
          founded_year: d.founded_year || '',
          email: d.email || '',
          phone: d.phone || '',
          website: d.website || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          pincode: d.pincode || '',
          country: d.country || 'India',
          gst_number: d.gst_number || '',
          pan_number: d.pan_number || '',
          cin_number: d.cin_number || '',
          tan_number: d.tan_number || '',
          fiscal_year_start: String(d.fiscal_year_start || 4),
          payroll_day: String(d.payroll_day || 28),
          currency: d.currency || 'INR',
          work_days_per_week: String(d.work_days_per_week || 5),
          work_hours_per_day: String(d.work_hours_per_day || 8),
          probation_months: String(d.probation_months || 6),
          notice_days: String(d.notice_days || 30),
          emp_code_prefix: d.emp_code_prefix || 'EMP',
        })
        if (d.logo_base64) setLogoPreview(d.logo_base64)
        if (d.updated_at) setLastSaved(new Date(d.updated_at).toLocaleString())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Logo must be under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      setLogoPreview(ev.target.result)
      set('logo_base64', ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoPreview(null)
    set('logo_base64', '')
    if (fileRef.current) fileRef.current.value = ''
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      showToast('error', 'Company name is required.')
      return
    }
    setSaving(true)
    try {
      await axios.put('/api/super-admin/company', form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLastSaved(new Date().toLocaleString())
      showToast('success', 'Company details saved successfully.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function inputProps(key, extra = {}) {
    return {
      value: form[key],
      onChange: e => set(key, e.target.value),
      style: s.input,
      onFocus: e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' },
      onBlur: e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' },
      ...extra,
    }
  }

  if (loading) return (
    <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center' }}>
      <Sidebar active="company" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '3px solid rgba(194, 7, 26, 0.2)', borderTopColor: '#C2071A',
          animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
        }} />
        <div style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '12px' }}>Loading company details...</div>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <Sidebar active="company" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="Company Details" />
        <main style={s.main}>
        {toast && (
          <div style={s.toast(toast.type)}>
            {toast.type === 'success' ? <FiCheckCircle size={16} color="#16a34a" /> : <FiX size={16} color="#dc2626" />}
            {toast.msg}
          </div>
        )}

        <div style={s.header}>
          <h1 style={s.h1}>Company Details</h1>
          <p style={s.sub}>Configure your organisation's profile, legal info, and HR settings</p>
        </div>

        {/* ── Section 1: Identity ─────────────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={s.sectionIcon}>
              <FiBriefcase size={18} color="#C2071A" />
            </div>
            <div>
              <div style={s.sectionTitle}>Company Identity</div>
              <div style={s.sectionDesc}>Basic profile visible across the platform</div>
            </div>
          </div>

          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '24px' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '16px', flexShrink: 0,
              border: '2px dashed #e2e8f0',
              background: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
            }} onClick={() => fileRef.current?.click()}>
              {logoPreview
                ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                : <FiBriefcase size={28} color="#94a3b8" />
              }
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>Company Logo</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>PNG, JPG or SVG · Max 2 MB · Recommended 200×200px</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => fileRef.current?.click()} style={{
                  padding: '7px 14px', background: 'rgba(194, 7, 26, 0.08)',
                  border: '1px solid rgba(194, 7, 26, 0.2)', borderRadius: '8px',
                  color: '#C2071A', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <FiUploadCloud size={14} color="#C2071A" /> Upload Logo
                </button>
                {logoPreview && (
                  <button onClick={removeLogo} style={{
                    padding: '7px 14px', background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
                    color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  }}>Remove</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </div>
          </div>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Company Name *</label>
              <input {...inputProps('name', { placeholder: 'Insight Technology Pvt. Ltd.' })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Industry</label>
              <select value={form.industry} onChange={e => set('industry', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                <option value="">— Select Industry —</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Company Size</label>
              <select value={form.company_size} onChange={e => set('company_size', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                <option value="">— Select Size —</option>
                {COMPANY_SIZES.map(sz => <option key={sz} value={sz}>{sz} employees</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Founded Year</label>
              <input {...inputProps('founded_year', { type: 'number', placeholder: '2010', min: '1900', max: new Date().getFullYear() })} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Contact & Address ────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={{ ...s.sectionIcon, background: 'rgba(194, 7, 26, 0.08)', border: '1px solid rgba(194, 7, 26, 0.15)' }}>
              <FiMapPin size={18} color="#C2071A" />
            </div>
            <div>
              <div style={s.sectionTitle}>Contact & Address</div>
              <div style={s.sectionDesc}>Official contact details and registered office address</div>
            </div>
          </div>

          <div style={{ ...s.grid3, marginBottom: '16px' }}>
            <div style={s.field}>
              <label style={s.label}>Official Email</label>
              <input {...inputProps('email', { type: 'email', placeholder: 'hr@company.com' })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Phone Number</label>
              <input {...inputProps('phone', { placeholder: '+91 98765 43210' })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Website</label>
              <input {...inputProps('website', { placeholder: 'https://company.com' })} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Street Address</label>
            <textarea
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="123, MG Road, Nungambakkam"
              style={s.textarea}
              onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
              onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={s.grid4}>
            <div style={s.field}>
              <label style={s.label}>City</label>
              <input {...inputProps('city', { placeholder: 'Chennai' })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                <option value="">— State —</option>
                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Pincode</label>
              <input {...inputProps('pincode', { placeholder: '600001', maxLength: 10 })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Country</label>
              <input {...inputProps('country', { placeholder: 'India' })} />
            </div>
          </div>
        </div>

        {/* ── Section 3: Legal Information ────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={{ ...s.sectionIcon, background: 'rgba(194, 7, 26, 0.08)', border: '1px solid rgba(194, 7, 26, 0.15)' }}>
              <FiFileText size={18} color="#C2071A" />
            </div>
            <div>
              <div style={s.sectionTitle}>Legal Information</div>
              <div style={s.sectionDesc}>Statutory registration numbers used in payroll and compliance</div>
            </div>
          </div>

          <div style={s.grid4}>
            <div style={s.field}>
              <label style={s.label}>GST Number</label>
              <input {...inputProps('gst_number', { placeholder: '22AAAAA0000A1Z5', style: { ...s.input, textTransform: 'uppercase' } })}
                onChange={e => set('gst_number', e.target.value.toUpperCase())} />
            </div>
            <div style={s.field}>
              <label style={s.label}>PAN Number</label>
              <input {...inputProps('pan_number', { placeholder: 'AAAAA0000A', style: { ...s.input, textTransform: 'uppercase' } })}
                onChange={e => set('pan_number', e.target.value.toUpperCase())} />
            </div>
            <div style={s.field}>
              <label style={s.label}>CIN Number</label>
              <input {...inputProps('cin_number', { placeholder: 'U74999TN2010PTC000000', style: { ...s.input, textTransform: 'uppercase' } })}
                onChange={e => set('cin_number', e.target.value.toUpperCase())} />
            </div>
            <div style={s.field}>
              <label style={s.label}>TAN Number</label>
              <input {...inputProps('tan_number', { placeholder: 'CHEN12345F', style: { ...s.input, textTransform: 'uppercase' } })}
                onChange={e => set('tan_number', e.target.value.toUpperCase())} />
            </div>
          </div>
        </div>

        {/* ── Section 4: Payroll & HR Config ──────────────────── */}
        <div style={s.section}>
          <div style={s.sectionHead}>
            <div style={{ ...s.sectionIcon, background: 'rgba(194, 7, 26, 0.08)', border: '1px solid rgba(194, 7, 26, 0.15)' }}>
              <FiSettings size={18} color="#C2071A" />
            </div>
            <div>
              <div style={s.sectionTitle}>Payroll & HR Configuration</div>
              <div style={s.sectionDesc}>Defaults applied across all payroll, attendance, and leave modules</div>
            </div>
          </div>

          <div style={{ ...s.grid3, marginBottom: '16px' }}>
            <div style={s.field}>
              <label style={s.label}>Fiscal Year Start</label>
              <select value={form.fiscal_year_start} onChange={e => set('fiscal_year_start', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Payroll Processing Day</label>
              <select value={form.payroll_day} onChange={e => set('payroll_day', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...s.grid4, marginBottom: '16px' }}>
            <div style={s.field}>
              <label style={s.label}>Work Days / Week</label>
              <select value={form.work_days_per_week} onChange={e => set('work_days_per_week', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {[4, 5, 6, 7].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Work Hours / Day</label>
              <select value={form.work_hours_per_day} onChange={e => set('work_hours_per_day', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {[6, 7, 8, 9, 10, 12].map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Probation Period</label>
              <select value={form.probation_months} onChange={e => set('probation_months', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Notice Period</label>
              <select value={form.notice_days} onChange={e => set('notice_days', e.target.value)} style={s.select}
                onFocus={e => { e.target.style.border = '1px solid #C2071A'; e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)' }}
                onBlur={e => { e.target.style.border = '1px solid #e2e8f0'; e.target.style.boxShadow = 'none' }}>
                {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            <div style={{ ...s.field, maxWidth: '220px' }}>
              <label style={s.label}>Employee Code Prefix</label>
              <input
                {...inputProps('emp_code_prefix', { placeholder: 'EMP', maxLength: 10, style: { ...s.input, textTransform: 'uppercase', letterSpacing: '0.06em' } })}
                onChange={e => set('emp_code_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
            </div>
            <div style={{ paddingBottom: '2px', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
              Employee codes will be generated as&nbsp;
              <span style={{ color: '#C2071A', fontWeight: '600', fontFamily: 'monospace' }}>
                {(form.emp_code_prefix || 'EMP').toUpperCase()}0001
              </span>
              ,&nbsp;
              <span style={{ color: '#C2071A', fontWeight: '600', fontFamily: 'monospace' }}>
                {(form.emp_code_prefix || 'EMP').toUpperCase()}0002
              </span>
              …
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div style={s.footer}>
          <span style={s.lastSaved}>
            {lastSaved ? `Last saved: ${lastSaved}` : 'No changes saved yet'}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...s.saveBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 6px 20px rgba(194, 7, 26, 0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(194, 7, 26, 0.35)' }}
          >
            <FiSave size={15} color="#ffffff" style={{ stroke: '#ffffff' }} />
            {saving ? 'Saving...' : 'Save Company Details'}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
      </div>
    </div>
  )
}

