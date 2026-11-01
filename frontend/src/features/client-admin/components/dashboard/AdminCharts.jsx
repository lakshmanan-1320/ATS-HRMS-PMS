import React, { useState } from 'react'
import { PMS } from '../../../employee-portal/theme'

/** Progress ring (Figma "KPI Approval" / "Performance Overview"). */
export function Ring({ pct = 0, size = 64, stroke = 8, label, sub, color = PMS.blue, track = PMS.pillGrey }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${p}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label != null && (
        <text x="50%" y={sub ? '47%' : '50%'} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: PMS.fontHead, fontWeight: 700, fontSize: size * 0.2, fill: PMS.navy }}>{label}</text>
      )}
      {sub && (
        <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: PMS.fontHead, fontSize: size * 0.1, fill: PMS.muted }}>{sub}</text>
      )}
    </svg>
  )
}

/** Thick donut with a navy remainder arc like the Figma status donuts. */
export function StatusDonut({ pct = 0, size = 116, label, sub }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${p}% ${sub || ''}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PMS.navy} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p > 0 ? PMS.blue : PMS.pillGrey} strokeWidth={stroke}
        strokeDasharray={`${p > 0 ? (p / 100) * c : c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 4} fill={PMS.white} />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: PMS.fontHead, fontWeight: 700, fontSize: 19, fill: PMS.navy }}>{label}</text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: PMS.fontHead, fontSize: 9.5, fill: PMS.muted }}>{sub}</text>
    </svg>
  )
}

/**
 * Small area line chart (Goal Completion card). `points` are 0–100 values;
 * null values are skipped. Labels render below.
 */
export function MiniLine({ points = [], labels = [], height = 70 }) {
  const w = 270
  const n = points.length
  const xs = points.map((_, i) => (n <= 1 ? w / 2 : (i / (n - 1)) * (w - 8) + 4))
  const ys = points.map(v => (v == null ? null : height - 6 - (Math.max(0, Math.min(100, v)) / 100) * (height - 14)))
  const pts = xs.map((x, i) => (ys[i] == null ? null : [x, ys[i]])).filter(Boolean)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z` : ''
  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="pmsMiniArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PMS.blue} stopOpacity="0.18" />
            <stop offset="1" stopColor={PMS.blue} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke={PMS.pillGrey} strokeDasharray="3 4" />
        ))}
        {area && <path d={area} fill="url(#pmsMiniArea)" />}
        {pts.length > 1 && <path d={line} fill="none" stroke={PMS.blue} strokeWidth="1.6" />}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.6 : 2.6} fill={i === pts.length - 1 ? PMS.blue : PMS.white} stroke={PMS.blue} strokeWidth="1.4" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontFamily: PMS.fontHead, fontSize: 9.5, color: PMS.muted }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * Multi-series line chart with hover tooltip (Performance Trend).
 * series: [{ key, label, color, values: number[] }], labels: string[]
 */
export function TrendChart({ series = [], labels = [], height = 220, yMax }) {
  const [hover, setHover] = useState(null)
  const w = 1200
  const padL = 40, padB = 26, padT = 12
  const n = labels.length
  const allVals = series.flatMap(s => s.values).filter(v => v != null)
  const max = yMax || Math.max(4, Math.ceil((Math.max(0, ...allVals) * 1.2) / 4) * 4)
  const x = i => (n <= 1 ? padL + (w - padL) / 2 : padL + (i / (n - 1)) * (w - padL - 16))
  const y = v => padT + (1 - v / max) * (height - padT - padB)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f))

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="pmsTrendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PMS.blue} stopOpacity="0.14" />
            <stop offset="1" stopColor={PMS.blue} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={w} y1={y(t)} y2={y(t)} stroke={PMS.pillGrey} />
            <text x={padL - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" style={{ fontFamily: PMS.fontHead, fontSize: 11, fill: PMS.muted }}>{t}</text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean)
          if (!pts.length) return null
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
          return (
            <g key={s.key}>
              {si === 0 && pts.length > 1 && <path d={`${d} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill="url(#pmsTrendArea)" />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.2" />
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="5" fill={PMS.white} stroke={s.color} strokeWidth="2" />
            </g>
          )
        })}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - (w / Math.max(n, 1)) / 2} y={0} width={w / Math.max(n, 1)} height={height - padB} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={height - padB} stroke={PMS.blue} strokeDasharray="4 4" />}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: `${(padL / w) * 100}%`, marginTop: 2 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontFamily: PMS.fontHead, fontSize: 11, color: i === n - 1 ? PMS.navy : PMS.muted, fontWeight: i === n - 1 ? 700 : 400 }}>{l}</span>
        ))}
      </div>
      {hover != null && (
        <div style={{
          position: 'absolute', top: 0, left: `${(x(hover) / w) * 100}%`, transform: 'translate(-50%, -8px)',
          background: PMS.navy, color: PMS.white, borderRadius: 10, padding: '8px 12px', pointerEvents: 'none',
          fontFamily: PMS.fontHead, fontSize: 11, whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(0,18,51,0.25)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{labels[hover]}</div>
          {series.map(s => (
            <div key={s.key} style={{ fontWeight: 700 }}>{s.values[hover] ?? 0} {s.label.toLowerCase()}</div>
          ))}
        </div>
      )}
    </div>
  )
}
