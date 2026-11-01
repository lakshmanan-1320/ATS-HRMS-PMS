import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import { FiTarget } from 'react-icons/fi'

const STATUS_META = {
  draft:       { label: 'Draft',       color: '#33415C', bg: '#F1F4F8', border: 'rgba(71,85,105,0.2)' },
  active:      { label: 'Active',      color: '#15803d', bg: '#dcfce7', border: 'rgba(21,128,61,0.2)' },
  in_progress: { label: 'In Progress', color: '#0353A4', bg: '#dbeafe', border: 'rgba(29,78,216,0.2)' },
  submitted:   { label: 'Submitted',   color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.2)' },
  approved:    { label: 'Approved',    color: '#6d28d9', bg: '#f3e8ff', border: 'rgba(109,40,217,0.2)' },
  completed:   { label: 'Completed',   color: '#047857', bg: '#d1fae5', border: 'rgba(4,120,87,0.2)' },
  rejected:    { label: 'Rejected',    color: '#b91c1c', bg: '#fee2e2', border: 'rgba(185,28,28,0.2)' },
}

const TYPE_META = {
  company:    { label: 'Company',    icon: '🏢', color: '#6d28d9', bg: 'rgba(109,40,217,0.08)' },
  department: { label: 'Department', icon: '🏗️', color: '#0284c7', bg: 'rgba(2,132,199,0.08)' },
  team:       { label: 'Team',       icon: '👥', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  individual: { label: 'Individual', icon: '👤', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
}

const BLANK = {
  title: '', description: '', goal_type: 'individual',
  parent_goal_id: '', assigned_to_employee_id: '', assigned_to_department_id: '',
  start_date: '', due_date: '', target_metric: '', weight: 100,
}

const PAGE_SIZE = 8

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProgressBar({ value, override }) {
  const pct = override !== null && override !== undefined ? override : value
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1, height: 6, background: '#E3E7EE', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, pct || 0)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{Math.round(pct || 0)}%</span>
      </div>
      {override !== null && override !== undefined && (
        <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Manager override</div>
      )}
    </div>
  )
}

function Badge({ meta, value }) {
  const m = meta[value] || { label: value, color: '#33415C', bg: '#F1F4F8', border: 'rgba(71,85,105,0.2)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
      color: m.color, background: m.bg, border: `1px solid ${m.border || m.bg}`,
    }}>{m.label}</span>
  )
}

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500,
          minWidth: 280, maxWidth: 360,
          background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#b91c1c' : '#15803d',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {t.type === 'error' ? '✗' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  )
}

function Pagination({ page, totalPages, onPrev, onNext, onPage }) {
  if (totalPages <= 1) return null

  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const btnBase = {
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    border: '1px solid #E3E7EE',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 }}>
      <button
        onClick={onPrev} disabled={page === 1}
        style={{
          ...btnBase, padding: '8px 16px',
          background: page === 1 ? '#f8fafc' : '#ffffff',
          color: page === 1 ? '#cbd5e1' : '#33415C',
          cursor: page === 1 ? 'not-allowed' : 'pointer',
        }}
      >← Prev</button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: 13 }}>…</span>
        ) : (
          <button key={p} onClick={() => onPage(p)} style={{
            ...btnBase,
            width: 38, height: 38,
            background: p === page ? 'linear-gradient(135deg,#0466C8,#0353A4)' : '#ffffff',
            color: p === page ? '#ffffff' : '#33415C',
            border: p === page ? 'none' : '1px solid #E3E7EE',
            boxShadow: p === page ? '0 2px 8px rgba(4, 102, 200,0.3)' : 'none',
            fontWeight: p === page ? 700 : 600,
          }}>{p}</button>
        )
      )}

      <button
        onClick={onNext} disabled={page === totalPages}
        style={{
          ...btnBase, padding: '8px 16px',
          background: page === totalPages ? '#f8fafc' : '#ffffff',
          color: page === totalPages ? '#cbd5e1' : '#33415C',
          cursor: page === totalPages ? 'not-allowed' : 'pointer',
        }}
      >Next →</button>
    </div>
  )
}

function GoalDetail({ goal, employees, goals, onClose, onAction }) {
  const [rejectReason, setRejectReason]     = useState('')
  const [overridePct, setOverridePct]       = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [showOverride, setShowOverride]     = useState(false)
  const [showReject, setShowReject]         = useState(false)
  const [actingEmp, setActingEmp]           = useState('')

  const subGoals     = goal.sub_goals || []
  const completedSubs = subGoals.filter(s => ['completed', 'approved'].includes(s.status)).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        width: 520, height: '100vh', overflowY: 'auto',
        background: '#ffffff', borderLeft: '1px solid #cbd5e1',
        padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <Badge meta={STATUS_META} value={goal.status} />
              <span style={{
                fontSize: 11, color: TYPE_META[goal.goal_type]?.color || '#7D8597', fontWeight: 700,
                background: TYPE_META[goal.goal_type]?.bg, padding: '2px 8px', borderRadius: 6,
              }}>
                {TYPE_META[goal.goal_type]?.icon} {TYPE_META[goal.goal_type]?.label}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#001233' }}>{goal.title}</h2>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8,
            cursor: 'pointer', color: '#7D8597', fontSize: 16,
          }}>✕</button>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #E3E7EE' }}>
          <div style={{ fontSize: 11, color: '#7D8597', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Progress</div>
          <ProgressBar value={goal.progress} override={goal.override_progress} />
          {subGoals.length > 0 && (
            <div style={{ fontSize: 11, color: '#7D8597', marginTop: 6, fontWeight: 600 }}>
              {completedSubs} of {subGoals.length} sub-goals completed
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Assigned To',   goal.assigned_to_employee_name || goal.assigned_to_department_name || '—'],
            ['Created By',    goal.created_by_employee_name || '—'],
            ['Start Date',    fmtDate(goal.start_date)],
            ['Due Date',      fmtDate(goal.due_date)],
            ['Target Metric', goal.target_metric || '—'],
            ['Weight',        `${goal.weight}%`],
            ['Parent Goal',   goal.parent_goal_title || '—'],
            ['Submitted At',  fmtDate(goal.submitted_at)],
          ].map(([label, val]) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #E3E7EE' }}>
              <div style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#001233', fontWeight: 700 }}>{val}</div>
            </div>
          ))}
        </div>

        {goal.description && (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #E3E7EE' }}>
            <div style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>Description</div>
            <div style={{ fontSize: 13, color: '#33415C', lineHeight: 1.6, fontWeight: 500 }}>{goal.description}</div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Sub-Goals ({subGoals.length})
          </div>
          {subGoals.length === 0 ? (
            <div style={{ fontSize: 13, color: '#7D8597', padding: '12px 0', fontWeight: 600 }}>No sub-goals yet.</div>
          ) : subGoals.map(sg => (
            <div key={sg.id} style={{
              background: '#f8fafc', borderRadius: 10, padding: '12px 14px',
              border: '1px solid #E3E7EE', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#001233' }}>{sg.title}</div>
                <Badge meta={STATUS_META} value={sg.status} />
              </div>
              <ProgressBar value={sg.progress} override={sg.override_progress} />
              <div style={{ fontSize: 11, color: '#7D8597', marginTop: 4, fontWeight: 600 }}>
                Weight: {sg.weight}% · Due: {fmtDate(sg.due_date)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #E3E7EE', paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Actions</div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>Acting As (Employee)</label>
            <select value={actingEmp} onChange={e => setActingEmp(e.target.value)} style={selSt}>
              <option value="">— Select employee —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} [{e.employee_code}]</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {goal.status === 'draft' && (
              <ActionBtn color="#15803d" onClick={() => onAction('activate', goal.id, {})}>Activate</ActionBtn>
            )}
            {['active', 'in_progress'].includes(goal.status) && (
              <ActionBtn color="#0466C8" onClick={() => onAction('submit', goal.id, {})}>Submit for Approval</ActionBtn>
            )}
            {goal.status === 'submitted' && (
              <>
                <ActionBtn color="#6d28d9" onClick={() => onAction('approve', goal.id, { approved_by_employee_id: actingEmp })}>Approve</ActionBtn>
                <ActionBtn color="#b91c1c" onClick={() => setShowReject(v => !v)}>Reject</ActionBtn>
              </>
            )}
            <ActionBtn color="#b45309" onClick={() => setShowOverride(v => !v)}>Override Progress</ActionBtn>
          </div>

          {showReject && (
            <div style={{ marginTop: 12 }}>
              <label style={labelSt}>Rejection Reason</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                style={{ ...selSt, resize: 'vertical' }} placeholder="Why is this being rejected?" />
              <ActionBtn color="#b91c1c" style={{ marginTop: 8 }}
                onClick={() => { onAction('reject', goal.id, { rejected_by_employee_id: actingEmp, reason: rejectReason }); setShowReject(false) }}>
                Confirm Reject
              </ActionBtn>
            </div>
          )}

          {showOverride && (
            <div style={{ marginTop: 12 }}>
              <label style={labelSt}>Override Progress (%)</label>
              <input type="number" min={0} max={100} value={overridePct} onChange={e => setOverridePct(e.target.value)}
                style={selSt} placeholder="0–100" />
              <label style={{ ...labelSt, marginTop: 8 }}>Reason</label>
              <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                style={selSt} placeholder="Reason for override" />
              <ActionBtn color="#b45309" style={{ marginTop: 8 }}
                onClick={() => { onAction('override', goal.id, { progress: overridePct, override_by_employee_id: actingEmp, reason: overrideReason }); setShowOverride(false) }}>
                Apply Override
              </ActionBtn>
            </div>
          )}

          {goal.rejection_reason && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#fee2e2', borderRadius: 8, border: '1px solid #fca5a5' }}>
              <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700, marginBottom: 4 }}>Rejection Reason</div>
              <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>{goal.rejection_reason}</div>
            </div>
          )}
          {goal.override_reason && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700, marginBottom: 4 }}>Override Reason</div>
              <div style={{ fontSize: 13, color: '#92400e', fontWeight: 500 }}>{goal.override_reason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ color, onClick, children, style = {} }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, border: `1px solid ${color}33`,
      background: `${color}10`, color, fontSize: 12, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit', ...style,
    }}>{children}</button>
  )
}

const labelSt = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#7D8597',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}
const selSt = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  background: '#ffffff', border: '1px solid #E3E7EE',
  color: '#001233', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.15s ease',
}

function GoalModal({ form, setForm, onSave, onClose, employees, departments, goals, saving }) {
  const setField   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const parentGoals = goals.filter(g => g.id !== form.id)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
        background: '#ffffff', borderRadius: 16, padding: 28,
        border: '1px solid #E3E7EE', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#001233' }}>Edit Goal</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8,
            cursor: 'pointer', color: '#7D8597', fontSize: 16,
          }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Title *">
            <input value={form.title} onChange={e => setField('title', e.target.value)} style={selSt} placeholder="e.g. Increase sales by 30%" />
          </Field>

          <Field label="Goal Type *">
            <select value={form.goal_type} onChange={e => setField('goal_type', e.target.value)} style={selSt}>
              <option value="company">Company</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
          </Field>

          <Field label="Parent Goal (optional)">
            <select value={form.parent_goal_id} onChange={e => setField('parent_goal_id', e.target.value)} style={selSt}>
              <option value="">— None (top-level goal) —</option>
              {parentGoals.map(g => <option key={g.id} value={g.id}>{g.title} [{g.goal_type}]</option>)}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Assign to Employee">
              <select value={form.assigned_to_employee_id} onChange={e => setField('assigned_to_employee_id', e.target.value)} style={selSt}>
                <option value="">— None —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} [{e.employee_code}]</option>)}
              </select>
            </Field>
            <Field label="Assign to Department">
              <select value={form.assigned_to_department_id} onChange={e => setField('assigned_to_department_id', e.target.value)} style={selSt}>
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={e => setField('start_date', e.target.value)} style={selSt} />
            </Field>
            <Field label="Due Date">
              <input type="date" value={form.due_date} onChange={e => setField('due_date', e.target.value)} style={selSt} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Target Metric">
              <input value={form.target_metric} onChange={e => setField('target_metric', e.target.value)} style={selSt} placeholder="e.g. 50 clients, 30% growth" />
            </Field>
            <Field label="Weight (%) in parent">
              <input type="number" min={1} max={100} value={form.weight} onChange={e => setField('weight', e.target.value)} style={selSt} />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={e => setField('description', e.target.value)}
              rows={3} style={{ ...selSt, resize: 'vertical' }} placeholder="Detailed description of the goal..." />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid #E3E7EE',
            background: '#f8fafc', color: '#7D8597', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: saving ? 'rgba(4, 102, 200,0.5)' : 'linear-gradient(135deg,#0466C8,#0353A4)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(4, 102, 200,0.35)',
          }}>{saving ? 'Saving…' : 'Update Goal'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  )
}

const STAT_CARDS = [
  { key: 'total',     label: 'Total Goals',      color: '#6d28d9', icon: '🎯', bg: 'rgba(109,40,217,0.07)' },
  { key: 'active',    label: 'Active',            color: '#10b981', icon: '⚡', bg: 'rgba(16,185,129,0.07)' },
  { key: 'submitted', label: 'Pending Approval',  color: '#f59e0b', icon: '⏳', bg: 'rgba(245,158,11,0.07)' },
  { key: 'completed', label: 'Completed',          color: '#059669', icon: '✅', bg: 'rgba(5,150,105,0.07)' },
]

export default function Goals() {
  const [goals, setGoals]               = useState([])
  const [employees, setEmployees]       = useState([])
  const [departments, setDepts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [toasts, setToasts]             = useState([])
  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState(BLANK)
  const [saving, setSaving]             = useState(false)
  const [detailGoal, setDetailGoal]     = useState(null)
  const [goalMode, setGoalModeState]    = useState('hybrid')
  const [page, setPage]                 = useState(1)

  const toast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [gRes, eRes, dRes, mRes] = await Promise.all([
        api.get('/client-admin/goals'),
        api.get('/client-admin/employees'),
        api.get('/client-admin/departments'),
        api.get('/client-admin/goals/mode'),
      ])
      setGoals(gRes.data)
      setEmployees(eRes.data)
      setDepts(dRes.data)
      setGoalModeState(mRes.data.goal_mode)
    } catch (err) {
      toast('Failed to load goals.', 'error')
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (g) => {
    setForm({
      id: g.id, title: g.title, description: g.description || '',
      goal_type: g.goal_type, parent_goal_id: g.parent_goal_id || '',
      assigned_to_employee_id: g.assigned_to_employee_id || '',
      assigned_to_department_id: g.assigned_to_department_id || '',
      start_date: g.start_date ? g.start_date.slice(0, 10) : '',
      due_date: g.due_date ? g.due_date.slice(0, 10) : '',
      target_metric: g.target_metric || '', weight: g.weight,
    })
    setShowModal(true)
  }

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/client-admin/goals/${id}`)
      setDetailGoal(res.data)
    } catch (err) {
      toast('Failed to load goal detail.', 'error')
      if (err.response?.status === 401) {
        sessionStorage.clear()
        window.location.href = '/login'
      }
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast('Title is required.', 'error'); return }
    setSaving(true)
    try {
      await api.put(`/client-admin/goals/${form.id}`, form)
      toast('Goal updated.')
      setShowModal(false)
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return
    try {
      await api.delete(`/client-admin/goals/${id}`)
      toast('Goal deleted.')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed.', 'error')
    }
  }

  const handleAction = async (action, id, body = {}) => {
    try {
      const urls = {
        activate: `/client-admin/goals/${id}/activate`,
        submit:   `/client-admin/goals/${id}/submit`,
        approve:  `/client-admin/goals/${id}/approve`,
        reject:   `/client-admin/goals/${id}/reject`,
        override: `/client-admin/goals/${id}/override-progress`,
      }
      const res = await api.post(urls[action], body)
      toast(res.data.message || 'Done.')
      setDetailGoal(res.data.data)
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Action failed.', 'error')
    }
  }

  const stats = {
    total:     goals.length,
    active:    goals.filter(g => ['active', 'in_progress'].includes(g.status)).length,
    submitted: goals.filter(g => g.status === 'submitted').length,
    completed: goals.filter(g => ['completed', 'approved'].includes(g.status)).length,
  }

  const filtered = goals.filter(g => {
    const q = search.toLowerCase()
    const matchSearch = !q || g.title.toLowerCase().includes(q) ||
      (g.assigned_to_employee_name || '').toLowerCase().includes(q) ||
      (g.assigned_to_department_name || '').toLowerCase().includes(q)
    const matchType   = !filterType   || g.goal_type === filterType
    const matchStatus = !filterStatus || g.status    === filterStatus
    return matchSearch && matchType && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilterChange = setter => e => { setter(e.target.value); setPage(1) }
  const handleSearchChange = e => { setSearch(e.target.value); setPage(1) }
  const clearFilters = () => { setSearch(''); setFilterType(''); setFilterStatus(''); setPage(1) }

  const modeLabel = goalMode === 'top_down' ? 'Top-Down' : goalMode === 'bottom_up' ? 'Bottom-Up' : 'Hybrid'

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#001233', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="goals" />
      <Toast toasts={toasts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>

        {/* Header */}
        <PageHeader
          icon={FiTarget}
          title="Goals Management"
          subtitle={`Manage company, department, team and individual goals — Mode: ${modeLabel}`}
        />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {STAT_CARDS.map(s => (
            <div key={s.key} style={{
              background: '#ffffff', borderRadius: 14, padding: '20px 22px',
              border: '1px solid #E3E7EE',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 72, height: 72, background: s.bg,
                borderRadius: '0 14px 0 72px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                padding: '12px 14px', fontSize: 20,
              }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{stats[s.key]}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</div>
              <div style={{ marginTop: 14, height: 3, borderRadius: 2, background: '#F1F4F8', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: stats.total > 0 ? `${Math.round((stats[s.key] / stats.total) * 100)}%` : '0%',
                  background: s.color, borderRadius: 2, transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          background: '#ffffff', borderRadius: 12, padding: '14px 18px',
          border: '1px solid #E3E7EE', marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: 14, pointerEvents: 'none',
            }}>🔍</span>
            <input
              value={search} onChange={handleSearchChange}
              placeholder="Search goals…"
              style={{ ...selSt, paddingLeft: 36, width: '100%' }}
            />
          </div>
          <select value={filterType} onChange={handleFilterChange(setFilterType)} style={{ ...selSt, width: 148 }}>
            <option value="">All Types</option>
            <option value="company">Company</option>
            <option value="department">Department</option>
            <option value="team">Team</option>
            <option value="individual">Individual</option>
          </select>
          <select value={filterStatus} onChange={handleFilterChange(setFilterStatus)} style={{ ...selSt, width: 158 }}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(search || filterType || filterStatus) && (
            <button onClick={clearFilters} style={{
              padding: '9px 14px', borderRadius: 8, border: '1px solid #fca5a5',
              background: '#fff5f5', color: '#b91c1c', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}
            >✕ Clear</button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Goal List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                background: '#ffffff', borderRadius: 14, height: 108,
                border: '1px solid #E3E7EE',
                opacity: 1 - i * 0.15,
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: '#ffffff', borderRadius: 16, border: '2px dashed #E3E7EE',
          }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#001233', marginBottom: 6 }}>No goals found</div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              {search || filterType || filterStatus ? 'Try adjusting your search or filters.' : 'No goals have been created yet.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paginated.map(g => {
                const subCount  = goals.filter(x => x.parent_goal_id === g.id).length
                const typeColor = TYPE_META[g.goal_type]?.color || '#7D8597'
                const typeBg    = TYPE_META[g.goal_type]?.bg || 'rgba(100,116,139,0.08)'
                return (
                  <div key={g.id} style={{
                    background: '#ffffff', borderRadius: 14, padding: '18px 22px',
                    border: '1px solid #E3E7EE', borderLeft: `4px solid ${typeColor}`,
                    transition: 'all 0.2s ease', cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.07)'
                      e.currentTarget.style.borderColor = typeColor
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
                      e.currentTarget.style.borderColor = '#E3E7EE'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }} onClick={() => openDetail(g.id)}>

                        {/* Badges row */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11, color: typeColor, fontWeight: 700,
                            background: typeBg, padding: '2px 8px',
                            borderRadius: 6, border: `1px solid ${typeColor}22`,
                          }}>
                            {TYPE_META[g.goal_type]?.icon} {TYPE_META[g.goal_type]?.label}
                          </span>
                          <Badge meta={STATUS_META} value={g.status} />
                          {g.parent_goal_title && (
                            <span style={{
                              fontSize: 10, color: '#33415C', background: '#f8fafc',
                              border: '1px solid #E3E7EE', padding: '2px 7px', borderRadius: 5, fontWeight: 600,
                            }}>↳ {g.parent_goal_title}</span>
                          )}
                          {subCount > 0 && (
                            <span style={{
                              fontSize: 10, color: '#0466C8', background: 'rgba(4, 102, 200,0.08)',
                              border: '1px solid rgba(4, 102, 200,0.15)', padding: '2px 7px', borderRadius: 5, fontWeight: 700,
                            }}>{subCount} sub-goal{subCount > 1 ? 's' : ''}</span>
                          )}
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#001233', marginBottom: 6 }}>{g.title}</div>

                        {/* Meta */}
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#7D8597', flexWrap: 'wrap', fontWeight: 500, marginBottom: 10 }}>
                          {g.assigned_to_employee_name && <span>👤 {g.assigned_to_employee_name}</span>}
                          {g.assigned_to_department_name && <span>🏢 {g.assigned_to_department_name}</span>}
                          {g.due_date && <span>📅 Due {fmtDate(g.due_date)}</span>}
                          {g.target_metric && <span>🎯 {g.target_metric}</span>}
                          <span style={{ color: '#94a3b8' }}>Weight: {g.weight}%</span>
                        </div>

                        <div style={{ maxWidth: 420 }}>
                          <ProgressBar value={g.progress} override={g.override_progress} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                        <button onClick={() => openEdit(g)} style={{
                          padding: '6px 16px', borderRadius: 7, border: '1px solid #E3E7EE',
                          background: '#f8fafc', color: '#33415C', fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#E3E7EE'; e.currentTarget.style.color = '#001233' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#33415C' }}
                        >Edit</button>
                        <button onClick={() => handleDelete(g.id)} style={{
                          padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(185,28,28,0.15)',
                          background: 'rgba(185,28,28,0.04)', color: '#b91c1c', fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.15s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(185,28,28,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(185,28,28,0.04)'}
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages, p + 1))}
              onPage={setPage}
            />

            {totalPages > 1 && (
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} goals
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <GoalModal
          form={form} setForm={setForm}
          onSave={handleSave} onClose={() => setShowModal(false)}
          employees={employees} departments={departments} goals={goals} saving={saving}
        />
      )}

      {detailGoal && (
        <GoalDetail
          goal={detailGoal} employees={employees} goals={goals}
          onClose={() => setDetailGoal(null)}
          onAction={handleAction}
          onRefresh={load}
        />
      )}
      </div>
    </div>
  )
}
