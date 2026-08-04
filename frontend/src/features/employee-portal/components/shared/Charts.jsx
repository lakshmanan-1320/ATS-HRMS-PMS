import React from 'react'
import { BAR_COLORS } from '../../theme'

export function DonutChart({ segments, size = 130, strokeWidth = 13 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const total = segments.reduce((s, g) => s + g.value, 0) || 1
  let cum = 0
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const len = (seg.value / total) * circ
        const offset = cum
        cum += len
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
          />
        )
      })}
    </svg>
  )
}

export function MiniBarChart({ bars, height = 64 }) {
  const max = Math.max(...bars.map(b => b.value), 1)
  const barW = bars.length > 0 ? 100 / bars.length : 100
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height: `${height}px` }} preserveAspectRatio="none">
      {bars.map((bar, i) => {
        const bh = Math.max(2, (bar.value / max) * (height - 18))
        const x = i * barW + barW * 0.18
        const w = barW * 0.64
        const y = height - bh - 16
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={bh} rx="2.5" fill={BAR_COLORS[i % BAR_COLORS.length]} opacity="0.85" />
            <text x={x + w / 2} y={height - 5} textAnchor="middle" fontSize="5.5" fill="#94a3b8" fontFamily="sans-serif">
              {bar.label}
            </text>
            <text x={x + w / 2} y={y - 2} textAnchor="middle" fontSize="5" fill="#64748b" fontFamily="sans-serif">
              {bar.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function MiniRing({ pct, size = 56, color = '#6366f1' }) {
  const r = (size - 7) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color }}>{pct}%</span>
      </div>
    </div>
  )
}
