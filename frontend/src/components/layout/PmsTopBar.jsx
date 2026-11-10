import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiX, FiCalendar, FiLogOut, FiChevronDown, FiLock, FiSliders } from 'react-icons/fi'
import { PMS } from '../../features/employee-portal/theme'

// Accent variables consumed by shared widgets rendered inside the header.
const HEADER_VARS = {
  '--primary-color': PMS.blue,
  '--card-active-bg': PMS.ice,
  '--card-active-border': PMS.barSoft,
}

export function PmsIconButton({ title, onClick, active, children, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`pms-icon-btn pms-focus ${className}`}
      style={{
        width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, position: 'relative',
        background: active ? PMS.ice : PMS.white,
        border: `1px solid ${active ? PMS.barSoft : PMS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: active ? PMS.blue : PMS.navy, padding: 0,
      }}
    >
      {children}
    </button>
  )
}

/**
 * Shared PMS top bar (Figma header): logo, optional page title, round icon
 * buttons (menu search, calendar, notifications, preferences) and the profile menu.
 * Portal-specific behaviour (search items, links, notification bell) comes from props.
 */
export default function PmsTopBar({
  title,
  hideTitleFor = ['Dashboard'],
  searchItems = [],
  displayName,
  fullName,
  userEmail,
  roleLabel,
  calendarPath,
  calendarTitle = 'Calendar',
  prefsPath,
  prefsTitle = 'Preferences',
  changePasswordPath,
  onLogout,
  notificationSlot,
  homePath,
}) {
  const navigate = useNavigate()
  const showTitle = title && !hideTitleFor.includes(title)

  const [showProfile, setShowProfile] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus()
  }, [showSearch])

  const results = searchQuery.trim()
    ? searchItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchItems.slice(0, 6)

  function go(path) {
    navigate(path)
    setSearchQuery('')
    setShowSearch(false)
  }

  const menuBtn = {
    width: '100%', padding: '11px 16px', background: 'none', border: 'none',
    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
    fontFamily: PMS.fontHead, fontSize: '12.5px', fontWeight: 600, textAlign: 'left',
  }

  return (
    <header className="pms-topbar" style={{
      ...HEADER_VARS,
      background: PMS.white,
      position: 'sticky', top: 0, zIndex: 200, flexShrink: 0,
      fontFamily: PMS.fontHead,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        height: '42px', paddingBottom: '16px', boxSizing: 'content-box',
        borderBottom: `1px solid ${PMS.divider}`,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => homePath && navigate(homePath)}
            title="Go to dashboard"
            className="pms-focus"
            style={{ background: 'none', border: 'none', padding: 0, cursor: homePath ? 'pointer' : 'default', display: 'flex', flexShrink: 0 }}
          >
            <img className="pms-hide-sm" src="/pms/insight-technology-logo.svg" alt="Insight Technology — People · Performance · Progress" style={{ height: '37.4px', width: 'auto', display: 'block' }} />
            <img className="pms-show-sm" src="/pms/insight-technology-mark.svg" alt="Insight Technology" style={{ height: '36px', width: 'auto' }} />
          </button>
          {showTitle && (
            <div className="pms-topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
              <span style={{ width: '1px', height: '28px', background: PMS.border, flexShrink: 0 }} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: PMS.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div ref={searchRef} style={{ position: 'relative' }}>
            <PmsIconButton title="Search menu" onClick={() => setShowSearch(v => !v)} active={showSearch}>
              <FiSearch size={15} />
            </PmsIconButton>
            {showSearch && (
              <div style={{
                position: 'absolute', top: '50px', right: 0, width: '320px', maxWidth: 'calc(100vw - 32px)',
                background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: '16px',
                boxShadow: '0 16px 36px rgba(0,18,51,0.14)', zIndex: 400, overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 14px', borderBottom: `1px solid ${PMS.pillGrey}` }}>
                  <FiSearch size={14} color={PMS.blue} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="ca-borderless-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowSearch(false)
                      if (e.key === 'Enter' && results[0]) go(results[0].path)
                    }}
                    placeholder="Search menu..."
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: PMS.fontHead, fontSize: '12.5px', color: PMS.navy, width: '100%' }}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: PMS.muted, display: 'flex' }}>
                      <FiX size={13} />
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
                  {results.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: PMS.muted }}>No matching menu items found</div>
                  ) : results.map((res) => (
                    <button
                      type="button"
                      key={res.path}
                      onClick={() => go(res.path)}
                      style={{ width: '100%', padding: '9px 10px', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', display: 'block' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = PMS.surfaceAlt }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      <div style={{ fontFamily: PMS.fontHead, fontSize: '12.5px', fontWeight: 600, color: PMS.navy }}>{res.label}</div>
                      <div style={{ fontFamily: PMS.fontHead, fontSize: '10px', color: PMS.muted }}>{res.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {calendarPath && (
            <PmsIconButton title={calendarTitle} onClick={() => navigate(calendarPath)} className="pms-hide-sm">
              <FiCalendar size={15} />
            </PmsIconButton>
          )}

          {notificationSlot}

          {prefsPath && (
            <PmsIconButton title={prefsTitle} onClick={() => navigate(prefsPath)} className="pms-hide-sm">
              <FiSliders size={16} />
            </PmsIconButton>
          )}

          <span className="pms-hide-sm" style={{ width: '1px', height: '28px', background: PMS.border }} />

          {/* Profile */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowProfile(v => !v)}
              className="pms-focus"
              aria-expanded={showProfile}
              style={{ display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}
            >
              <span style={{
                width: '42px', height: '42px', borderRadius: '50%', background: PMS.gradBlue,
                color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: PMS.fontHead, fontSize: '15px', fontWeight: 700, flexShrink: 0,
              }}>
                {(displayName || '?').charAt(0).toUpperCase()}
              </span>
              <span className="pms-hide-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '56px' }}>
                <span style={{ fontFamily: PMS.fontHead, fontSize: '12.5px', fontWeight: 700, color: PMS.navy, lineHeight: 1.5 }}>{displayName}</span>
                <span style={{ fontFamily: PMS.fontHead, fontSize: '10.5px', color: PMS.muted, lineHeight: 1.5 }}>{roleLabel}</span>
              </span>
              <FiChevronDown size={13} color={PMS.slate} style={{ marginLeft: '12px', transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showProfile && (
              <div style={{
                position: 'absolute', top: '52px', right: 0, width: '220px', background: PMS.white,
                border: `1px solid ${PMS.border}`, borderRadius: '16px',
                boxShadow: '0 16px 36px rgba(0,18,51,0.14)', zIndex: 500, overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${PMS.pillGrey}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: PMS.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fullName || displayName}
                  </div>
                  <div style={{ fontSize: '11px', color: PMS.muted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userEmail}
                  </div>
                </div>
                {changePasswordPath && (
                  <button
                    type="button"
                    onClick={() => { setShowProfile(false); navigate(changePasswordPath) }}
                    style={{ ...menuBtn, color: PMS.slate }}
                    onMouseEnter={e => { e.currentTarget.style.background = PMS.surfaceAlt }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <FiLock size={14} /> Change Password
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  style={{ ...menuBtn, color: PMS.blue }}
                  onMouseEnter={e => { e.currentTarget.style.background = PMS.ice }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <FiLogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
