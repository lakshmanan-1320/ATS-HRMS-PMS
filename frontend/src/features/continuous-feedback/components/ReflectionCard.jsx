import React from 'react';

export default function ReflectionCard({ reflection }) {
  if (!reflection) return null;

  const qnaList = Array.isArray(reflection.qna_answers) ? reflection.qna_answers : [];

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{reflection.employee_name || 'Employee Reflection'}</span>
        </div>
        <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(reflection.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      {qnaList.length > 0 ? (
        qnaList.map((item, idx) => (
          <div key={item.answer_id || idx} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
              Q{idx + 1}. {item.question}
            </div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 3, background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {item.answer || '—'}
            </div>
          </div>
        ))
      ) : (
        <>
          {reflection.what_i_learned && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>What I Learned:</div>
              <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{reflection.what_i_learned}</div>
            </div>
          )}

          {reflection.challenges_faced && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Challenges Faced:</div>
              <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{reflection.challenges_faced}</div>
            </div>
          )}

          {reflection.support_needed && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Support Needed:</div>
              <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{reflection.support_needed}</div>
            </div>
          )}

          {reflection.next_steps && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>My Next Steps:</div>
              <div style={{ fontSize: 13, color: '#0f766e', fontWeight: 600, marginTop: 2 }}>{reflection.next_steps}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
