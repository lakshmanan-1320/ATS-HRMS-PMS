import React from 'react'
import { FiLogIn, FiLogOut, FiMapPin, FiAlertTriangle, FiCheckCircle, FiPlus, FiCalendar, FiHeadphones, FiGift, FiLoader } from 'react-icons/fi'
import { PMS } from '../../theme'

function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h} : ${m} : ${sec}`
}

function formatTimeStr(t) {
  if (!t) return '—'
  const parts = String(t).split(':')
  const h = parseInt(parts[0], 10)
  if (isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${String(displayH).padStart(2, '0')}:${parts[1]} ${ampm}`
}

const label = { fontFamily: PMS.fontHead, fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '17px' }

function Tile({ value, caption, icon, onClick, disabled, title, dashed }) {
  const interactive = !!onClick && !disabled
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      title={title}
      className={interactive ? 'pms-hover-lift pms-focus' : undefined}
      style={{
        position: 'relative', minHeight: '99px', minWidth: 0, borderRadius: '18px',
        padding: dashed ? '14px' : '20px 18px 16px 18px', boxSizing: 'border-box',
        background: dashed ? 'transparent' : 'rgba(255,255,255,0.13)',
        border: dashed ? '1px dashed rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.22)',
        color: PMS.white, textAlign: dashed ? 'center' : 'left',
        display: 'flex', flexDirection: 'column', justifyContent: dashed ? 'center' : 'space-between',
        alignItems: dashed ? 'center' : 'stretch', gap: dashed ? '8px' : '10px',
        cursor: interactive ? 'pointer' : 'default', opacity: disabled && !dashed ? 0.95 : 1,
      }}
    >
      {dashed ? (
        <>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
          <span style={{ fontFamily: PMS.fontHead, fontSize: '12px', fontWeight: 700 }}>{value}</span>
        </>
      ) : (
        <>
          <span style={{ position: 'absolute', top: '14px', right: '16px', color: 'rgba(255,255,255,0.9)', display: 'flex' }}>{icon}</span>
          <span style={{ fontFamily: PMS.fontHead, fontSize: '19px', fontWeight: 700, lineHeight: '28px', paddingRight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
          <span style={{ fontFamily: PMS.fontHead, fontSize: '10.5px', color: 'rgba(255,255,255,0.8)', lineHeight: '16px' }}>{caption}</span>
        </>
      )}
    </button>
  )
}

function FooterStat({ caption, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: PMS.fontHead, fontSize: '10px', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{caption}</div>
      <div style={{ fontFamily: PMS.fontHead, fontSize: '15px', fontWeight: 700, color: PMS.white, whiteSpace: 'nowrap', marginTop: '2px' }}>{value}</div>
    </div>
  )
}

function RoundBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="pms-dark-btn pms-focus"
      style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
    >
      {children}
    </button>
  )
}

/**
 * "Today's attendance" panel (right side of My Workday).
 * All attendance state and the punch handler come from EmployeeDashboard.
 */
export default function AttendanceCard({
  isCheckIn, hasCheckedOut, punchTime, checkoutTime,
  elapsedSeconds, locationAddress, punching,
  isHoliday, holidayName, isOnLeave,
  attendanceEnabled, formattedDate,
  onPunch,
  shiftName, shiftCode, shiftStartTime, shiftEndTime, shiftColorCode, shiftGraceMinutes,
  leaveBalanceDays, openRegularizations, onRequestShift, onOpenAttendance, onContactAdmin,
}) {
  const statusPill = hasCheckedOut ? 'Checked out' : isCheckIn ? 'Checked in' : 'Not checked in'

  const statusValue = !attendanceEnabled ? 'Disabled'
    : isHoliday ? 'Holiday'
    : isOnLeave ? 'On leave'
    : hasCheckedOut ? 'Completed'
    : isCheckIn ? 'Present'
    : 'Pending'
  const statusIcon = !attendanceEnabled ? <FiAlertTriangle size={13} />
    : isHoliday ? <FiGift size={13} />
    : <FiCheckCircle size={13} />

  // Punch tile: this tile is the check-in / check-out action
  let punchValue = '— —'
  let punchCaption = 'Punch in'
  let punchIcon = <FiLogIn size={13} />
  let punchTitle = isHoliday ? 'Punch in (holiday)' : 'Check in'
  if (punching) {
    punchValue = '…'; punchCaption = 'Processing…'; punchIcon = <FiLoader size={13} />; punchTitle = 'Processing'
  } else if (hasCheckedOut) {
    punchValue = `${punchTime || '—'} – ${checkoutTime || '—'}`; punchCaption = 'Checked out'; punchIcon = <FiCheckCircle size={13} />; punchTitle = 'Attendance completed'
  } else if (isCheckIn) {
    punchValue = punchTime || '—'; punchCaption = 'Punched in · tap to punch out'; punchIcon = <FiLogOut size={13} />; punchTitle = 'Check out'
  } else if (isHoliday) {
    punchCaption = 'Punch in (holiday)'
  }
  const punchDisabled = !attendanceEnabled || hasCheckedOut || punching

  // Note text
  const notes = []
  if (shiftName) {
    notes.push(`${shiftName}${shiftCode ? ` (${shiftCode})` : ''} · ${formatTimeStr(shiftStartTime)} – ${formatTimeStr(shiftEndTime)}${shiftGraceMinutes > 0 ? ` · ${shiftGraceMinutes} min grace period` : ''}.`)
  } else {
    notes.push('No shift assigned. Contact your administrator for shift assignments.')
  }
  if (isHoliday) notes.push(`Today is a holiday${holidayName ? `: ${holidayName}` : ''}.`)
  if (isOnLeave && !isHoliday) notes.push('You are on leave today.')
  if (!attendanceEnabled) notes.push('Attendance is disabled for your account.')

  const workPct = Math.min(100, (elapsedSeconds / (8 * 3600)) * 100)

  return (
    <div style={{
      background: PMS.gradPanel, borderRadius: PMS.radiusInner, padding: '26px 24px 24px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
      display: 'flex', flexDirection: 'column', minWidth: 0, boxSizing: 'border-box', color: PMS.white,
    }}>
      {/* Top: timer / shift / date */}
      <div className="pms-att-top">
        <div style={{ minWidth: 0 }}>
          <div style={label}>Today's attendance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            <span style={{ fontFamily: PMS.fontHead, fontSize: '23px', fontWeight: 700, lineHeight: '34px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatTime(elapsedSeconds)}
            </span>
            <span style={{ height: '25px', padding: '0 12px', borderRadius: '12.5px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', display: 'inline-flex', alignItems: 'center', fontFamily: PMS.fontHead, fontSize: '10.5px', whiteSpace: 'nowrap' }}>
              {statusPill}
            </span>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={label}>Shift</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', minWidth: 0 }}>
            {shiftName && <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: shiftColorCode || PMS.sky, flexShrink: 0 }} />}
            <span style={{ fontFamily: PMS.fontHead, fontSize: '17px', fontWeight: 700, lineHeight: '34px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shiftName || 'Not assigned'}
            </span>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={label}>Date</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: PMS.white, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiCalendar size={15} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>{formattedDate}</span>
              <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '9.5px', color: 'rgba(255,255,255,0.7)' }}>Have a productive day!</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div className="pms-att-tiles" style={{ marginTop: '22px' }}>
        <Tile value={punchValue} caption={punchCaption} icon={punchIcon} onClick={onPunch} disabled={punchDisabled} title={punchTitle} />
        <Tile value={locationAddress || '—'} caption="Location" icon={<FiMapPin size={13} />} title={locationAddress} />
        <Tile value={statusValue} caption="Attendance status" icon={statusIcon} />
        <Tile dashed value="Request shift" icon={<FiPlus size={13} />} onClick={onRequestShift} title="Request a shift from your administrator" />
      </div>

      {/* Note */}
      <div style={{ marginTop: '26px' }}>
        <div style={label}>Note</div>
        <div style={{ fontFamily: PMS.fontHead, fontSize: '13px', lineHeight: '20px', marginTop: '6px', color: PMS.white }}>
          {notes.join(' ')}
        </div>
        {hasCheckedOut && (
          <div style={{ marginTop: '14px', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: PMS.fontHead, fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>
              <span>Work duration</span>
              <span style={{ color: PMS.white, fontWeight: 700 }}>{formatTime(elapsedSeconds)} of 8h target</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.18)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${workPct}%`, background: PMS.white, borderRadius: '3px', transition: 'width 0.6s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto', paddingTop: '24px',
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.18)', borderRadius: '20px', padding: '14px 20px', minHeight: '72px', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px 28px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '16px 40px', flexWrap: 'wrap', minWidth: 0 }}>
            <FooterStat caption="Leave balance" value={leaveBalanceDays > 0 ? `${leaveBalanceDays} days` : '— days'} />
            <FooterStat caption="Calls this week" value="— calls" />
            <FooterStat caption="Regularizations" value={`${openRegularizations} open`} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px 16px', flexWrap: 'wrap' }}>
            <RoundBtn title="Attendance history" onClick={onOpenAttendance}><FiMapPin size={15} /></RoundBtn>
            <RoundBtn title="Help & support" onClick={onContactAdmin}><FiHeadphones size={15} /></RoundBtn>
            <button
              type="button"
              onClick={onContactAdmin}
              className="pms-hover-lift pms-focus"
              style={{ height: '44px', padding: '0 22px', borderRadius: '22px', background: PMS.white, color: PMS.blue, border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <FiHeadphones size={15} /> Contact admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
