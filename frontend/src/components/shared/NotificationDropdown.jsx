import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FiBell, FiCalendar, FiClock, FiCheckCircle, FiXCircle,
  FiDollarSign, FiFileText, FiAlertCircle, FiCheck
} from 'react-icons/fi'

const NOTIF_ICONS = {
  leave_submitted:          { Icon: FiCalendar },
  leave_applied:            { Icon: FiCalendar },
  leave_approved:           { Icon: FiCheckCircle },
  leave_rejected:           { Icon: FiXCircle },
  leave_cancelled:          { Icon: FiXCircle },

  regularization_submitted: { Icon: FiClock },
  regularization_approved:  { Icon: FiCheckCircle },
  regularization_rejected:  { Icon: FiXCircle },

  permission_submitted:     { Icon: FiClock },
  permission_approved:      { Icon: FiCheckCircle },
  permission_rejected:      { Icon: FiXCircle },

  payroll_processed:        { Icon: FiDollarSign },
  payslip_published:        { Icon: FiDollarSign },

  overtime_submitted:       { Icon: FiClock },
  overtime_approved:        { Icon: FiCheckCircle },
  overtime_rejected:        { Icon: FiXCircle },

  policy_published:         { Icon: FiFileText },
}

function timeAgo(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const past = new Date(dateString)
  const diffSec = Math.floor((now - past) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function NotificationDropdown({ role = 'employee', variant = 'default' }) {
  const isPms = variant === 'pms'
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const fetchNotifications = useCallback(() => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token')
    if (!token) return

    axios.get('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const notifList = res.data?.items || []
        const count = res.data?.unread || 0
        setItems(notifList)
        setUnreadCount(count)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 20000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleMarkRead(id) {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token')
    if (!token) return
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  async function handleMarkAllRead() {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token')
    if (!token) return
    try {
      await axios.patch('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  function handleNotificationClick(n) {
    if (!n.is_read) {
      handleMarkRead(n.id)
    }
    setShowDropdown(false)

    const type = String(n.type || '').toLowerCase()
    const entityType = String(n.entity_type || '').toLowerCase()

    // Determine target route based on type, entityType, and user role
    if (type.includes('leave_submitted') || type.includes('leave_applied') || type.includes('leave_cancelled')) {
      if (role === 'client_admin') navigate('/client-admin/leave-approvals')
      else if (role === 'manager' || role === 'hr') navigate('/employee/leave-approvals')
      else navigate('/employee/leave')
    } else if (type.includes('leave_approved') || type.includes('leave_rejected') || entityType === 'leave') {
      navigate('/employee/leave')
    } else if (type.includes('regularization_submitted')) {
      if (role === 'client_admin') navigate('/client-admin/regularizations')
      else if (role === 'manager' || role === 'hr') navigate('/employee/regularization-approvals')
      else navigate('/employee/regularization')
    } else if (type.includes('regularization_approved') || type.includes('regularization_rejected') || entityType === 'regularization') {
      navigate('/employee/regularization')
    } else if (type.includes('permission_submitted')) {
      if (role === 'client_admin') navigate('/client-admin/permissions')
      else navigate('/employee/attendance')
    } else if (type.includes('permission_approved') || type.includes('permission_rejected') || entityType === 'permission') {
      navigate('/employee/attendance')
    } else if (type.includes('payroll') || type.includes('payslip') || entityType === 'payslip') {
      navigate('/employee/payslips')
    } else if (type.includes('overtime_submitted')) {
      if (role === 'manager' || role === 'hr') navigate('/employee/overtime-approvals')
      else navigate('/employee/overtime')
    } else if (type.includes('overtime_approved') || type.includes('overtime_rejected') || entityType === 'overtime') {
      navigate('/employee/overtime')
    } else if (type.includes('policy') || entityType === 'policy') {
      if (role === 'client_admin') navigate('/client-admin/policies')
      else navigate('/employee/policies')
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setShowDropdown(v => !v)
          if (!showDropdown) fetchNotifications()
        }}
        title="Notifications"
        style={{
          position: 'relative',
          background: showDropdown ? 'var(--card-active-bg, #FEECEE)' : '#fff',
          border: `1px solid ${showDropdown ? 'var(--card-active-border, #F7A6AF)' : (isPms ? '#E3E7EE' : '#e4eaf3')}`,
          borderRadius: isPms ? '50%' : '9px',
          width: isPms ? '42px' : '36px', height: isPms ? '42px' : '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-active-bg, #FEECEE)'; e.currentTarget.style.borderColor = 'var(--card-active-border, #F7A6AF)' }}
        onMouseLeave={e => { if (!showDropdown) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = isPms ? '#E3E7EE' : '#e4eaf3' } }}
      >
        <FiBell size={isPms ? 15 : 16} color={showDropdown ? 'var(--primary-color, #C2071A)' : (isPms ? '#001233' : '#374151')} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: isPms ? '6px' : '5px', right: isPms ? '6px' : '5px',
            minWidth: '16px', height: '16px', borderRadius: '8px',
            background: 'var(--primary-color, #C2071A)', border: '2px solid #fff',
            fontSize: '9px', color: '#fff', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '50px', right: 0,
          width: '360px', background: '#ffffff',
          border: '1px solid #e2e8f0', borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 600, overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#ffffff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: '11px', background: 'var(--card-active-bg, #FEECEE)', color: 'var(--primary-color, #C2071A)',
                  padding: '2px 8px', borderRadius: '20px', fontWeight: '700',
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
                  fontSize: '12px', color: 'var(--primary-color, #C2071A)', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontFamily: 'inherit',
                }}
              >
                <FiCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <FiBell size={32} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>No notifications yet</div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>You are all caught up!</div>
              </div>
            ) : (
              items.map(n => {
                const meta = NOTIF_ICONS[n.type] || { Icon: FiAlertCircle }
                const IconComponent = meta.Icon
                const isUnread = !n.is_read

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid #f1f5f9',
                      background: '#ffffff',
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      cursor: 'pointer', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef8f8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: 'var(--card-active-bg, #FEECEE)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px',
                    }}>
                      <IconComponent size={18} color="var(--primary-color, #C2071A)" style={{ color: 'var(--primary-color, #C2071A)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{
                          fontSize: '13px', fontWeight: isUnread ? '700' : '600',
                          color: isUnread ? '#0f172a' : '#334155',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', flexShrink: 0 }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      {n.message && (
                        <div style={{
                          fontSize: '12px', color: isUnread ? '#475569' : '#64748b',
                          marginTop: '3px', lineHeight: '1.4',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {n.message}
                        </div>
                      )}
                    </div>

                    {isUnread && (
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: 'var(--primary-color, #C2071A)', flexShrink: 0, marginTop: '6px',
                      }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
