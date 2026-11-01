import React, { useState } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import { FiCalendar, FiSliders, FiUsers, FiClock, FiActivity, FiCheck, FiAlertCircle } from 'react-icons/fi'
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
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#F1F4F8', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ClientAdminSidebar active="leave-plans" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          
          {/* Main Page Header */}
          <PageHeader
            icon={FiSliders}
            title="Leave Administration"
            subtitle="Manage custom plans, assignments, adjustments, and accrual runs."
          />

          {/* Master Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E3E7EE', marginBottom: '24px' }}>
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
                    border: 'none', borderBottom: `2.5px solid ${isAct ? '#0466C8' : 'transparent'}`,
                    color: isAct ? '#0466C8' : '#7D8597', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
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
              <div style={{ width: '100%' }}>
                <div style={{ background: '#fff', border: '1px solid #E3E7EE', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800', color: '#001233' }}>Process Leave Accruals</h3>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#7D8597' }}>
                    Trigger the accrual engine to credit monthly or quarterly leave quotas for all assigned employees.
                  </p>

                  <form onSubmit={handleRunAccrualsSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#33415C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accrual Period (YYYY-MM)</label>
                      <input
                        style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', color: '#001233', outline: 'none', fontWeight: '600' }}
                        type="month"
                        value={accrualPeriod}
                        onChange={e => setAccrualPeriod(e.target.value)}
                      />
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                        Accruals run automatically checks for duplicate transactions to prevent multiple allocations for the same month.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: '#EEF8FF', border: '1px solid #C9DDF3', borderRadius: '10px', marginBottom: '20px' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #0466C8 0%, #0466C8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <FiActivity size={12} color="#ffffff" />
                      </div>
                      <span style={{ fontSize: '11px', color: '#001233', lineHeight: '16px' }}>
                        This will calculate fractional credits (e.g. <code>quota_days / 12</code> for Monthly, or <code>quota_days / 4</code> for Quarterly) and post them directly to each employee's transaction ledger.
                      </span>
                    </div>

                    {accrualSuccess && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#15803d', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #15803d 0%, #15803d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FiCheck size={11} color="#ffffff" />
                        </div>
                        {accrualSuccess}
                      </div>
                    )}

                    {accrualError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FiAlertCircle size={11} color="#ffffff" />
                        </div>
                        {accrualError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={runningAccrual}
                      style={{
                        padding: '12px 28px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff',
                        cursor: runningAccrual ? 'not-allowed' : 'pointer',
                        background: runningAccrual ? '#E3E7EE' : 'linear-gradient(135deg,#0466C8,#023E7D)',
                        boxShadow: runningAccrual ? 'none' : '0 4px 14px rgba(4, 102, 200,0.35)',
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
