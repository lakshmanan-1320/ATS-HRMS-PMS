import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const EVENTS = [
  {
    key: 'leave_submitted',
    label: 'Leave Request Submitted',
    description: 'Notify manager when an employee submits a leave request.',
    trigger: 'Employee',
    recipient: 'Manager',
    category: 'Leave',
    icon: '🏖️',
  },
  {
    key: 'leave_decision',
    label: 'Leave Approved / Rejected',
    description: 'Notify employee when their leave request is approved or rejected.',
    trigger: 'Manager',
    recipient: 'Employee',
    category: 'Leave',
    icon: '✅',
  },
  {
    key: 'regularization_submitted',
    label: 'Regularization Request Submitted',
    description: 'Notify manager when an employee submits an attendance regularization request.',
    trigger: 'Employee',
    recipient: 'Manager',
    category: 'Attendance',
    icon: '🕐',
  },
  {
    key: 'regularization_decision',
    label: 'Regularization Approved / Rejected',
    description: 'Notify employee when their regularization request is approved or rejected.',
    trigger: 'Manager',
    recipient: 'Employee',
    category: 'Attendance',
    icon: '📋',
  },
  {
    key: 'appraisal_cycle_opened',
    label: 'Appraisal Cycle Opened',
    description: 'Notify all employees when a new appraisal cycle becomes active.',
    trigger: 'Client Admin',
    recipient: 'All Employees',
    category: 'Performance',
    icon: '⭐',
  },
  {
    key: 'goal_submitted',
    label: 'Goal Submitted for Approval',
    description: 'Notify manager when an employee submits a goal for approval.',
    trigger: 'Employee',
    recipient: 'Manager',
    category: 'Performance',
    icon: '📨',
  },
  {
    key: 'goal_deadline_reminder',
    label: 'Goal Deadline Approaching (3 days)',
    description: 'Remind employees when a goal is due in 3 days.',
    trigger: 'Scheduled Job',
    recipient: 'Employee',
    category: 'Performance',
    icon: '🎯',
  },
  {
    key: 'payroll_processed',
    label: 'Payroll Processed',
    description: 'Notify employees when their payslip is ready.',
    trigger: 'Client Admin',
    recipient: 'Employee',
    category: 'Payroll',
    icon: '💰',
  },
]

const TRIGGER_CONFIG = {
  'Employee':      { bg: '#ede9fe', color: '#6d28d9', dot: '#7c3aed' },
  'Manager':       { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
  'Client Admin':  { bg: '#fef9c3', color: '#a16207', dot: '#ca8a04' },
  'Scheduled Job': { bg: '#e0f2fe', color: '#0369a1', dot: '#0284c7' },
}

const CATEGORY_CONFIG = {
  'Leave':       { color: '#6366f1', bg: '#eef2ff', icon: '🏖️' },
  'Attendance':  { color: '#0891b2', bg: '#ecfeff', icon: '🕐' },
  'Performance': { color: '#059669', bg: '#ecfdf5', icon: '⭐' },
  'Payroll':     { color: '#d97706', bg: '#fffbeb', icon: '💰' },
}

const RECIPIENT_ICONS = {
  'Manager': '👔',
  'Employee': '👤',
  'All Employees': '👥',
}

const CATEGORIES = [...new Set(EVENTS.map(e => e.category))]

export default function NotificationSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, type: 'success', msg: '' })
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    api.get('/super-admin/notification-settings')
      .then(r => setSettings(r.data || {}))
      .catch(() => showToast('error', 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(key) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleAll(keys, value) {
    setSettings(prev => {
      const next = { ...prev }
      keys.forEach(k => { next[k] = value })
      return next
    })
  }

  function save() {
    setSaving(true)
    api.put('/super-admin/notification-settings', settings)
      .then(() => showToast('success', 'Settings saved successfully'))
      .catch(() => showToast('error', 'Failed to save settings'))
      .finally(() => setSaving(false))
  }

  function showToast(type, msg) {
    setToast({ show: true, type, msg })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  const allEvents = EVENTS
  const filteredCategories = filter === 'All' ? CATEGORIES : [filter]
  const enabledCount = EVENTS.filter(ev => settings[ev.key]).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="notifications" />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: '36px 40px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'rgba(99,102,241,0.15)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-60px', right: '160px',
            width: '140px', height: '140px', borderRadius: '50%',
            background: 'rgba(99,102,241,0.08)', pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                }}>🔔</div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.3px' }}>
                    Notification Settings
                  </h1>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Control which email notifications are sent for each system event
                  </p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: 'Total', value: EVENTS.length, color: '#94a3b8' },
                { label: 'Enabled', value: enabledCount, color: '#4ade80' },
                { label: 'Disabled', value: EVENTS.length - enabledCount, color: '#f87171' },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  textAlign: 'center',
                  minWidth: '72px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 40px 40px' }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {['All', ...CATEGORIES].map(cat => {
              const catCfg = CATEGORY_CONFIG[cat]
              const isActive = filter === cat
              const catEvents = cat === 'All' ? EVENTS : EVENTS.filter(e => e.category === cat)
              const catEnabled = catEvents.filter(e => settings[e.key]).length
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '50px',
                    border: isActive
                      ? `2px solid ${cat === 'All' ? '#6366f1' : catCfg.color}`
                      : '2px solid #e2e8f0',
                    background: isActive
                      ? cat === 'All' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : catCfg.bg
                      : '#ffffff',
                    color: isActive
                      ? cat === 'All' ? '#fff' : catCfg.color
                      : '#64748b',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.2)' : 'none',
                  }}
                >
                  {cat !== 'All' && <span>{catCfg.icon}</span>}
                  {cat}
                  <span style={{
                    background: isActive
                      ? cat === 'All' ? 'rgba(255,255,255,0.25)' : `${catCfg.color}22`
                      : '#f1f5f9',
                    color: isActive ? (cat === 'All' ? '#fff' : catCfg.color) : '#94a3b8',
                    borderRadius: '50px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}>
                    {catEnabled}/{catEvents.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Category Sections */}
          {loading ? (
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '60px',
              textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Loading notification settings…</p>
            </div>
          ) : (
            filteredCategories.map(category => {
              const catEvents = EVENTS.filter(e => e.category === category)
              const catCfg = CATEGORY_CONFIG[category]
              const catEnabled = catEvents.filter(e => settings[e.key]).length
              const allOn = catEvents.every(e => settings[e.key])
              return (
                <div key={category} style={{ marginBottom: '24px' }}>
                  {/* Category Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: catCfg.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '18px',
                        border: `1px solid ${catCfg.color}22`,
                      }}>
                        {catCfg.icon}
                      </div>
                      <div>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{category}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                          {catEnabled} of {catEvents.length} enabled
                        </span>
                      </div>
                      <div style={{
                        height: '6px', width: '80px', borderRadius: '3px',
                        background: '#e2e8f0', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(catEnabled / catEvents.length) * 100}%`,
                          background: catCfg.color,
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAll(catEvents.map(e => e.key), !allOn)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '8px',
                        border: `1.5px solid ${catCfg.color}`,
                        background: allOn ? catCfg.bg : 'transparent',
                        color: catCfg.color,
                        fontSize: '11px', fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {allOn ? 'Disable All' : 'Enable All'}
                    </button>
                  </div>

                  {/* Notification Cards */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                    {/* Table Head */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 160px 90px',
                      padding: '11px 20px',
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '10px', fontWeight: '700',
                      color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      <span>Event</span>
                      <span>Trigger</span>
                      <span>Recipient</span>
                      <span style={{ textAlign: 'right' }}>Enabled</span>
                    </div>

                    {catEvents.map((ev, i) => {
                      const isOn = !!settings[ev.key]
                      const trig = TRIGGER_CONFIG[ev.trigger] || TRIGGER_CONFIG['Scheduled Job']
                      return (
                        <div
                          key={ev.key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px 160px 90px',
                            padding: '16px 20px',
                            borderBottom: i < catEvents.length - 1 ? '1px solid #f1f5f9' : 'none',
                            alignItems: 'center',
                            background: isOn ? '#fafbff' : '#ffffff',
                            transition: 'background 0.15s',
                            cursor: 'default',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f5f7ff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = isOn ? '#fafbff' : '#ffffff' }}
                        >
                          {/* Event Info */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '10px',
                              background: isOn ? catCfg.bg : '#f1f5f9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', flexShrink: 0,
                              transition: 'background 0.2s',
                              border: isOn ? `1px solid ${catCfg.color}33` : '1px solid #e2e8f0',
                            }}>
                              {ev.icon}
                            </div>
                            <div>
                              <div style={{
                                fontSize: '13px', fontWeight: '700',
                                color: isOn ? '#1e293b' : '#64748b',
                                marginBottom: '3px',
                                transition: 'color 0.2s',
                              }}>
                                {ev.label}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                                {ev.description}
                              </div>
                            </div>
                          </div>

                          {/* Trigger Badge */}
                          <div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '11px', fontWeight: '700',
                              padding: '4px 10px', borderRadius: '6px',
                              background: trig.bg, color: trig.color,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              <span style={{
                                width: '5px', height: '5px', borderRadius: '50%',
                                background: trig.dot, flexShrink: 0,
                              }} />
                              {ev.trigger}
                            </span>
                          </div>

                          {/* Recipient */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '15px' }}>{RECIPIENT_ICONS[ev.recipient] || '👤'}</span>
                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                              {ev.recipient}
                            </span>
                          </div>

                          {/* Toggle */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px' }}>
                            <button
                              onClick={() => toggle(ev.key)}
                              title={isOn ? 'Click to disable' : 'Click to enable'}
                              style={{
                                position: 'relative', width: '46px', height: '26px',
                                background: isOn
                                  ? `linear-gradient(135deg, ${catCfg.color}, ${catCfg.color}cc)`
                                  : '#cbd5e1',
                                borderRadius: '13px', cursor: 'pointer',
                                border: 'none', padding: 0, outline: 'none', flexShrink: 0,
                                transition: 'background 0.2s',
                                boxShadow: isOn ? `0 2px 8px ${catCfg.color}55` : 'none',
                              }}
                            >
                              <span style={{
                                position: 'absolute', top: '3px',
                                left: isOn ? '23px' : '3px',
                                width: '20px', height: '20px',
                                background: '#ffffff', borderRadius: '50%',
                                transition: 'left 0.2s cubic-bezier(.34,1.56,.64,1)',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                pointerEvents: 'none',
                              }} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          {/* Footer Action Bar */}
          {!loading && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '16px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              marginTop: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '13px', color: '#64748b',
                }}>
                  <span style={{
                    display: 'inline-block', width: '8px', height: '8px',
                    borderRadius: '50%', background: '#4ade80',
                  }} />
                  <span><strong style={{ color: '#1e293b' }}>{enabledCount}</strong> of <strong style={{ color: '#1e293b' }}>{EVENTS.length}</strong> notifications active</span>
                </div>
                {enabledCount === 0 && (
                  <span style={{
                    fontSize: '11px', background: '#fef2f2', color: '#dc2626',
                    padding: '3px 10px', borderRadius: '6px', fontWeight: '600',
                  }}>
                    ⚠️ All notifications disabled
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => toggleAll(EVENTS.map(e => e.key), false)}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    fontSize: '13px', fontWeight: '600', color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Disable All
                </button>
                <button
                  onClick={() => toggleAll(EVENTS.map(e => e.key), true)}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    fontSize: '13px', fontWeight: '600', color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Enable All
                </button>
                <button
                  onClick={save}
                  disabled={saving || loading}
                  style={{
                    padding: '10px 28px',
                    background: saving
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700', color: '#ffffff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {saving ? (
                    <>
                      <span style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                      Saving…
                    </>
                  ) : '💾 Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: '28px', right: '28px',
        background: toast.type === 'success'
          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
          : 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff',
        padding: '14px 22px', borderRadius: '12px',
        fontSize: '13px', fontWeight: '600',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        transform: toast.show ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.95)',
        opacity: toast.show ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '10px',
        minWidth: '220px',
      }}>
        <span style={{ fontSize: '18px' }}>{toast.type === 'success' ? '✅' : '❌'}</span>
        {toast.msg}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
