import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiMenu, FiMinus, FiLogOut, FiChevronDown, FiChevronRight, FiLock } from 'react-icons/fi'

export default function ExpandableSidebar({ roleName, roleLetter, companyName = 'Insight PMS', activeId, sections, onLogout, onChangePassword }) {
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const dropdownRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-expand parent items that contain the active child on mount/activeId change
  const [expandedItems, setExpandedItems] = useState(() => {
    const expanded = {}
    sections.forEach(section => {
      section.links.forEach(link => {
        if (link.children) {
          const hasActiveChild = link.children.some(child => child.id === activeId)
          if (hasActiveChild) expanded[link.id] = true
        }
      })
    })
    return expanded
  })

  useEffect(() => {
    setExpandedItems(prev => {
      const next = { ...prev }
      sections.forEach(section => {
        section.links.forEach(link => {
          if (link.children) {
            const hasActiveChild = link.children.some(child => child.id === activeId)
            if (hasActiveChild) next[link.id] = true
          }
        })
      })
      return next
    })
  }, [activeId])

  function toggleExpand(id) {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Retrieve user email from session storage, fallback based on role
  const userEmail = sessionStorage.getItem('sa_email') || `${roleName.toLowerCase().replace(/\s+/g, '')}@insighthcm.in`
  
  // Format display name nicely
  const displayName = userEmail
    .split('@')[0]
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter sections and links based on search query
  const filteredSections = sections.map(section => {
    const filteredLinks = section.links.filter(link => {
      const matchLabel = link.label.toLowerCase().includes(searchQuery.toLowerCase())
      const matchChildren = link.children && link.children.some(child => child.label.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchLabel || matchChildren
    })
    return { ...section, links: filteredLinks }
  }).filter(section => section.links.length > 0)

  const styles = {
    aside: {
      width: isCollapsed ? '76px' : '280px',
      minWidth: isCollapsed ? '76px' : '280px',
      background: 'var(--sidebar-bg, #161616)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0px',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      userSelect: 'none',
      zIndex: 100,
      color: '#ffffff',
      boxSizing: 'border-box',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isCollapsed ? 'center' : 'space-between',
      padding: isCollapsed ? '20px 0' : '20px 18px 16px',
      background: '#161616',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      flexShrink: 0,
    },
    brandArea: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      overflow: 'hidden',
      minWidth: 0,
      flex: 1,
    },
    brandLogo: {
      height: '42px',
      width: 'auto',
      maxWidth: '185px',
      objectFit: 'contain',
      display: 'block',
    },
    hamburger: {
      cursor: 'pointer',
      color: 'rgba(255, 255, 255, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      flexShrink: 0,
      transition: 'color 0.2s, background 0.2s',
    },
    searchContainer: {
      padding: '16px 16px 8px',
      display: isCollapsed ? 'none' : undefined,
    },
    searchBox: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      color: 'rgba(255, 255, 255, 0.45)',
      pointerEvents: 'none',
      width: '16px',
      height: '16px',
    },
    searchInput: {
      width: '100%',
      height: '38px',
      padding: '0 45px 0 36px',
      background: '#242426',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '13.5px',
      outline: 'none',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      transition: 'background 0.2s, border-color 0.2s',
    },
    shortcutBadge: {
      position: 'absolute',
      right: '10px',
      background: '#3f3f46',
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '10px',
      fontWeight: '600',
      padding: '2px 5px',
      borderRadius: '4px',
      pointerEvents: 'none',
    },
    nav: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: isCollapsed ? '4px' : '22px',
      padding: isCollapsed ? '12px 8px 24px' : '16px 16px 20px',
      overflowY: 'auto',
      overflowX: 'hidden',
    },
    sectionGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '2px 8px 6px',
    },
    sectionTitle: {
      fontSize: '11px',
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.45)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    sectionMinus: {
      color: 'rgba(255, 255, 255, 0.25)',
      fontSize: '10px',
    },
    linkButton: (isActive, isSoon) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: isCollapsed ? 'center' : 'space-between',
      width: '100%',
      padding: isCollapsed ? '10px' : '10.5px 14px',
      margin: '1px 0',
      background: isActive ? 'var(--navbar-active-gradient, linear-gradient(135deg, #D01021 0%, #B40619 100%))' : 'none',
      border: 'none',
      borderRadius: '10px',
      boxShadow: isActive ? '0 4px 14px rgba(208, 16, 33, 0.4)' : 'none',
      cursor: isSoon ? 'default' : 'pointer',
      fontSize: '14px',
      fontWeight: isActive ? '600' : '400',
      color: isActive ? '#ffffff' : isSoon ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.85)',
      textAlign: 'left',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
    }),
    linkInner: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    badge: {
      background: '#C2071A',
      color: '#ffffff',
      fontSize: '10.5px',
      fontWeight: '700',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(194, 7, 26, 0.5)',
      flexShrink: 0,
    },
    soonBadge: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '9px',
      fontWeight: '700',
      padding: '2px 6px',
      borderRadius: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    footer: {
      padding: '14px 16px',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      position: 'relative',
      background: '#161616',
    },
    profileCard: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'none',
      border: 'none',
      borderRadius: '10px',
      padding: '8px 10px',
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    profileLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      overflow: 'hidden',
    },
    avatarCircle: {
      width: '34px',
      height: '34px',
      borderRadius: '50%',
      background: '#C2071A',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '700',
      flexShrink: 0,
      boxShadow: '0 2px 8px rgba(194, 7, 26, 0.4)',
    },
    profileInfo: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    profileName: {
      fontSize: '13.5px',
      fontWeight: '600',
      color: '#ffffff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    profileEmail: {
      fontSize: '11.5px',
      color: 'rgba(255, 255, 255, 0.55)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      marginTop: '1px',
    },
    profileMore: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '16px',
    },
    dropdown: {
      position: 'absolute',
      bottom: '64px',
      left: '16px',
      right: '16px',
      background: '#242426',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      display: showDropdown ? 'block' : 'none',
      zIndex: 200,
    },
    dropdownItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      padding: '12px 16px',
      background: 'none',
      border: 'none',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: '600',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'background 0.2s',
      fontFamily: 'inherit',
    },
    childGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginTop: '4px',
      marginLeft: '12px',
      paddingLeft: '14px',
      borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
    },
    childLinkButton: (isActive, isSoon) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '8.5px 12px',
      background: isActive ? 'var(--navbar-active-gradient, linear-gradient(135deg, #D01021 0%, #B40619 100%))' : 'none',
      border: 'none',
      borderRadius: '8px',
      boxShadow: isActive ? '0 2px 10px rgba(208, 16, 33, 0.35)' : 'none',
      cursor: isSoon ? 'default' : 'pointer',
      fontSize: '13px',
      fontWeight: isActive ? '600' : '400',
      color: isActive ? '#ffffff' : isSoon ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.75)',
      textAlign: 'left',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
    }),
    parentLinkButton: (isExpanded, hasActiveChild) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: isCollapsed ? 'center' : 'space-between',
      width: '100%',
      padding: isCollapsed ? '10px' : '10.5px 14px',
      background: hasActiveChild ? 'rgba(255, 255, 255, 0.08)' : 'none',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: hasActiveChild ? '600' : '400',
      color: hasActiveChild ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
      textAlign: 'left',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
    }),
  }

  const handleMouseEnterButton = (e, isActive, isSoon) => {
    if (isSoon) return
    if (!isActive) {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
      e.currentTarget.style.color = '#ffffff'
    }
  }

  const handleMouseLeaveButton = (e, isActive, isSoon) => {
    if (isSoon) return
    if (!isActive) {
      e.currentTarget.style.background = 'none'
      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'
    }
  }

  const handleMouseEnterProfile = (e) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
  }

  const handleMouseLeaveProfile = (e) => {
    e.currentTarget.style.background = 'none'
  }

  const handleMouseEnterDropdownItem = (e) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
  }

  const handleMouseLeaveDropdownItem = (e) => {
    e.currentTarget.style.background = 'none'
  }

  return (
    <aside className="no-scrollbar" style={styles.aside}>
      {/* Header */}
      <div style={styles.header}>
        {isCollapsed ? (
          <button
            style={styles.hamburger}
            onClick={() => setIsCollapsed(false)}
            title="Expand sidebar"
            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            <img src="/insight-tech-icon.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </button>
        ) : (
          <>
            <div style={styles.brandArea}>
              <img src="/insight-tech-logo-white.png" alt="Insight Tech Logo" style={styles.brandLogo} />
            </div>
            <button
              style={styles.hamburger}
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            >
              <FiMenu size={18} />
            </button>
          </>
        )}
      </div>

      {/* Search Bar matching mockup */}
      <div style={styles.searchContainer}>
        <div style={styles.searchBox}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            onFocus={(e) => {
              e.target.style.background = '#2a2a2d'
              e.target.style.borderColor = 'rgba(208, 16, 33, 0.5)'
            }}
            onBlur={(e) => {
              e.target.style.background = '#242426'
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            }}
          />
          <span style={styles.shortcutBadge}>⌘ K</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="no-scrollbar" style={styles.nav}>
        {filteredSections.map((section, sIndex) => (
          <div key={section.title || sIndex} style={styles.sectionGroup}>
            {section.title && !isCollapsed && (
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>{section.title}</span>
                <FiMinus style={styles.sectionMinus} />
              </div>
            )}
            
            {section.links.map(link => {
              const isActive = activeId === link.id
              const Icon = link.icon

              if (link.children) {
                const isExpanded = !!expandedItems[link.id]
                const hasActiveChild = link.children.some(c => c.id === activeId)

                return (
                  <div key={link.id}>
                    <button
                      onClick={() => isCollapsed ? setIsCollapsed(false) : toggleExpand(link.id)}
                      title={isCollapsed ? link.label : undefined}
                      style={styles.parentLinkButton(isExpanded, hasActiveChild)}
                      onMouseEnter={(e) => {
                        if (!hasActiveChild) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                          e.currentTarget.style.color = '#ffffff'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!hasActiveChild) {
                          e.currentTarget.style.background = 'none'
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'
                        }
                      }}
                    >
                      <div style={styles.linkInner}>
                        <Icon size={18} style={{ color: hasActiveChild ? '#ffffff' : 'rgba(255,255,255,0.7)', flexShrink: 0, width: 18, height: 18 }} />
                        {!isCollapsed && <span>{link.label}</span>}
                      </div>
                      {!isCollapsed && (isExpanded
                        ? <FiChevronDown size={15} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                        : <FiChevronRight size={15} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                      )}
                    </button>
                    {!isCollapsed && isExpanded && (
                      <div style={styles.childGroup}>
                        {link.children.map(child => {
                          const isChildActive = activeId === child.id
                          const ChildIcon = child.icon
                          return (
                            <button
                              key={child.id}
                              onClick={() => child.path && !child.soon && navigate(child.path)}
                              disabled={!child.path || child.soon}
                              style={styles.childLinkButton(isChildActive, child.soon)}
                              onMouseEnter={(e) => {
                                if (!isChildActive && !child.soon) {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                                  e.currentTarget.style.color = '#ffffff'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive && !child.soon) {
                                  e.currentTarget.style.background = 'none'
                                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'
                                }
                              }}
                            >
                              <div style={styles.linkInner}>
                                <ChildIcon size={16} style={{ color: isChildActive ? '#ffffff' : child.soon ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', flexShrink: 0, width: 16, height: 16 }} />
                                <span>{child.label}</span>
                              </div>
                              {child.soon && <span style={styles.soonBadge}>Soon</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <button
                  key={link.id}
                  onClick={() => link.path && navigate(link.path)}
                  disabled={!link.path}
                  title={isCollapsed ? link.label : undefined}
                  style={styles.linkButton(isActive, link.soon)}
                  onMouseEnter={(e) => handleMouseEnterButton(e, isActive, link.soon)}
                  onMouseLeave={(e) => handleMouseLeaveButton(e, isActive, link.soon)}
                  onFocus={(e) => handleMouseEnterButton(e, isActive, link.soon)}
                  onBlur={(e) => handleMouseLeaveButton(e, isActive, link.soon)}
                >
                  <div style={styles.linkInner}>
                    <Icon size={18} style={{ color: isActive ? '#ffffff' : link.soon ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', flexShrink: 0, width: 18, height: 18 }} />
                    {!isCollapsed && <span>{link.label}</span>}
                  </div>

                  {!isCollapsed && (link.soon ? (
                    <span style={styles.soonBadge}>Soon</span>
                  ) : link.badge ? (
                    <span style={styles.badge}>{link.badge}</span>
                  ) : null)}
                </button>
              )
            })}
          </div>
        ))}
        {filteredSections.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '20px' }}>
            No menus found
          </div>
        )}
      </nav>

      {/* Footer Profile Card */}
      <div style={styles.footer} ref={dropdownRef}>
        {/* Dropdown Popup */}
        <div style={styles.dropdown}>
          {onChangePassword && (
            <button
              onClick={() => { setShowDropdown(false); onChangePassword() }}
              style={styles.dropdownItem}
              onMouseEnter={handleMouseEnterDropdownItem}
              onMouseLeave={handleMouseLeaveDropdownItem}
            >
              <FiLock size={16} style={{ width: 16, height: 16 }} />
              <span>Change Password</span>
            </button>
          )}
          <button
            onClick={onLogout}
            style={styles.dropdownItem}
            onMouseEnter={handleMouseEnterDropdownItem}
            onMouseLeave={handleMouseLeaveDropdownItem}
          >
            <FiLogOut size={16} style={{ width: 16, height: 16 }} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Card */}
        <div
          style={{ ...styles.profileCard, outline: 'none', justifyContent: isCollapsed ? 'center' : 'space-between' }}
          tabIndex={0}
          onClick={() => setShowDropdown(!showDropdown)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setShowDropdown(!showDropdown)
            }
          }}
          onMouseEnter={handleMouseEnterProfile}
          onMouseLeave={handleMouseLeaveProfile}
          onFocus={handleMouseEnterProfile}
          onBlur={handleMouseLeaveProfile}
          title={isCollapsed ? displayName : undefined}
        >
          <div style={{ ...styles.profileLeft, gap: isCollapsed ? 0 : '10px' }}>
            <div style={styles.avatarCircle}>{roleLetter}</div>
            {!isCollapsed && (
              <div style={styles.profileInfo}>
                <span style={styles.profileName}>{displayName}</span>
                <span style={styles.profileEmail}>{userEmail}</span>
              </div>
            )}
          </div>
          {!isCollapsed && <FiMenu style={styles.profileMore} size={16} />}
        </div>
      </div>
    </aside>
  )
}


