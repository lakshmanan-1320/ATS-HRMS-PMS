import React from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationDropdown from '../shared/NotificationDropdown'
import { clearModuleCache } from '../../hooks/useModules'
import PmsTopBar from './PmsTopBar'

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
  const fullName = sessionStorage.getItem('employee_name') || ''
  const emailName = userEmail
    ? userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Employee'
  const displayName = (fullName.trim().split(/\s+/)[0]) || emailName
  const userRole = sessionStorage.getItem('user_role') || 'employee'
  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const roleLabel = isManager && userRole === 'employee'
    ? 'Manager'
    : userRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  function handleLogout() {
    clearModuleCache()
    sessionStorage.clear()
    navigate('/login')
  }

  return (
    <PmsTopBar
      title={title}
      searchItems={SEARCHABLE_ITEMS}
      displayName={displayName}
      fullName={fullName}
      userEmail={userEmail}
      roleLabel={roleLabel}
      homePath="/employee/dashboard"
      calendarPath="/employee/holidays"
      calendarTitle="Holiday calendar"
      prefsPath="/employee/profile"
      prefsTitle="My profile & preferences"
      changePasswordPath="/employee/change-password"
      onLogout={handleLogout}
      notificationSlot={<NotificationDropdown role={isManager ? 'manager' : userRole} variant="pms" />}
    />
  )
}
