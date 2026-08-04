import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { getFinancialYears } from '../../performanceConfiguration/financialYears.api.js'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_META = {
  draft:  { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Draft',  dot: '#94a3b8', accent: '#94a3b8' },
  active: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Active', dot: '#22c55e', accent: '#22c55e' },
  closed: { bg: '#faf5ff', color: '#6d28d9', border: '#ddd6fe', label: 'Closed', dot: '#8b5cf6', accent: '#8b5cf6' },
}

const RATING_LABELS = {
  exceeds_expectations: { label: 'Exceeds Expectations', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  good:                 { label: 'Good',                 color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  meets_expectations:   { label: 'Meets Expectations',   color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  below_expectations:   { label: 'Below Expectations',   color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
}

const inputSt = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: '#ffffff', border: '1.5px solid #e2e8f0',
  borderRadius: '10px', color: '#1e293b', fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s',
}

const BLANK_FORM = {
  name: '', period_start: '', period_end: '',
  self_appraisal_deadline: '', manager_review_deadline: '',
  financial_year_id: '',
}

function CalIcon() {
  return (
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
      style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function UserAvatar({ name, size = 36 }) {
  const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: colors[idx],
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: '700', flexShrink: 0, letterSpacing: '-0.5px',
    }}>{initials}</div>
  )
}

function ProgressBar({ percent, color = '#6366f1' }) {
  return (
    <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%',
        background: color, borderRadius: '999px', transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

function getCycleProgress(cycle) {
  if (!cycle.period_start || !cycle.period_end) return 0
  const start = new Date(cycle.period_start).getTime()
  const end   = new Date(cycle.period_end).getTime()
  const now   = Date.now()
  if (now <= start) return 0
  if (now >= end) return 100
  return Math.round(((now - start) / (end - start)) * 100)
}

function fmt(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
export default function AppraisalCycles({ isSubComponent = false }) {
  const [cycles, setCycles]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [err, setErr]                     = useState('')
  const [showForm, setShowForm]           = useState(false)
  const [form, setForm]                   = useState(BLANK_FORM)
  const [saving, setSaving]               = useState(false)
  const [editId, setEditId]               = useState(null)
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [employees, setEmployees]         = useState([])
  const [empLoading, setEmpLoading]       = useState(false)
  const [financialYears, setFinancialYears] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/client-admin/appraisal')
      setCycles(r.data || [])

      const fyRes = await getFinancialYears()
      setFinancialYears(fyRes.data || fyRes || [])
    } catch (e) {
      setErr('Failed to load cycles.')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function loadEmployees(cycle) {
    setSelectedCycle(cycle)
    setEmpLoading(true)
    try {
      const r = await api.get(`/client-admin/appraisal/${cycle.id}/employees`)
      setEmployees(r.data || [])
    } catch (e) {
      setEmployees([])
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setEmpLoading(false) }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.period_start || !form.period_end) {
      setErr('Name, period start and period end are required.')
      return
    }
    setSaving(true); setErr('')
    try {
      if (editId) await api.put(`/client-admin/appraisal/${editId}`, form)
      else        await api.post('/client-admin/appraisal', form)
      setShowForm(false); setEditId(null); setForm(BLANK_FORM)
      load()
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed.')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setSaving(false) }
  }

  async function handleStatusChange(cycle, status) {
    try {
      await api.put(`/client-admin/appraisal/${cycle.id}`, { status })
      load()
      if (selectedCycle?.id === cycle.id) setSelectedCycle(prev => ({ ...prev, status }))
    } catch (e) {
      setErr(e.response?.data?.message || 'Update failed.')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this draft cycle?')) return
    try {
      await api.delete(`/client-admin/appraisal/${id}`)
      if (selectedCycle?.id === id) setSelectedCycle(null)
      load()
    } catch (e) {
      setErr(e.response?.data?.message || 'Delete failed.')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    }
  }

  function openEdit(cycle) {
    setEditId(cycle.id)
    setForm({
      name: cycle.name,
      period_start: cycle.period_start?.slice(0, 10) || '',
      period_end:   cycle.period_end?.slice(0, 10)   || '',
      self_appraisal_deadline: cycle.self_appraisal_deadline?.slice(0, 10) || '',
      manager_review_deadline: cycle.manager_review_deadline?.slice(0, 10) || '',
      financial_year_id: cycle.financial_year_id || '',
    })
    setShowForm(true)
  }

  const activeCycles = cycles.filter(c => c.status === 'active').length
  const draftCycles  = cycles.filter(c => c.status === 'draft').length
  const closedCycles = cycles.filter(c => c.status === 'closed').length

  const mainContent = (
    <>
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditId(null); setErr('') } }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '520px', maxWidth: '90vw', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                  {editId ? 'Edit Appraisal Cycle' : 'New Appraisal Cycle'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  {editId ? 'Update the cycle details below' : 'Set up a new performance review period'}
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditId(null); setErr('') }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#64748b';
                }}
              >&times;</button>
            </div>
            {err && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>{err}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>CYCLE NAME *</label>
                <input
                  style={inputSt} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Annual Review 2026"
                  onFocus={e => { e.target.style.borderColor = '#6366f1' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>FINANCIAL YEAR *</label>
                <select
                  style={inputSt}
                  value={form.financial_year_id || ''}
                  onChange={e => setForm(f => ({ ...f, financial_year_id: e.target.value }))}
                >
                  <option value="">— Select Financial Year —</option>
                  {financialYears.map(fy => (
                    <option key={fy.financial_year_id} value={fy.financial_year_id}>
                      {fy.name}
                    </option>
                  ))}
                </select>
              </div>
              {[
                { key: 'period_start',            label: 'PERIOD START *' },
                { key: 'period_end',              label: 'PERIOD END *' },
                { key: 'self_appraisal_deadline', label: 'SELF-APPRAISAL DEADLINE' },
                { key: 'manager_review_deadline', label: 'MANAGER REVIEW DEADLINE' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>{label}</label>
                  <input type="date" style={inputSt} value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#6366f1' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '12px 20px', background: saving ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.35)' }}
              >
                {saving ? 'Saving...' : (editId ? 'Update Cycle' : 'Create Cycle')}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditId(null); setErr('') }}
                style={{ padding: '12px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      <main style={{ flex: 1, padding: isSubComponent ? '0px' : '32px 36px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.4px' }}>Appraisal Cycles</h1>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Create and manage performance appraisal periods</p>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm(BLANK_FORM); setErr('') }}
              style={{ padding: '11px 22px', display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)' }}
            >
              <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Cycle
            </button>
          </div>

          {!loading && cycles.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
              {[
                { label: 'Active Cycles', count: activeCycles, dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', textColor: '#15803d' },
                { label: 'Draft Cycles',  count: draftCycles,  dot: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', textColor: '#64748b' },
                { label: 'Closed Cycles', count: closedCycles, dot: '#8b5cf6', bg: '#faf5ff', border: '#ddd6fe', textColor: '#6d28d9' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: `0 0 0 3px ${s.border}` }} />
                  <div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>{s.count}</div>
                    <div style={{ fontSize: '11px', color: s.textColor, fontWeight: '700', marginTop: '3px' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {err && !showForm && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: selectedCycle ? '1fr 1.45fr' : '1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loading ? (
                [1, 2].map(i => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ height: '4px', background: '#f1f5f9' }} />
                    <div style={{ padding: '20px' }}>
                      <div style={{ width: '55%', height: '14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '10px' }} />
                      <div style={{ width: '38%', height: '11px', background: '#f8fafc', borderRadius: '6px', marginBottom: '18px' }} />
                      <div style={{ width: '28%', height: '9px', background: '#f1f5f9', borderRadius: '6px' }} />
                    </div>
                  </div>
                ))
              ) : cycles.length === 0 ? (
                <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '20px', padding: '56px 40px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" fill="none" stroke="#8b5cf6" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M12 11v6M9 14h6" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>No appraisal cycles yet</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '22px' }}>Create your first cycle to begin managing performance reviews</div>
                  <button
                    onClick={() => { setShowForm(true); setErr('') }}
                    style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                  >+ Create First Cycle</button>
                </div>
              ) : cycles.map(cycle => {
                const sm = STATUS_META[cycle.status] || STATUS_META.draft
                const isSelected = selectedCycle?.id === cycle.id
                const progress = getCycleProgress(cycle)
                return (
                  <div
                    key={cycle.id}
                    onClick={() => loadEmployees(cycle)}
                    style={{ background: '#fff', border: `1px solid ${isSelected ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: '16px', overflow: 'hidden', boxShadow: isSelected ? '0 8px 25px rgba(99,102,241,0.13)' : '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = '#c7d2fe' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0' } }}
                  >
                    <div style={{ height: '4px', background: sm.accent }} />
                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cycle.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            <CalIcon />{fmt(cycle.period_start)} - {fmt(cycle.period_end)}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sm.dot, display: 'inline-block' }} />
                          {sm.label}
                        </span>
                      </div>
                      {cycle.status === 'active' && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.04em' }}>CYCLE PROGRESS</span>
                            <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: '800' }}>{progress}%</span>
                          </div>
                          <ProgressBar percent={progress} color="#6366f1" />
                        </div>
                      )}
                      {(cycle.self_appraisal_deadline || cycle.manager_review_deadline) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                          {cycle.self_appraisal_deadline && (
                            <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 9px' }}>Self: {fmt(cycle.self_appraisal_deadline)}</div>
                          )}
                          {cycle.manager_review_deadline && (
                            <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 9px' }}>Manager: {fmt(cycle.manager_review_deadline)}</div>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {cycle.status === 'draft' && (
                          <button onClick={e => { e.stopPropagation(); handleStatusChange(cycle, 'active') }}
                            style={{ padding: '6px 13px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7' }} onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4' }}
                          >Activate</button>
                        )}
                        {cycle.status === 'active' && (
                          <button onClick={e => { e.stopPropagation(); handleStatusChange(cycle, 'closed') }}
                            style={{ padding: '6px 13px', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', color: '#6d28d9', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe' }} onMouseLeave={e => { e.currentTarget.style.background = '#faf5ff' }}
                          >Close</button>
                        )}
                        <button onClick={e => { e.stopPropagation(); openEdit(cycle) }}
                          style={{ padding: '6px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569' }}
                        >Edit</button>
                        {cycle.status === 'draft' && (
                          <button onClick={e => { e.stopPropagation(); handleDelete(cycle.id) }}
                            style={{ padding: '6px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }} onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                          >Delete</button>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: isSelected ? '#6366f1' : '#94a3b8', fontWeight: '600' }}>
                          {isSelected ? 'Viewing employees' : 'Click to view employees'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedCycle && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                  <div style={{ position: 'absolute', bottom: '-16px', left: '40%', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '3px' }}>{selectedCycle.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Employee appraisal status</div>
                    </div>
                    <button
                      onClick={() => setSelectedCycle(null)}
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '20px', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                    >&times;</button>
                  </div>
                  {!empLoading && employees.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                      {[
                        { label: 'Total',     count: employees.length,                                                                                  bg: 'rgba(255,255,255,0.15)', color: '#fff'     },
                        { label: 'Self Done', count: employees.filter(e => e.self_status    === 'active' || e.self_status    === 'closed').length,       bg: 'rgba(134,239,172,0.2)', color: '#86efac'  },
                        { label: 'Mgr Done',  count: employees.filter(e => e.manager_status === 'active' || e.manager_status === 'closed').length,       bg: 'rgba(165,180,252,0.2)', color: '#a5b4fc'  },
                      ].map(s => (
                        <div key={s.label} style={{ flex: 1, textAlign: 'center', background: s.bg, borderRadius: '10px', padding: '10px 8px' }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.count}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: '3px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ padding: '14px', maxHeight: '500px', overflowY: 'auto' }}>
                  {empLoading ? (
                    [1, 2, 3].map(i => (
                      <div key={i} style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ width: '50%', height: '12px', background: '#e2e8f0', borderRadius: '6px', marginBottom: '8px' }} />
                          <div style={{ width: '35%', height: '10px', background: '#f1f5f9', borderRadius: '6px' }} />
                        </div>
                      </div>
                    ))
                  ) : employees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '12px' }}>&#128101;</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>No employees found</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>No active employees assigned to this cycle</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {employees.map(emp => {
                        const selfMeta   = emp.self_status    ? (STATUS_META[emp.self_status]    || STATUS_META.draft) : null
                        const mgrMeta    = emp.manager_status ? (STATUS_META[emp.manager_status] || STATUS_META.draft) : null
                        const ratingMeta = emp.final_rating   ? (RATING_LABELS[emp.final_rating] || null)             : null
                        return (
                          <div
                            key={emp.employee_id}
                            style={{ padding: '13px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#f1f5f9' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                              <UserAvatar name={emp.employee_name} size={34} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.employee_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {emp.designation || '-'}{emp.manager_name ? ` - Mgr: ${emp.manager_name}` : ''}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: '700', background: selfMeta ? selfMeta.bg : '#f8fafc', color: selfMeta ? selfMeta.color : '#64748b', border: `1px solid ${selfMeta ? selfMeta.border : '#e2e8f0'}` }}>
                                Self: {selfMeta ? selfMeta.label : 'Pending'}
                              </span>
                              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: '700', background: mgrMeta ? mgrMeta.bg : '#f8fafc', color: mgrMeta ? mgrMeta.color : '#64748b', border: `1px solid ${mgrMeta ? mgrMeta.border : '#e2e8f0'}` }}>
                                Mgr: {mgrMeta ? mgrMeta.label : 'Pending'}
                              </span>
                              {ratingMeta && (
                                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: '700', background: ratingMeta.bg, color: ratingMeta.color, border: `1px solid ${ratingMeta.border}` }}>
                                  {ratingMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
      </main>
    </>
  );

  if (isSubComponent) {
    return (
      <div style={{ padding: '0px' }}>
        {mainContent}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="appraisal" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        {mainContent}
      </div>
    </div>
  );
}
