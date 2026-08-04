import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'

export default function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const token = sessionStorage.getItem('sa_token')
  const headers = { Authorization: `Bearer ${token}` }

  function toast(msg, type = 'success') {
    const id = ++toastIdRef.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }

  async function fetchCompanies() {
    try {
      const res = await axios.get('/api/super-admin/client-admins/companies', { headers })
      setCompanies(res.data)
    } catch {
      toast('Failed to load companies.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  async function handleCreateCompany(e) {
    e.preventDefault()
    if (!companyName.trim()) {
      setError('Company name is required.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await axios.post('/api/super-admin/client-admins/companies', { name: companyName.trim() }, { headers })
      toast('Company created successfully.')
      setShowAddModal(false)
      setCompanyName('')
      fetchCompanies()
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create company.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteCompany(id, name) {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will delete all linked employees and client admins.`)) return
    try {
      await axios.delete(`/api/super-admin/client-admins/companies/${id}`, { headers })
      toast('Company deleted.')
      fetchCompanies()
    } catch {
      toast('Failed to delete company.', 'error')
    }
  }

  const filtered = companies.filter(c => c.company_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar active="companies" />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {/* Toast notifications */}
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: '12px 18px', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600',
              background: t.type === 'error' ? '#ef4444' : '#22c55e', boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
            }}>
              {t.msg}
            </div>
          ))}
        </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>Companies & Organizations</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Manage client companies, view employee counts, and assign client admins per company — {companies.length} total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
            background: '#6366f1', border: 'none', borderRadius: '12px', color: '#fff',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          + Add Company
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search company by name..."
          style={{
            width: '100%', maxWidth: '380px', padding: '10px 14px', background: '#ffffff',
            border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none'
          }}
        />
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading companies...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e8eaf0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏢</div>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>No companies found. Click "+ Add Company" to create one.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filtered.map(c => (
            <div key={c.organization_id} style={{
              background: '#ffffff', border: '1px solid #e8eaf0', borderRadius: '16px',
              padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex',
              flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                    }}>
                      🏢
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{c.company_name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        Created {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCompany(c.organization_id, c.company_name)}
                    title="Delete Company"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px' }}
                  >
                    🗑️
                  </button>
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Employees</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{c.total_employees}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Client Admins</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#6366f1', marginTop: '2px' }}>{c.total_client_admins}</div>
                  </div>
                </div>

                {/* Client Admins list preview */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Assigned Admins:
                  </div>
                  {c.client_admins && c.client_admins.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {c.client_admins.map(adm => (
                        <div key={adm.client_admin_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>👤 {adm.full_name}</span>
                          <span style={{ color: '#64748b' }}>{adm.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#cbd5e1', italic: 'true' }}>No client admin assigned yet.</div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate('/settings/client-admins', { state: { createForOrgId: c.organization_id, createForCompany: c.company_name } })}
                  style={{
                    flex: 1, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '8px', color: '#6366f1', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  + Add Client Admin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden'
          }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e8eaf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Add New Company</h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Create a new tenant organization</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            <form onSubmit={handleCreateCompany} style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Technologies Inc."
                  style={{
                    width: '100%', padding: '10px 14px', background: '#f8fafc',
                    border: error ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '13px', outline: 'none'
                  }}
                />
                {error && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>{error}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
