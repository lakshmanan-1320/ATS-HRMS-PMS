import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  FiDownload, FiMoreVertical, FiChevronDown, FiCalendar, FiSearch, FiPlus, FiMessageSquare,
  FiX, FiCheck, FiArrowUpRight, FiLogIn, FiLogOut, FiTag, FiInbox,
} from 'react-icons/fi'
import { PMS } from '../../../employee-portal/theme'
import { EmptyBox } from '../../../employee-portal/components/shared/PmsUI'
import { initials } from './AdminKpiCards'
import { timeAgo, humanize } from '../../../../components/layout/ClientAdminTopBar'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtDay = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—')
const fmtTime = d => (d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null)
function fmtRange(a, b) {
  if (!a) return '—'
  if (!b || String(a).slice(0, 10) === String(b).slice(0, 10)) return fmtDay(a)
  const da = new Date(a), db = new Date(b)
  if (da.getMonth() === db.getMonth()) return `${da.getDate()}–${db.getDate()} ${db.toLocaleDateString('en-GB', { month: 'short' })}`
  return `${fmtDay(a)} – ${fmtDay(b)}`
}
const shortId = (prefix, id) => `${prefix}-${String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`

const VIEWED_KEY = 'ca_viewed_requests'
function readViewed() {
  try { return new Set(JSON.parse(sessionStorage.getItem(VIEWED_KEY) || '[]')) } catch { return new Set() }
}

/** Normalises leave / regularization / goal rows into one shape for the panel. */
export function normalizeRequests({ leaves = [], regs = [], goals = [] }) {
  const out = []
  leaves.forEach(l => out.push({
    key: `leave:${l.leave_request_id}`, kind: 'leave', id: l.leave_request_id, employeeId: l.employee_id,
    name: l.employee_name || 'Employee', code: l.employee_code, department: l.department_name || null, designation: l.designation || null,
    typeLabel: l.leave_type_name || 'Leave', createdAt: l.created_at, requestDate: l.start_date,
    dateLabel: fmtRange(l.start_date, l.end_date), reason: l.leave_reason,
    ref: shortId('LV', l.leave_request_id),
    tiles: [
      { value: fmtDay(l.start_date), caption: 'Leave from', icon: <FiCalendar size={13} /> },
      { value: fmtDay(l.end_date), caption: 'Leave to', icon: <FiCalendar size={13} /> },
      { value: `${Number(l.total_leave_days || 0)} day${Number(l.total_leave_days) === 1 ? '' : 's'}`, caption: humanize(l.session_type || 'Full day'), icon: <FiTag size={13} /> },
    ],
    leaveTypeId: l.leave_type_id, days: Number(l.total_leave_days || 0), raw: l,
  }))
  regs.forEach(r => {
    const inT = fmtTime(r.requested_check_in), outT = fmtTime(r.requested_check_out)
    out.push({
      key: `reg:${r.regularization_request_id}`, kind: 'regularization', id: r.regularization_request_id, employeeId: r.employee_id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Employee', code: r.employee_code,
      department: r.department_name || null, designation: r.designation || null,
      typeLabel: humanize(r.request_type || r.request_category || 'Regularization'), createdAt: r.created_at,
      requestDate: r.attendance_date, dateLabel: fmtDay(r.attendance_date), reason: r.reason,
      ref: shortId('REQ', r.regularization_request_id),
      tiles: [
        { value: inT || '— —', caption: inT ? `Punch in · ${fmtDay(r.attendance_date)}` : 'Punch in not changed', icon: <FiLogIn size={13} /> },
        { value: outT || '— —', caption: outT ? 'Requested punch out' : 'Punch out not changed', icon: <FiLogOut size={13} /> },
        { value: humanize(r.request_category || 'Regularization'), caption: 'Category', icon: <FiTag size={13} /> },
      ],
      raw: r,
    })
  })
  goals.forEach(g => out.push({
    key: `goal:${g.goal_id}`, kind: 'goal', id: g.goal_id, employeeId: g.assigned_to_employee_id,
    name: g.assigned_to_name || g.employee_name || g.assigned_to || 'Employee', code: null,
    department: g.department_name || null, designation: null,
    typeLabel: 'Goal approval', createdAt: g.updated_at || g.created_at, requestDate: g.due_date || g.created_at,
    dateLabel: g.due_date ? `Due ${fmtDay(g.due_date)}` : 'Goal', reason: g.description || g.title,
    ref: shortId('GL', g.goal_id),
    tiles: [
      { value: g.title || 'Goal', caption: 'Goal title', icon: <FiTag size={13} /> },
      { value: g.weight != null ? `${g.weight}%` : '—', caption: 'Weightage', icon: <FiTag size={13} /> },
      { value: g.due_date ? fmtDay(g.due_date) : '—', caption: 'Due date', icon: <FiCalendar size={13} /> },
    ],
    raw: g,
  }))
  return out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

// ── filter bar ────────────────────────────────────────────────────────────────
const pillBox = {
  display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 16px', boxSizing: 'border-box',
  background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: 22, minWidth: 0,
  fontFamily: PMS.fontHead, fontSize: 12, color: PMS.navy,
}
const bare = { border: 'none', outline: 'none', background: 'transparent', fontFamily: PMS.fontHead, fontSize: 12, color: PMS.navy, minWidth: 0, flex: 1, appearance: 'none', cursor: 'pointer' }

export function ApprovalFilters({ filters, setFilters, departments, types }) {
  const active = ['department', 'type', 'from', 'to', 'search'].filter(k => filters[k]).length
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  return (
    <div className="pms-filter-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>Active filters</span>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: PMS.navy, color: PMS.white, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active}</span>
        {active > 0 && (
          <button type="button" onClick={() => setFilters({})} style={{ background: 'none', border: 'none', color: PMS.blue, fontFamily: PMS.fontHead, fontSize: 11.5, cursor: 'pointer', padding: 0 }}>Clear</button>
        )}
      </div>
      <label style={pillBox}>
        <select aria-label="Department" className="ca-borderless-input" value={filters.department || ''} onChange={e => set('department', e.target.value)} style={bare}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <FiChevronDown size={14} color={PMS.slate} />
      </label>
      <label style={pillBox}>
        <select aria-label="Request type" className="ca-borderless-input" value={filters.type || ''} onChange={e => set('type', e.target.value)} style={bare}>
          <option value="">All request types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <FiChevronDown size={14} color={PMS.slate} />
      </label>
      <label style={pillBox} title="From date">
        <input type="date" aria-label="From date" className="ca-borderless-input" value={filters.from || ''} onChange={e => set('from', e.target.value)} style={{ ...bare, cursor: 'text' }} />
      </label>
      <label style={pillBox} title="To date">
        <input type="date" aria-label="To date" className="ca-borderless-input" value={filters.to || ''} onChange={e => set('to', e.target.value)} style={{ ...bare, cursor: 'text' }} />
      </label>
      <label style={pillBox}>
        <input type="text" aria-label="Search employee" placeholder="Search employee..." className="ca-borderless-input" value={filters.search || ''} onChange={e => set('search', e.target.value)} style={{ ...bare, cursor: 'text' }} />
        <FiSearch size={14} color={PMS.slate} />
      </label>
    </div>
  )
}

export function applyFilters(items, f) {
  return items.filter(it => {
    if (f.department && it.department !== f.department) return false
    if (f.type && it.typeLabel !== f.type && humanize(it.kind) !== f.type) return false
    const d = it.requestDate ? String(it.requestDate).slice(0, 10) : null
    if (f.from && d && d < f.from) return false
    if (f.to && d && d > f.to) return false
    if (f.search && !`${it.name} ${it.code || ''}`.toLowerCase().includes(f.search.toLowerCase())) return false
    return true
  })
}

// ── panel ─────────────────────────────────────────────────────────────────────
const AVATAR_BGS = ['#0466C8', '#33415C', '#5C677D', '#407BA7']

function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label="Request type" className="pms-tabs-scroll" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 46, padding: '0 5px', background: PMS.white, borderRadius: 23, boxSizing: 'border-box', maxWidth: '100%' }}>
      {tabs.map(t => {
        const active = t.key === value
        return (
          <button key={t.key} type="button" role="tab" aria-selected={active} onClick={() => onChange(t.key)} className="pms-focus" style={{
            height: 36, padding: '0 15px', borderRadius: 18, border: 'none', background: active ? PMS.gradBlue : 'transparent',
            color: active ? PMS.white : PMS.navy, display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: PMS.fontHead, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {t.label}
            {t.count != null && (
              <span style={{ minWidth: 20, height: 20, borderRadius: 10, padding: '0 5px', boxSizing: 'border-box', background: active ? PMS.white : PMS.surfaceAlt, color: active ? PMS.blue : PMS.navy, fontSize: 10.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function RequestRow({ item, index, selected, viewed, onSelect }) {
  const status = selected ? 'Pending' : viewed ? 'Viewed' : 'New'
  return (
    <button type="button" onClick={onSelect} className="pms-focus" style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 62, padding: '0 14px', boxSizing: 'border-box',
      borderRadius: PMS.radiusRow, border: 'none', cursor: 'pointer', textAlign: 'left', color: PMS.white,
      background: selected ? PMS.gradBlue : PMS.navyRow, boxShadow: selected ? PMS.shadowRow : 'none', transition: 'background 0.2s',
    }}>
      <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: selected ? PMS.white : AVATAR_BGS[index % AVATAR_BGS.length], color: selected ? PMS.navy : PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PMS.fontHead, fontSize: 12, fontWeight: 700 }}>{initials(item.name)}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
        <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 10, color: selected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.typeLabel}{item.createdAt ? ` · ${timeAgo(item.createdAt)}` : ''}
        </span>
      </span>
      <span className="pms-hide-sm" style={{ height: 27, padding: '0 12px', borderRadius: 13.5, flexShrink: 0, background: selected ? PMS.white : 'rgba(255,255,255,0.08)', color: selected ? PMS.blue : PMS.white, display: 'inline-flex', alignItems: 'center', fontFamily: PMS.fontHead, fontSize: 10.5 }}>{status}</span>
      <span style={{ minWidth: 62, textAlign: 'right', flexShrink: 0, fontFamily: PMS.fontHead, fontSize: 12.7, fontWeight: 700, whiteSpace: 'nowrap' }}>{item.dateLabel}</span>
    </button>
  )
}

const lbl = { fontFamily: PMS.fontHead, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: '17px' }

function Tile({ value, caption, icon, dashed, onClick, children }) {
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter') onClick() } : undefined}
      className={onClick ? 'pms-hover-lift pms-focus' : undefined}
      style={{
        position: 'relative', minHeight: 99, minWidth: 0, borderRadius: 18, boxSizing: 'border-box', color: PMS.white,
        padding: dashed ? 14 : '20px 18px 16px', cursor: onClick ? 'pointer' : 'default',
        background: dashed ? 'transparent' : 'rgba(255,255,255,0.13)',
        border: dashed ? '1px dashed rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.22)',
        display: 'flex', flexDirection: 'column', justifyContent: dashed ? 'center' : 'space-between',
        alignItems: dashed ? 'center' : 'stretch', gap: dashed ? 8 : 10, textAlign: dashed ? 'center' : 'left',
      }}>
      {children || (dashed ? (
        <>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
          <span style={{ fontFamily: PMS.fontHead, fontSize: 12, fontWeight: 700 }}>{value}</span>
        </>
      ) : (
        <>
          <span style={{ position: 'absolute', top: 14, right: 16, color: 'rgba(255,255,255,0.9)', display: 'flex' }}>{icon || <FiArrowUpRight size={13} />}</span>
          <span style={{ fontFamily: PMS.fontHead, fontSize: 19, fontWeight: 700, lineHeight: '28px', paddingRight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
          <span style={{ fontFamily: PMS.fontHead, fontSize: 10.5, color: 'rgba(255,255,255,0.8)' }}>{caption}</span>
        </>
      ))}
    </div>
  )
}

function exportCsv(items) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['Reference', 'Type', 'Category', 'Employee', 'Employee code', 'Department', 'Date', 'Reason', 'Submitted']
  const rows = items.map(i => [i.ref, humanize(i.kind), i.typeLabel, i.name, i.code, i.department, i.requestDate ? String(i.requestDate).slice(0, 10) : '', i.reason, i.createdAt ? String(i.createdAt).slice(0, 16).replace('T', ' ') : ''].map(esc).join(','))
  const blob = new Blob([[header.map(esc).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pending-approvals-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Dark "Pending Approvals" panel. Leave & regularization requests can be approved /
 * rejected inline (with confirmation); goal approvals link to the Goals page.
 * `onAct(item, action, note)` performs the API call and resolves on success.
 */
export default function PendingApprovalsPanel({ items, counts, showGoals, loading, onAct, onOpenGoals, menuLinks = [], getEmployeeStats }) {
  const [tab, setTab] = useState('all')
  const [selectedKey, setSelectedKey] = useState(null)
  const [viewed, setViewed] = useState(readViewed)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'approve' | 'reject'
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const noteRef = useRef(null)

  useEffect(() => {
    function onDoc(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const tabs = [
    { key: 'all', label: 'All requests' },
    { key: 'leave', label: 'Leave', count: counts.leave },
    { key: 'regularization', label: 'Regularization', count: counts.regularization },
    ...(showGoals ? [{ key: 'goal', label: 'Goals', count: counts.goal }] : []),
  ]
  const list = useMemo(() => (tab === 'all' ? items : items.filter(i => i.kind === tab)), [items, tab])
  const rows = list.slice(0, 5)
  const selected = list.find(i => i.key === selectedKey) || list[0] || null

  useEffect(() => {
    if (!selected) return
    setViewed(prev => {
      if (prev.has(selected.key)) return prev
      const next = new Set(prev); next.add(selected.key)
      try { sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [selected?.key])

  useEffect(() => { setNote(''); setNoteOpen(false); setConfirm(null) }, [selected?.key])
  useEffect(() => { if (noteOpen && noteRef.current) noteRef.current.focus() }, [noteOpen])
  useEffect(() => {
    if (!confirm) return
    const t = setTimeout(() => setConfirm(null), 5000)
    return () => clearTimeout(t)
  }, [confirm])

  async function act(action) {
    if (!selected || busy) return
    if (action === 'reject' && !note.trim()) {
      setNoteOpen(true)
      toast.info('Add a note explaining the rejection first.')
      return
    }
    if (confirm !== action) { setConfirm(action); return }
    setBusy(true)
    try {
      await onAct(selected, action, note.trim())
      toast.success(`${selected.typeLabel} for ${selected.name} ${action === 'approve' ? 'approved' : 'rejected'}.`)
      setSelectedKey(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Action failed.')
    } finally {
      setBusy(false); setConfirm(null)
    }
  }

  const stats = selected && getEmployeeStats ? getEmployeeStats(selected) : []

  return (
    <section style={{ background: PMS.navy, borderRadius: PMS.radiusPanel, padding: '26px 24px 24px', boxSizing: 'border-box', minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: 16, fontWeight: 700, color: PMS.white, lineHeight: '24px' }}>Pending Approvals</div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Review requests from your team</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 auto', justifyContent: 'space-between', minWidth: 0, maxWidth: 822 }}>
          <Tabs tabs={tabs} value={tab} onChange={k => { setTab(k); setSelectedKey(null) }} />
          <div ref={menuRef} style={{ display: 'flex', gap: 13, flexShrink: 0, position: 'relative' }}>
            <button type="button" title="Download list (CSV)" aria-label="Download list as CSV" disabled={!list.length} onClick={() => exportCsv(list)} className="pms-dark-btn pms-focus"
              style={{ width: 38, height: 38, borderRadius: '50%', background: PMS.navyRow, border: 'none', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: list.length ? 'pointer' : 'default', opacity: list.length ? 1 : 0.5, padding: 0 }}>
              <FiDownload size={14} />
            </button>
            <button type="button" title="More" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)} className="pms-dark-btn pms-focus"
              style={{ width: 38, height: 38, borderRadius: '50%', background: PMS.navyRow, border: 'none', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <FiMoreVertical size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 46, right: 0, minWidth: 210, background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: 14, boxShadow: '0 16px 36px rgba(0,18,51,0.25)', padding: 6, zIndex: 20 }}>
                {menuLinks.map(l => (
                  <button key={l.label} type="button" onClick={() => { setMenuOpen(false); l.onClick() }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'none', borderRadius: 10, fontFamily: PMS.fontHead, fontSize: 12, color: PMS.navy, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = PMS.surfaceAlt }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pms-workday-body" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: rows.length >= 5 ? 24 : 16, minWidth: 0 }}>
          {loading ? (
            <EmptyBox dark icon={<FiInbox size={14} />} title="Loading requests…" sub="Fetching pending approvals" style={{ minHeight: 160, flex: 1 }} />
          ) : rows.length === 0 ? (
            <EmptyBox dark icon={<FiInbox size={14} />} title="No pending requests" sub="Everything is approved — nice work" style={{ minHeight: 160, flex: 1 }} />
          ) : rows.map((it, i) => (
            <RequestRow key={it.key} item={it} index={i} selected={selected && it.key === selected.key} viewed={viewed.has(it.key)} onSelect={() => setSelectedKey(it.key)} />
          ))}
          {list.length > rows.length && (
            <div style={{ fontFamily: PMS.fontHead, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              Showing 5 of {list.length}. Use the filters above or open the full list from the menu.
            </div>
          )}
        </div>

        {/* Detail */}
        <div style={{ background: PMS.gradPanel, borderRadius: PMS.radiusInner, padding: '26px 24px 24px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', display: 'flex', flexDirection: 'column', minWidth: 0, color: PMS.white }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
              <EmptyBox dark icon={<FiCheck size={14} />} title="Nothing selected" sub="Pick a request on the left to review it" style={{ width: '100%', maxWidth: 360 }} />
            </div>
          ) : (
            <>
              <div className="pms-att-top">
                <div style={{ minWidth: 0 }}>
                  <div style={lbl}>Request details</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                    <span style={{ fontFamily: PMS.fontHead, fontSize: 23, fontWeight: 700, lineHeight: '34px', whiteSpace: 'nowrap' }}># {selected.ref}</span>
                    <span style={{ height: 25, padding: '0 12px', borderRadius: 12.5, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', display: 'inline-flex', alignItems: 'center', fontFamily: PMS.fontHead, fontSize: 10.5 }}>Pending</span>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={lbl}>Department</div>
                  <div style={{ fontFamily: PMS.fontHead, fontSize: 17, fontWeight: 700, lineHeight: '34px', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.department || '—'}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={lbl}>Employee</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: PMS.white, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PMS.fontHead, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials(selected.name)}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</span>
                      <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 9.5, color: 'rgba(255,255,255,0.7)' }}>{selected.designation || selected.code || selected.typeLabel}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pms-att-tiles" style={{ marginTop: 22 }}>
                {selected.tiles.map((t, i) => <Tile key={i} {...t} />)}
                {selected.kind === 'goal' ? (
                  <Tile dashed value="Review in Goals" icon={<FiArrowUpRight size={13} />} onClick={onOpenGoals} />
                ) : noteOpen ? (
                  <Tile>
                    <textarea
                      ref={noteRef}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a note (required to reject)…"
                      aria-label="Approval note"
                      className="ca-borderless-input"
                      style={{ width: '100%', flex: 1, minHeight: 70, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: PMS.white, fontFamily: PMS.fontHead, fontSize: 11.5, padding: 0 }}
                    />
                  </Tile>
                ) : (
                  <Tile dashed value={note ? 'Edit note' : 'Add note'} icon={<FiPlus size={13} />} onClick={() => setNoteOpen(true)} />
                )}
              </div>

              <div style={{ marginTop: 26 }}>
                <div style={lbl}>Reason</div>
                <div style={{ fontFamily: PMS.fontHead, fontSize: 13, lineHeight: '20px', marginTop: 6 }}>{selected.reason || 'No reason provided.'}</div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 20, padding: '14px 20px', minHeight: 72, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px 28px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '16px 40px', flexWrap: 'wrap', minWidth: 0 }}>
                    {stats.map(s => (
                      <div key={s.caption} style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: PMS.fontHead, fontSize: 10, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{s.caption}</div>
                        <div style={{ fontFamily: PMS.fontHead, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {selected.kind !== 'goal' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <button type="button" title="Add note" aria-label="Add note" onClick={() => setNoteOpen(true)} className="pms-dark-btn pms-focus"
                        style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <FiMessageSquare size={15} />
                      </button>
                      <button type="button" disabled={busy} onClick={() => act('reject')} title={confirm === 'reject' ? 'Click again to confirm rejection' : 'Reject'} aria-label="Reject" className="pms-dark-btn pms-focus"
                        style={{ height: 42, minWidth: 42, padding: confirm === 'reject' ? '0 16px' : 0, borderRadius: 21, background: confirm === 'reject' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: busy ? 'wait' : 'pointer', fontFamily: PMS.fontHead, fontSize: 12, fontWeight: 700 }}>
                        <FiX size={15} />{confirm === 'reject' && 'Confirm reject'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => act('approve')} className="pms-hover-lift pms-focus"
                        style={{ height: 44, padding: '0 22px', borderRadius: 22, background: PMS.white, color: PMS.blue, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                        <FiCheck size={15} /> {busy ? 'Saving…' : confirm === 'approve' ? 'Confirm approve' : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
