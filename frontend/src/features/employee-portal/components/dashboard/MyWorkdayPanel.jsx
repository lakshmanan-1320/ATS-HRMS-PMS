import React, { useEffect, useRef, useState } from 'react'
import { FiDownload, FiMoreVertical, FiTarget } from 'react-icons/fi'
import { PMS } from '../../theme'
import { EmptyBox, daysUntil, dayLabel } from '../shared/PmsUI'

const AVATAR_BGS = ['#33415C', '#5C677D', '#0466C8', '#407BA7']

function initials(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '—'
  return (words[0][0] + (words[1] ? words[1][0] : (words[0][1] || ''))).toUpperCase()
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label="Workday view" className="pms-tabs-scroll" style={{
      display: 'flex', alignItems: 'center', gap: '4px', height: '46px', padding: '0 5px',
      background: PMS.white, borderRadius: '23px', boxSizing: 'border-box', maxWidth: '100%',
    }}>
      {tabs.map(t => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className="pms-focus"
            style={{
              height: '36px', padding: '0 15px', borderRadius: '18px', border: 'none',
              background: active ? PMS.gradBlue : 'transparent',
              color: active ? PMS.white : PMS.navy,
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              fontFamily: PMS.fontHead, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            {t.count != null && (
              <span style={{
                minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 5px', boxSizing: 'border-box',
                background: active ? PMS.white : PMS.surfaceAlt, color: active ? PMS.blue : PMS.navy,
                fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function GoalRow({ goal, index, highlighted, onHover, onOpen }) {
  const progress = Math.max(0, Math.min(100, Math.round(Number(goal.progress) || 0)))
  const d = goal.due_date ? daysUntil(goal.due_date) : null
  const metaParts = []
  if (d != null) metaParts.push(d < 0 ? `Overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}` : d === 0 ? 'Due today' : `Due in ${d} day${d === 1 ? '' : 's'}`)
  else metaParts.push('No due date')
  if (goal.goal_type) metaParts.push(String(goal.goal_type).replace(/_/g, ' '))
  else if (goal.priority) metaParts.push(`${goal.priority} priority`)

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onOpen}
      className="pms-focus"
      style={{
        display: 'flex', alignItems: 'center', gap: '14px', width: '100%', minHeight: '62px',
        padding: '0 14px 0 14px', boxSizing: 'border-box', borderRadius: PMS.radiusRow, border: 'none',
        background: highlighted ? PMS.gradBlue : PMS.navyRow,
        boxShadow: highlighted ? PMS.shadowRow : 'none',
        color: PMS.white, cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s, box-shadow 0.2s',
      }}
    >
      <span style={{
        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
        background: highlighted ? PMS.white : AVATAR_BGS[index % AVATAR_BGS.length],
        color: highlighted ? PMS.navy : PMS.white,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: PMS.fontHead, fontSize: '12px', fontWeight: 700,
      }}>{initials(goal.title)}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</span>
        <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '10px', color: highlighted ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'none' }}>
          {metaParts.join(' · ')}
        </span>
      </span>
      <span style={{
        height: '27px', padding: '0 11px', borderRadius: '13.5px', flexShrink: 0,
        background: highlighted ? PMS.white : 'rgba(255,255,255,0.08)', color: highlighted ? PMS.blue : PMS.white,
        display: 'inline-flex', alignItems: 'center', fontFamily: PMS.fontHead, fontSize: '10.5px',
      }}>{progress}%</span>
      <span style={{ width: '62px', textAlign: 'right', flexShrink: 0, fontFamily: PMS.fontHead, fontSize: '12.7px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {d == null ? '—' : dayLabel(d)}
      </span>
    </button>
  )
}

function TeamRow({ members, subtitle, onView }) {
  const shown = members.slice(0, 4)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', minHeight: '62px', padding: '0 14px 0 18px',
      borderRadius: PMS.radiusRow, background: PMS.navyRow, boxSizing: 'border-box',
    }}>
      <span className="pms-team-avatars" style={{ display: 'flex', flexShrink: 0 }}>
        {shown.length === 0 ? (
          <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: PMS.slate, border: `2px solid ${PMS.navyRow}` }} />
        ) : shown.map((m, i) => (
          <span key={m.id || i} title={`${m.first_name || ''} ${m.last_name || ''}`.trim()} style={{
            width: '32px', height: '32px', borderRadius: '50%', marginLeft: i === 0 ? 0 : '-10px',
            background: ['#0466C8', '#33415C', '#407BA7', '#5C677D'][i % 4], border: `1px solid ${PMS.navyRow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: PMS.fontHead, fontSize: '9px', fontWeight: 700, color: PMS.white, boxSizing: 'border-box',
          }}>{initials(`${m.first_name || ''} ${m.last_name || ''}`)}</span>
        ))}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, color: PMS.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Your team</span>
        <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '10px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</span>
      </span>
      {onView && (
        <button type="button" onClick={onView} className="pms-dark-btn pms-focus" style={{
          height: '27px', padding: '0 14px', borderRadius: '13.5px', border: 'none', background: 'rgba(255,255,255,0.08)',
          color: PMS.white, fontFamily: PMS.fontHead, fontSize: '10.5px', cursor: 'pointer', flexShrink: 0,
        }}>View</button>
      )}
      <span style={{ minWidth: '20px', textAlign: 'right', fontFamily: PMS.fontHead, fontSize: '12.7px', fontWeight: 700, color: PMS.white, flexShrink: 0 }}>{members.length}</span>
    </div>
  )
}

function exportCsv(goals) {
  const header = ['Title', 'Status', 'Progress (%)', 'Start date', 'Due date', 'Type', 'Priority']
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = goals.map(g => [g.title, g.status, g.progress ?? 0, g.start_date ? String(g.start_date).slice(0, 10) : '', g.due_date ? String(g.due_date).slice(0, 10) : '', g.goal_type, g.priority].map(esc).join(','))
  const blob = new Blob([[header.map(esc).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `my-workday-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Dark "My Workday" panel. The left column lists the employee's goals (filtered by
 * tab) plus their team; the right column hosts the attendance panel passed as children.
 */
export default function MyWorkdayPanel({
  goals, upcomingGoals, showGoals, teamMembers, teamSubtitle, onViewTeam,
  onOpenGoals, onNewGoal, menuLinks = [], children,
}) {
  const [tab, setTab] = useState('all')
  const [hovered, setHovered] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDoc(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const openGoals = goals.filter(g => !['approved', 'completed'].includes(g.status))
  const activeGoals = goals.filter(g => ['active', 'in_progress'].includes(g.status))
  const byDue = (a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date) - new Date(b.due_date)
  }

  const tabs = [
    { key: 'all', label: 'All work' },
    ...(showGoals ? [{ key: 'goals', label: 'Goals', count: activeGoals.length }] : []),
    { key: 'meetings', label: 'Meetings', count: 0 },
    ...(showGoals ? [{ key: 'deadlines', label: 'Deadlines', count: upcomingGoals.length }] : []),
  ]
  const list = !showGoals || tab === 'meetings' ? []
    : tab === 'goals' ? [...activeGoals].sort(byDue)
    : tab === 'deadlines' ? upcomingGoals
    : [...openGoals].sort(byDue)
  const rows = list.slice(0, 4)

  const emptyCopy = tab === 'meetings'
    ? { title: 'No meetings scheduled', sub: 'Your meetings will appear here' }
    : !showGoals
      ? { title: 'No work items yet', sub: 'Your tasks will appear here' }
      : tab === 'deadlines'
        ? { title: 'No upcoming deadlines', sub: 'Nothing due in the next 30 days' }
        : { title: 'No open goals', sub: 'Set a new goal to get started' }

  return (
    <section className="pms-workday" style={{ background: PMS.navy, borderRadius: PMS.radiusPanel, padding: '26px 24px 24px', boxSizing: 'border-box', minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: PMS.fontHead, fontSize: '16px', fontWeight: 700, color: PMS.white, lineHeight: '24px' }}>My Workday</div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '17px', marginTop: '2px' }}>
            Your goals, team and today's attendance
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', justifyContent: 'space-between', minWidth: 0, maxWidth: '822px' }}>
          <Tabs tabs={tabs} value={tab} onChange={(k) => { setTab(k); setHovered(0) }} />
          <div style={{ display: 'flex', gap: '13px', flexShrink: 0 }} ref={menuRef}>
            <button type="button" title="Download goals (CSV)" aria-label="Download goals as CSV" onClick={() => exportCsv(list.length ? list : goals)}
              disabled={!goals.length} className="pms-dark-btn pms-focus"
              style={{ width: '38px', height: '38px', borderRadius: '50%', background: PMS.navyRow, border: 'none', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: goals.length ? 'pointer' : 'default', opacity: goals.length ? 1 : 0.5, padding: 0 }}>
              <FiDownload size={14} />
            </button>
            <div style={{ position: 'relative' }}>
              <button type="button" title="More" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)} className="pms-dark-btn pms-focus"
                style={{ width: '38px', height: '38px', borderRadius: '50%', background: PMS.navyRow, border: 'none', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <FiMoreVertical size={15} />
              </button>
              {menuOpen && menuLinks.length > 0 && (
                <div style={{ position: 'absolute', top: '46px', right: 0, minWidth: '200px', background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: '14px', boxShadow: '0 16px 36px rgba(0,18,51,0.25)', padding: '6px', zIndex: 20 }}>
                  {menuLinks.map(l => (
                    <button key={l.label} type="button" onClick={() => { setMenuOpen(false); l.onClick() }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'none', borderRadius: '10px', fontFamily: PMS.fontHead, fontSize: '12px', color: PMS.navy, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = PMS.surfaceAlt }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={children ? 'pms-workday-body' : undefined} style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: rows.length >= 4 ? '31px' : '16px', minWidth: 0 }}>
          {rows.length === 0 ? (
            <EmptyBox dark icon={<FiTarget size={14} />} title={emptyCopy.title} sub={emptyCopy.sub} style={{ minHeight: '150px', flex: 1 }} />
          ) : rows.map((g, i) => (
            <GoalRow
              key={g.goal_id || g.id || i}
              goal={g}
              index={i}
              highlighted={hovered === i}
              onHover={() => setHovered(i)}
              onOpen={onOpenGoals}
            />
          ))}
          {showGoals && list.length > 4 && (
            <button type="button" onClick={onOpenGoals} className="pms-focus" style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: PMS.sky, fontFamily: PMS.fontHead, fontSize: '11px', cursor: 'pointer', padding: 0, marginTop: '-8px' }}>
              View all {list.length} →
            </button>
          )}
          {showGoals && rows.length === 0 && tab !== 'meetings' && onNewGoal && (
            <button type="button" onClick={onNewGoal} className="pms-focus" style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: PMS.sky, fontFamily: PMS.fontHead, fontSize: '11px', cursor: 'pointer', padding: 0, marginTop: '-6px' }}>
              + Set a new goal
            </button>
          )}
          <div style={{ marginTop: 'auto' }}>
            <TeamRow members={teamMembers} subtitle={teamSubtitle} onView={onViewTeam} />
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}
