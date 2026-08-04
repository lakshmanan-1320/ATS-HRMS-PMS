import React from 'react';

export default function ActionItemCard({ item, onToggleComplete, onVerify, isManager, readOnly = false }) {
  if (!item) return null;

  const isCompleted = item.status === 'COMPLETED';
  const isVerified = item.verified_by_manager;

  const priorityColors = {
    HIGH: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
    MEDIUM: { bg: '#fffbebe', text: '#b45309', border: '#fde68a' },
    LOW: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }
  };
  const pStyle = priorityColors[item.priority] || priorityColors.MEDIUM;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onToggleComplete && onToggleComplete(item.action_item_id)}
          disabled={readOnly}
          style={{ width: 18, height: 18, marginTop: 2, cursor: readOnly ? 'not-allowed' : 'pointer' }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: isCompleted ? '#64748b' : '#1e293b', textDecoration: isCompleted ? 'line-through' : 'none' }}>
            {item.title}
          </div>
          {item.description && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{item.description}</div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ background: pStyle.bg, color: pStyle.text, border: `1px solid ${pStyle.border}`, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
              {item.priority}
            </span>
            {item.due_date && (
              <span style={{ fontSize: 11, color: '#64748b' }}>📅 Due: {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            )}
            <span style={{ fontSize: 11, color: '#64748b' }}>👤 Assigned to: {item.assigned_to_name || 'Employee'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {isCompleted ? (
          isVerified ? (
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ✓ Verified by Manager
            </span>
          ) : (isManager && !readOnly) ? (
            <button
              onClick={() => onVerify && onVerify(item.action_item_id)}
              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Verify Completion
            </button>
          ) : (
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
              Pending Manager Verification
            </span>
          )
        ) : (
          <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
            Pending
          </span>
        )}
      </div>
    </div>
  );
}
