import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar.jsx'

const STATUSES = ['active', 'inactive', 'suspended']

const STATUS_META = {
  active:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Active' },
  inactive:  { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Inactive' },
  suspended: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Suspended' },
}

function StatusBadge({ value }) {
  const m = STATUS_META[value] || {}
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: '600', letterSpacing: '0.03em',
      color: m.color, background: m.bg,
    }}>
      {value === 'active' ? '●' : value === 'suspended' ? '⊘' : '○'} {m.label}
    </span>
  )
}

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '500',
          minWidth: '280px', maxWidth: '360px',
          background: t.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#dc2626' : '#16a34a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          {t.type === 'error' ? '✗' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  )
}

function Field({ label, name, type = 'text', placeholder, required, hint, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#6366f1', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '10px 14px', background: '#f8fafc',
          border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : '#e2e8f0'}`,
          borderRadius: '10px', color: '#1e293b', fontSize: '13px',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : '#e2e8f0'}
      />
      {error && <span style={{ color: '#ef4444', fontSize: '11px' }}>{error}</span>}
      {hint && !error && <span style={{ color: '#94a3b8', fontSize: '11px' }}>{hint}</span>}
    </div>
  )
}

function PasswordField({ label, name, placeholder, required, hint, value, error, onChange }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#6366f1', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(name, e.target.value)}
          style={{
            padding: '10px 42px 10px 14px', background: '#f8fafc',
            border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : '#e2e8f0'}`,
            borderRadius: '10px', color: '#1e293b', fontSize: '13px',
            outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = '#6366f1'}
          onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : '#e2e8f0'}
        />
        <button
          type="button"
          onClick={() => setShow(p => !p)}
          style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: '15px', padding: '0', lineHeight: 1,
          }}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: '11px' }}>{error}</span>}
      {hint && !error && <span style={{ color: '#94a3b8', fontSize: '11px' }}>{hint}</span>}
    </div>
  )
}

function PhoneField({ label, required, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#6366f1', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : '#e2e8f0'}`,
        borderRadius: '10px', background: '#f8fafc', overflow: 'hidden',
      }}>
        <span style={{
          padding: '10px 12px', color: '#94a3b8', fontSize: '13px',
          borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap',
          userSelect: 'none',
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
          onFocus={e => e.currentTarget.parentElement.style.borderColor = '#6366f1'}
          onBlur={e => e.currentTarget.parentElement.style.borderColor = error ? 'rgba(239,68,68,0.5)' : '#e2e8f0'}
        />
        <span style={{ padding: '10px 12px', fontSize: '11px', color: value.length === 10 ? '#22c55e' : '#cbd5e1' }}>
          {value.length}/10
        </span>
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: '11px' }}>{error}</span>}
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar active="client-admins" />
      <Toast toasts={toasts} />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>Client Admins</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Create and manage client administrator accounts — {admins.length} total
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: '#6366f1', border: 'none',
              borderRadius: '12px', color: '#fff', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
          >
            + Add Client Admin
          </button>
        </div>

        {/* Stats row */}
        {admins.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Total', value: admins.length, color: '#6366f1' },
              { label: 'Active', value: admins.filter(a => a.status === 'active').length, color: '#22c55e' },
              { label: 'Inactive', value: admins.filter(a => a.status === 'inactive').length, color: '#64748b' },
              { label: 'Suspended', value: admins.filter(a => a.status === 'suspended').length, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#ffffff', border: '1px solid #e8eaf0',
                borderRadius: '12px', padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{
              flex: '1', minWidth: '220px', padding: '9px 14px',
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '10px', color: '#1e293b', fontSize: '13px',
              outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'active', 'inactive', 'suspended'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '9px 14px', borderRadius: '10px', fontSize: '12px',
                  fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  border: statusFilter === s ? '1px solid rgba(99,102,241,0.5)' : '1px solid #e2e8f0',
                  background: statusFilter === s ? 'rgba(99,102,241,0.08)' : '#ffffff',
                  color: statusFilter === s ? '#6366f1' : '#64748b',
                  textTransform: 'capitalize',
                }}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: '#ffffff', border: '1px solid #e8eaf0',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                {admins.length === 0
                  ? 'No client admins yet. Click "Add Client Admin" to create one.'
                  : 'No results match your search.'}
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e8eaf0' }}>
                  {['Client Admin', 'Company / Organization', 'Phone', 'Status', 'Goal Mode', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#94a3b8',
                      background: '#f8fafc',
                    }}>
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
                      borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Name + Email */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: 'rgba(99,102,241,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '700', color: '#6366f1', flexShrink: 0,
                        }}>
                          {a.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{a.full_name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>{a.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Company / Organization */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          background: 'rgba(59,130,246,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', flexShrink: 0
                        }}>
                          🏢
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                            {a.company_name || a.organization_name || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px', color: a.phone ? '#475569' : '#cbd5e1' }}>
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
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>▼</span>
                      </div>
                      {statusPopup === a.client_admin_id && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            position: 'absolute', top: '100%', left: '16px', zIndex: 100,
                            background: '#ffffff', border: '1px solid #e2e8f0',
                            borderRadius: '10px', overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)', minWidth: '140px',
                          }}
                        >
                          {STATUSES.map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(a.client_admin_id, s)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                width: '100%', padding: '10px 14px',
                                background: a.status === s ? 'rgba(99,102,241,0.06)' : 'none',
                                border: 'none', cursor: 'pointer', fontSize: '12px',
                                color: STATUS_META[s]?.color, fontFamily: 'inherit',
                                textAlign: 'left', fontWeight: '500',
                              }}
                            >
                              {STATUS_META[s]?.label}
                              {a.status === s && <span style={{ marginLeft: 'auto', fontSize: '10px' }}>✓</span>}
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
                          padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                          color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                        }}
                      >
                        <option value="top_down">Top-Down</option>
                        <option value="bottom_up">Bottom-Up</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </td>

                    {/* Created */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEdit(a)}
                          style={{
                            padding: '6px 14px', borderRadius: '8px', fontSize: '12px',
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                            color: '#6366f1', transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(a.client_admin_id)}
                          style={{
                            padding: '6px 14px', borderRadius: '8px', fontSize: '12px',
                            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444', transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create / Edit Modal */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div style={{
            background: '#ffffff', border: '1px solid #e8eaf0',
            borderRadius: '20px', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px 28px 20px', borderBottom: '1px solid #e8eaf0',
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                  {modal === 'create' ? 'Add Client Admin' : 'Edit Client Admin'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {modal === 'create' ? 'Create a new client administrator account' : `Editing ${editTarget?.full_name}`}
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: '#f1f5f9', border: 'none',
                  color: '#94a3b8', cursor: 'pointer', fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
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
                    border: formErrors.company_name ? '1px solid #ef4444' : '1px solid #e2e8f0',
                    borderRadius: '10px', fontSize: '13px', outline: 'none', color: '#1e293b', fontFamily: 'inherit'
                  }}
                >
                  <option value="">+ Create New Company Name Below...</option>
                  {companiesList.map(c => (
                    <option key={c.organization_id} value={c.organization_id}>
                      🏢 {c.company_name}
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
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', letterSpacing: '0.04em' }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Internal notes about this client admin..."
                  rows={3}
                  style={{
                    padding: '10px 14px', background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px', color: '#1e293b', fontSize: '13px',
                    outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '12px',
              padding: '16px 28px 24px', borderTop: '1px solid #e8eaf0',
            }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: '10px 20px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
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
                  fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  background: saving ? 'rgba(99,102,241,0.5)' : '#6366f1',
                  border: 'none', color: '#fff', transition: 'all 0.15s', minWidth: '110px',
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
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#ffffff', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px', padding: '28px 32px', width: '100%', maxWidth: '400px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              Delete Client Admin?
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              This action cannot be undone. The account will be permanently removed.
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '9px 18px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  color: '#64748b',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: '9px 18px', borderRadius: '10px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
