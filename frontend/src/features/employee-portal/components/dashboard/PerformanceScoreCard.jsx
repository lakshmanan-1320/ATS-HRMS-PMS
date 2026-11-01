import React from 'react'
import { FiActivity } from 'react-icons/fi'
import { PMS } from '../../theme'
import { PmsCard, CardHeader, HeaderChip, BigStat } from '../shared/PmsUI'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MAX_BAR = 66
const MIN_BAR = 8

/**
 * Performance score: the average rating plus a 7-month bar chart.
 * `score` is null and `monthlyScores` is empty until a ratings API exists; the
 * card then shows an empty state with neutral placeholder bars instead of
 * made-up numbers.
 */
export default function PerformanceScoreCard({ score = null, monthlyScores = {}, scale = 5, onViewAll }) {
  const now = new Date()
  const months = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    return { key, label: MONTHS[d.getMonth()], value: monthlyScores[key], current: i === 6 }
  })

  return (
      <PmsCard>
        <CardHeader
          title="Performance Score"
          chip={<HeaderChip icon={<FiActivity size={14} />} onClick={onViewAll} title="Open performance hub" />}
        />
        <BigStat
          value={score != null ? Number(score).toFixed(2) : '—'}
          pill="Avg rating"
          pillTone="blue"
          caption={score != null ? 'Average ratings across year' : 'No ratings published yet'}
        />
        <div style={{ marginTop: 'auto', paddingTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: `${MAX_BAR}px` }}>
            {months.map(m => {
              const h = m.value != null ? Math.max(MIN_BAR, Math.round((m.value / scale) * MAX_BAR)) : MIN_BAR
              return (
                <span
                  key={m.key}
                  title={m.value != null ? `${m.label}: ${m.value}` : `${m.label}: no rating`}
                  style={{
                    width: '22px', height: `${h}px`, borderRadius: '6px',
                    background: m.value == null
                      ? (m.current ? PMS.pillBlue : PMS.barSofter)
                      : (m.current ? PMS.gradBlueVert : PMS.gradBarSoft),
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            {months.map(m => (
              <span key={m.key} style={{ width: '22px', textAlign: 'center', fontFamily: PMS.fontHead, fontSize: '10px', fontWeight: m.current ? 700 : 400, color: m.current ? PMS.navy : PMS.muted }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </PmsCard>
  )
}
