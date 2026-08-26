import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FiHome,
  FiMap,
  FiFolder,
  FiGitMerge,
  FiUsers,
  FiTarget,
  FiActivity,
  FiTrendingUp,
  FiClock,
  FiCalendar,
  FiGift,
  FiCheckSquare,
  FiCreditCard,
  FiClipboard,
  FiSettings,
  FiLock,
  FiShield,
  FiGrid,
  FiFileText
} from 'react-icons/fi'
import ExpandableSidebar from './ExpandableSidebar'
import { useModules } from '../../hooks/useModules'

export default function ClientAdminSidebar({ active }) {
  const { isEnabled } = useModules()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState(
    sessionStorage.getItem('company_name') || 'Client Admin'
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

  const performanceLinks = [
    (isEnabled('goals') || isEnabled('performance')) && {
      id: 'performance',
      icon: FiTarget,
      label: 'Performance Hub',
      path: '/client-admin/performance'
    },
    isEnabled('performance') && {
      id: 'bell-curve',
      icon: FiTrendingUp,
      label: 'Bell Curve Calibration',
      path: '/client-admin/bell-curve'
    },
      isEnabled('performance') && {
    id: 'nine-box',
    icon: FiGrid,
    label: '9-Box Grid',
    path: '/client-admin/nine-box'
  },
    isEnabled('performance') && {
      id: 'pip',
      icon: FiActivity,
      label: 'Performance PIP',
      path: '/client-admin/pip'
    }
  ].filter(Boolean)

  const attendanceLeaveLinks = [
    isEnabled('attendance') && {
      id: 'attendance-group',
      icon: FiClock,
      label: 'Attendance',
      children: [
        { id: 'attendance-dashboard', icon: FiActivity, label: 'Dashboard', path: '/client-admin/attendance/dashboard' },
        { id: 'attendance-tracking', icon: FiUsers, label: 'Attendance Tracking', path: '/client-admin/attendance/tracking' },
        { id: 'attendance-policies', icon: FiSettings, label: 'Attendance Policies', path: '/client-admin/attendance/policies' },
        { id: 'office-locations', icon: FiMap, label: 'Office Locations', path: '/client-admin/attendance/office-locations' },
        { id: 'shifts-schedules', icon: FiClock, label: 'Shifts & Schedules', path: '/client-admin/attendance/shifts-schedules' },
        { id: 'attendance-reports', icon: FiClipboard, label: 'Reports', path: '/client-admin/attendance/reports' },
      ]
    },
    isEnabled('leave') && {
      id: 'leave-management-group',
      icon: FiCalendar,
      label: 'Leave Management',
      children: [
        { id: 'leave',          icon: FiCalendar,    label: 'Leave Types',      path: '/client-admin/leave' },
        { id: 'leave-plans',    icon: FiCalendar,    label: 'Leave Plans',      path: '/client-admin/leave/plans' },
        { id: 'leave-settings', icon: FiSettings,    label: 'Leave Settings',   path: '/client-admin/leave-settings' },
        { id: 'leave-approvals',icon: FiCheckSquare, label: 'Leave Approvals',  path: '/client-admin/leave-approvals' },
        { id: 'holidays',       icon: FiGift,        label: 'Holiday Calendar', path: '/client-admin/holidays' },
      ]
    },
    isEnabled('attendance') && { id: 'regularizations',icon: FiCheckSquare, label: 'Regularization',     path: '/client-admin/regularizations' },
    isEnabled('attendance') && { id: 'permissions',    icon: FiShield,      label: 'Permissions',        path: '/client-admin/permissions' },
  ].filter(Boolean)

  const payrollLinks = [
    isEnabled('payroll') && { id: 'payroll',  icon: FiCreditCard, label: 'Payroll',  path: '/client-admin/payroll' },
    isEnabled('payroll') && { id: 'reports',  icon: FiClipboard,  label: 'Reports',  path: '/client-admin/reports' },
  ].filter(Boolean)

  const sections = [
    {
      title: 'Overview',
      links: [
        { id: 'dashboard', icon: FiHome,     label: 'Dashboard', path: '/client-admin/dashboard' },
        { id: 'org-chart', icon: FiMap,      label: 'Org Chart', path: '/client-admin/org-chart' },
      ]
    },
    {
      title: 'Organization',
      links: [
        { id: 'departments', icon: FiFolder,   label: 'Departments',      path: '/client-admin/departments' },
        { id: 'hierarchy',   icon: FiGitMerge, label: 'Hierarchy Levels', path: '/client-admin/hierarchy' },
        { id: 'employees',   icon: FiUsers,    label: 'Employees',        path: '/client-admin/employees' },
        { id: 'policies',    icon: FiFileText, label: 'HR Policies',      path: '/client-admin/policies' },
      ]
    },
    ...(performanceLinks.length > 0       ? [{ title: 'Performance',      links: performanceLinks       }] : []),
    ...(attendanceLeaveLinks.length > 0   ? [{ title: 'Attendance & Leave', links: attendanceLeaveLinks }] : []),
    ...(payrollLinks.length > 0           ? [{ title: 'Payroll',           links: payrollLinks           }] : []),
    {
      title: 'Account',
      links: [
        { id: 'audit',           icon: FiClipboard, label: 'Audit Logs',      path: '/client-admin/audit' },
        { id: 'change-password', icon: FiLock,      label: 'Change Password', path: '/client-admin/change-password' },
      ]
    }
  ]

  return (
    <ExpandableSidebar
      roleName="Client Admin"
      roleLetter="C"
      companyName={companyName}
      activeId={active}
      sections={sections}
      onLogout={handleLogout}
    />
  )
}
