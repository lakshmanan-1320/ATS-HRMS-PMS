import React from 'react';

const CATEGORY_META = {
  GREAT_LEADERSHIP: { label: 'Great Leadership', icon: '👑', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  EXCELLENT_COLLABORATION: { label: 'Excellent Collaboration', icon: '🤝', bg: '#e0f2fe', color: '#075985', border: '#bae6fd' },
  PROBLEM_SOLVER: { label: 'Problem Solver', icon: '🧩', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' },
  CUSTOMER_APPRECIATION: { label: 'Customer Appreciation', icon: '🌟', bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
  INNOVATION: { label: 'Innovation', icon: '🚀', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' }
};

export default function PraiseCard({ praise }) {
  if (!praise) return null;

  const meta = CATEGORY_META[praise.category] || { label: praise.category, icon: '🏆', bg: '#f1f5f9', color: '#1e293b', border: '#cbd5e1' };

  return (
    <div style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{meta.icon}</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: meta.color }}>{meta.label}</span>
        </div>
        <span style={{ fontSize: 11, color: meta.color, opacity: 0.8 }}>
          {new Date(praise.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, marginTop: 4 }}>
        "{praise.message}"
      </div>

      <div style={{ fontSize: 11, color: meta.color, marginTop: 8, fontWeight: 700 }}>
        Recognized by {praise.from_user_name || 'Manager'}
      </div>
    </div>
  );
}
