import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'
import {
  FiMail, FiLock, FiServer, FiInfo, FiKey,
  FiSend, FiCheckCircle, FiAlertCircle, FiRefreshCw,
  FiSave, FiShield, FiHelpCircle, FiEye, FiEyeOff
} from 'react-icons/fi'

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
  border: '1px solid #cbd5e1',
  borderRadius: '10px', fontSize: '13px',
  color: '#1e293b', outline: 'none',
  transition: 'border 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

function SectionLabel({ icon: Icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '16px',
    }}>
      {Icon && <Icon size={16} color="#C2071A" />}
      <span style={{
        fontSize: '11px', fontWeight: '800', color: '#C2071A',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: '#edf2f7', marginLeft: '4px' }} />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: '11px', fontWeight: '700', color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.05em',
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
    e.target.style.border = '1px solid #C2071A'
    e.target.style.boxShadow = '0 0 0 3.5px rgba(194, 7, 26, 0.12)'
  }
  const onBlur = e => {
    e.target.style.border = '1px solid #cbd5e1'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="smtp" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="SMTP / Email Settings" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: '#FEECEE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FiMail size={20} color="#C2071A" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              SMTP Settings
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '48px', fontWeight: 500 }}>
            Configure the outbound email server for OTP delivery and system notifications
          </p>
        </div>

        <form onSubmit={handleSave} style={{ maxWidth: '760px' }}>

          {/* Alert banner */}
          {alert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
              fontSize: '13px', fontWeight: '700',
              background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
              color: alert.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              {alert.type === 'success' ? <FiCheckCircle size={18} color="#16a34a" /> : <FiAlertCircle size={18} color="#dc2626" />}
              <span>{alert.msg}</span>
            </div>
          )}

          {/* Main card */}
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
          }}>

            {/* Card gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
              padding: '24px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                }}>
                  <FiMail size={24} color="#ffffff" stroke="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                    Email Server Configuration
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginTop: '3px', fontWeight: 500 }}>
                    Outbound SMTP for transactional emails and OTP delivery
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '20px', padding: '6px 14px', backdropFilter: 'blur(8px)',
              }}>
                <FiLock size={14} color="#ffffff" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>
                  AES-256 Encrypted
                </span>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '32px' }}>

              {/* Section 1: Server */}
              <SectionLabel icon={FiServer} title="Server Configuration" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px', borderRadius: '12px',
                background: '#FEECEE',
                border: '1px solid rgba(194, 7, 26, 0.2)',
                marginBottom: '28px',
              }}>
                <FiInfo size={18} color="#C2071A" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#C2071A', fontWeight: '600', lineHeight: 1.5 }}>
                  Use <strong>SSL on port 465</strong> for Hostinger, or <strong>TLS on port 587</strong> for Gmail/Outlook.
                  Credentials are never transmitted in plaintext.
                </span>
              </div>

              {/* Section 2: Authentication */}
              <SectionLabel icon={FiKey} title="Authentication" />
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
                        display: 'flex', alignItems: 'center'
                      }}
                    >{showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}</button>
                  </div>
                </Field>
              </div>

              {/* Section 3: Sender Identity */}
              <SectionLabel icon={FiSend} title="Sender Identity" />
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
              <p style={{ fontSize: '12px', color: '#64748b', margin: '10px 0 0', fontWeight: 500 }}>
                Recipients will see this name and address in their inbox.
              </p>
            </div>

            {/* Card footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 32px',
              borderTop: '1px solid #edf2f7',
              background: '#f8fafc',
            }}>
              {/* Connection status */}
              <div>
                {status === null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1' }} />
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Connection not tested</span>
                  </div>
                )}
                {status === 'testing' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '700' }}>Testing connection…</span>
                  </div>
                )}
                {status === 'ok' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '20px',
                    background: '#f0fdf4', border: '1px solid #86efac',
                  }}>
                    <FiCheckCircle size={14} color="#16a34a" />
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                      Connection verified
                    </span>
                  </div>
                )}
                {status === 'err' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '20px',
                    background: '#fef2f2', border: '1px solid #fca5a5',
                  }}>
                    <FiAlertCircle size={14} color="#dc2626" />
                    <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>
                      Connection failed
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
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px', fontSize: '13px',
                    fontWeight: '700', color: '#475569',
                    cursor: testing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', opacity: testing ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!testing) { e.currentTarget.style.borderColor = '#C2071A'; e.currentTarget.style.color = '#C2071A' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569' }}
                >
                  <FiRefreshCw size={15} color={testing ? '#94a3b8' : '#C2071A'} />
                  <span>{testing ? 'Testing…' : 'Test Connection'}</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700',
                    color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(194, 7, 26, 0.25)',
                    transition: 'all 0.2s', opacity: saving ? 0.75 : 1,
                  }}
                >
                  <FiSave size={15} color="#ffffff" stroke="#ffffff" />
                  <span>{saving ? 'Saving…' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom tip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            marginTop: '20px', padding: '16px 20px',
            borderRadius: '16px', background: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiHelpCircle size={18} color="#C2071A" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                Testing recommendation
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6', fontWeight: 500 }}>
                Always click <strong>Test Connection</strong> after saving to confirm emails can be delivered.
                A test email will be sent to the configured From Address.
              </div>
            </div>
          </div>
        </form>
      </main>
      </div>
    </div>
  )
}

