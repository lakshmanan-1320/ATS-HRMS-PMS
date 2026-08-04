import React from 'react'
import { FiTrash2 } from 'react-icons/fi'

export default function GoalDeleteDialog({ goal, role, onConfirm, onCancel }) {
  if (!goal) return null

  const isDraft = goal.status === 'DRAFT'
  const isAllowedOverride = ['client_admin', 'hr'].includes(role)
  const canDelete = isDraft || isAllowedOverride

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onCancel}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#ffffff', borderRadius: 16, padding: 28,
        border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: '#fee2e2', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#ef4444'
          }}><FiTrash2 size={24} /></div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Delete Goal?</h3>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748b', fontWeight: 500, lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: '#1e293b' }}>"{goal.title}"</strong>?
            This action cannot be undone.
          </p>
          {!canDelete && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 8,
              background: '#fff7ed', border: '1px solid rgba(234,88,12,0.2)',
              fontSize: 12, color: '#ea580c', fontWeight: 600,
            }}>
              Only draft goals can be deleted.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '10px 24px', borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#64748b', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={!canDelete} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: canDelete ? '#dc2626' : '#e2e8f0',
            color: canDelete ? '#fff' : '#94a3b8',
            fontSize: 13, fontWeight: 700,
            cursor: canDelete ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}>Delete Goal</button>
        </div>
      </div>
    </div>
  )
}
