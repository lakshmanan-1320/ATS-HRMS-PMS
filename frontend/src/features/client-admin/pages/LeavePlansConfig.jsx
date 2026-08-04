import React, { useState } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { FiCalendar, FiSliders, FiUsers, FiClock, FiActivity } from 'react-icons/fi'
import LeavePlansList from './LeavePlansList.jsx'
import LeavePlanDetails from './LeavePlanDetails.jsx'
import LeaveBalancesGrid from './LeaveBalancesGrid.jsx'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeavePlansConfig() {
  const [activeTab, setActiveTab] = useState('plans')
  const [selectedPlan, setSelectedPlan] = useState(null)
  
  // Accrual form fields
  const defaultPeriod = new Date().toISOString().slice(0, 7) // "YYYY-MM"
  const [accrualPeriod, setAccrualPeriod] = useState(defaultPeriod)
  const [runningAccrual, setRunningAccrual] = useState(false)
  const [accrualSuccess, setAccrualSuccess] = useState('')
  const [accrualError, setAccrualError] = useState('')

  const handleRunAccrualsSubmit = (e) => {
    e.preventDefault()
    setAccrualSuccess('')
    setAccrualError('')

    if (!accrualPeriod) return setAccrualError('Accrual period (YYYY-MM) is required.')
    if (!/^\d{4}-\d{2}$/.test(accrualPeriod)) return setAccrualError('Invalid period format. Use YYYY-MM.')

    if (!window.confirm(`Are you sure you want to run accruals for the period: ${accrualPeriod}?`)) return

    setRunningAccrual(true)
    api.post('/v1/leave/admin/run-accruals', { period: accrualPeriod })
      .then(res => {
        setAccrualSuccess(res.data?.message || 'Accruals processed successfully!')
      })
      .catch(err => {
        setAccrualError(err.response?.data?.message || 'Failed to process accruals.')
      })
      .finally(() => setRunningAccrual(false))
  }

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan)
  }

  const handleBackToPlans = () => {
    setSelectedPlan(null)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="leave-plans" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Main Page Header */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiSliders size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Leave Administration</h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Manage custom plans, assignments, adjustments, and accrual runs.
              </p>
            </div>
          </div>

          {/* Master Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
            {[
              { key: 'plans', label: 'Leave Plans', icon: <FiCalendar size={13} /> },
              { key: 'balances', label: 'Employee Balances', icon: <FiUsers size={13} /> },
              { key: 'accruals', label: 'Run Accruals', icon: <FiClock size={13} /> }
            ].map(t => {
              const isAct = activeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key)
                    if (t.key === 'plans') setSelectedPlan(null) // reset selection when changing tabs
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', background: 'none',
                    border: 'none', borderBottom: `2.5px solid ${isAct ? '#6366f1' : 'transparent'}`,
                    color: isAct ? '#6366f1' : '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Tab Contents */}
          <div>
            {activeTab === 'plans' && (
              selectedPlan ? (
                <LeavePlanDetails plan={selectedPlan} onBack={handleBackToPlans} />
              ) : (
                <LeavePlansList onSelectPlan={handleSelectPlan} />
              )
            )}

            {activeTab === 'balances' && (
              <LeaveBalancesGrid />
            )}

            {activeTab === 'accruals' && (
              <div style={{ maxWidth: '600px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Process Leave Accruals</h3>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
                    Trigger the accrual engine to credit monthly or quarterly leave quotas for all assigned employees.
                  </p>

                  <form onSubmit={handleRunAccrualsSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accrual Period (YYYY-MM)</label>
                      <input
                        style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', fontWeight: '600' }}
                        type="month"
                        value={accrualPeriod}
                        onChange={e => setAccrualPeriod(e.target.value)}
                      />
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                        Accruals run automatically checks for duplicate transactions to prevent multiple allocations for the same month.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', marginBottom: '20px' }}>
                      <FiActivity size={14} color="#4f46e5" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: '11px', color: '#4338ca', lineHeight: '16px' }}>
                        This will calculate fractional credits (e.g. <code>quota_days / 12</code> for Monthly, or <code>quota_days / 4</code> for Quarterly) and post them directly to each employee's transaction ledger.
                      </span>
                    </div>

                    {accrualSuccess && (
                      <div style={{ color: '#15803d', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        ✓ {accrualSuccess}
                      </div>
                    )}

                    {accrualError && (
                      <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        ⚠️ {accrualError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={runningAccrual}
                      style={{
                        width: '100%', padding: '12px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff',
                        cursor: runningAccrual ? 'not-allowed' : 'pointer',
                        background: runningAccrual ? '#cbd5e1' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                        boxShadow: runningAccrual ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {runningAccrual ? 'Executing Accruals…' : 'Execute Accrual Run'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
