import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FiHome, FiUsers, FiBriefcase, FiMail, FiLayers,
  FiClipboard, FiSettings, FiBell, FiKey, FiClock, FiShield, FiLock
} from 'react-icons/fi'
import ExpandableSidebar from './ExpandableSidebar'

export default function Sidebar({ active }) {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState(
    sessionStorage.getItem('sa_company_name') || 'Insight PMS'
  )

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    if (!token) return
    axios.get('/api/super-admin/company', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const name = res.data?.name
        if (name) {
          setCompanyName(name)
          sessionStorage.setItem('sa_company_name', name)
        }
      })
      .catch(() => {})
  }, [])

  function handleLogout() {
    sessionStorage.clear()
    navigate('/login')
  }

  function handleChangePassword() {
    navigate('/settings/change-password')
  }

  const sections = [
    {
      title: 'Overview',
      links: [
        { id: 'dashboard', icon: FiHome, label: 'Home', path: '/dashboard' }
      ]
    },
    {
      title: 'Tenant Management',
      links: [
        { id: 'companies',     icon: FiBriefcase, label: 'Companies',     path: '/settings/companies' },
        { id: 'client-admins', icon: FiUsers,     label: 'Client Admins', path: '/settings/client-admins' },
      ]
    },
    {
      title: 'Platform Modules',
      links: [
        { id: 'modules', icon: FiLayers, label: 'Module Management', path: '/settings/modules' },
      ]
    },
    {
      title: 'System Settings',
      links: [
        {
          id: 'settings-group',
          icon: FiSettings,
          label: 'Settings',
          path: null,
          children: [
            { id: 'smtp',            icon: FiMail,      label: 'SMTP / Email Settings',     path: '/settings/smtp' },
            { id: 'security',        icon: FiShield,    label: 'Security & Authentication', path: '/settings/security' },
            { id: 'password-policy', icon: FiKey,       label: 'Password Policy',           path: '/settings/password-policy' },
            { id: 'session',         icon: FiClock,     label: 'Session & Timeout',         path: '/settings/session-timeout' },
            { id: 'notifications',   icon: FiBell,      label: 'Notification Settings',     path: '/settings/notifications' },
            { id: 'audit',           icon: FiClipboard, label: 'Audit Log Settings',        path: '/settings/audit' },
          ]
        }
      ]
    },
    {
      title: 'Account',
      links: [
        { id: 'change-password', icon: FiLock, label: 'Change Password', path: '/settings/change-password' }
      ]
    }
  ]

  return (
    <ExpandableSidebar
      roleName="Super Admin"
      roleLetter="S"
      companyName={companyName}
      activeId={active}
      sections={sections}
      onLogout={handleLogout}
      onChangePassword={handleChangePassword}
    />
  )
}
