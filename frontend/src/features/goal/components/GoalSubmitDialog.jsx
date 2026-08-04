import React from 'react'
import { FiUploadCloud, FiAlertTriangle } from 'react-icons/fi'

export default function GoalSubmitDialog({ draftGoals = [], totalWeight, onConfirm, onCancel, saving }) {
  const goalCount = draftGoals.length
  const weightValid = totalWeight === 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onCancel}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#ffffff', borderRadius: 16, padding: 28,
        border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: weightValid ? '#e0f2fe' : '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: weightValid ? '#0284c7' : '#d97706'
          }}>
            {weightValid ? <FiUploadCloud size={28} /> : <FiAlertTriangle size={28} />}
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Submit Goal Plan</h3>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748b', fontWeight: 500, lineHeight: 1.6 }}>
            Submit all goals for manager review?
          </p>
        </div>

        {/* Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          marginBottom: 20, padding: '14px 16px', borderRadius: 10,
          background: '#f8fafc', border: '1px solid #e2e8f0',
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Goals</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0891b2' }}>{goalCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Total Weight</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: weightValid ? '#16a34a' : '#dc2626' }}>
              {totalWeight}%
            </div>
          </div>
        </div>

        {!weightValid && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: '#fff7ed', border: '1px solid rgba(234,88,12,0.2)',
            fontSize: 12, color: '#ea580c', fontWeight: 600, lineHeight: 1.5,
          }}>
            Total weight must equal 100% before submission. Currently at {totalWeight}%.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '10px 24px', borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#64748b', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={saving || !weightValid}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: (saving || !weightValid) ? '#e2e8f0' : 'linear-gradient(135deg, #059669, #047857)',
              color: (saving || !weightValid) ? '#94a3b8' : '#fff',
              fontSize: 13, fontWeight: 700,
              cursor: (saving || !weightValid) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: (saving || !weightValid) ? 'none' : '0 4px 14px rgba(5,150,105,0.3)',
            }}
          >{saving ? 'Submitting…' : 'Submit'}</button>
        </div>
      </div>
    </div>
  )
}
