import React from 'react';

export default function FeedbackTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
        No coaching history recorded yet.
      </div>
    );
  }

  const getTypeMeta = (item) => {
    switch (item.item_type) {
      case 'FEEDBACK':
        return { icon: '💬', title: `${item.sub_type || 'Coaching'} Feedback`, color: '#6366f1', bg: '#eef2ff' };
      case 'REFLECTION':
        return { icon: '💡', title: 'Employee Reflection', color: '#0f766e', bg: '#ccfbf1' };
      case 'ACTION_ITEM':
        return { icon: '📋', title: `Action Item (${item.sub_type})`, color: '#b45309', bg: '#fef3c7' };
      case 'PRAISE':
        return { icon: '🏆', title: `Praise Badge (${item.sub_type})`, color: '#166534', bg: '#dcfce7' };
      default:
        return { icon: '📌', title: 'Activity', color: '#475569', bg: '#f1f5f9' };
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: 20, margin: '16px 0' }}>
      {/* Vertical Timeline Line */}
      <div style={{ position: 'absolute', top: 8, bottom: 8, left: 7, width: 2, background: '#cbd5e1' }} />

      {timeline.map((item, idx) => {
        const meta = getTypeMeta(item);
        return (
          <div key={idx} style={{ position: 'relative', marginBottom: 20, paddingLeft: 16 }}>
            {/* Dot */}
            <div style={{
              position: 'absolute',
              left: -19,
              top: 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: meta.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 9
            }} />

            <div style={{ background: meta.bg, border: `1px solid ${meta.color}40`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: meta.color }}>
                  {meta.icon} {meta.title}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{item.details}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>By {item.actor_name || 'System'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
