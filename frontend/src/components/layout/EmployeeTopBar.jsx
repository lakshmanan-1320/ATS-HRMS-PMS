import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiLogOut, FiChevronDown, FiCalendar, FiClock, FiTarget, FiCheckCircle, FiXCircle, FiDollarSign, FiStar, FiAlertCircle, FiAward } from 'react-icons/fi'
import { getPendingLeaves, getPendingRegularizations, getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../../features/employee-portal/api'

export default function EmployeeTopBar({ title }) {
  const navigate = useNavigate()
  const userEmail = sessionStorage.getItem('sa_email') || ''
  const displayName = userEmail
    ? userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Employee'
  const userRole = sessionStorage.getItem('user_role') || 'employee'
  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const companyName = sessionStorage.getItem('company_name') || 'Employee Portal'

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  function loadNotifications() {
    const canApprove = isManager || userRole === 'hr' || userRole === 'client_admin'
    const promises = [
      getMyNotifications().catch(() => ({ data: { items: [], unread: 0 } })),
      canApprove ? getPendingLeaves().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      canApprove ? getPendingRegularizations().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]
    Promise.all(promises).then(([notifRes, leavesRes, regsRes]) => {
      const inApp = (notifRes.data?.items || []).map(n => ({
        id: n.id,
        type: n.type,
        message: n.title,
        sub: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
        entityId: n.entity_id,
        entityType: n.entity_type,
        source: 'inapp',
      }))

      const leaves = (leavesRes.data || []).map(l => ({
        type: 'leave',
        message: `${l.employee_name || l.first_name || 'An employee'} requested leave`,
        sub: l.leave_type_name || 'Leave request',
        isRead: false,
        source: 'pending',
      }))
      const regs = (regsRes.data || []).map(r => ({
        type: 'regularization',
        message: `${r.employee_name || r.first_name || 'An employee'} needs regularization`,
        sub: r.date ? new Date(r.date).toLocaleDateString('en-IN') : 'Regularization request',
        isRead: false,
        source: 'pending',
      }))

      const combined = [...inApp, ...leaves, ...regs]
      setNotifications(combined)
      const inAppUnread = notifRes.data?.unread || 0
      setUnreadCount(inAppUnread + leaves.length + regs.length)
    })
  }

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [isManager, userRole])

  async function handleMarkRead(notif) {
    if (notif.source === 'inapp' && notif.id && !notif.isRead) {
      await markNotificationRead(notif.id).catch(() => {})
      loadNotifications()
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead().catch(() => {})
    loadNotifications()
  }

  useEffect(() => {
    function handle(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleLogout() {
    sessionStorage.clear()
    navigate('/login')
  }

  const roleLabel = userRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 36px',
      height: '62px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
          {title || companyName}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Employee Portal</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{today}</span>

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotif(v => !v); setShowProfile(false) }}
            title="Notifications"
            style={{
              position: 'relative',
              background: showNotif ? '#ede9fe' : '#f8fafc',
              border: `1px solid ${showNotif ? '#a78bfa' : '#e2e8f0'}`,
              borderRadius: '10px',
              width: '42px', height: '42px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#a78bfa' }}
            onMouseLeave={e => { if (!showNotif) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' } }}
          >
            <FiBell size={18} color="#374151" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '7px', right: '7px',
                minWidth: '16px', height: '16px', borderRadius: '8px',
                background: '#ef4444', border: '2px solid #fff',
                fontSize: '9px', color: '#fff', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 2px',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', top: '50px', right: 0,
              width: '340px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Notifications</div>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: '11px', background: '#ede9fe', color: '#6d28d9',
                      padding: '2px 8px', borderRadius: '20px', fontWeight: '600',
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '11px', color: '#6366f1', fontWeight: '600', fontFamily: 'inherit',
                      padding: '2px 6px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <FiBell size={28} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>No notifications</div>
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const TYPE_META = {
                      leave_submitted:           { bg: '#ede9fe', color: '#7c3aed', Icon: FiCalendar },
                      leave_approved:            { bg: '#dcfce7', color: '#16a34a', Icon: FiCheckCircle },
                      leave_rejected:            { bg: '#fee2e2', color: '#dc2626', Icon: FiXCircle },
                      leave:                     { bg: '#ede9fe', color: '#7c3aed', Icon: FiCalendar },
                      regularization_submitted:  { bg: '#fef3c7', color: '#b45309', Icon: FiClock },
                      regularization_approved:   { bg: '#dcfce7', color: '#16a34a', Icon: FiCheckCircle },
                      regularization_rejected:   { bg: '#fee2e2', color: '#dc2626', Icon: FiXCircle },
                      regularization:            { bg: '#fef3c7', color: '#b45309', Icon: FiClock },
                      goal_submitted:            { bg: '#dcfce7', color: '#16a34a', Icon: FiTarget },
                      goal_deadline_reminder:    { bg: '#fff7ed', color: '#c2410c', Icon: FiAlertCircle },
                      appraisal_cycle_opened:    { bg: '#faf5ff', color: '#7c3aed', Icon: FiStar },
                      payroll_processed:         { bg: '#f0fdf4', color: '#15803d', Icon: FiDollarSign },
                      COMPETENCY_LIBRARY_UPDATED: { bg: '#e0e7ff', color: '#6366f1', Icon: FiAward },
                      COMPETENCY_ASSESSMENT_COMPLETED: { bg: '#dcfce7', color: '#16a34a', Icon: FiAward },
                      COMPETENCY_ASSESSMENT_PENDING: { bg: '#fff7ed', color: '#ea580c', Icon: FiClock },
                      COMPETENCY_ASSESSMENT_ACKNOWLEDGED: { bg: '#f0fdf4', color: '#15803d', Icon: FiCheckCircle },
                    }
                    const meta = TYPE_META[n.type] || { bg: '#f0f9ff', color: '#0284c7', Icon: FiBell }
                    const { bg: iconBg, color: iconColor, Icon } = meta
                    return (
                      <div
                        key={n.id || i}
                        onClick={() => handleMarkRead(n)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: i < notifications.length - 1 ? '1px solid #f8fafc' : 'none',
                          display: 'flex', alignItems: 'flex-start', gap: '10px',
                          background: n.isRead === false && n.source === 'inapp' ? '#fafbff' : '#ffffff',
                          cursor: n.source === 'inapp' && !n.isRead ? 'pointer' : 'default',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '9px',
                          background: iconBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={15} color={iconColor} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '13px', color: '#1e293b',
                            fontWeight: n.isRead === false && n.source === 'inapp' ? '600' : '500',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                            {n.sub}
                          </div>
                          {n.createdAt && (
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                              {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        {n.isRead === false && n.source === 'inapp' && (
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: '6px' }} />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotif(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: showProfile ? '#f1f5f9' : 'none', border: 'none',
              cursor: 'pointer', padding: '5px 10px', borderRadius: '10px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showProfile) e.currentTarget.style.background = 'none' }}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '800', flexShrink: 0,
            }}>
              {displayName.charAt(0)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{displayName}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{roleLabel}</div>
            </div>
            <FiChevronDown
              size={14}
              color="#94a3b8"
              style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {showProfile && (
            <div style={{
              position: 'absolute', top: '54px', right: 0,
              width: '220px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#dc2626', fontWeight: '600',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <FiLogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
