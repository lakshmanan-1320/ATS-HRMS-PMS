import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiX, FiCalendar, FiLogOut, FiChevronDown, FiLock } from 'react-icons/fi'
import NotificationDropdown from '../shared/NotificationDropdown'
import { clearModuleCache } from '../../hooks/useModules'

const BRAND_RED = 'var(--primary-color, #C2071A)'
const FONT_HEAD = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

const SEARCHABLE_ITEMS = [
  { label: 'My Dashboard', category: 'Overview', path: '/employee/dashboard' },
  { label: 'Performance Hub', category: 'Performance', path: '/employee/performance' },
  { label: 'My Team', category: 'Organization', path: '/employee/team' },
  { label: 'My Profile', category: 'Organization', path: '/employee/profile' },
  { label: 'Leave Dashboard', category: 'Attendance & Leave', path: '/employee/leave' },
  { label: 'Apply for Leave', category: 'Attendance & Leave', path: '/employee/leave-request' },
  { label: 'Leave Approvals', category: 'Attendance & Leave', path: '/employee/leave-approvals' },
  { label: 'Holiday List', category: 'Attendance & Leave', path: '/employee/holidays' },
  { label: 'My Attendance', category: 'Attendance & Leave', path: '/employee/attendance' },
  { label: 'Team Attendance', category: 'Attendance & Leave', path: '/employee/team-attendance' },
  { label: 'Regularization Requests', category: 'Attendance & Leave', path: '/employee/regularization' },
  { label: 'Regularization Approvals', category: 'Attendance & Leave', path: '/employee/regularization-approvals' },
  { label: 'Overtime', category: 'Payroll', path: '/employee/overtime' },
  { label: 'Overtime Approvals', category: 'Payroll', path: '/employee/overtime-approvals' },
  { label: 'My Payslips', category: 'Payroll', path: '/employee/payslips' },
  { label: 'Company Policies', category: 'Account', path: '/employee/policies' },
  { label: 'Change Password', category: 'Account', path: '/employee/change-password' },
]

export default function EmployeeTopBar({ title }) {
  const navigate = useNavigate()
  const userEmail = sessionStorage.getItem('sa_email') || ''
  const displayName = userEmail
    ? userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Employee'
  const userRole = sessionStorage.getItem('user_role') || 'employee'
  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const companyName = sessionStorage.getItem('company_name') || 'Employee Portal'
  const roleLabel = userRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const [showProfile, setShowProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (searchInputRef.current) searchInputRef.current.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleLogout() {
    clearModuleCache()
    sessionStorage.clear()
    navigate('/login')
  }

  const filteredSearchResults = searchQuery.trim()
    ? SEARCHABLE_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e4eaf3',
      padding: '0 24px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      flexShrink: 0,
      fontFamily: FONT_HEAD,
    }}>
      {/* Left side: Title + Search + Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--card-active-bg, #FEECEE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <img src="/insight-tech-icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '15px', fontWeight: 700, color: '#0f1b3d', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {title || companyName}
            </div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
              {isManager ? 'Manager Portal' : 'Employee Portal'}
            </div>
          </div>
        </div>

        {/* Live Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', height: '36px',
            padding: '0 12px', background: '#fff',
            border: `1px solid ${isSearchFocused ? BRAND_RED : '#e4eaf3'}`,
            borderRadius: '9px', width: '240px', transition: 'all 0.2s',
            boxShadow: isSearchFocused ? '0 0 0 3px rgba(194, 7, 26, 0.1)' : 'none'
          }}>
            <FiSearch size={15} color={isSearchFocused ? BRAND_RED : '#93a1bd'} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search menu..."
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: FONT_HEAD, fontSize: '12.5px', color: '#0f1b3d', width: '100%'
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}>
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Live Search Results Overlay */}
          {isSearchFocused && searchQuery.trim() && (
            <div style={{
              position: 'absolute', top: '44px', left: 0, width: '320px',
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 400, overflow: 'hidden'
            }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                SEARCH RESULTS ({filteredSearchResults.length})
              </div>
              <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {filteredSearchResults.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                    No matching menu items found
                  </div>
                ) : (
                  filteredSearchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        navigate(res.path)
                        setSearchQuery('')
                        setIsSearchFocused(false)
                      }}
                      style={{
                        padding: '10px 14px', borderBottom: i < filteredSearchResults.length - 1 ? '1px solid #f8fafc' : 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <div>
                        <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', fontWeight: 600, color: '#0f1b3d' }}>{res.label}</div>
                        <div style={{ fontFamily: FONT_HEAD, fontSize: '10px', color: '#64748b' }}>{res.category}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#edf3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FiCalendar size={15} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', fontWeight: 600, color: '#0f1b3d' }}>{todayFormatted}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Have a productive day!</div>
          </div>
        </div>
      </div>

      {/* Right side: Notifications + User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <NotificationDropdown role={isManager ? 'manager' : userRole} />

        {/* Profile Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfile(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'pointer', padding: '4px 8px', borderRadius: '10px',
              background: showProfile ? '#f8fafc' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #D01021 0%, #B40619 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_HEAD, fontSize: '14px', fontWeight: 700, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(194, 7, 26, 0.3)'
            }}>
              {displayName.charAt(0)}
            </div>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', fontWeight: 700, color: '#0f1b3d', lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{roleLabel}</div>
            </div>
            <FiChevronDown size={14} color="#94a3b8" style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {showProfile && (
            <div style={{
              position: 'absolute', top: '50px', right: 0,
              width: '220px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail}
                </div>
              </div>
              <button
                onClick={() => { setShowProfile(false); navigate('/employee/change-password') }}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: '600',
                  textAlign: 'left', borderBottom: '1px solid #f8fafc'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <FiLock size={14} /> Change Password
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#C2071A', fontWeight: '600',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#feecee' }}
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
