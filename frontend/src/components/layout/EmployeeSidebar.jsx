import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FiKey,
  FiHome,
  FiTarget,
  FiTrendingUp,
  FiClock,
  FiCalendar,
  FiCreditCard,
  FiActivity,
  FiGift,
  FiCheckSquare,
  FiClipboard,
  FiUsers,
  FiLock,
  FiFileText
} from 'react-icons/fi'
import ExpandableSidebar from './ExpandableSidebar'
import { useModules } from '../../hooks/useModules'

const iconMap = {
  '🔑': FiKey,
  '🏠': FiHome,
  '🎯': FiTarget,
  '📊': FiTrendingUp,
  '🕐': FiClock,
  '🗓️': FiCalendar,
  '₹': FiCreditCard,
  '📈': FiActivity,
  '🎉': FiGift,
  '📝': FiCheckSquare,
  '📋': FiClipboard,
  '👥': FiUsers,
  '📅': FiClock,
  '🔒': FiLock,
  '⏰': FiClock,
  '📄': FiFileText
}

export default function EmployeeSidebar({ active }) {
  const navigate = useNavigate()
  const { isEnabled } = useModules()
  const userRole = sessionStorage.getItem('user_role') || 'employee'
  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const displayRole = userRole.replace('_', ' ')
  const [companyName, setCompanyName] = useState(
    sessionStorage.getItem('company_name') || 'Insight PMS'
  )

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    if (!token) return
    axios.get('/api/settings/company-name', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const name = res.data?.name
        if (name) {
          setCompanyName(name)
          sessionStorage.setItem('company_name', name)
        }
      })
      .catch(() => {})
  }, [])

  function handleLogout() {
    sessionStorage.clear()
    navigate('/login')
  }

  const leaveChildren = [
    { id: 'leave',          icon: '🗓️', label: 'Leave Overview',   path: '/employee/leave' },
    { id: 'leave-request',  icon: '📅', label: 'Leave Request',    path: '/employee/leave-request' },
    { id: 'holidays',       icon: '🎉', label: 'Holiday Calendar', path: '/employee/holidays' },
  ]
  if (isEnabled('leave') && (['manager', 'hr', 'client_admin'].includes(userRole) || sessionStorage.getItem('is_manager') === 'true')) {
    leaveChildren.push({ id: 'leave-approvals', icon: '📋', label: 'Leave Approvals', path: '/employee/leave-approvals' })
  }

  const baseLinks = [
    { id: 'dashboard',      icon: '🏠', label: 'Dashboard',        path: '/employee/dashboard' },
    { id: 'policies',       icon: '📄', label: 'Company Policies', path: '/employee/policies' },
    (isEnabled('goals') || isEnabled('performance')) && { id: 'performance', icon: '🎯', label: 'My Performance', path: '/employee/performance' },
    isEnabled('performance') && { id: 'pip', icon: '📈', label: 'My PIP', path: '/employee/pip' },
    isEnabled('attendance')  && { id: 'attendance',     icon: '🕐', label: 'My Attendance',    path: '/employee/attendance' },
    isEnabled('leave')       && {
      id: 'leave-management-group',
      icon: '🗓️',
      label: 'Leave Management',
      children: leaveChildren
    },
    isEnabled('attendance')  && { id: 'regularization', icon: '📝', label: 'Regularization',   path: '/employee/regularization' },
    isEnabled('payroll')     && { id: 'payroll',        icon: '₹',  label: 'My Payslips',      path: '/employee/payslips' },
    isEnabled('payroll')     && { id: 'overtime',       icon: '⏰', label: 'My Overtime',      path: '/employee/overtime' },
    { id: 'change-password', icon: '🔒', label: 'Change Password',  path: '/employee/change-password' },
  ].filter(Boolean)

  // Prepend Admin Dashboard link if user is client_admin or super_admin
  const links = [...baseLinks]
  // Manager splice operations removed as performance hub handles them.
  if (userRole === 'client_admin') {
    links.unshift({ id: 'admin-dashboard', icon: '🔑', label: 'Admin Panel', path: '/client-admin/dashboard' })
  } else if (userRole === 'super_admin') {
    links.unshift({ id: 'admin-dashboard', icon: '🔑', label: 'Admin Panel', path: '/dashboard' })
  }

  // Append Approvals link if role allows it
  if (['manager', 'hr', 'client_admin'].includes(userRole) || sessionStorage.getItem('is_manager') === 'true') {
    if (isEnabled('attendance')) {
      links.push({ id: 'regularization-approvals', icon: '📋', label: 'Regularization Approvals', path: '/employee/regularization-approvals' })
      links.push({ id: 'team-attendance', icon: '📅', label: 'Team Attendance', path: '/employee/team-attendance' })
    }
    if (isEnabled('payroll')) {
      links.push({ id: 'overtime-approvals', icon: '📋', label: 'Overtime Approvals', path: '/employee/overtime-approvals' })
    }
  }

  if (sessionStorage.getItem('is_manager') === 'true') {
    links.push({ id: 'team', icon: '👥', label: 'My Team', path: '/employee/team' })
  }

  // Map emojis to React Icons
  const processedLinks = links.map(link => {
    const icon = iconMap[link.icon] || FiHome
    if (link.children) {
      return {
        ...link,
        icon,
        children: link.children.map(child => ({
          ...child,
          icon: iconMap[child.icon] || FiHome
        }))
      }
    }
    return { ...link, icon }
  })

  const sections = [
    { title: 'Overview',      links: [] },
    { title: 'Performance',   links: [] },
    { title: 'Time & Leave',  links: [] },
    { title: 'Approvals',     links: [] },
    { title: 'Account',       links: [] },
  ]

  processedLinks.forEach(link => {
    if (link.id === 'admin-dashboard' || link.id === 'dashboard' || link.id === 'policies') {
      sections[0].links.push(link)
    } else if (link.id === 'team') {
      sections[0].links.push(link)
    } else if (['goals', 'appraisal', 'manager-goals', 'manager-appraisal', 'kpi-reviews', 'performance'].includes(link.id)) {
      sections[1].links.push(link)
    } else if (['attendance', 'leave-management-group', 'regularization', 'payroll'].includes(link.id)) {
      sections[2].links.push(link)
    } else if (['regularization-approvals', 'team-attendance'].includes(link.id)) {
      sections[3].links.push(link)
    } else if (link.id === 'change-password') {
      sections[4].links.push(link)
    } else {
      sections[0].links.push(link)
    }
  })

  const activeSections = sections.filter(s => s.links.length > 0)

  // Use dynamic role letter (first letter capitalized)
  const roleLetter = displayRole.charAt(0).toUpperCase() || 'E'

  return (
    <ExpandableSidebar
      roleName={displayRole}
      roleLetter={roleLetter}
      companyName={companyName}
      activeId={active}
      sections={activeSections}
      onLogout={handleLogout}
    />
  )
}

