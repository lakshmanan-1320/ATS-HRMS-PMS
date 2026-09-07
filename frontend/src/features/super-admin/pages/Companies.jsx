import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../../../components/layout/Sidebar.jsx'
import SuperAdminTopBar from '../../../components/layout/SuperAdminTopBar.jsx'
import {
  FiBriefcase, FiPlus, FiTrash2, FiUsers, FiUserPlus,
  FiSearch, FiAlertCircle, FiCheckCircle, FiX
} from 'react-icons/fi'

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="companies" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SuperAdminTopBar title="Companies & Organizations" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* Toast notifications */}
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: '12px 18px', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: '700',
              background: t.type === 'error' ? '#ef4444' : '#16a34a', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              {t.type === 'error' ? <FiAlertCircle size={16} color="#fff" /> : <FiCheckCircle size={16} color="#fff" />}
              <span>{t.msg}</span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiBriefcase size={20} color="#C2071A" strokeWidth={2.5} />
              </div>
              Companies & Organizations
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              Manage client companies, view employee counts, and assign client admins per company — {companies.length} total
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
              border: 'none', borderRadius: '12px', color: '#ffffff',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(194, 7, 26, 0.25)', transition: 'all 0.15s ease'
            }}
          >
            <FiPlus size={16} color="#ffffff" stroke="#ffffff" />
            <span>Add Company</span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '380px' }}>
          <FiSearch size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company by name..."
            style={{
              width: '100%', padding: '10px 14px 10px 40px', background: '#ffffff',
              border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', outline: 'none',
              color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading companies...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <FiBriefcase size={24} color="#C2071A" />
            </div>
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>No companies found. Click "+ Add Company" to create one.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {filtered.map(c => (
              <div key={c.organization_id} style={{
                background: '#ffffff', border: 'none', borderRadius: '16px',
                padding: '24px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '12px', background: '#FEECEE',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <FiBriefcase size={20} color="#C2071A" />
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{c.company_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                          Created {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCompany(c.organization_id, c.company_name)}
                      title="Delete Company"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                    >
                      <FiTrash2 size={16} color="#ef4444" />
                    </button>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '16px 0', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employees</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{c.total_employees}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client Admins</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#C2071A', marginTop: '2px' }}>{c.total_client_admins}</div>
                    </div>
                  </div>

                  {/* Client Admins list preview */}
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      Assigned Admins:
                    </div>
                    {c.client_admins && c.client_admins.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {c.client_admins.map(adm => (
                          <div key={adm.client_admin_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiUsers size={14} color="#C2071A" />
                              {adm.full_name}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>{adm.email}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>No client admin assigned yet.</div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => navigate('/settings/client-admins', { state: { createForOrgId: c.organization_id, createForCompany: c.company_name } })}
                    style={{
                      flex: 1, padding: '10px 14px', background: '#FEECEE', border: '1px solid rgba(194,7,26,0.2)',
                      borderRadius: '10px', color: '#C2071A', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s ease'
                    }}
                  >
                    <FiUserPlus size={15} color="#C2071A" />
                    <span>Add Client Admin</span>
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
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden'
            }}>
              <div style={{ padding: '24px 28px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Add New Company</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>Create a new tenant organization</p>
                </div>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCompany} style={{ padding: '24px 28px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Company Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. ABC Technologies Inc."
                    style={{
                      width: '100%', padding: '11px 14px', background: '#f8fafc',
                      border: error ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: '10px',
                      fontSize: '13px', outline: 'none', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                  />
                  {error && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block', fontWeight: 600 }}>{error}</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(194, 7, 26, 0.25)' }}
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
    </div>
  )
}

