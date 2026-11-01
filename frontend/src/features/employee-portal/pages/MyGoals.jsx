import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const DEFAULT_PAGE_SIZE = 5

const STATUS_META = {
  draft:       { bg: 'rgba(100,116,139,0.12)', color: '#7D8597',  label: 'Draft' },
  active:      { bg: 'rgba(4, 102, 200,0.12)',  color: '#0466C8',  label: 'Active' },
  in_progress: { bg: 'rgba(14,165,233,0.12)',  color: '#0ea5e9',  label: 'In Progress' },
  submitted:   { bg: 'rgba(234,179,8,0.12)',   color: '#d97706',  label: 'Submitted' },
  approved:    { bg: 'rgba(16,185,129,0.12)',  color: '#059669',  label: 'Approved' },
  completed:   { bg: 'rgba(16,185,129,0.15)',  color: '#10b981',  label: 'Completed' },
  rejected:    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444',  label: 'Rejected' },
}

const ACTION_META = {
  created:                        { label: 'Goal Created',                   color: '#0466C8' },
  sub_goal_added:                 { label: 'Sub-Goal Added',                 color: '#818cf8' },
  submitted_for_approval:         { label: 'Submitted for Approval',         color: '#d97706' },
  approved:                       { label: 'Approved by Manager',            color: '#10b981' },
  rejected:                       { label: 'Rejected by Manager',            color: '#ef4444' },
  activated:                      { label: 'Goal Activated',                 color: '#22c55e' },
  completion_requested:           { label: 'Completion Requested',           color: '#0ea5e9' },
  completion_withdrawn:           { label: 'Completion Withdrawn',           color: '#94a3b8' },
  completion_approved:            { label: 'Completion Approved',            color: '#10b981' },
  completion_rejected:            { label: 'Completion Rejected',            color: '#ef4444' },
  sub_goal_completion_requested:  { label: 'Sub-Goal Completion Requested',  color: '#0ea5e9' },
  sub_goal_completed:             { label: 'Sub-Goal Completed',             color: '#10b981' },
  progress_overridden:            { label: 'Progress Overridden',            color: '#f59e0b' },
}

const BLANK_FORM = {
  title: '', description: '', target_metric: '',
  start_date: '', due_date: '',
  parent_goal_id: '', weight: '',
}

const inputSt = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  background: '#ffffff', border: '1px solid #E3E7EE',
  borderRadius: '8px', color: '#001233', fontSize: '13px', fontFamily: 'inherit',
  colorScheme: 'light',
}

/* ── Shared UI ─────────────────────────────────────────────── */

function Badge({ status }) {
  const s = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700', padding: '3px 9px',
      borderRadius: '20px', background: s.bg, color: s.color,
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  )
}

function ProgressBar({ value, color }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0))
  const c = color || (pct >= 100 ? '#10b981' : pct >= 60 ? '#0466C8' : pct >= 30 ? '#f59e0b' : '#ef4444')
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '11px', color: '#7D8597' }}>Progress</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: c }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: '#F1F4F8', borderRadius: '4px' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: c,
          borderRadius: '4px', transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }
  }, [msg])
  if (!msg) return null
  const isErr = type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '13px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
      display: 'flex', alignItems: 'center', gap: '10px',
      background: isErr ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
      border: `1px solid ${isErr ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
      color: isErr ? '#ef4444' : '#10b981',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    }}>
      <span>{isErr ? '✕' : '✓'}</span>
      {msg}
    </div>
  )
}

/* ── Timeline ──────────────────────────────────────────────── */

function GoalTimeline({ goalId }) {
  const [history, setHistory]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFetchError(false)
    api.get(`/employee/goals/${goalId}/history`)
      .then(res => setHistory(res.data || []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [goalId])

  if (loading) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading history...</div>
  )
  if (fetchError) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontSize: '12px' }}>Failed to load activity history.</div>
  )
  if (!history.length) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No activity yet.</div>
  )

  return (
    <div style={{ marginTop: '16px', padding: '16px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #E3E7EE' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
        Activity Timeline
      </div>
      <div style={{ position: 'relative', paddingLeft: '22px' }}>
        <div style={{ position: 'absolute', left: '6px', top: '4px', bottom: '4px', width: '2px', background: '#E3E7EE', borderRadius: '1px' }} />
        {history.map((entry) => {
          const meta = ACTION_META[entry.action] || { label: entry.action, color: '#7D8597' }
          const isSubEvent = String(entry.goal_id) !== String(goalId)
          return (
            <div key={entry.id} style={{ position: 'relative', marginBottom: '14px' }}>
              <div style={{
                position: 'absolute', left: '-18px', top: '4px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: meta.color, border: '2px solid #ffffff',
              }} />
              <div style={{ fontSize: '12px', fontWeight: '600', color: meta.color, marginBottom: '2px' }}>{meta.label}</div>
              {isSubEvent && entry.goal_title && (
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>↳ {entry.goal_title}</div>
              )}
              <div style={{ fontSize: '11px', color: '#7D8597' }}>
                {entry.actor_name && <span style={{ color: '#33415C', fontWeight: '500' }}>{entry.actor_name}</span>}
                <span style={{ marginLeft: entry.actor_name ? '8px' : 0 }}>
                  {new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {entry.note && (
                <div style={{ fontSize: '11px', color: '#7D8597', marginTop: '4px', padding: '6px 10px', background: '#ffffff', borderRadius: '6px', lineHeight: '1.5', borderLeft: `2px solid ${meta.color}50` }}>
                  {entry.note}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Modals ────────────────────────────────────────────────── */

function SubGoalModal({ form, setForm, onSave, onClose, saving, parentGoals }) {
  const parent = parentGoals.find(g => String(g.id) === String(form.parent_goal_id))
  const usedWeight = parent ? Number(parent.sub_goal_weight_total || 0) : 0
  const remaining = 100 - usedWeight

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#001233', marginBottom: '10px' }}>
          Add Sub-Goal
        </div>
        {parent && (
          <div style={{ marginBottom: '18px', padding: '9px 13px', background: 'rgba(4, 102, 200,0.06)', border: '1px solid rgba(4, 102, 200,0.15)', borderRadius: '8px', fontSize: '12px', color: '#0466C8' }}>
            Parent: <strong style={{ color: '#0353A4' }}>{parent.title}</strong>
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#7D8597', display: 'block', marginBottom: '6px' }}>
            Weight (%) <span style={{ color: '#94a3b8', fontWeight: 400 }}>— {remaining}% remaining</span>
          </label>
          <input type="number" min={1} max={remaining} value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} style={inputSt} placeholder={`1 – ${remaining}`} />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, height: '4px', background: '#F1F4F8', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${Math.min(100, usedWeight + Number(form.weight || 0))}%`, background: '#0466C8', borderRadius: '2px', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#7D8597', flexShrink: 0 }}>
              {Math.min(100, usedWeight + Number(form.weight || 0))}% / 100%
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#7D8597', display: 'block', marginBottom: '6px' }}>Title *</label>
          <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputSt} autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#7D8597', display: 'block', marginBottom: '6px' }}>Start Date</label>
            <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inputSt} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#7D8597', display: 'block', marginBottom: '6px' }}>Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} style={inputSt} />
          </div>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#7D8597', display: 'block', marginBottom: '6px' }}>Description</label>
          <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputSt, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #E3E7EE', background: '#f8fafc', color: '#7D8597', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#0466C8', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Add Sub-Goal'}</button>
        </div>
      </div>
    </div>
  )
}

function CompleteModal({ goal, onConfirm, onClose, saving }) {
  const [note, setNote] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#ffffff', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#059669', marginBottom: '4px' }}>Request Completion Approval</div>
        <div style={{ fontSize: '13px', color: '#7D8597', marginBottom: '14px' }}>{goal.title}</div>
        <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '16px', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px' }}>
          Your manager will be notified to approve this completion. Progress updates only after approval.
        </div>
        {goal.weight && (
          <div style={{ background: 'rgba(4, 102, 200,0.06)', border: '1px solid rgba(4, 102, 200,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#0353A4' }}>
            This sub-goal contributes <strong>{goal.weight}%</strong> to the parent goal progress.
          </div>
        )}
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#7D8597', display: 'block', marginBottom: '6px' }}>
          Completion Note <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
        </label>
        <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe what you achieved…" style={{ ...inputSt, resize: 'vertical', marginBottom: '20px' }} autoFocus />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #E3E7EE', background: '#f8fafc', color: '#7D8597', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => onConfirm(note)} disabled={saving} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>{saving ? 'Submitting…' : 'Send for Approval'}</button>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-goal row ──────────────────────────────────────────── */

function SubGoalRow({ sg, onMarkComplete, onWithdraw, parentStatus }) {
  const isPendingApproval = sg.pending_completion
  const canComplete = parentStatus === 'approved' && ['active', 'in_progress'].includes(sg.status) && !isPendingApproval
  const isCompleted = sg.status === 'completed'
  const accentColor = isCompleted ? '#10b981' : isPendingApproval ? '#f59e0b' : '#0466C8'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 14px', borderRadius: '10px',
      background: '#f8fafc',
      border: `1px solid ${isPendingApproval ? 'rgba(245,158,11,0.25)' : '#E3E7EE'}`,
    }}>
      <div style={{ width: '3px', alignSelf: 'stretch', minHeight: '32px', background: accentColor, borderRadius: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#001233', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
          {sg.title}
          <Badge status={sg.status} />
          {isPendingApproval && (
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
              Pending Approval
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#7D8597', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span>Weight: <strong style={{ color: '#0466C8' }}>{sg.weight}%</strong></span>
          {sg.due_date && <span>Due {new Date(sg.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
        </div>
        {sg.completion_rejected_at && !isPendingApproval && !isCompleted && (
          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '3px' }}>
            ✗ Completion rejected — {sg.completion_rejection_reason || 'no reason provided'}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: '6px', alignItems: 'center' }}>
        {canComplete && (
          <button onClick={() => onMarkComplete(sg)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
            Mark Complete
          </button>
        )}
        {isPendingApproval && (
          <button onClick={() => onWithdraw(sg.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', background: 'rgba(245,158,11,0.05)', color: '#d97706' }}>
            Withdraw
          </button>
        )}
        {isCompleted && !isPendingApproval && (
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>✓ Done</span>
        )}
      </div>
    </div>
  )
}

/* ── Goal card ─────────────────────────────────────────────── */

function GoalCard({ goal, onEdit, onSubmit, onDelete, onAddSub, onMarkComplete, onWithdraw, onViewReject }) {
  const [showHistory, setShowHistory] = useState(false)
  const canEdit   = ['draft', 'in_progress'].includes(goal.status) && !goal.parent_goal_id
  const canSubmit = ['draft', 'in_progress'].includes(goal.status) && !goal.parent_goal_id
  const canDelete = goal.status === 'draft' && !goal.parent_goal_id
  const subGoals  = goal.subGoals || []
  const completedWeight = subGoals.filter(sg => sg.status === 'completed').reduce((s, sg) => s + Number(sg.weight), 0)
  const progressVal = subGoals.length > 0 ? completedWeight : goal.progress

  const statusColor = STATUS_META[goal.status]?.color || '#E3E7EE'
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #E3E7EE',
      borderLeft: `4px solid ${statusColor}`,
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}>
      <div style={{ padding: '18px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#001233', marginBottom: '4px', lineHeight: '1.3' }}>
              {goal.title}
            </div>
            {goal.description && (
              <div style={{ fontSize: '12px', color: '#7D8597', lineHeight: '1.5', marginBottom: '4px' }}>{goal.description}</div>
            )}
            {goal.status === 'in_progress' && goal.rejection_reason && (
              <div onClick={() => onViewReject(goal)} style={{ fontSize: '12px', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ⚠ Rejected — <span style={{ textDecoration: 'underline' }}>View reason</span>
              </div>
            )}
            {goal.status === 'submitted' && (
              <div style={{ fontSize: '12px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>⏳</span> Awaiting manager approval
              </div>
            )}
            {goal.status === 'approved' && (
              <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>✓</span> Approved{goal.approved_by_name ? ` by ${goal.approved_by_name}` : ''}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <Badge status={goal.status} />
          </div>
        </div>

        {/* Meta chips */}
        {(goal.target_metric || goal.due_date || goal.start_date || subGoals.length > 0) && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {goal.target_metric && (
              <span style={{ fontSize: '11px', color: '#7D8597', background: '#F1F4F8', border: '1px solid #E3E7EE', padding: '3px 9px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🎯 {goal.target_metric}
              </span>
            )}
            {goal.start_date && (
              <span style={{ fontSize: '11px', color: '#7D8597', background: '#F1F4F8', border: '1px solid #E3E7EE', padding: '3px 9px', borderRadius: '20px' }}>
                From {new Date(goal.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {goal.due_date && (
              <span style={{ fontSize: '11px', color: '#7D8597', background: '#F1F4F8', border: '1px solid #E3E7EE', padding: '3px 9px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📅 Due {new Date(goal.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {subGoals.length > 0 && (
              <span style={{ fontSize: '11px', color: '#0466C8', background: 'rgba(4, 102, 200,0.07)', border: '1px solid rgba(4, 102, 200,0.15)', padding: '3px 9px', borderRadius: '20px' }}>
                🔗 {subGoals.length} sub-goal{subGoals.length !== 1 ? 's' : ''} · {completedWeight}% achieved
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: subGoals.length > 0 ? '14px' : '16px' }}>
          <ProgressBar value={progressVal} />
        </div>

        {/* Sub-goals */}
        {subGoals.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Sub-Goals
              </span>
              <span style={{ fontSize: '11px', color: '#7D8597' }}>
                {Number(goal.sub_goal_weight_total || 0)}% allocated
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {subGoals.map(sg => (
                <SubGoalRow key={sg.id} sg={sg} onMarkComplete={onMarkComplete} onWithdraw={onWithdraw} parentStatus={goal.status} />
              ))}
            </div>
            {Number(goal.sub_goal_weight_total || 0) < 100 && (
              <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '6px', paddingLeft: '4px' }}>
                {100 - Number(goal.sub_goal_weight_total || 0)}% weight remaining
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #F1F4F8', marginTop: '4px', paddingTop: '12px' }}>
          {canEdit && (
            <button onClick={() => onEdit(goal)} style={actionBtn('#0466C8', 'rgba(4, 102, 200,0.08)')}>Edit</button>
          )}
          {canSubmit && (
            <button onClick={() => onSubmit(goal.id)} style={actionBtn('#059669', 'rgba(16,185,129,0.08)')}>Submit for Approval</button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(goal.id)} style={actionBtn('#ef4444', 'rgba(239,68,68,0.07)')}>Delete</button>
          )}
          {['approved', 'active', 'in_progress'].includes(goal.status) && (
            <button onClick={() => onAddSub(goal)} style={{
              ...actionBtn('#0466C8', 'rgba(4, 102, 200,0.05)'),
              border: '1px dashed rgba(4, 102, 200,0.35)',
            }}>
              + Add Sub-Goal
            </button>
          )}
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: '6px', border: '1px solid #E3E7EE', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', background: showHistory ? 'rgba(4, 102, 200,0.06)' : '#f8fafc', color: showHistory ? '#0466C8' : '#7D8597', transition: 'all 0.15s' }}
          >
            {showHistory ? '▲ Hide History' : '▼ History'}
          </button>
        </div>

        {showHistory && <GoalTimeline goalId={goal.id} />}
      </div>
    </div>
  )
}

function actionBtn(color, bg) {
  return {
    padding: '5px 13px', borderRadius: '6px', border: 'none',
    cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit',
    background: bg, color, transition: 'opacity 0.15s',
  }
}

/* ── Pagination ────────────────────────────────────────────── */

function PageBtn({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: '34px', height: '34px', padding: '0 10px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '9px',
        border: active ? '1.5px solid #0466C8' : '1px solid #E3E7EE',
        background: active ? 'linear-gradient(135deg,#0466C8,#0353A4)' : disabled ? '#f8fafc' : '#ffffff',
        color: active ? '#ffffff' : disabled ? '#cbd5e1' : '#33415C',
        fontSize: '12px', fontWeight: active ? '700' : '500',
        fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
        boxShadow: active ? '0 2px 8px rgba(4, 102, 200,0.3)' : 'none',
        transition: 'all 0.15s',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  )
}

function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (total === 0) return null
  const start = Math.min((page - 1) * pageSize + 1, total)
  const end   = Math.min(page * pageSize, total)

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: '20px', padding: '12px 18px',
      background: '#ffffff', border: '1px solid #E3E7EE',
      borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      flexWrap: 'wrap', gap: '12px',
    }}>

      {/* Left – range label + per-page selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#7D8597' }}>
          Showing{' '}
          <strong style={{ color: '#001233' }}>{start}–{end}</strong>
          {' '}of{' '}
          <strong style={{ color: '#001233' }}>{total}</strong>
          {' '}goal{total !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Per page</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '4px 28px 4px 10px', borderRadius: '8px',
              border: '1px solid #E3E7EE', background: '#f8fafc',
              color: '#33415C', fontSize: '12px', fontFamily: 'inherit',
              cursor: 'pointer', outline: 'none', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}
          >
            {[3, 5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Right – page buttons (only when needed) */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <PageBtn label="‹" onClick={() => onPageChange(page - 1)} disabled={page === 1} />
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', userSelect: 'none' }}>…</span>
            ) : (
              <PageBtn key={p} label={p} onClick={() => onPageChange(p)} active={p === page} />
            )
          )}
          <PageBtn label="›" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} />
        </div>
      )}
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────── */

const STATUS_FILTERS = ['all', 'draft', 'active', 'in_progress', 'submitted', 'approved', 'completed', 'rejected']

export default function MyGoals() {
  const navigate = useNavigate()

  const [created, setCreated] = useState([])
  const [createdLoading, setCreatedLoading] = useState(true)
  const [goalConfig, setGoalConfig] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [completeTarget, setCompleteTarget] = useState(null)
  const [rejectDetail, setRejectDetail] = useState(null)

  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const loadCreated = useCallback(() => {
    setCreatedLoading(true)
    Promise.all([
      api.get('/employee/goals/goal-config'),
      api.get('/employee/goals/created'),
    ])
      .then(([cfgRes, createdRes]) => {
        setGoalConfig(cfgRes.data)
        setCreated(createdRes.data || [])
      })
      .catch(() => showToast('Failed to load your goals', 'error'))
      .finally(() => setCreatedLoading(false))
  }, [])

  useEffect(() => { loadCreated() }, [loadCreated])

  function changeFilter(f) {
    setStatusFilter(f)
    setPage(1)
  }

  /* Computed */
  const topLevel = created.filter(g => !g.parent_goal_id)
  const filtered  = statusFilter === 'all' ? topLevel : topLevel.filter(g => g.status === statusFilter)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handlePageSizeChange(size) {
    setPageSize(size)
    setPage(1)
  }

  const counts = {
    total:     topLevel.length,
    active:    topLevel.filter(g => ['active', 'in_progress'].includes(g.status)).length,
    pending:   topLevel.filter(g => g.status === 'submitted').length,
    completed: topLevel.filter(g => ['approved', 'completed'].includes(g.status)).length,
  }

  /* Handlers */
  async function handleSave() {
    if (!form.title?.trim()) { showToast('Title is required.', 'error'); return }
    if (!form.weight) { showToast('Weight is required for the sub-goal.', 'error'); return }
    setSaving(true)
    try {
      await api.post('/employee/goals', form)
      showToast('Sub-goal created.')
      setShowModal(false)
      setForm(BLANK_FORM)
      loadCreated()
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(goalId) {
    try {
      await api.post(`/employee/goals/created/${goalId}/submit`)
      showToast('Goal submitted for manager approval.')
      loadCreated()
    } catch (err) {
      showToast(err.response?.data?.message || 'Submit failed.', 'error')
    }
  }

  async function handleDelete(goalId) {
    if (!window.confirm('Delete this goal?')) return
    try {
      await api.delete(`/employee/goals/created/${goalId}`)
      showToast('Goal deleted.')
      loadCreated()
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error')
    }
  }

  async function handleMarkComplete(note) {
    if (!completeTarget) return
    setSaving(true)
    try {
      await api.post(`/employee/goals/${completeTarget.id}/mark-complete`, { note })
      showToast('Completion request sent to your manager for approval.')
      setCompleteTarget(null)
      loadCreated()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit completion request.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleWithdraw(goalId) {
    try {
      await api.delete(`/employee/goals/${goalId}/withdraw-completion`)
      showToast('Completion request withdrawn.')
      loadCreated()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to withdraw.', 'error')
    }
  }

  function openEdit(goal) {
    navigate(`/employee/goals/edit/${goal.id}`)
  }

  function openAddSub(parentGoal) {
    setForm({ ...BLANK_FORM, parent_goal_id: String(parentGoal.id) })
    setShowModal(true)
  }

  /* ── Render ── */
  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
      <EmployeeSidebar active="goals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="My Goals" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#001233', letterSpacing: '-0.3px' }}>My Goals</h1>
            <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#7D8597' }}>Track and manage goals you've created.</p>
          </div>
          {goalConfig?.allow_employee_goal && (
            <button
              onClick={() => navigate('/employee/goals/create')}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #0466C8, #0353A4)',
                color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(4, 102, 200,0.3)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              + Create Goal
            </button>
          )}
          {goalConfig && !goalConfig.allow_employee_goal && (
            <div style={{ fontSize: '12px', color: '#7D8597', fontStyle: 'italic', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #E3E7EE' }}>
              Goal creation is disabled by your administrator.
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Goals',      value: counts.total,     color: '#0466C8', bg: 'rgba(4, 102, 200,0.08)',  icon: '📋' },
            { label: 'Active',           value: counts.active,    color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', icon: '⚡' },
            { label: 'Pending Approval', value: counts.pending,   color: '#d97706', bg: 'rgba(234,179,8,0.08)',  icon: '⏳' },
            { label: 'Completed',        value: counts.completed, color: '#059669', bg: 'rgba(16,185,129,0.08)', icon: '✓' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#ffffff',
              border: '1px solid #E3E7EE',
              borderRadius: '14px', padding: '20px',
              display: 'flex', alignItems: 'center', gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', fontSize: '22px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#7D8597', marginTop: '4px', fontWeight: '500', letterSpacing: '0.02em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter chips */}
        <div style={{
          background: '#ffffff', border: '1px solid #E3E7EE',
          borderRadius: '14px', padding: '10px 12px',
          marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          {STATUS_FILTERS.map(s => {
            const count = s === 'all' ? topLevel.length : topLevel.filter(g => g.status === s).length
            const active = statusFilter === s
            const meta = STATUS_META[s]
            return (
              <button
                key={s}
                onClick={() => changeFilter(s)}
                style={{
                  padding: '6px 13px', borderRadius: '20px', cursor: 'pointer',
                  fontSize: '11px', fontWeight: '600', fontFamily: 'inherit',
                  border: active ? `1.5px solid ${meta ? meta.color + '60' : 'rgba(4, 102, 200,0.5)'}` : '1px solid #E3E7EE',
                  background: active ? (meta ? meta.bg : 'rgba(4, 102, 200,0.09)') : 'transparent',
                  color: active ? (meta ? meta.color : '#0466C8') : '#94a3b8',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                <span>{s === 'all' ? 'All' : STATUS_META[s]?.label || s}</span>
                <span style={{
                  minWidth: '18px', height: '18px', borderRadius: '9px',
                  background: active ? (meta ? meta.color : '#0466C8') : '#E3E7EE',
                  color: active ? '#fff' : '#7D8597',
                  fontSize: '10px', fontWeight: '700',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Goal list */}
        {createdLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: '14px', height: '140px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#ffffff', border: '1px solid #E3E7EE',
            borderRadius: '18px', padding: '64px 48px', textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(4, 102, 200,0.12), rgba(4, 102, 200,0.06))',
              border: '1px solid rgba(4, 102, 200,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', margin: '0 auto 20px',
            }}>🎯</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#001233', marginBottom: '8px' }}>
              {statusFilter === 'all' ? 'No goals yet' : `No ${STATUS_META[statusFilter]?.label || statusFilter} goals`}
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
              {statusFilter === 'all' && goalConfig?.allow_employee_goal
                ? 'Create your first goal and submit it for manager approval.'
                : statusFilter !== 'all' ? 'Try a different filter to see your goals.' : ''}
            </div>
            {statusFilter === 'all' && goalConfig?.allow_employee_goal && (
              <button
                onClick={() => navigate('/employee/goals/create')}
                style={{
                  padding: '10px 22px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #0466C8, #0353A4)',
                  color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                  fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(4, 102, 200,0.3)',
                }}
              >
                + Create Your First Goal
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginated.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEdit}
                  onSubmit={handleSubmit}
                  onDelete={handleDelete}
                  onAddSub={openAddSub}
                  onMarkComplete={setCompleteTarget}
                  onWithdraw={handleWithdraw}
                  onViewReject={setRejectDetail}
                />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </main>

      {showModal && (
        <SubGoalModal
          form={form} setForm={setForm}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setForm(BLANK_FORM) }}
          saving={saving}
          parentGoals={created}
        />
      )}

      {completeTarget && (
        <CompleteModal
          goal={completeTarget}
          onConfirm={handleMarkComplete}
          onClose={() => setCompleteTarget(null)}
          saving={saving}
        />
      )}

      {rejectDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444', marginBottom: '12px' }}>Goal Rejected</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#001233', marginBottom: '8px' }}>{rejectDetail.title}</div>
            <div style={{ fontSize: '13px', color: '#7D8597', marginBottom: '20px', lineHeight: '1.6', padding: '12px 14px', background: 'rgba(239,68,68,0.04)', borderRadius: '8px', borderLeft: '3px solid rgba(239,68,68,0.35)' }}>
              {rejectDetail.rejection_reason || 'No reason provided.'}
            </div>
            <button onClick={() => setRejectDetail(null)} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#0466C8', color: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: '600' }}>OK</button>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '' })} />
    </div>
  </div>
  )
}
