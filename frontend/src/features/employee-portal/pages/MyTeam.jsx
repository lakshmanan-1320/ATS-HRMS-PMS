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

export default function MyTeam() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const isManager = sessionStorage.getItem('is_manager') === 'true'

  useEffect(() => {
    if (!isManager) { setLoading(false); return }
    api.get('/employee/my-team')
      .then(res => setTeam(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isManager])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
      <EmployeeSidebar active="team" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="My Team" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>My Team</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Your direct reports</p>
        </div>

        {!isManager ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            You don't have any direct reports
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px', fontSize: '14px' }}>Loading team...</div>
        ) : team.length === 0 ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No direct reports found
          </div>
        ) : (
          <>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              {team.length} direct report{team.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {team.map(member => (
                <div key={member.id} style={{
                  background: '#ffffff', border: '1px solid #e2e8f0',
                  borderRadius: '12px', padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                      background: member.is_manager ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    }}>
                      {member.is_manager ? '👔' : '👤'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                        {member.first_name} {member.last_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{member.designation}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Department</span>
                      <span style={{ color: '#1e293b', fontWeight: '500' }}>{member.department_name || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Level</span>
                      <span style={{ color: '#1e293b', fontWeight: '500' }}>{member.level_name || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Employee Code</span>
                      <span style={{ color: '#1e293b', fontWeight: '500' }}>{member.employee_code}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Email</span>
                      <span style={{ color: '#6366f1', fontWeight: '500' }}>{member.email}</span>
                    </div>
                  </div>
                  {member.is_manager && (
                    <div style={{ marginTop: '10px', padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', fontSize: '11px', color: '#059669', fontWeight: '600', textAlign: 'center' }}>
                      Also a Manager
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  </div>
  )
}
