import React, { useState, useEffect, useRef } from 'react'
import { STATUS_META, PRIORITY_META, CATEGORY_META } from '../pages/GoalPage'
import { 
  FiEye, FiEdit2, FiTrash2, FiCheck, FiX, FiRefreshCw, FiMoreVertical, 
  FiMessageSquare, FiAlertCircle, FiTrendingUp, FiFolder, FiLock, FiCalendar,
  FiTarget, FiUser
} from 'react-icons/fi'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Badge({ value, meta }) {
  const m = meta[value] || { label: value, color: '#64748b', bg: '#f1f5f9', border: 'rgba(100,116,139,0.2)' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
      color: m.color, background: m.bg, border: `1px solid ${m.border || m.bg}`,
      whiteSpace: 'nowrap',
    }}>{m.label || m.icon}{m.icon ? ` ${m.label}` : ''}</span>
  )
}

/* ─── Dropdown Actions Menu ─── */
function ActionMenu({ goal, role, onView, onEdit, onDelete, onStatusChange, activeConfig }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const s = goal.status
  const isEmp = role === 'employee'
  const isMgr = role === 'manager' || role === 'client_admin' || role === 'hr'
  const allowEditActive = activeConfig?.allow_goal_edit_after_approval ?? false

  const actions = []

  // View: Always
  actions.push({ icon: FiEye, label: 'View Details', color: '#475569', onClick: () => onView(goal.goal_id) })

  // Edit logic
  let canEdit = false
  if (['DRAFT', 'CHANGES_REQUESTED'].includes(s)) {
    canEdit = true
  } else if (s === 'ACTIVE' && allowEditActive) {
    canEdit = true
  }

  if (canEdit) {
    actions.push({ icon: FiEdit2, label: 'Edit Goal', color: '#2563eb', onClick: () => onEdit(goal) })
  }

  // Submit: only the goal owner (employee) can submit their own plan
  if (['DRAFT', 'CHANGES_REQUESTED'].includes(s) && isEmp) {
    actions.push({ icon: FiRefreshCw, label: 'Submit Plan', color: '#059669', onClick: () => onStatusChange(goal.goal_id, 'PENDING_APPROVAL') })
  }

  // Manager approvals: only PENDING_APPROVAL
  if (s === 'PENDING_APPROVAL' && isMgr) {
    actions.push({ icon: FiCheck, label: 'Approve Goal', color: '#16a34a', onClick: () => onStatusChange(goal.goal_id, 'ACTIVE') })
    actions.push({
      icon: FiMessageSquare, 
      label: 'Request Changes', 
      color: '#7c3aed', 
      onClick: () => {
        const reason = prompt('Enter request changes reason:')
        if (reason) onStatusChange(goal.goal_id, 'CHANGES_REQUESTED', { reason })
      }
    })
    actions.push({
      icon: FiX, 
      label: 'Reject Goal', 
      color: '#dc2626', 
      onClick: () => {
        const reason = prompt('Enter rejection reason:')
        if (reason) onStatusChange(goal.goal_id, 'REJECTED', { reason })
      }
    })
  }

  // Delete: client_admin and hr can delete any goal. Others can only delete DRAFT.
  if (['client_admin', 'hr'].includes(role) || s === 'DRAFT') {
    actions.push({ icon: FiTrash2, label: 'Delete Goal', color: '#dc2626', onClick: () => onDelete(goal) })
  }

  if (actions.length === 0) return null

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
          padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
          color: '#64748b', transition: 'all 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      >
        <FiMoreVertical size={16} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, marginTop: 4, width: 180,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          zIndex: 50, padding: 6, display: 'flex', flexDirection: 'column', gap: 2
        }}>
          {actions.map((act, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); act.onClick() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                width: '100%', border: 'none', borderRadius: 6, background: 'none',
                color: act.color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${act.color}0a`}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <act.icon size={14} />
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Skeleton Loader ─── */
function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          background: '#ffffff', borderRadius: 14, height: 90,
          border: '1px solid #e2e8f0', opacity: 1 - i * 0.15,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '80px 20px',
      background: '#ffffff', borderRadius: 16, border: '2px dashed #e2e8f0',
    }}>
      <div style={{ fontSize: 52, marginBottom: 14, color: '#cbd5e1' }}><FiTarget size={52} /></div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No goals found</div>
      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
        Create your first goal using the button above.
      </div>
    </div>
  )
}

/* ─── Goal Card Component ─── */
function GoalCard({ g, allGoals, role, onView, onEdit, onDelete, onStatusChange, activeConfig }) {
  const subCount = allGoals.filter(x => x.parent_goal_id === g.goal_id).length
  const statusMeta = STATUS_META[g.status] || STATUS_META.DRAFT
  const priorityMeta = PRIORITY_META[g.priority] || {}

  return (
    <div style={{
      background: '#ffffff', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${statusMeta.color}`,
      transition: 'all 0.2s ease', cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      marginBottom: 10,
      position: 'relative',
      zIndex: 1,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = statusMeta.color
        e.currentTarget.style.zIndex = 10
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
        e.currentTarget.style.borderColor = '#e2e8f0'
        e.currentTarget.style.zIndex = 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }} onClick={() => onView(g.goal_id)}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            {g.goal_code && (
              <span style={{
                fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.08)',
                padding: '2px 7px', borderRadius: 5, fontWeight: 700,
                border: '1px solid rgba(99,102,241,0.15)', fontFamily: 'monospace',
              }}>{g.goal_code}</span>
            )}
            <Badge value={g.status} meta={STATUS_META} />
            {g.priority && <Badge value={g.priority} meta={PRIORITY_META} />}
            {g.goal_category_name && (
              <span style={{
                fontSize: 10, color: '#475569', background: '#f8fafc',
                border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: 5, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
                <FiFolder size={10} /> {g.goal_category_name}
              </span>
            )}
            {subCount > 0 && (
              <span style={{
                fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)', padding: '2px 7px', borderRadius: 5, fontWeight: 700,
              }}>{subCount} sub-goal{subCount > 1 ? 's' : ''}</span>
            )}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{g.title}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b', flexWrap: 'wrap', fontWeight: 500 }}>
            {g.assigned_to_employee_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiUser size={11} /> {g.assigned_to_employee_name}</span>}
            {g.due_date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiCalendar size={11} /> Due {fmtDate(g.due_date)}</span>}
            {g.weight != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiTrendingUp size={11} /> Weight: {g.weight}%</span>}
            {g.visibility && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FiLock size={11} /> {g.visibility}</span>}
          </div>

          {g.status === 'CHANGES_REQUESTED' && g.rejection_reason && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8,
              background: '#f5f3ff', border: '1px solid rgba(124,58,237,0.15)',
              fontSize: 12, color: '#7c3aed', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
              <FiAlertCircle size={14} /> <strong>Manager:</strong> {g.rejection_reason}
            </div>
          )}
        </div>

        <ActionMenu
          goal={g}
          role={role}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          activeConfig={activeConfig}
        />
      </div>
    </div>
  )
}

/* ─── Goal List ─── */
export default function GoalList({ goals = [], loading, role, onView, onEdit, onDelete, onStatusChange, allGoals = [], groupView = false, activeConfig }) {
  if (loading) return <SkeletonRows />
  if (goals.length === 0) return <EmptyState />

  // ─── Group View (For Manager / Admin Reviewing Employee Goal Plans) ───
  if (groupView) {
    // Group goals by employee
    const groups = {}
    goals.forEach(g => {
      const empName = g.assigned_to_employee_name || g.owner_employee_name || 'Organization / Dept Goals'
      const empId = g.assigned_to_employee_id || 'org'
      if (!groups[empId]) {
        groups[empId] = {
          employeeName: empName,
          employeeCode: g.assigned_to_employee_code || '',
          goals: [],
        }
      }
      groups[empId].goals.push(g)
    })

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {Object.entries(groups).map(([empId, group]) => {
          // Calculate overall status for this employee plan
          let overallStatus = 'DRAFT'
          if (group.goals.some(g => g.status === 'CHANGES_REQUESTED')) {
            overallStatus = 'CHANGES_REQUESTED'
          } else if (group.goals.some(g => g.status === 'PENDING_APPROVAL')) {
            overallStatus = 'PENDING_APPROVAL'
          } else if (group.goals.every(g => ['ACTIVE', 'IN_PROGRESS', 'COMPLETED'].includes(g.status))) {
            overallStatus = 'ACTIVE'
          }

          const hasPending = group.goals.some(g => g.status === 'PENDING_APPROVAL')

          return (
            <div key={empId} style={{
              background: '#ffffff', borderRadius: 16, padding: '24px 28px',
              border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}>
              {/* Group Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {group.employeeName}
                    </h3>
                    {group.employeeCode && (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>({group.employeeCode})</span>
                    )}
                    <Badge value={overallStatus} meta={STATUS_META} />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
                    {group.goals.length} Goal{group.goals.length !== 1 ? 's' : ''} in current plan
                  </div>
                </div>

                {/* Plan-Level Group Actions */}
                {hasPending && (role === 'client_admin' || role === 'manager' || role === 'hr') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        group.goals.forEach(g => {
                          if (g.status === 'PENDING_APPROVAL') onStatusChange(g.goal_id, 'ACTIVE')
                        })
                      }}
                      style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: '#16a34a', color: '#fff', fontSize: 12,
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Approve Plan</button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter change request comments:')
                        if (reason !== null) {
                          group.goals.forEach(g => {
                            if (g.status === 'PENDING_APPROVAL') onStatusChange(g.goal_id, 'CHANGES_REQUESTED', { reason })
                          })
                        }
                      }}
                      style={{
                        padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                        background: '#f8fafc', color: '#7c3aed', fontSize: 12,
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Request Changes</button>
                  </div>
                )}
              </div>

              {/* Goals Cards under this Plan */}
              <div>
                {group.goals.map(g => (
                  <GoalCard
                    key={g.goal_id}
                    g={g}
                    allGoals={allGoals}
                    role={role}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    activeConfig={activeConfig}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Normal Flat List View (For "My Goals") ───
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {goals.map(g => (
        <GoalCard
          key={g.goal_id}
          g={g}
          allGoals={allGoals}
          role={role}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          activeConfig={activeConfig}
        />
      ))}
    </div>
  )
}
