import React from 'react'
import { FiCalendar, FiPlus, FiSliders, FiFlag, FiStar } from 'react-icons/fi'
import { PMS } from '../../theme'

export const PERIODS = [
  { key: 'all',     label: 'All time' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'month',   label: 'Month' },
  { key: 'week',    label: 'Week' },
]

export function PeriodTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Goal period" className="pms-tabs-scroll" style={{
      display: 'flex', alignItems: 'center', height: '44px', padding: '0 5px', gap: '2px',
      background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, borderRadius: '22px',
      boxSizing: 'border-box', maxWidth: '100%',
    }}>
      {PERIODS.map(p => {
        const active = p.key === value
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.key)}
            className="pms-focus"
            style={{
              height: '34px', padding: '0 19px', borderRadius: '17px', border: 'none',
              background: active ? PMS.white : 'transparent',
              boxShadow: active ? '0 4px 12px rgba(0,18,51,0.08)' : 'none',
              color: active ? PMS.navy : PMS.muted,
              fontFamily: PMS.fontHead, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

export default function DashboardHero({
  greeting, firstName, dateLabel, period, onPeriodChange, showGoalControls, onNewGoal, onFilters,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px 24px', flexWrap: 'wrap', paddingTop: '19px' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: PMS.fontHead, fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, lineHeight: 1.5, color: PMS.navy, letterSpacing: '-0.5px' }}>
          {greeting}, <span style={{ color: PMS.blue }}>{firstName ? `${firstName}!` : 'there!'}</span>
        </div>
        <div style={{ fontFamily: PMS.fontHead, fontSize: '13px', color: PMS.muted, lineHeight: '20px', marginTop: '-2px' }}>
          Here's your overview for today. Stay on track and keep making progress.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px 24px', flexWrap: 'wrap', minWidth: 0 }}>
        {showGoalControls && <PeriodTabs value={period} onChange={onPeriodChange} />}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', height: '42px', padding: '0 18px',
          background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: '21px',
          fontFamily: PMS.fontHead, fontSize: '12px', color: PMS.navy, whiteSpace: 'nowrap', boxSizing: 'border-box',
        }}>
          <FiCalendar size={13} color={PMS.navy} />
          {dateLabel}
        </div>

        {showGoalControls && (
          <>
            <button
              type="button"
              onClick={onFilters}
              title="Open performance hub"
              aria-label="Open performance hub"
              className="pms-icon-btn pms-focus pms-hide-sm"
              style={{ width: '42px', height: '42px', borderRadius: '50%', background: PMS.white, border: `1px solid ${PMS.border}`, color: PMS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              <FiSliders size={16} />
            </button>
            <button
              type="button"
              onClick={onNewGoal}
              className="pms-hover-lift pms-focus"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px', height: '46px', padding: '0 26px 0 28px',
                background: PMS.gradBlue, color: PMS.white, border: 'none', borderRadius: '23px',
                fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                boxShadow: PMS.shadowCta, whiteSpace: 'nowrap',
              }}
            >
              <FiPlus size={14} strokeWidth={2.6} /> Set a new goal
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function DailyFocus({ quote }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px 34px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
        <span style={{ fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, color: PMS.navy }}>Daily focus</span>
        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: PMS.navy, color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiFlag size={10} strokeWidth={2.4} />
        </span>
      </div>
      <div style={{
        flex: 1, minWidth: '240px', minHeight: '43px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '0 20px 0 20px', background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: '22px', boxSizing: 'border-box',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <FiStar size={13} color={PMS.blue} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: PMS.fontHead, fontSize: '12px', color: PMS.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            “{quote}”
          </span>
        </span>
        <span className="pms-hide-sm" style={{ fontFamily: PMS.fontHead, fontSize: '12px', color: PMS.muted, whiteSpace: 'nowrap' }}>
          Have a productive day!
        </span>
      </div>
    </div>
  )
}
