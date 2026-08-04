import React from 'react'
import { COLORS } from '../../theme'

const BANDS = [
  { label: 'Not Started', range: [0, 0],     color: COLORS.slate,   bg: 'rgba(148,163,184,0.1)' },
  { label: '1 – 49%',    range: [1, 49],     color: COLORS.amber,   bg: 'rgba(245,158,11,0.1)'  },
  { label: '50 – 99%',   range: [50, 99],    color: COLORS.primary, bg: 'rgba(99,102,241,0.1)'  },
  { label: 'Completed',  range: [100, 100],  color: COLORS.green,   bg: 'rgba(16,185,129,0.1)'  },
]

export default function GoalDistributionCard({ goals, avgProgress, completionPct, onTrack }) {
  if (goals.length === 0) {
    return (
      <div style={{ background: COLORS.surface, borderRadius: '18px', padding: '22px', border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text, marginBottom: '2px' }}>Progress Distribution</div>
        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '18px' }}>Goals by completion level</div>
        <div style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: '12px', padding: '32px 0' }}>No goals yet</div>
      </div>
    )
  }

  return (
    <div style={{ background: COLORS.surface, borderRadius: '18px', padding: '22px', border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text, marginBottom: '2px' }}>Progress Distribution</div>
      <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '18px' }}>Goals by completion level</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {BANDS.map(band => {
          const count = goals.filter(g => {
            const p = Number(g.progress) || 0
            return p >= band.range[0] && p <= band.range[1]
          }).length
          const pct = Math.round((count / goals.length) * 100)
          return (
            <div key={band.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: band.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: COLORS.textSub }}>{band.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: band.color, background: band.bg, padding: '1px 7px', borderRadius: '10px' }}>{count}</span>
                  <span style={{ fontSize: '10px', color: COLORS.textMuted }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: band.color, borderRadius: '3px', transition: 'width 0.6s ease', opacity: 0.85 }} />
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: '6px', padding: '10px 14px', background: 'rgba(99,102,241,0.04)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.primary }}>{avgProgress}%</div>
            <div style={{ fontSize: '9px', color: COLORS.textMuted }}>Avg Progress</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.green }}>{completionPct}%</div>
            <div style={{ fontSize: '9px', color: COLORS.textMuted }}>Completion</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.blue }}>{onTrack}</div>
            <div style={{ fontSize: '9px', color: COLORS.textMuted }}>On Track</div>
          </div>
        </div>
      </div>
    </div>
  )
}
