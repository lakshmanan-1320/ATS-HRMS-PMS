import React, { useEffect, useState } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>{title}</div>
      {children}
    </div>
  )
}

export default function MyProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/employee/me')
      .then(res => {
        setProfile(res.data)
        if (res.data) sessionStorage.setItem('employee_name', `${res.data.first_name} ${res.data.last_name}`)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
      <EmployeeSidebar active="profile" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="My Profile" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>My Profile</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Your personal and work information</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px', fontSize: '14px' }}>Loading profile...</div>
        ) : !profile ? (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '14px' }}>
            Failed to load profile. Please refresh.
          </div>
        ) : (
          <div style={{ maxWidth: '700px' }}>
            {/* Header card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: profile.is_manager ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
                {profile.is_manager ? '👔' : '👤'}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{profile.first_name} {profile.last_name}</div>
                <div style={{ fontSize: '13px', color: '#6366f1', marginTop: '3px' }}>{profile.designation}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    {profile.employee_code}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: profile.is_manager ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.1)', color: profile.is_manager ? '#059669' : '#0284c7' }}>
                    {profile.is_manager ? 'Manager' : 'Employee'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: profile.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color: profile.status === 'active' ? '#059669' : '#ef4444' }}>
                    {profile.status}
                  </span>
                </div>
              </div>
            </div>

            <Section title="Work Information">
              <InfoRow label="Department" value={profile.department_name} />
              <InfoRow label="Designation" value={profile.designation} />
              <InfoRow label="Hierarchy Level" value={profile.level_name} />
              <InfoRow label="Employment Type" value={profile.employment_type} />
              <InfoRow label="Date of Joining" value={fmtDate(profile.date_of_joining)} />
              {profile.direct_reports_count > 0 && (
                <InfoRow label="Direct Reports" value={`${profile.direct_reports_count} employee(s)`} />
              )}
            </Section>

            <Section title="Contact Information">
              <InfoRow label="Email Address" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="Gender" value={profile.gender} />
            </Section>

            {profile.manager_first_name && (
              <Section title="Reporting Manager">
                <InfoRow label="Name" value={`${profile.manager_first_name} ${profile.manager_last_name}`} />
                <InfoRow label="Email" value={profile.manager_email} />
                <InfoRow label="Designation" value={profile.manager_designation} />
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  </div>
  )
}
