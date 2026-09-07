import React from 'react'
import { FiAlertTriangle, FiGift, FiCalendar } from 'react-icons/fi'
import { FingerprintIcon, ExitIcon, EntryIcon, CheckIcon } from '../shared/Icons'
import { COLORS } from '../../theme'

function formatTime(s) {
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function formatTimeStr(t) {
  if (!t) return '—'
  const parts = t.split(':')
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH.toString().padStart(2, '0')}:${m} ${ampm}`
}

export default function AttendanceCard({
  isCheckIn, hasCheckedOut, punchTime, checkoutTime,
  elapsedSeconds, locationAddress, punching,
  isHoliday, holidayName, isOnLeave,
  attendanceEnabled, formattedDate,
  onPunch,
  shiftName, shiftCode, shiftStartTime, shiftEndTime, shiftColorCode, shiftGraceMinutes
}) {
  const punchBtnStyle = {
    base: {
      padding: '10px 26px', border: 'none', borderRadius: '30px',
      fontSize: '13px', fontWeight: '700', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s',
    },
    in:       { background: COLORS.green,   color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' },
    out:      { background: COLORS.red,     color: '#fff', boxShadow: '0 4px 14px rgba(239,68,68,0.3)'  },
    disabled: { background: '#e2e8f0',      color: COLORS.textMuted, cursor: 'default' },
  }

  const timerColor = hasCheckedOut ? COLORS.textMuted : isCheckIn ? COLORS.green : COLORS.textMuted

  return (
    <div style={{ background: COLORS.surface, borderRadius: '18px', padding: '22px', border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid #f1f5f9`, paddingBottom: '13px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(194,7,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary, flexShrink: 0 }}>
            <FingerprintIcon size={14} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>Today's Attendance</span>
        </div>
        <div style={{ fontSize: '11px', color: COLORS.textMuted }}>{formattedDate}</div>
      </div>

      {shiftName ? (
        <div style={{
          width: '100%',
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxSizing: 'border-box'
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: shiftColorCode || '#C2071A', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                {shiftName} <span style={{ fontSize: '10px', fontWeight: '700', color: '#C2071A', background: '#feecee', padding: '2px 6px', borderRadius: '6px', marginLeft: '4px' }}>{shiftCode}</span>
              </span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                {formatTimeStr(shiftStartTime)} - {formatTimeStr(shiftEndTime)}
              </span>
            </div>
            {shiftGraceMinutes > 0 && (
              <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Grace Period: <strong>{shiftGraceMinutes} mins</strong>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          background: '#fffbeb',
          border: '1.5px solid #fef3c7',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '11.5px',
          color: '#b45309',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxSizing: 'border-box'
        }}>
          <FiAlertTriangle size={13} color="#b45309" style={{ flexShrink: 0 }} />
          <span><strong>No Shift Assigned:</strong> Contact administrator for shift assignments.</span>
        </div>
      )}

      {isHoliday && (
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '9px', padding: '8px 12px', marginBottom: '14px', fontSize: '11px', color: COLORS.green, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiGift size={13} /> <strong>Holiday:</strong>&nbsp;{holidayName}
        </div>
      )}
      {isOnLeave && !isHoliday && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '9px', padding: '8px 12px', marginBottom: '14px', fontSize: '11px', color: COLORS.red, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiCalendar size={13} /> <strong>On Leave today</strong>
        </div>
      )}

      <div style={{ fontSize: '40px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px', lineHeight: 1, marginBottom: '5px', color: timerColor }}>
        {formatTime(elapsedSeconds)}
      </div>
      <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '18px', fontWeight: '500' }}>
        {hasCheckedOut ? 'Attendance completed' : isCheckIn ? 'Currently checked in' : isHoliday ? 'Holiday — no attendance' : isOnLeave ? 'On leave today' : 'Not checked in'}
      </div>

      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: COLORS.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>IN</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{punchTime || '—'}</div>
        </div>
        {hasCheckedOut && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: COLORS.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>OUT</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{checkoutTime || '—'}</div>
          </div>
        )}
        <div style={{ textAlign: 'center', maxWidth: '100px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: COLORS.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>LOCATION</div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', wordBreak: 'break-word', lineHeight: 1.3 }}>{locationAddress}</div>
        </div>
      </div>

      {attendanceEnabled ? (
        <button
          onClick={onPunch}
          disabled={hasCheckedOut || punching}
          style={{ ...punchBtnStyle.base, ...(hasCheckedOut ? punchBtnStyle.disabled : isCheckIn ? punchBtnStyle.out : punchBtnStyle.in) }}
        >
          {punching
            ? 'Processing…'
            : hasCheckedOut
              ? <><CheckIcon /> Checked Out</>
              : isCheckIn
                ? <><ExitIcon /> Check Out</>
                : <><EntryIcon /> {isHoliday ? 'Punch In (Holiday)' : 'Check In'}</>
          }
        </button>
      ) : (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: COLORS.red, display: 'flex', alignItems: 'center', gap: '7px' }}>
          <FiAlertTriangle size={13} color={COLORS.red} style={{ flexShrink: 0 }} /><span><strong>Attendance disabled</strong> for your account</span>
        </div>
      )}

      {hasCheckedOut && (
        <div style={{ width: '100%', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '10px', color: COLORS.textMuted }}>Work duration</span>
            <span style={{ fontSize: '10px', fontWeight: '700', color: COLORS.primary }}>{formatTime(elapsedSeconds)}</span>
          </div>
          <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (elapsedSeconds / (8 * 3600)) * 100)}%`, background: 'linear-gradient(to right, #D01021, #B40619)', borderRadius: '3px', transition: 'width 0.6s' }} />
          </div>
          <div style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '3px', textAlign: 'right' }}>of 8hr target</div>
        </div>
      )}
    </div>
  )
}
