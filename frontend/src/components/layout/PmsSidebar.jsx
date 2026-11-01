import React from 'react'
import { FiSearch, FiX, FiChevronDown, FiChevronRight, FiChevronLeft, FiLock, FiLogOut, FiSettings, FiHeadphones } from 'react-icons/fi'

// ─────────────────────────────────────────────────────────────────────────────
// PMS variant of the sidebar used by the employee portal.
// Colours: PMS navy/blue (Figma "Employee" frame).
// Font sizes & spacing: same as the client-admin sidebar (ExpandableSidebar
// default variant) so every module's sidebar reads the same.
// Presentational only; state and navigation logic stay in ExpandableSidebar.
// ─────────────────────────────────────────────────────────────────────────────
const SB = {
  bg: 'linear-gradient(180deg, #000714 0%, #15294E 46.6%, #001233 100%)',
  activeBg: 'linear-gradient(90deg, #004E89 0%, #52ACEF 61%, #407BA7 100%)',
  text: 'rgba(238, 248, 255, 0.85)',
  steel: '#407BA7',
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  hover: 'rgba(255,255,255,0.08)',
}

// Sizes mirrored from the client-admin sidebar
const SIZE = {
  width: 280, collapsedWidth: 76,
  itemFont: '14px', itemPad: '10.5px 14px', itemIcon: 18, itemGap: '12px', itemRadius: '10px',
  childFont: '13px', childPad: '8.5px 12px', childIcon: 16, childRadius: '8px',
  sectionGap: '22px', groupGap: '6px',
  titleFont: '11px', titleSpacing: '0.08em',
  searchHeight: '40px', searchFont: '13.5px',
}

const soonTag = (
  <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soon</span>
)

function NavItem({ icon: Icon, label, active, collapsed, onClick, disabled, trailing, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={collapsed ? label : undefined}
      className="pms-focus"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        width: '100%', margin: small ? 0 : '1px 0',
        padding: collapsed ? '10px' : (small ? SIZE.childPad : SIZE.itemPad),
        border: 'none', borderRadius: small ? SIZE.childRadius : SIZE.itemRadius,
        background: active ? SB.activeBg : 'transparent',
        boxShadow: active ? 'inset 0 0 0 1px rgba(164,216,255,0.45), 0 0 10px rgba(4,102,200,0.55)' : 'none',
        color: active ? '#ffffff' : SB.text,
        fontFamily: SB.font, fontSize: small ? SIZE.childFont : SIZE.itemFont, fontWeight: active ? 600 : 400,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        textAlign: 'left', outline: 'none', boxSizing: 'border-box', transition: 'background 0.2s, color 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active && !disabled) { e.currentTarget.style.background = SB.hover; e.currentTarget.style.color = '#ffffff' } }}
      onMouseLeave={e => { if (!active && !disabled) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SB.text } }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: SIZE.itemGap, minWidth: 0 }}>
        {Icon && (
          <Icon
            size={small ? SIZE.childIcon : SIZE.itemIcon}
            style={{ flexShrink: 0, color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', width: small ? SIZE.childIcon : SIZE.itemIcon, height: small ? SIZE.childIcon : SIZE.itemIcon }}
          />
        )}
        {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      </span>
      {!collapsed && trailing}
    </button>
  )
}

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
  background: 'none', border: 'none', color: '#ffffff', fontFamily: SB.font, fontSize: '13px',
  fontWeight: 600, cursor: 'pointer', textAlign: 'left',
}

export default function PmsSidebar({
  sections, activeId, isCollapsed, setIsCollapsed, isNarrow,
  closedSections, toggleSection, expandedItems, toggleExpand,
  searchQuery, setSearchQuery, searchInputRef, navigate,
  roleLetter, displayName, userEmail,
  showDropdown, setShowDropdown, dropdownRef, onLogout, onChangePassword, onSettings, onHelp,
}) {
  const width = isCollapsed ? SIZE.collapsedWidth : SIZE.width
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')
  const initial = (displayName || roleLetter || 'U').charAt(0).toUpperCase()

  return (
    <aside className="no-scrollbar" style={{
      width: `${width}px`, minWidth: `${width}px`, background: SB.bg,
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden', fontFamily: SB.font, color: '#ffffff', userSelect: 'none',
      zIndex: 100, boxSizing: 'border-box', transition: 'width 0.25s ease, min-width 0.25s ease',
    }}>
      {/* Search / expand */}
      <div style={{ padding: isCollapsed ? '20px 0 4px' : '20px 16px 8px', display: 'flex', justifyContent: 'center', gap: '8px', flexShrink: 0 }}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            title="Expand menu"
            className="pms-focus"
            style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
          >
            <img src="/pms/insight-technology-mark.svg" alt="Expand menu" style={{ height: '26px', width: 'auto', display: 'block' }} />
          </button>
        ) : (
          <>
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, height: SIZE.searchHeight,
              background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: '10px', boxSizing: 'border-box', padding: '0 8px 0 12px', gap: '10px',
            }}>
              <FiSearch size={16} style={{ color: 'rgba(255,255,255,0.75)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                className="pms-sidebar-search"
                placeholder="Search menu..."
                aria-label="Search menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); e.currentTarget.blur() } }}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontFamily: SB.font, fontSize: SIZE.searchFont, fontWeight: 500, padding: 0 }}
              />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} title="Clear search"
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EEF8FF', padding: 0, flexShrink: 0 }}>
                  <FiX size={12} />
                </button>
              ) : (
                <span style={{ background: 'rgba(255,255,255,0.13)', borderRadius: '5px', height: '20px', padding: '0 7px', display: 'inline-flex', alignItems: 'center', fontSize: '10.5px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {isMac ? '⌘ K' : 'Ctrl K'}
                </span>
              )}
            </div>
            {isNarrow && (
              <button type="button" onClick={() => setIsCollapsed(true)} title="Collapse menu" className="pms-focus"
                style={{ width: SIZE.searchHeight, height: SIZE.searchHeight, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#EEF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                <FiChevronLeft size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="no-scrollbar" style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column',
        gap: isCollapsed ? '4px' : SIZE.sectionGap,
        padding: isCollapsed ? '12px 8px 24px' : '16px 16px 20px',
      }}>
        {sections.map((section, sIndex) => {
          const key = section.title || `s${sIndex}`
          const closed = !!closedSections[key] && !searchQuery
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: SIZE.groupGap }}>
              {section.title && !isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="pms-focus"
                  aria-expanded={!closed}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: '2px 8px 6px', cursor: 'pointer', color: '#ffffff', width: '100%' }}
                >
                  <span style={{ fontFamily: SB.font, fontSize: SIZE.titleFont, fontWeight: 700, textTransform: 'uppercase', letterSpacing: SIZE.titleSpacing, color: 'rgba(238, 248, 255, 0.55)', whiteSpace: 'nowrap' }}>{section.title}</span>
                  <FiChevronDown size={13} style={{ color: 'rgba(255,255,255,0.45)', transform: closed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              )}
              {!closed && section.links.map(link => {
                if (link.children) {
                  const isExpanded = !!expandedItems[link.id]
                  const hasActiveChild = link.children.some(c => c.id === activeId)
                  return (
                    <div key={link.id}>
                      <NavItem
                        icon={link.icon}
                        label={link.label}
                        active={false}
                        collapsed={isCollapsed}
                        onClick={() => (isCollapsed ? setIsCollapsed(false) : toggleExpand(link.id))}
                        trailing={isExpanded
                          ? <FiChevronDown size={15} style={{ color: hasActiveChild ? '#ffffff' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                          : <FiChevronRight size={15} style={{ color: hasActiveChild ? '#ffffff' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />}
                      />
                      {!isCollapsed && isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', marginLeft: '12px', paddingLeft: '14px', borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
                          {link.children.map(child => (
                            <NavItem
                              key={child.id}
                              small
                              icon={child.icon}
                              label={child.label}
                              active={activeId === child.id}
                              collapsed={false}
                              disabled={!child.path || child.soon}
                              onClick={() => child.path && !child.soon && navigate(child.path)}
                              trailing={child.soon ? soonTag : null}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                  <NavItem
                    key={link.id}
                    icon={link.icon}
                    label={link.label}
                    active={activeId === link.id}
                    collapsed={isCollapsed}
                    disabled={!link.path || link.soon}
                    onClick={() => link.path && !link.soon && navigate(link.path)}
                    trailing={link.soon
                      ? soonTag
                      : link.badge
                        ? <span style={{ minWidth: '20px', height: '20px', borderRadius: '10px', background: SB.steel, color: '#ffffff', fontSize: '10.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{link.badge}</span>
                        : null}
                  />
                )
              })}
            </div>
          )
        })}
        {sections.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '20px' }}>No menus found</div>
        )}
      </nav>

      {/* Footer: profile, settings, help, version */}
      <div ref={dropdownRef} style={{ position: 'relative', padding: isCollapsed ? '14px 8px' : '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {showDropdown && (
          <div style={{ position: 'absolute', bottom: 'calc(100% - 6px)', left: '16px', right: isCollapsed ? 'auto' : '16px', width: isCollapsed ? '200px' : 'auto', background: '#0A1D42', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 200 }}>
            {onChangePassword && (
              <button type="button" onClick={() => { setShowDropdown(false); onChangePassword() }} style={menuItemStyle}
                onMouseEnter={e => { e.currentTarget.style.background = SB.hover }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                <FiLock size={16} /> Change Password
              </button>
            )}
            <button type="button" onClick={onLogout} style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = SB.hover }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
              <FiLogOut size={16} /> Sign Out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          title={isCollapsed ? displayName : undefined}
          className="pms-focus"
          aria-expanded={showDropdown}
          style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#ffffff', marginBottom: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.background = SB.hover }} onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '10px', minWidth: 0 }}>
            <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: SB.steel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>{initial}</span>
            {!isCollapsed && (
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{userEmail}</span>
              </span>
            )}
          </span>
          {!isCollapsed && <FiChevronDown size={16} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.6)', transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
        </button>

        {onSettings && <NavItem icon={FiSettings} label="Settings" collapsed={isCollapsed} onClick={onSettings} />}
        <NavItem icon={FiHeadphones} label="Help & Support" collapsed={isCollapsed} onClick={onHelp} />
        {!isCollapsed && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', padding: '6px 0 0 14px' }}>v1.0.0</div>
        )}
      </div>
    </aside>
  )
}
