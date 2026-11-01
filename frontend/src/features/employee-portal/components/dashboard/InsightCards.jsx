import React from 'react'
import { FiVideo, FiStar, FiAward } from 'react-icons/fi'
import { PMS } from '../../theme'
import { PmsCard, CardHeader, HeaderChip, BigStat, LegendDot, EmptyBox, T } from '../shared/PmsUI'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOURS = Array.from({ length: 12 }).map((_, i) => `${String(10 + i).padStart(2, '0')}:00`)

/**
 * Meetings calendar (Mon–Fri × 10:00–21:00).
 * `meetings`: [{ day: 0-4, start: 10.5, end: 11.5, accepted: bool, title }]
 * Empty until a meetings API exists, so the grid shows an empty state.
 */
export function MeetingsCalendarCard({ meetings = [], className }) {
  const startHour = 10
  const span = 11 // 10:00 → 21:00
  return (
    <PmsCard className={className}>
      <CardHeader title="Meetings Calendar" chip={<HeaderChip icon={<FiVideo size={14} />} />} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <BigStat value={meetings.length} pill="This week" pillTone="blue" caption="calls scheduled" />
        <div style={{ display: 'flex', gap: '14px', paddingBottom: '1px' }}>
          <LegendDot color={PMS.blue} label="Accepted" />
          <LegendDot color={PMS.barSoft} label="Not accepted" />
        </div>
      </div>

      <div className="pms-scroll-x" style={{ marginTop: 'auto', paddingTop: '14px' }}>
        <div style={{ minWidth: '560px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr', columnGap: '0' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {DAYS.map(d => <span key={d} style={{ height: '18px', lineHeight: '18px', ...T.small }}>{d}</span>)}
            </div>
            <div style={{ position: 'relative', height: '90px', margin: '0 16px 0 2px' }}>
              {HOURS.map((h, i) => (
                <span key={h} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i / span) * 100}%`, width: '1px', background: PMS.pillGrey }} />
              ))}
              {meetings.map((m, i) => (
                <span key={i} title={m.title} style={{
                  position: 'absolute', top: `${m.day * 18 + 2}px`, height: '14px', borderRadius: '7px',
                  left: `${((m.start - startHour) / span) * 100}%`, width: `${((m.end - m.start) / span) * 100}%`,
                  background: m.accepted ? PMS.blue : PMS.barSoft,
                }} />
              ))}
              {meetings.length === 0 && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ background: PMS.white, border: `1px dashed #D5DBE5`, borderRadius: '12px', padding: '6px 14px', fontFamily: PMS.fontHead, fontSize: '11px', color: PMS.muted }}>
                    No meetings scheduled this week
                  </span>
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr', marginTop: '8px' }}>
            <span />
            <div style={{ position: 'relative', height: '14px', margin: '0 16px 0 2px' }}>
              {HOURS.map((h, i) => (
                <span key={h} style={{ position: 'absolute', left: `${(i / span) * 100}%`, transform: 'translateX(-50%)', fontFamily: PMS.fontHead, fontSize: '9px', color: PMS.muted, whiteSpace: 'nowrap' }}>{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PmsCard>
  )
}

function Pentagon({ filled }) {
  // Concentric pentagons from the Figma (outer #EAF2FB, inner #D6E6F7, blue score shape).
  const pts = (r) => Array.from({ length: 5 }).map((_, i) => {
    const a = (-90 + i * 72) * Math.PI / 180
    return `${(29 + r * Math.cos(a)).toFixed(2)},${(30 + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
  return (
    <svg width="58" height="56" viewBox="0 0 58 56" aria-hidden>
      <polygon points={pts(28)} fill="#EAF2FB" stroke="#ffffff" />
      <polygon points={pts(19)} fill="#D6E6F7" stroke="#ffffff" />
      {filled && <polygon points={pts(19.5)} fill="#0466C8" fillOpacity="0.85" stroke="#0353A4" />}
    </svg>
  )
}

/**
 * Skill-set overview. `skills`: [{ name, score, max }].
 * Empty until a skills/competency API is wired for employees.
 */
export function SkillsetOverviewCard({ skills = [] }) {
  const max = skills[0]?.max || 6
  const avg = skills.length ? skills.reduce((s, k) => s + Number(k.score || 0), 0) / skills.length : null
  return (
    <PmsCard>
      <CardHeader title="Skill-set Overview" chip={<HeaderChip icon={<FiStar size={14} />} />} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <BigStat
          value={avg != null ? `${Math.round(avg)}/${max}` : '—'}
          caption={skills.length ? `Average across ${skills.length} skills` : 'No skills assessed yet'}
        />
        <span style={{ marginRight: '22px' }}><Pentagon filled={skills.length > 0} /></span>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '11.5px' }}>
        {skills.length === 0 ? (
          <EmptyBox icon={<FiAward size={14} />} title="No skill ratings yet" sub="Ratings appear after your assessment" />
        ) : skills.slice(0, 5).map(k => (
          <div key={k.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 118px 26px', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...T.small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.name}</span>
            <span style={{ height: '8px', borderRadius: '4px', background: PMS.surfaceAlt, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (k.score / (k.max || max)) * 100)}%`, background: PMS.gradBlue, borderRadius: '4px' }} />
            </span>
            <span style={{ ...T.small, color: PMS.navy, fontWeight: 700, textAlign: 'right' }}>{k.score}/{k.max || max}</span>
          </div>
        ))}
      </div>
    </PmsCard>
  )
}
