import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'
import {
  FiPlus, FiSearch, FiX, FiFilter, FiChevronDown, FiChevronUp,
  FiList, FiCheckCircle, FiXCircle, FiDollarSign, FiEdit2, FiCalendar,
  FiCheck, FiMinus, FiAlertCircle
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const PAGE_SIZE = 8

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export default function LeaveTypesConfig() {
  const [types, setTypes]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [page, setPage]           = useState(1)

  // Filters
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('ALL')
  const [paidFilter, setPaidFilter]       = useState('ALL')
  const [halfDayFilter, setHalfDayFilter] = useState('ALL')
  const [sortBy, setSortBy]               = useState('leave_type_name')
  const [sortDir, setSortDir]             = useState('asc')
  const [showAdvanced, setShowAdvanced]   = useState(false)

  // Form fields
  const [name, setName]               = useState('')
  const [code, setCode]               = useState('')
  const [description, setDescription] = useState('')
  const [quota, setQuota]             = useState('0')
  const [isPaid, setIsPaid]           = useState(true)
  const [reqAttachment, setReqAttachment] = useState(false)
  const [allowHalf, setAllowHalf]     = useState(true)
  const [allowNeg, setAllowNeg]       = useState(false)
  const [maxConsecutive, setMaxConsecutive] = useState('')
  const [isActive, setIsActive]       = useState(true)
  const [formError, setFormError]     = useState('')

  function fetchLeaveTypes() {
    setLoading(true)
    api.get('/v1/leave/leave-types')
      .then(res => { setTypes(res.data || []); setPage(1) })
      .catch(err => {
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLeaveTypes() }, [])

  const stats = useMemo(() => ({
    total:    types.length,
    active:   types.filter(t => t.is_active).length,
    paid:     types.filter(t => t.is_paid_leave).length,
    inactive: types.filter(t => !t.is_active).length,
  }), [types])

  const hasAdvancedFilters = paidFilter !== 'ALL' || halfDayFilter !== 'ALL' || sortBy !== 'leave_type_name' || sortDir !== 'asc'
  const hasAnyFilter       = search || statusFilter !== 'ALL' || paidFilter !== 'ALL' || halfDayFilter !== 'ALL'

  const filtered = useMemo(() => {
    let rows = types.filter(t => {
      if (search) {
        const q = search.toLowerCase()
        if (![t.leave_type_name, t.leave_type_code, t.description].some(f => f?.toLowerCase().includes(q))) return false
      }
      if (statusFilter === 'ACTIVE'   && !t.is_active)    return false
      if (statusFilter === 'INACTIVE' && t.is_active)     return false
      if (paidFilter   === 'PAID'     && !t.is_paid_leave) return false
      if (paidFilter   === 'UNPAID'   && t.is_paid_leave)  return false
      if (halfDayFilter === 'ALLOWED' && !t.allows_half_day) return false
      if (halfDayFilter === 'BLOCKED' && t.allows_half_day)  return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      let va = a[sortBy]; let vb = b[sortBy]
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [types, search, statusFilter, paidFilter, halfDayFilter, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetAll() {
    setSearch(''); setStatusFilter('ALL'); setPaidFilter('ALL')
    setHalfDayFilter('ALL'); setSortBy('leave_type_name'); setSortDir('asc'); setPage(1)
  }

  function openCreateModal() {
    setEditingType(null)
    setName(''); setCode(''); setDescription(''); setQuota('0')
    setIsPaid(true); setReqAttachment(false); setAllowHalf(true)
    setAllowNeg(false); setMaxConsecutive(''); setIsActive(true); setFormError('')
    setModalOpen(true)
  }

  function openEditModal(t) {
    setEditingType(t)
    setName(t.leave_type_name); setCode(t.leave_type_code)
    setDescription(t.description || ''); setQuota(t.annual_quota_days.toString())
    setIsPaid(t.is_paid_leave); setReqAttachment(t.requires_attachment)
    setAllowHalf(t.allows_half_day); setAllowNeg(t.allows_negative_balance)
    setMaxConsecutive(t.max_consecutive_days ? t.max_consecutive_days.toString() : '')
    setIsActive(t.is_active); setFormError('')
    setModalOpen(true)
  }

  function handleSave(e) {
    e.preventDefault(); setFormError('')
    if (!name.trim()) return setFormError('Name is required.')
    if (!code.trim()) return setFormError('Code is required.')

    const payload = {
      leave_type_name: name.trim(), leave_type_code: code.trim(),
      description: description.trim(), annual_quota_days: parseFloat(quota) || 0.0,
      is_paid_leave: isPaid, requires_attachment: reqAttachment,
      allows_half_day: allowHalf, allows_negative_balance: allowNeg,
      max_consecutive_days: parseInt(maxConsecutive, 10) || null, is_active: isActive
    }

    const req = editingType
      ? api.put(`/v1/leave/leave-types/${editingType.leave_type_id}`, payload)
      : api.post('/v1/leave/leave-types', payload)

    req.then(() => { setModalOpen(false); fetchLeaveTypes() })
      .catch(err => {
        setFormError(err.response?.data?.message || 'Error saving.')
        if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
      })
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#f8fafc',
    border: '1px solid #E3E7EE', borderRadius: '10px',
    fontSize: '13px', color: '#001233', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.15s'
  }

  const isStatActive = (key) => {
    if (key === 'ALL')      return statusFilter === 'ALL' && paidFilter === 'ALL'
    if (key === 'ACTIVE')   return statusFilter === 'ACTIVE'
    if (key === 'INACTIVE') return statusFilter === 'INACTIVE'
    if (key === 'PAID')     return paidFilter === 'PAID'
    return false
  }

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#F1F4F8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="leave" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Header */}
          <PageHeader
            icon={FiCalendar}
            title="Leave Policies"
            subtitle="Define and customize standard organizational leave types and rules"
            actions={
              <button
                onClick={openCreateModal}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(4, 102, 200,0.35)', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <AddIcon size={20} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Add Leave Type</span>
              </button>
            }
          />

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { key: 'ALL',      label: 'Total Policies',   value: stats.total,    color: '#0466C8', icon: <FiList size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { key: 'ACTIVE',   label: 'Active',           value: stats.active,   color: '#0466C8', icon: <FiCheckCircle size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { key: 'PAID',     label: 'Paid Leave Types', value: stats.paid,     color: '#0466C8', icon: <FiDollarSign size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { key: 'INACTIVE', label: 'Inactive',         value: stats.inactive, color: '#0466C8', icon: <FiXCircle size={22} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
            ].map(({ key, label, value, color, icon }) => {
              const active = isStatActive(key)
              return (
                <div
                  key={key}
                  onClick={() => {
                    if (key === 'ALL')      { setStatusFilter('ALL'); setPaidFilter('ALL') }
                    else if (key === 'ACTIVE')   setStatusFilter('ACTIVE')
                    else if (key === 'INACTIVE') setStatusFilter('INACTIVE')
                    else if (key === 'PAID')     { setPaidFilter('PAID'); setStatusFilter('ALL') }
                    setPage(1)
                  }}
                  style={{ background: '#fff', border: `1.5px solid ${active ? color : '#E3E7EE'}`, borderRadius: '14px', padding: '18px 20px', boxShadow: active ? `0 4px 14px ${color}22` : '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: active ? color : '#001233', lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '12px', color: '#7D8597', fontWeight: '600', marginTop: 3 }}>{label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 260px', minWidth: '180px', maxWidth: '260px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '9px', padding: '0 11px' }}>
                <FiSearch size={13} color="#94a3b8" />
                <input
                  placeholder="Search leave type, code or description…"
                  value={search}
                  className="ca-borderless-input"
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '13px', color: '#001233', outline: 'none', fontFamily: 'inherit', width: '100%' }}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                    <FiX size={12} />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                style={{ padding: '8px 11px', border: '1px solid #E3E7EE', borderRadius: '9px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <button
                onClick={() => setShowAdvanced(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', background: showAdvanced || hasAdvancedFilters ? '#EEF8FF' : '#f8fafc', border: `1px solid ${showAdvanced || hasAdvancedFilters ? '#C9DDF3' : '#E3E7EE'}`, borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: showAdvanced || hasAdvancedFilters ? '#023E7D' : '#374151', cursor: 'pointer' }}>
                <FiFilter size={12} />
                Advanced {hasAdvancedFilters ? '•' : ''}
                {showAdvanced ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
              </button>

              {hasAnyFilter && (
                <button onClick={resetAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '9px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}>
                  <FiX size={11} /> Clear All
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <FiFilter size={12} color="#94a3b8" />
                <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: '600' }}>
                  {filtered.length} of {types.length} polic{filtered.length !== 1 ? 'ies' : 'y'}
                </span>
              </div>
            </div>

            {showAdvanced && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F4F8', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pay Type</label>
                  <select value={paidFilter} onChange={e => { setPaidFilter(e.target.value); setPage(1) }}
                    style={{ padding: '7px 11px', border: '1px solid #E3E7EE', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '130px' }}>
                    <option value="ALL">All Types</option>
                    <option value="PAID">Paid Only</option>
                    <option value="UNPAID">Unpaid Only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Half Day</label>
                  <select value={halfDayFilter} onChange={e => { setHalfDayFilter(e.target.value); setPage(1) }}
                    style={{ padding: '7px 11px', border: '1px solid #E3E7EE', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '130px' }}>
                    <option value="ALL">All</option>
                    <option value="ALLOWED">Allowed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort By</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ padding: '7px 11px', border: '1px solid #E3E7EE', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', minWidth: '150px' }}>
                    <option value="leave_type_name">Name</option>
                    <option value="leave_type_code">Code</option>
                    <option value="annual_quota_days">Annual Quota</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order</label>
                  <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #E3E7EE', overflow: 'hidden' }}>
                    {[{ val: 'asc', label: '↑ A–Z' }, { val: 'desc', label: '↓ Z–A' }].map(o => (
                      <button key={o.val} onClick={() => setSortDir(o.val)}
                        style={{ padding: '7px 12px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', background: sortDir === o.val ? '#0466C8' : '#f8fafc', color: sortDir === o.val ? '#fff' : '#374151', transition: 'all 0.15s' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasAdvancedFilters && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '10px', color: 'transparent' }}>&nbsp;</label>
                    <button onClick={() => { setPaidFilter('ALL'); setHalfDayFilter('ALL'); setSortBy('leave_type_name'); setSortDir('asc') }}
                      style={{ padding: '7px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Tab Pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { val: 'ALL',      label: 'All',      count: types.length,   color: '#0466C8' },
              { val: 'ACTIVE',   label: 'Active',   count: stats.active,   color: '#16a34a' },
              { val: 'INACTIVE', label: 'Inactive', count: stats.inactive, color: '#dc2626' },
            ].map(o => (
              <button key={o.val} onClick={() => { setStatusFilter(o.val); setPage(1) }} style={{
                padding: '7px 16px', borderRadius: '20px',
                border: `1.5px solid ${statusFilter === o.val ? o.color : '#E3E7EE'}`,
                background: statusFilter === o.val ? o.color : '#fff',
                color: statusFilter === o.val ? '#fff' : '#33415C',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s',
              }}>
                {o.label}
                <span style={{ background: statusFilter === o.val ? 'rgba(255,255,255,0.25)' : '#F1F4F8', color: statusFilter === o.val ? '#fff' : '#374151', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' }}>
                  {o.count}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #E3E7EE', borderTopColor: '#0466C8', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#7D8597', fontSize: '13px', fontWeight: '600' }}>Loading leave policies…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FiCalendar size={22} color="#ffffff" />
                </div>
                <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>
                  {types.length === 0 ? 'No leave policies configured yet' : 'No policies match the current filters'}
                </div>
                {types.length === 0 ? (
                  <button onClick={openCreateModal} style={{ marginTop: 8, padding: '9px 20px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    + Add First Leave Type
                  </button>
                ) : hasAnyFilter && (
                  <span onClick={resetAll} style={{ color: '#0466C8', fontSize: '13px', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>
                    Clear all filters
                  </span>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #E3E7EE' }}>
                      {['Leave Type', 'Code', 'Annual Quota', 'Pay Type', 'Half Day', 'Attachment', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '13px 18px', color: '#7D8597', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((t, idx) => (
                      <tr
                        key={t.leave_type_id}
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F1F4F8' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: '700', color: '#001233' }}>{t.leave_type_name}</div>
                          {t.description && <div style={{ fontSize: '11px', color: '#7D8597', marginTop: 2, fontWeight: 500 }}>{t.description}</div>}
                          {t.max_consecutive_days && (
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>Max {t.max_consecutive_days} consecutive days</div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontFamily: 'monospace', background: '#EEF8FF', color: '#023E7D', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                            {t.leave_type_code}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 48, height: 32, borderRadius: '8px', background: '#f8fafc', border: '1px solid #E3E7EE', color: '#374151', fontWeight: '800', fontSize: '14px', padding: '0 10px' }}>
                             {parseFloat(t.annual_quota_days)}
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 6 }}>days/yr</span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px',
                            background: t.is_paid_leave ? '#dcfce7' : '#fef3c7',
                            color:      t.is_paid_leave ? '#15803d' : '#b45309',
                            border:     `1px solid ${t.is_paid_leave ? '#bbf7d0' : '#fde68a'}`,
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                          }}>
                            {t.is_paid_leave ? <><FiCheck size={11} /> Paid</> : <><FiMinus size={11} /> Unpaid</>}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px',
                            background: t.allows_half_day ? '#ede9fe' : '#F1F4F8',
                            color:      t.allows_half_day ? '#6d28d9' : '#7D8597',
                            border:     `1px solid ${t.allows_half_day ? '#ddd6fe' : '#E3E7EE'}`,
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                          }}>
                            {t.allows_half_day ? 'Allowed' : 'Blocked'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: t.requires_attachment ? '#7c3aed' : '#94a3b8' }}>
                            {t.requires_attachment ? 'Required' : 'Optional'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            display: 'inline-flex', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px',
                            background: t.is_active ? '#f0fdf4' : '#f8fafc',
                            color:      t.is_active ? '#15803d' : '#7D8597',
                            border:     `1px solid ${t.is_active ? '#bbf7d0' : '#E3E7EE'}`,
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                          }}>
                            {t.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            onClick={() => openEditModal(t)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#0466C8', color: '#ffffff', border: '1px solid #0466C8', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#023E7D' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#0466C8' }}
                          >
                            <FiEdit2 size={12} color="#ffffff" /> Configure
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: '12px', background: '#fff', border: '1px solid #E3E7EE', borderRadius: '12px', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: '500' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong style={{ color: '#374151' }}>{filtered.length}</strong> policies
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #E3E7EE', cursor: page === 1 ? 'not-allowed' : 'pointer', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#E3E7EE' : '#374151' }}>
                  ‹ Prev
                </button>

                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`d${i}`} style={{ padding: '6px 8px', color: '#94a3b8', fontSize: '13px' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', fontSize: '13px', fontWeight: page === p ? '800' : '600', border: page === p ? 'none' : '1px solid #E3E7EE', cursor: 'pointer', background: page === p ? 'linear-gradient(135deg,#0466C8,#023E7D)' : '#fff', color: page === p ? '#fff' : '#374151', boxShadow: page === p ? '0 2px 8px rgba(4, 102, 200,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1px solid #E3E7EE', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#E3E7EE' : '#374151' }}>
                  Next ›
                </button>
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '560px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflowY: 'auto', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCalendar size={18} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#001233' }}>
                  {editingType ? 'Modify Leave Policy' : 'Create Leave Policy'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7D8597' }}>
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#33415C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type Name *</label>
                  <input style={inputStyle} placeholder="e.g. Annual Vacation" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#33415C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Code *</label>
                  <input style={{ ...inputStyle, fontFamily: 'monospace', background: editingType ? '#F1F4F8' : '#f8fafc' }} placeholder="e.g. AL" value={code} onChange={e => setCode(e.target.value)} disabled={!!editingType} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#33415C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <input style={inputStyle} placeholder="Brief policy explanation…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#33415C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Quota (Days)</label>
                  <input style={inputStyle} type="number" step="0.5" value={quota} onChange={e => setQuota(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#33415C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Consecutive Days</label>
                  <input style={inputStyle} type="number" placeholder="No limit" value={maxConsecutive} onChange={e => setMaxConsecutive(e.target.value)} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Policy Options</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                  {[
                    { label: 'Paid Leave',              state: isPaid,        set: setIsPaid },
                    { label: 'Requires Attachment',     state: reqAttachment, set: setReqAttachment },
                    { label: 'Allow Half-Day Requests', state: allowHalf,     set: setAllowHalf },
                    { label: 'Allow Negative Balances', state: allowNeg,      set: setAllowNeg },
                    { label: 'Active Policy',           state: isActive,      set: setIsActive },
                  ].map(({ label, state, set }) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '600', minWidth: '45%' }}>
                      <input
                        type="checkbox" checked={state} onChange={e => set(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0466C8' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiAlertCircle size={11} color="#ffffff" />
                  </div>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setModalOpen(false)}
                  style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#33415C', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#0466C8,#023E7D)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(4, 102, 200,0.35)' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  {editingType ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
