import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar'
import { FiPlus, FiEdit2, FiTrash2, FiFolder, FiCheck, FiX, FiInfo } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function GoalCategoryConfig({ isSubComponent = false }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Dialog controls
  const [showModal, setShowModal] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/client-admin/goal-categories')
      setCategories(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load goal categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleOpenCreate = () => {
    setEditCategory(null)
    setName('')
    setIsActive(true)
    setShowModal(true)
  }

  const handleOpenEdit = (cat) => {
    setEditCategory(cat)
    setName(cat.name)
    setIsActive(cat.is_active)
    setShowModal(true)
  }

  const showToast = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 4000)
    } else {
      setError(msg)
      setTimeout(() => setError(''), 4000)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editCategory) {
        // Edit
        await api.put(`/client-admin/goal-categories/${editCategory.category_id}`, {
          name: name.trim(),
          is_active: isActive
        })
        showToast('Goal category updated successfully.')
      } else {
        // Create
        await api.post('/client-admin/goal-categories', {
          name: name.trim(),
          is_active: isActive
        })
        showToast('Goal category created successfully.')
      }
      setShowModal(false)
      fetchCategories()
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed.', false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await api.delete(`/client-admin/goal-categories/${deletingId}`)
      showToast('Goal category deleted successfully.')
      setDeletingId(null)
      fetchCategories()
    } catch (err) {
      showToast(err.response?.data?.message || 'Cannot delete category.', false)
    }
  }

  const mainContent = (
    <>
      {/* Toast Alert */}
      {(success || error) && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${error ? '#fca5a5' : '#86efac'}`,
          color: error ? '#dc2626' : '#16a34a',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}>
          {error ? `✗ ${error}` : `✓ ${success}`}
        </div>
      )}

      <main style={{ flex: 1, padding: isSubComponent ? '0px' : '28px 36px', overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Goal Categories</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Manage dynamic goal categories for organization performance cycles
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FiPlus /> Add Category
            </button>
          </div>

          {/* Table Card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: '#475569' }}>Name</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      Loading goal categories…
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>No custom categories yet</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Create custom categories to align with your organization’s goals.</div>
                    </td>
                  </tr>
                ) : (
                  categories.map(c => (
                    <tr key={c.category_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.15s' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 18, color: '#a5b4fc' }}>📁</span>
                          {c.name}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                          color: c.is_active ? '#16a34a' : '#64748b',
                          background: c.is_active ? '#f0fdf4' : '#f1f5f9',
                          border: `1px solid ${c.is_active ? 'rgba(22,163,74,0.2)' : 'rgba(100,116,139,0.2)'}`,
                        }}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            style={{
                              padding: 6, borderRadius: 6, border: '1px solid #e2e8f0',
                              background: '#fff', color: '#475569', cursor: 'pointer',
                              display: 'inline-flex', transition: 'all 0.15s'
                            }}
                            title="Edit"
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingId(c.category_id)}
                            style={{
                              padding: 6, borderRadius: 6, border: '1px solid #e2e8f0',
                              background: '#fff', color: '#ef4444', cursor: 'pointer',
                              display: 'inline-flex', transition: 'all 0.15s'
                            }}
                            title="Delete"
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.background = '#fef2f2' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 440,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {editCategory ? 'Edit Goal Category' : 'Create Goal Category'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sales, Marketing, Personal Growth"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
                    fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="cat-active" style={{ fontSize: 13, color: '#334155', fontWeight: 600, cursor: 'pointer' }}>Active</label>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', boxShadow: '0 4px 10px rgba(99,102,241,0.2)'
                }}
              >
                {saving ? 'Saving...' : (editCategory ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 400,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0', padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Delete Category</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to delete this category? This action cannot be undone and will fail if the category is currently mapped to any goals.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 10px rgba(239,68,68,0.2)'
                }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (isSubComponent) {
    return (
      <div style={{ padding: '0px' }}>
        {mainContent}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: "'Inter', 'Roboto', system-ui, -apple-system, sans-serif" }}>
      <ClientAdminSidebar active="goal-categories" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        {mainContent}
      </div>
    </div>
  );
}
