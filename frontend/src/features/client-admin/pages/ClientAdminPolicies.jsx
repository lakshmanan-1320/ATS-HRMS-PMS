import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiDownload,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiArchive,
  FiX,
  FiUploadCloud,
  FiTag,
  FiCalendar,
  FiCheck,
  FiLayers,
  FiShield
} from 'react-icons/fi';
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx';
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx';
import { FiZap } from 'react-icons/fi';

const STATUS_META = {
  published: { label: 'Published', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  draft:     { label: 'Draft',     color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  retired:   { label: 'Retired',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
};

const CATEGORIES = [
  'Attendance & Working Hours',
  'Leave & Employee Conduct',
  'IT & Data Security',
  'Benefits & Compensation',
  'General HR'
];

export default function ClientAdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [viewingPolicy, setViewingPolicy] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Attendance & Working Hours',
    summary: '',
    contentHtml: '',
    keywords: '',
    versionNumber: '1.0',
    effectiveDate: new Date().toISOString().split('T')[0],
    isPublished: false
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const getHeaders = () => {
    const token = sessionStorage.getItem('sa_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/policies', { headers: getHeaders() });
      if (res.data.success) {
        setPolicies(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      toast.error('Failed to load HR policies.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      title: '',
      category: 'Attendance & Working Hours',
      summary: '',
      contentHtml: '<h3>1. Purpose & Scope</h3>\n<p>Enter detailed policy rules and guidelines here...</p>\n<h3>2. Compliance & Rules</h3>\n<p>Enter key expectations and standards...</p>',
      keywords: 'policy, hr, guidelines',
      versionNumber: '1.0',
      effectiveDate: new Date().toISOString().split('T')[0],
      isPublished: false
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title,
      category: policy.category,
      summary: policy.summary || '',
      contentHtml: policy.content_html || '',
      keywords: Array.isArray(policy.keywords) ? policy.keywords.join(', ') : '',
      versionNumber: policy.version_number || '1.0',
      effectiveDate: policy.effective_date ? policy.effective_date.split('T')[0] : '',
      isPublished: policy.is_published
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.match(/\.(pdf|docx|doc)$/i)) {
        toast.error('Please upload a PDF or DOCX document file.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Policy title is required.');
      return;
    }

    if (!editingPolicy && !selectedFile) {
      toast.error('Please attach an official signed PDF or DOCX document.');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('title', formData.title);
      data.append('category', formData.category);
      data.append('summary', formData.summary);
      data.append('contentHtml', formData.contentHtml);
      data.append('keywords', formData.keywords);
      data.append('versionNumber', formData.versionNumber);
      data.append('effectiveDate', formData.effectiveDate);
      data.append('isPublished', formData.isPublished);

      if (selectedFile) {
        data.append('document', selectedFile);
      }

      let res;
      if (editingPolicy) {
        res = await axios.put(`/api/policies/${editingPolicy.policy_id}`, data, {
          headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await axios.post('/api/policies', data, {
          headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.data.success) {
        toast.success(editingPolicy ? 'Policy updated successfully!' : 'Policy created successfully!');
        setIsModalOpen(false);
        fetchPolicies();
      }
    } catch (err) {
      console.error('Error saving policy:', err);
      toast.error(err.response?.data?.message || 'Failed to save policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (policy, isPublished, isActive = true) => {
    try {
      const res = await axios.patch(
        `/api/policies/${policy.policy_id}/status`,
        { isPublished, isActive },
        { headers: getHeaders() }
      );
      if (res.data.success) {
        toast.success(`Policy status updated to ${isPublished ? 'Published' : isActive ? 'Draft' : 'Retired'}`);
        fetchPolicies();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update policy status.');
    }
  };

  const handleDelete = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await axios.delete(`/api/policies/${policyId}`, { headers: getHeaders() });
      if (res.data.success) {
        toast.success('Policy deleted successfully.');
        fetchPolicies();
      }
    } catch (err) {
      console.error('Error deleting policy:', err);
      toast.error('Failed to delete policy.');
    }
  };

  const handleDownloadDoc = async (policy) => {
    try {
      const token = sessionStorage.getItem('sa_token');
      const res = await fetch(`/api/policies/${policy.policy_id}/document`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = policy.document_name || `${policy.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Unable to download policy document.');
    }
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.summary?.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'published') matchesStatus = p.is_published && p.is_active;
    if (statusFilter === 'draft') matchesStatus = !p.is_published && p.is_active;
    if (statusFilter === 'retired') matchesStatus = !p.is_active;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalCount = policies.length;
  const publishedCount = policies.filter((p) => p.is_published && p.is_active).length;
  const draftCount = policies.filter((p) => !p.is_published && p.is_active).length;
  const retiredCount = policies.filter((p) => !p.is_active).length;

  const iStyle = {
    padding: '10px 14px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    color: '#1e293b',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease'
  };

  const selStyle = {
    ...iStyle,
    cursor: 'pointer'
  };

  const BD = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  };

  const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="policies" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar />
        
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Header Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <FiShield size={14} /> HR Governance & Policy Hub
              </div>
              <h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
                Company Policies Management
              </h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Publish, control versioning, and distribute official signed HR policies.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={handleOpenCreateModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 22px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.40)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.35)'; }}
              >
                <FiPlus size={16} /> Create New Policy
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: cardShadow }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiLayers size={22} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{totalCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Total Policies</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: cardShadow }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiCheckCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{publishedCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Published & Active</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: cardShadow }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiClock size={22} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{draftCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Draft Policies</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: cardShadow }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArchive size={22} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{retiredCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Retired Policies</div>
              </div>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 280 }}>
              <FiSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search policy title, summary, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...iStyle, paddingLeft: 38, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ ...selStyle, width: 220, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ ...selStyle, width: 160, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="retired">Retired</option>
            </select>

            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Showing {filteredPolicies.length} of {policies.length} policy records
            </span>
          </div>

          {/* Policy Table */}
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: cardShadow }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                Loading policies...
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <FiFileText size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>No Policies Found</div>
                <div style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto' }}>
                  No HR policies match your filter query. Click "+ Create Policy" to add your first policy.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <th style={{ padding: '14px 20px' }}>Policy Details</th>
                      <th style={{ padding: '14px 16px' }}>Category</th>
                      <th style={{ padding: '14px 16px' }}>Version & Date</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                      <th style={{ padding: '14px 16px' }}>Official Document</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPolicies.map((policy) => {
                      const sm = policy.is_active
                        ? policy.is_published
                          ? STATUS_META.published
                          : STATUS_META.draft
                        : STATUS_META.retired;

                      return (
                        <tr key={policy.policy_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                          {/* Policy Details */}
                          <td style={{ padding: '16px 20px', maxWidth: 380 }}>
                            <div
                              onClick={() => setViewingPolicy(policy)}
                              style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, cursor: 'pointer', transition: 'color 0.15s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#6366f1')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
                            >
                              {policy.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                              {policy.summary || 'No summary provided.'}
                            </div>
                            {policy.keywords && policy.keywords.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                {policy.keywords.slice(0, 3).map((kw, i) => (
                                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#475569', fontWeight: 600 }}>
                                    <FiTag size={10} style={{ color: '#94a3b8' }} /> {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td style={{ padding: '16px 16px', whitespaceNowrap: 'nowrap' }}>
                            <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>
                              {policy.category}
                            </span>
                          </td>

                          {/* Version & Date */}
                          <td style={{ padding: '16px 16px', whitespaceNowrap: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>v{policy.version_number}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              <FiCalendar size={12} /> {policy.effective_date ? new Date(policy.effective_date).toLocaleDateString('en-IN') : 'N/A'}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '16px 16px', whitespaceNowrap: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: sm.bg, border: `1px solid ${sm.border}`, borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot }} />
                              {sm.label}
                            </span>
                          </td>

                          {/* Document Download Link */}
                          <td style={{ padding: '16px 16px', whitespaceNowrap: 'nowrap' }}>
                            <button
                              onClick={() => handleDownloadDoc(policy)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#4338ca', fontFamily: 'inherit', transition: 'all 0.15s' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                              <FiDownload size={13} />
                              <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {policy.document_name || 'Download PDF'}
                              </span>
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td style={{ padding: '16px 20px', textAlign: 'right', whitespaceNowrap: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => setViewingPolicy(policy)}
                                title="Read Policy"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#334155', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                              >
                                <FiEye size={13} /> Read
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(policy)}
                                title="Edit Policy"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#334155', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                              >
                                <FiEdit3 size={13} /> Edit
                              </button>

                              {policy.is_published ? (
                                <button
                                  onClick={() => handleToggleStatus(policy, false, true)}
                                  style={{ padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#d97706', transition: 'all 0.15s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fffbeb'; }}
                                >
                                  Unpublish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(policy, true, true)}
                                  style={{ padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#16a34a', transition: 'all 0.15s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                                >
                                  Publish
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(policy.policy_id)}
                                title="Delete Policy"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#dc2626', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* CREATE / EDIT POLICY MODAL */}
      {isModalOpen && (
        <div style={BD} onClick={() => setIsModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #cbd5e1', padding: 26, width: 680, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
                <FiFileText style={{ color: '#6366f1' }} />
                {editingPolicy ? 'Edit HR Policy' : 'Create New HR Policy'}
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  Policy Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Attendance & Working Hours Policy"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={iStyle}
                />
              </div>

              {/* Grid: Category & Version */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                    Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={selStyle}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                    Version Number
                  </label>
                  <input
                    type="text"
                    placeholder="1.0"
                    value={formData.versionNumber}
                    onChange={(e) => setFormData({ ...formData, versionNumber: e.target.value })}
                    style={iStyle}
                  />
                </div>
              </div>

              {/* Grid: Effective Date & Keywords */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    style={iStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                    Keywords / RAG Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="attendance, grace period, shift timing"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    style={iStyle}
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  Executive Overview / Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide a concise 2-3 sentence overview..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  style={{ ...iStyle, resize: 'vertical' }}
                />
              </div>

              {/* File Attachment Dropzone */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  Attach Signed Document (PDF/DOCX) {!editingPolicy && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 20, textAlign: 'center', background: '#f8fafc', transition: 'border-color 0.15s' }}>
                  <input
                    type="file"
                    id="policyDocInput"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="policyDocInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <FiUploadCloud size={28} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      {selectedFile ? selectedFile.name : editingPolicy ? `Current: ${editingPolicy.document_name} (Click to replace)` : 'Click to upload official PDF or DOCX file'}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Maximum file size: 15MB</span>
                  </label>
                </div>
              </div>

              {/* HTML Content Editor */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  Policy Content HTML (Formatted Text for Employee Reader & Future RAG)
                </label>
                <textarea
                  rows={6}
                  value={formData.contentHtml}
                  onChange={(e) => setFormData({ ...formData, contentHtml: e.target.value })}
                  style={{ ...iStyle, fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#38bdf8', resize: 'vertical' }}
                />
              </div>

              {/* Publish Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Publish Immediately</div>
                  <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    When checked, policy will immediately become visible to employees.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#ffffff', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}
                >
                  {submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POLICY READER MODAL */}
      {viewingPolicy && (
        <div style={BD} onClick={() => setViewingPolicy(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #cbd5e1', padding: 28, width: 780, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {viewingPolicy.category} • v{viewingPolicy.version_number}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#1e293b' }}>
                  {viewingPolicy.title}
                </h2>
              </div>
              <button onClick={() => setViewingPolicy(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {viewingPolicy.summary && (
                <div style={{ padding: 14, background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 4 }}>Executive Summary</div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{viewingPolicy.summary}</div>
                </div>
              )}

              <div
                style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: viewingPolicy.content_html }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <FiCalendar size={14} /> Effective: {viewingPolicy.effective_date ? new Date(viewingPolicy.effective_date).toLocaleDateString('en-IN') : 'N/A'}
              </div>
              <button
                onClick={() => handleDownloadDoc(viewingPolicy)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#ffffff', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}
              >
                <FiDownload size={15} /> Download Official PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
