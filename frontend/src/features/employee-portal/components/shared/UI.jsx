import React from 'react'
import { FiCheck, FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import { COLORS, STATUS_COLOR, GRADIENTS } from '../../theme'

export function KpiCard({ icon, label, value, sub, gradient }) {
  return (
    <div style={{
      background: gradient, borderRadius: '16px', padding: '20px 22px',
      position: 'relative', overflow: 'hidden', color: '#fff',
      boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    }}>
      <div style={{ position: 'absolute', right: '-18px', top: '-18px', width: '90px', height: '90px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '12px', bottom: '-28px', width: '70px', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', lineHeight: 1, position: 'relative' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: '600', opacity: 0.88, marginTop: '5px' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

export function Badge({ status }) {
  const key = (status || '').toLowerCase()
  const s = STATUS_COLOR[key] || STATUS_COLOR.draft
  return (
    <span style={{
      fontSize: '10px', fontWeight: '600', padding: '2px 8px',
      borderRadius: '20px', background: s.bg, color: s.color,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0))
  const color = pct >= 100 ? COLORS.green : pct >= 60 ? COLORS.primary : pct >= 30 ? COLORS.amber : COLORS.red
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: COLORS.textMuted }}>Progress</span>
        <span style={{ fontSize: '10px', fontWeight: '700', color }}>{pct}%</span>
      </div>
      <div style={{ height: '4px', background: '#F1F4F8', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${COLORS.primary}`, borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
      <div style={{ color: COLORS.primary, fontSize: '13px', fontWeight: '600' }}>{label}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function Toast({ message, type = 'success', onClose }) {
  const bg    = type === 'success' ? COLORS.green : type === 'error' ? COLORS.red : COLORS.amber
  const Icon  = type === 'success' ? FiCheck : type === 'error' ? FiX : FiAlertTriangle
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: bg, color: '#fff', borderRadius: '12px',
      padding: '12px 18px', fontSize: '13px', fontWeight: '600',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: '10px',
      animation: 'slideIn 0.25s ease',
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={11} color="#ffffff" /></span>
      {message}
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: '4px', opacity: 0.7, fontSize: '16px' }}>×</button>}
    </div>
  )
}

export function WidgetCard({ icon, iconBg, iconColor, title, subtitle, action, children }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: '18px', padding: '20px 22px', border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '10px', color: COLORS.textMuted }}>{subtitle}</div>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ViewAllLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '11px', fontWeight: '700', color: COLORS.primary,
        display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      View all <span aria-hidden="true">→</span>
    </button>
  )
}

export function EmptyState({ message, positive = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center', color: positive ? COLORS.green : COLORS.textMuted, fontSize: '11px', padding: '16px 0', fontWeight: positive ? '600' : '400' }}>
      {positive && <FiCheckCircle size={12} />}
      {message}
    </div>
  )
}
