import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiChevronDown } from 'react-icons/fi'
import NotificationDropdown from '../shared/NotificationDropdown'
import { clearModuleCache } from '../../hooks/useModules'

export default function ClientAdminTopBar({ title }) {
  const navigate = useNavigate()
  const companyName = sessionStorage.getItem('company_name') || 'Client Admin'
  const userEmail = sessionStorage.getItem('sa_email') || ''
  const displayName = userEmail
    ? userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Admin'
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleLogout() {
    clearModuleCache()
    sessionStorage.clear()
    navigate('/login')
  }

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
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Client Admin Panel</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{today}</span>

        <NotificationDropdown role="client_admin" />

        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(v => !v)}
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
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Client Admin</div>
            </div>
            <FiChevronDown size={14} color="#94a3b8" style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showProfile && (
            <div style={{
              position: 'absolute', top: '54px', right: 0,
              width: '220px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
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
