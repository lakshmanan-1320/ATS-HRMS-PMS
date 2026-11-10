import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCalendar, FiClock, FiFileText, FiBookOpen, FiZap, FiChevronRight, FiBell } from 'react-icons/fi'
import { PMS } from '../../theme'
import { PmsCard, CardHeader, HeaderChip, Pill, T } from '../shared/PmsUI'

const ACTIONS = [
  { title: 'Apply Leave',           subtitle: 'Request paid or casual leave',  icon: FiCalendar, link: '/employee/leave-request' },
  { title: 'Attendance Correction', subtitle: 'Submit regularization request',  icon: FiClock,    link: '/employee/regularization' },
  { title: 'My Payslips',           subtitle: 'View & download salary slips',  icon: FiFileText, link: '/employee/payslips' },
  { title: 'Company Policies',      subtitle: 'HR rules & employee guidelines', icon: FiBookOpen, link: '/employee/policies' },
]

export default function QuickActionsWidget({ className }) {
  const navigate = useNavigate()
  return (
    <PmsCard className={className}>
      <CardHeader title="Quick Actions" chip={<HeaderChip icon={<FiZap size={14} />} />} />
      <div style={{ ...T.caption, marginTop: '-4px' }}>Frequently used employee services</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px' }}>
        {ACTIONS.map(({ title, subtitle, icon: Icon, link }) => (
          <button
            key={title}
            type="button"
            onClick={() => navigate(link)}
            className="pms-hover-lift pms-focus"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              padding: '12px 12px 12px 12px', minWidth: 0, borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
              background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = PMS.barSoft; e.currentTarget.style.background = PMS.white }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = PMS.border; e.currentTarget.style.background = PMS.surfaceAlt }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: PMS.white, border: `1px solid ${PMS.border}`, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '12px', fontWeight: 600, color: PMS.navy, lineHeight: '17px' }}>{title}</span>
                <span style={{ ...T.small, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{subtitle}</span>
              </span>
            </span>
            <FiChevronRight size={14} color={PMS.muted} style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* Company spotlight notice (existing static content) */}
      <div style={{
        marginTop: '14px', background: PMS.ice, border: `1px solid ${PMS.barSoft}`, borderRadius: '16px',
        padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '12px',
      }}>
        <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: PMS.white, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FiBell size={14} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontFamily: PMS.fontHead, fontSize: '12px', fontWeight: 700, color: PMS.navy }}>Company Spotlight</span>
            <Pill tone="blue" style={{ height: '20px', fontSize: '9.5px', padding: '0 9px' }}>Notice</Pill>
          </div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: '11px', color: PMS.slate, lineHeight: 1.5 }}>
            Q3 All-Hands & Town Hall meeting is scheduled for Friday at 4:00 PM. Attendance is requested for all team members.
          </div>
        </div>
      </div>
    </PmsCard>
  )
}
