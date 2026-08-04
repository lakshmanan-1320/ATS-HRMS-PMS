import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'

const DEFAULTS = {
  host: 'smtp.hostinger.com',
  port: '465',
  encryption: 'ssl',
  username: 'noreply@insighttechnology.in',
  password: '',
  fromAddress: 'noreply@insighttechnology.in',
  fromName: 'Insight Technology',
}

const inputBase = {
  width: '100%', padding: '11px 14px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px', fontSize: '13px',
  color: '#1e293b', outline: 'none',
  transition: 'border 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

function SectionLabel({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '16px',
    }}>
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <span style={{
        fontSize: '11px', fontWeight: '700', color: '#6366f1',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: '#e8eaf0', marginLeft: '4px' }} />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <label style={{
        fontSize: '11px', fontWeight: '600', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label}</label>
      {children}
    </div>
  )
}

export default function SmtpSettings() {
  const [form, setForm] = useState(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null) // null | 'ok' | 'err' | 'testing'
  const [alert, setAlert] = useState(null)   // { type: 'success'|'error', msg }
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('sa_token')
    axios.get('/api/super-admin/smtp', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setForm(f => ({ ...f, ...r.data })))
      .catch(() => {})
  }, [])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function showAlert(type, msg) {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 5000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const token = sessionStorage.getItem('sa_token')
      await axios.put('/api/super-admin/smtp', form, { headers: { Authorization: `Bearer ${token}` } })
      showAlert('success', 'SMTP settings saved successfully.')
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setStatus('testing')
    setAlert(null)
    setTesting(true)
    try {
      const token = sessionStorage.getItem('sa_token')
      await axios.post('/api/super-admin/smtp/test', form, { headers: { Authorization: `Bearer ${token}` } })
      setStatus('ok')
      showAlert('success', 'SMTP connection verified — test email sent successfully.')
    } catch (err) {
      setStatus('err')
      showAlert('error', err.response?.data?.message || 'SMTP connection failed. Check your settings.')
    } finally {
      setTesting(false)
    }
  }

  const onFocus = e => {
    e.target.style.border = '1px solid #6366f1'
    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
  }
  const onBlur = e => {
    e.target.style.border = '1px solid #e2e8f0'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar active="smtp" />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>📧</div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              SMTP Settings
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '46px' }}>
            Configure the outbound email server for OTP delivery and system notifications
          </p>
        </div>

        <form onSubmit={handleSave} style={{ maxWidth: '760px' }}>

          {/* Alert banner */}
          {alert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '13px', fontWeight: '500',
              background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
              color: alert.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              <span style={{ fontSize: '16px' }}>{alert.type === 'success' ? '✓' : '⚠'}</span>
              {alert.msg}
            </div>
          )}

          {/* Main card */}
          <div style={{
            background: '#ffffff', borderRadius: '20px',
            border: '1px solid #e8eaf0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}>

            {/* Card gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)',
              padding: '24px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', backdropFilter: 'blur(8px)',
                }}>📧</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
                    Email Server Configuration
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                    Outbound SMTP for transactional emails and OTP delivery
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px', padding: '6px 14px', backdropFilter: 'blur(8px)',
              }}>
                <span style={{ fontSize: '12px' }}>🔒</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                  AES-256 Encrypted
                </span>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '32px' }}>

              {/* Section 1: Server */}
              <SectionLabel icon="🖥️" title="Server Configuration" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <Field label="SMTP Host">
                  <input
                    style={inputBase} value={form.host}
                    onChange={set('host')} placeholder="smtp.hostinger.com"
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </Field>
                <Field label="Port">
                  <input
                    style={inputBase} value={form.port}
                    onChange={set('port')} placeholder="465"
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </Field>
                <Field label="Encryption">
                  <select
                    style={{
                      ...inputBase, cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      paddingRight: '36px',
                    }}
                    value={form.encryption} onChange={set('encryption')}
                    onFocus={onFocus} onBlur={onBlur}
                  >
                    <option value="ssl">SSL (Port 465)</option>
                    <option value="tls">TLS (Port 587)</option>
                  </select>
                </Field>
              </div>

              {/* Encryption info pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '10px',
                background: 'rgba(99,102,241,0.04)',
                border: '1px solid rgba(99,102,241,0.12)',
                marginBottom: '28px',
              }}>
                <span style={{ fontSize: '13px' }}>ℹ️</span>
                <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '500' }}>
                  Use <strong>SSL on port 465</strong> for Hostinger, or <strong>TLS on port 587</strong> for Gmail/Outlook.
                  Credentials are never transmitted in plaintext.
                </span>
              </div>

              {/* Section 2: Authentication */}
              <SectionLabel icon="🔑" title="Authentication" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <Field label="SMTP Username">
                  <input
                    style={inputBase} value={form.username}
                    onChange={set('username')} placeholder="noreply@domain.com"
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </Field>
                <Field label="SMTP Password">
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      style={{ ...inputBase, paddingRight: '44px' }}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="••••••••••••"
                      onFocus={onFocus} onBlur={onBlur}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0,
                      }}
                    >{showPass ? '🙈' : '👁'}</button>
                  </div>
                </Field>
              </div>

              {/* Section 3: Sender Identity */}
              <SectionLabel icon="✉️" title="Sender Identity" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                <Field label="From Address">
                  <input
                    style={inputBase} value={form.fromAddress}
                    onChange={set('fromAddress')} placeholder="noreply@domain.com"
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </Field>
                <Field label="From Name">
                  <input
                    style={inputBase} value={form.fromName}
                    onChange={set('fromName')} placeholder="HR System"
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </Field>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '10px 0 0' }}>
                Recipients will see this name and address in their inbox.
              </p>
            </div>

            {/* Card footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 32px',
              borderTop: '1px solid #e8eaf0',
              background: '#f8fafc',
            }}>
              {/* Connection status */}
              <div>
                {status === null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Connection not tested</span>
                  </div>
                )}
                {status === 'testing' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '500' }}>Testing connection…</span>
                  </div>
                )}
                {status === 'ok' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '20px',
                    background: '#f0fdf4', border: '1px solid #86efac',
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)',
                    }} />
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                      Connection verified ✓
                    </span>
                  </div>
                )}
                {status === 'err' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '20px',
                    background: '#fef2f2', border: '1px solid #fca5a5',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                      Connection failed ✗
                    </span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 20px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px', fontSize: '13px',
                    fontWeight: '600', color: '#475569',
                    cursor: testing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', opacity: testing ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!testing) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                >
                  <span style={{ fontSize: '15px' }}>⟳</span>
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700',
                    color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    transition: 'all 0.2s', opacity: saving ? 0.75 : 1,
                  }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.4)' }}
                >
                  <span style={{ fontSize: '15px' }}>💾</span>
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom tip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            marginTop: '16px', padding: '14px 18px',
            borderRadius: '12px', background: 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.1)',
          }}>
            <span style={{ fontSize: '16px', marginTop: '1px' }}>💡</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#4f46e5', marginBottom: '3px' }}>
                Testing recommendation
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                Always click <strong>Test Connection</strong> after saving to confirm emails can be delivered.
                A test email will be sent to the configured From Address.
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
