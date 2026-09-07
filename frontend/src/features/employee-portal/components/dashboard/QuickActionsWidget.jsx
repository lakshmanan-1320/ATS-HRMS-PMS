import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCalendar, FiClock, FiFileText, FiBookOpen, FiZap, FiChevronRight, FiBell } from 'react-icons/fi'
import { COLORS } from '../../theme'

export default function QuickActionsWidget() {
  const navigate = useNavigate()

  const actions = [
    {
      title: 'Apply Leave',
      subtitle: 'Request paid or casual leave',
      icon: <FiCalendar size={18} color="#C2071A" />,
      bg: 'rgba(194,7,26,0.08)',
      link: '/employee/leave-request',
    },
    {
      title: 'Attendance Correction',
      subtitle: 'Submit regularization request',
      icon: <FiClock size={18} color="#0f766e" />,
      bg: 'rgba(15,118,110,0.08)',
      link: '/employee/regularization',
    },
    {
      title: 'My Payslips',
      subtitle: 'View & download salary slips',
      icon: <FiFileText size={18} color="#7c3aed" />,
      bg: 'rgba(124,58,237,0.08)',
      link: '/employee/payslips',
    },
    {
      title: 'Company Policies',
      subtitle: 'HR rules & employee guidelines',
      icon: <FiBookOpen size={18} color="#f59e0b" />,
      bg: 'rgba(245,158,11,0.08)',
      link: '/employee/policies',
    },
  ]

  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: '18px',
      padding: '22px',
      border: `1px solid ${COLORS.borderLight}`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '9px',
            background: 'rgba(194,7,26,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: COLORS.primary, flexShrink: 0
          }}>
            <FiZap size={15} color="#C2071A" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>Quick Actions</div>
            <div style={{ fontSize: '10px', color: COLORS.textMuted }}>Frequently used employee services</div>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        {actions.map((act) => (
          <div
            key={act.title}
            onClick={() => navigate(act.link)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#C2071A'
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(194,7,26,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: act.bg, display: 'flex', alignItems: 'center',
                justify: 'center', flexShrink: 0
              }}>
                {act.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.title}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.subtitle}
                </div>
              </div>
            </div>
            <FiChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Announcement Spotlight Sub-Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #fffef5 0%, #fffbf0 100%)',
        border: '1px solid #fef3c7',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'rgba(245,158,11,0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0, marginTop: '2px'
        }}>
          <FiBell size={15} color="#d97706" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#92400e' }}>
              Company Spotlight
            </span>
            <span style={{
              fontSize: '9px', fontWeight: '700', color: '#b45309',
              background: 'rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '10px',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Notice
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#78350f', lineHeight: 1.4, fontWeight: 500 }}>
            Q3 All-Hands & Town Hall meeting is scheduled for Friday at 4:00 PM. Attendance is requested for all team members.
          </p>
        </div>
      </div>
    </div>
  )
}
