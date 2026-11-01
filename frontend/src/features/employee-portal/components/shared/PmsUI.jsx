import React from 'react'
import { FiArrowUpRight } from 'react-icons/fi'
import { PMS } from '../../theme'

// Shared building blocks for the PMS (Figma) employee dashboard.
// Text uses <div>/<span> (not <p>/<h*>) because globals.css forces dark colours
// on paragraph/heading tags inside <main>.

export const T = {
  cardTitle: { fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 400, color: PMS.navy, lineHeight: '20px' },
  bigNumber: { fontFamily: PMS.fontHead, fontSize: '36px', fontWeight: 700, color: PMS.navy, lineHeight: '54px', letterSpacing: '-0.5px' },
  caption:   { fontFamily: PMS.fontHead, fontSize: '11px', color: PMS.muted, lineHeight: '17px' },
  small:     { fontFamily: PMS.fontHead, fontSize: '10px', color: PMS.muted, lineHeight: '15px' },
  rowTitle:  { fontFamily: PMS.fontHead, fontSize: '11px', fontWeight: 600, color: PMS.navy, lineHeight: '16px' },
}

export function PmsCard({ children, className = '', style }) {
  return (
    <section
      className={className}
      style={{
        background: PMS.white,
        border: `1px solid ${PMS.border}`,
        borderRadius: PMS.radiusCard,
        padding: '20px 20.5px 20.5px',
        minHeight: '261px',
        minWidth: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: PMS.fontHead,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

/** 32px round chip on the right of a card header — either a static icon or an ↗ action. */
export function HeaderChip({ icon, onClick, title }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="pms-icon-btn pms-focus"
        style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: PMS.white, border: `1px solid ${PMS.border}`, color: PMS.navy,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
        }}
      >
        {icon || <FiArrowUpRight size={13} />}
      </button>
    )
  }
  return (
    <span aria-hidden style={{
      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
      background: PMS.surfaceAlt, color: PMS.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </span>
  )
}

export function CardHeader({ title, chip }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minHeight: '32px' }}>
      <div style={{ ...T.cardTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {chip}
    </div>
  )
}

/** Pill badge. tone: 'blue' (E3EEFA / 0466C8) | 'grey' (EEF1F5 / 33415C) */
export function Pill({ children, tone = 'grey', style }) {
  const tones = {
    blue: { background: PMS.pillBlue, color: PMS.blue },
    grey: { background: PMS.pillGrey, color: PMS.slate },
  }
  return (
    <span style={{
      ...tones[tone],
      display: 'inline-flex', alignItems: 'center', height: '25px', padding: '0 12px',
      borderRadius: '12.5px', fontFamily: PMS.fontHead, fontSize: '11px', whiteSpace: 'nowrap',
      flexShrink: 0, ...style,
    }}>
      {children}
    </span>
  )
}

/** Big number + pill + caption block used by every stat card. */
export function BigStat({ value, pill, pillTone = 'grey', caption }) {
  return (
    <div style={{ marginTop: '3px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
        <span style={T.bigNumber}>{value}</span>
        {pill && <Pill tone={pillTone}>{pill}</Pill>}
      </div>
      {caption && <div style={{ ...T.caption, marginTop: '-2px' }}>{caption}</div>}
    </div>
  )
}

/** Dashed "nothing here" box from the Figma (270×104). */
export function EmptyBox({ icon, title, sub = 'Nothing to show yet', dark = false, style }) {
  return (
    <div style={{
      background: dark ? 'transparent' : PMS.surfaceAlt,
      border: `1px dashed ${dark ? 'rgba(255,255,255,0.3)' : '#D5DBE5'}`,
      borderRadius: '16px',
      minHeight: '104px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '14px', boxSizing: 'border-box', textAlign: 'center', gap: '2px',
      ...style,
    }}>
      {icon && (
        <span style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: dark ? 'rgba(255,255,255,0.12)' : PMS.white,
          color: dark ? PMS.white : PMS.slate,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
        }}>{icon}</span>
      )}
      <div style={{ fontFamily: PMS.fontHead, fontSize: '11px', color: dark ? PMS.white : PMS.navy }}>{title}</div>
      {sub && <div style={{ fontFamily: PMS.fontHead, fontSize: '10px', color: dark ? 'rgba(255,255,255,0.55)' : PMS.muted }}>{sub}</div>}
    </div>
  )
}

/** Compact list row used inside stat cards when there is data. */
export function ListRow({ title, sub, right, rightTone = 'grey', last, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        padding: '8px 0', borderBottom: last ? 'none' : `1px solid ${PMS.pillGrey}`,
        cursor: onClick ? 'pointer' : 'default', minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...T.rowTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {sub && <div style={{ ...T.small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
      {right != null && <Pill tone={rightTone} style={{ height: '22px', fontSize: '10px', padding: '0 9px' }}>{right}</Pill>}
    </div>
  )
}

export function LegendDot({ color, label, value }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', ...T.small, whiteSpace: 'nowrap' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
      {value != null && <strong style={{ color: PMS.navy, fontWeight: 700, marginLeft: '3px' }}>{value}</strong>}
    </span>
  )
}

/** Days until a date (ceil); negative when past. */
export function daysUntil(date, from = new Date()) {
  const d = new Date(date)
  if (isNaN(d)) return null
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((b - a) / 864e5)
}

export function dayLabel(n) {
  if (n == null) return '—'
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n < 0) return `${Math.abs(n)}d overdue`
  return `${n} days`
}
