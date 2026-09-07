import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'
import {
  FiUsers, FiUserCheck, FiUserX, FiPlus, FiBriefcase,
  FiSearch, FiEye, FiEyeOff, FiEdit2, FiTrash2,
  FiAlertTriangle, FiX, FiCheckCircle, FiAlertCircle, FiChevronDown
} from 'react-icons/fi'

const STATUSES = ['active', 'inactive', 'suspended']

const STATUS_META = {
  active:    { color: '#15803d', bg: '#dcfce7', label: 'Active' },
  inactive:  { color: '#64748b', bg: '#f1f5f9', label: 'Inactive' },
  suspended: { color: '#b91c1c', bg: '#fee2e2', label: 'Suspended' },
}

function StatusBadge({ value }) {
  const m = STATUS_META[value] || {}
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: '700', letterSpacing: '0.03em',
      color: m.color, background: m.bg,
    }}>
      {m.label}
    </span>
  )
}

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
          minWidth: '280px', maxWidth: '360px',
          background: t.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#dc2626' : '#16a34a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {t.type === 'error' ? <FiAlertCircle size={16} color="#dc2626" /> : <FiCheckCircle size={16} color="#16a34a" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

function Field({ label, name, type = 'text', placeholder, required, hint, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '10px 14px', background: '#f8fafc',
          border: `1px solid ${error ? '#ef4444' : '#cbd5e1'}`,
          borderRadius: '10px', color: '#1e293b', fontSize: '13px',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        onFocus={e => e.target.style.borderColor = '#C2071A'}
        onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#cbd5e1'}
      />
      {error && <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>{error}</span>}
      {hint && !error && <span style={{ color: '#94a3b8', fontSize: '11px' }}>{hint}</span>}
    </div>
  )
}

function PasswordField({ label, name, placeholder, required, hint, value, error, onChange }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(name, e.target.value)}
          style={{
            padding: '10px 42px 10px 14px', background: '#f8fafc',
            border: `1px solid ${error ? '#ef4444' : '#cbd5e1'}`,
            borderRadius: '10px', color: '#1e293b', fontSize: '13px',
            outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = '#C2071A'}
          onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#cbd5e1'}
        />
        <button
          type="button"
          onClick={() => setShow(p => !p)}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: '15px', padding: '0', lineHeight: 1, display: 'flex', alignItems: 'center'
          }}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>{error}</span>}
      {hint && !error && <span style={{ color: '#94a3b8', fontSize: '11px' }}>{hint}</span>}
    </div>
  )
}

function PhoneField({ label, required, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${error ? '#ef4444' : '#cbd5e1'}`,
        borderRadius: '10px', background: '#f8fafc', overflow: 'hidden',
      }}>
        <span style={{
          padding: '10px 12px', color: '#64748b', fontSize: '13px', fontWeight: '700',
          borderRight: '1px solid #cbd5e1', whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          +91
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder="98765 43210"
          maxLength={10}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
            onChange('phone', digits)
          }}
          style={{
            flex: 1, padding: '10px 14px', background: 'transparent',
            border: 'none', color: '#1e293b', fontSize: '13px',
            outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => e.currentTarget.parentElement.style.borderColor = '#C2071A'}
          onBlur={e => e.currentTarget.parentElement.style.borderColor = error ? '#ef4444' : '#cbd5e1'}
        />
        <span style={{ padding: '10px 12px', fontSize: '11px', color: value.length === 10 ? '#15803d' : '#94a3b8', fontWeight: '700' }}>
          {value.length}/10
        </span>
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600' }}>{error}</span>}
    </div>
  )
}

const emptyForm = { organization_id: '', full_name: '', company_name: '', email: '', phone: '', password: '', confirm_password: '', notes: '' }

export default function ClientAdmins() {
  const navigate = useNavigate()
  const location = useLocation()
  const [admins, setAdmins] = useState([])
  const [companiesList, setCompaniesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [statusPopup, setStatusPopup] = useState(null)
  const toastIdRef = useRef(0)

  const token = sessionStorage.getItem('sa_token')
  const headers = { Authorization: `Bearer ${token}` }

  function toast(msg, type = 'success') {
    const id = ++toastIdRef.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }

  async function fetchAdmins() {
    try {
      const [admRes, compRes] = await Promise.all([
        axios.get('/api/super-admin/client-admins', { headers }),
        axios.get('/api/super-admin/client-admins/companies', { headers })
      ])
      setAdmins(admRes.data)
      setCompaniesList(compRes.data)
    } catch {
      toast('Failed to load client admins.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAdmins() }, [])

  useEffect(() => {
    if (location.state?.createForOrgId) {
      setForm({
        ...emptyForm,
        organization_id: location.state.createForOrgId,
        company_name: location.state.createForCompany || ''
      })
      setModal('create')
    }
  }, [location.state])

  useEffect(() => {
    function handleClick() { setStatusPopup(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  function openCreate() {
    setForm(emptyForm)
    setFormErrors({})
    setEditTarget(null)
    setModal('create')
  }

  function openEdit(admin) {
    const rawPhone = (admin.phone || '').replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10)
    setForm({
      organization_id: admin.organization_id || '',
      full_name: admin.full_name || '',
      company_name: admin.company_name || admin.organization_name || '',
      email: admin.email || '',
      phone: rawPhone,
      password: '',
      confirm_password: '',
      notes: admin.notes || '',
    })
    setFormErrors({})
    setEditTarget(admin)
    setModal('edit')
  }

  function validateForm() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Required'
    if (!form.company_name.trim()) errs.company_name = 'Required'
    if (!form.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (form.phone && form.phone.length !== 10) errs.phone = 'Must be exactly 10 digits'
    if (modal === 'create' && !form.password) errs.password = 'Required'
    if (form.password && form.password.length < 8) errs.password = 'Min 8 characters'
    if (form.password && form.confirm_password !== form.password) errs.confirm_password = 'Passwords do not match'
    if (modal === 'create' && form.password && !form.confirm_password) errs.confirm_password = 'Required'
    return errs
  }

  async function handleSave() {
    const errs = validateForm()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirm_password, ...rest } = form
      const payload = { ...rest, phone: form.phone ? `+91${form.phone}` : '' }
      if (modal === 'create') {
        await axios.post('/api/super-admin/client-admins', payload, { headers })
        toast('Client admin created successfully.')
      } else {
        await axios.put(`/api/super-admin/client-admins/${editTarget.client_admin_id}`, payload, { headers })
        toast('Client admin updated successfully.')
      }
      setModal(null)
      fetchAdmins()
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id, status) {
    setStatusPopup(null)
    try {
      await axios.patch(`/api/super-admin/client-admins/${id}/status`, { status }, { headers })
      setAdmins(p => p.map(a => a.client_admin_id === id ? { ...a, status } : a))
      toast(`Status updated to ${status}.`)
    } catch (err) {
      toast(err.response?.data?.message || 'Status update failed.', 'error')
    }
  }

  async function handleDelete(id) {
    setDeleteConfirm(null)
    try {
      await axios.delete(`/api/super-admin/client-admins/${id}`, { headers })
      setAdmins(p => p.filter(a => a.client_admin_id !== id))
      toast('Client admin deleted.')
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed.', 'error')
    }
  }

  const filtered = admins.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  function handleFieldChange(name, value) {
    setForm(p => ({ ...p, [name]: value }))
    setFormErrors(p => ({ ...p, [name]: '' }))
  }

  const thStyle = {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#ffffff',
          background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
    borderBottom: 'none'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="client-admins" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="Client Admins" />
        <Toast toasts={toasts} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiUsers size={20} color="#C2071A" strokeWidth={2.5} />
              </div>
              Client Admins
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              Create and manage client administrator accounts — {admins.length} total
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', border: 'none',
              borderRadius: '12px', color: '#ffffff', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(194, 7, 26, 0.25)', transition: 'all 0.15s ease'
            }}
          >
            <FiPlus size={16} color="#ffffff" stroke="#ffffff" />
            <span>Add Client Admin</span>
          </button>
        </div>

        {/* Stats row */}
        {admins.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: 'Total Admins', value: admins.length, color: '#C2071A', bg: '#FEECEE' },
              { label: 'Active', value: admins.filter(a => a.status === 'active').length, color: '#15803d', bg: '#dcfce7' },
              { label: 'Inactive', value: admins.filter(a => a.status === 'inactive').length, color: '#64748b', bg: '#f1f5f9' },
              { label: 'Suspended', value: admins.filter(a => a.status === 'suspended').length, color: '#b91c1c', bg: '#fee2e2' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#ffffff', border: 'none',
                borderRadius: '16px', padding: '20px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                display: 'flex', alignItems: 'center', gap: '14px'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: s.color, fontSize: '16px' }}>
                  {s.value}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <FiSearch size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                background: '#ffffff', border: '1px solid #cbd5e1',
                borderRadius: '10px', color: '#1e293b', fontSize: '13px',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'active', 'inactive', 'suspended'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '9px 16px', borderRadius: '10px', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  border: statusFilter === s ? 'none' : '1px solid #cbd5e1',
                  background: statusFilter === s ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : '#ffffff',
                  color: statusFilter === s ? '#ffffff' : '#64748b',
                  textTransform: 'capitalize',
                  boxShadow: statusFilter === s ? '0 2px 8px rgba(194,7,26,0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: '#ffffff', border: 'none',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
              Loading client admins...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <FiUsers size={24} color="#C2071A" />
              </div>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                {admins.length === 0
                  ? 'No client admins yet. Click "Add Client Admin" to create one.'
                  : 'No results match your search.'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' }}>
                    {['Client Admin', 'Company / Organization', 'Phone', 'Status', 'Goal Mode', 'Created', 'Actions'].map(h => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr
                      key={a.client_admin_id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #edf2f7' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Name + Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: '#FEECEE',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: '800', color: '#C2071A', flexShrink: 0,
                          }}>
                            {a.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{a.full_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px', fontWeight: 500 }}>{a.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company / Organization */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            background: '#FEECEE',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FiBriefcase size={14} color="#C2071A" />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                              {a.company_name || a.organization_name || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', color: a.phone ? '#475569' : '#94a3b8', fontWeight: 600 }}>
                          {a.phone || '—'}
                        </div>
                      </td>

                      {/* Status — clickable dropdown */}
                      <td style={{ padding: '14px 16px', position: 'relative' }}>
                        <div
                          onClick={e => { e.stopPropagation(); setStatusPopup(statusPopup === a.client_admin_id ? null : a.client_admin_id) }}
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <StatusBadge value={a.status} />
                          <FiChevronDown size={12} color="#64748b" />
                        </div>
                        {statusPopup === a.client_admin_id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute', top: '100%', left: '16px', zIndex: 100,
                              background: '#ffffff', border: '1px solid #cbd5e1',
                              borderRadius: '10px', overflow: 'hidden',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: '140px',
                            }}
                          >
                            {STATUSES.map(s => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(a.client_admin_id, s)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  width: '100%', padding: '10px 14px',
                                  background: a.status === s ? '#FEECEE' : 'none',
                                  border: 'none', cursor: 'pointer', fontSize: '12px',
                                  color: STATUS_META[s]?.color, fontFamily: 'inherit',
                                  textAlign: 'left', fontWeight: '700',
                                }}
                              >
                                {STATUS_META[s]?.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Goal Mode */}
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={a.goal_mode || 'hybrid'}
                          onChange={async e => {
                            const mode = e.target.value
                            try {
                              await axios.patch(`/api/super-admin/client-admins/${a.id}/goal-mode`, { goal_mode: mode }, { headers })
                              setAdmins(p => p.map(x => x.id === a.id ? { ...x, goal_mode: mode } : x))
                              toast(`Goal mode set to ${mode}.`)
                            } catch { toast('Failed to update goal mode.', 'error') }
                          }}
                          style={{
                            padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: '#FEECEE', border: '1px solid rgba(194, 7, 26, 0.2)',
                            color: '#C2071A', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                          }}
                        >
                          <option value="top_down">Top-Down</option>
                          <option value="bottom_up">Bottom-Up</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </td>

                      {/* Created */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                          {new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openEdit(a)}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                              fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                              background: '#FEECEE', border: '1px solid rgba(194,7,26,0.2)',
                              color: '#C2071A', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <FiEdit2 size={13} color="#C2071A" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(a.client_admin_id)}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                              fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                              background: '#fee2e2', border: '1px solid rgba(185,28,28,0.2)',
                              color: '#b91c1c', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <FiTrash2 size={13} color="#b91c1c" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div style={{
            background: '#ffffff', border: 'none',
            borderRadius: '20px', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px 28px 20px', borderBottom: '1px solid #edf2f7',
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  {modal === 'create' ? 'Add Client Admin' : 'Edit Client Admin'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                  {modal === 'create' ? 'Create a new client administrator account' : `Editing ${editTarget?.full_name}`}
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: '#f1f5f9', border: 'none',
                  color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assign to Company / Organization <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={form.organization_id}
                  onChange={e => {
                    const orgId = e.target.value
                    const found = companiesList.find(c => c.organization_id === orgId)
                    setForm(p => ({
                      ...p,
                      organization_id: orgId,
                      company_name: found ? found.company_name : p.company_name
                    }))
                    setFormErrors(p => ({ ...p, company_name: '' }))
                  }}
                  style={{
                    padding: '10px 14px', background: '#f8fafc',
                    border: formErrors.company_name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                    borderRadius: '10px', fontSize: '13px', outline: 'none', color: '#1e293b', fontFamily: 'inherit'
                  }}
                >
                  <option value="">+ Create New Company Name Below...</option>
                  {companiesList.map(c => (
                    <option key={c.organization_id} value={c.organization_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {(!form.organization_id || modal === 'edit') && (
                <Field
                  label="New Company Name"
                  name="company_name"
                  placeholder="e.g. ABC Technologies Inc."
                  required
                  value={form.company_name}
                  error={formErrors.company_name}
                  onChange={handleFieldChange}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Client Admin Full Name" name="full_name" placeholder="Jane Doe" required
                  value={form.full_name} error={formErrors.full_name} onChange={handleFieldChange} />
                <Field label="Email Address" name="email" type="email" placeholder="jane@example.com" required
                  value={form.email} error={formErrors.email} onChange={handleFieldChange} />
              </div>
              <PhoneField
                label="Phone Number"
                value={form.phone}
                error={formErrors.phone}
                onChange={handleFieldChange}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <PasswordField
                  label={modal === 'create' ? 'Password' : 'New Password'}
                  name="password"
                  placeholder={modal === 'create' ? 'Min 8 characters' : 'Leave blank to keep current'}
                  required={modal === 'create'}
                  hint={modal === 'edit' ? 'Leave blank to keep existing' : undefined}
                  value={form.password} error={formErrors.password} onChange={handleFieldChange}
                />
                <PasswordField
                  label="Confirm Password"
                  name="confirm_password"
                  placeholder="Re-enter password"
                  required={modal === 'create' && !!form.password}
                  value={form.confirm_password} error={formErrors.confirm_password} onChange={handleFieldChange}
                />
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Internal notes about this client admin..."
                  rows={3}
                  style={{
                    padding: '10px 14px', background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px', color: '#1e293b', fontSize: '13px',
                    outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5',
                  }}
                  onFocus={e => e.target.style.borderColor = '#C2071A'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '12px',
              padding: '16px 28px 24px', borderTop: '1px solid #edf2f7',
            }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: '10px 20px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  color: '#64748b',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 24px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  background: saving ? '#fca5a5' : 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                  border: 'none', color: '#ffffff', boxShadow: '0 4px 12px rgba(194, 7, 26, 0.25)', minWidth: '110px',
                }}
              >
                {saving ? 'Saving...' : modal === 'create' ? 'Create Admin' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', border: 'none',
            borderRadius: '20px', padding: '28px 32px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <FiAlertTriangle size={24} color="#b91c1c" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Delete Client Admin?
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6', fontWeight: 500 }}>
              This action cannot be undone. The account will be permanently removed.
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 18px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  color: '#64748b',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: '10px 18px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', border: 'none',
                  color: '#ffffff', boxShadow: '0 4px 12px rgba(185,28,28,0.25)', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <FiTrash2 size={16} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
