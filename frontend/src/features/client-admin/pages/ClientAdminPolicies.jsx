import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiDownload,
  FiEye,
  FiEdit2,
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
  FiSlash,
  FiGrid,
  FiList,
  FiPrinter,
  FiRefreshCw,
  FiCpu,
  FiPaperclip,
  FiChevronRight,
  FiInfo
} from 'react-icons/fi';
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx';
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx';
import PageHeader from '../../../components/common/PageHeader.jsx';
import AddIcon from '../../../components/common/AddIcon.jsx';

const cardShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)';

const FONT_HEAD = "'Poppins', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const BRAND = {
  red: '#C2071A',
  redDark: '#900513',
  redTint: '#FEECEE',
  navy: '#0f1b3d',
  navySoft: '#1e293b',
  slate: '#42557e',
  slateSoft: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
};

/* High Quality Vector Icons with Red (#C2071A) as requested */
const BarChartIcon = ({ size = 22, color = BRAND.red, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <line x1="6" y1="20" x2="6" y2="15" />
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="5" />
  </svg>
);

const ClockOutlineIcon = ({ size = 22, color = BRAND.red, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleOutlineIcon = ({ size = 22, color = BRAND.red, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="8.5 12 11 14.5 15.5 9.5" />
  </svg>
);

const ArchiveOutlineIcon = ({ size = 22, color = BRAND.red, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" rx="1.5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const WhiteDownloadIcon = ({ size = 15, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffffff"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ stroke: '#ffffff', color: '#ffffff', flexShrink: 0, ...style }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#ffffff" />
    <polyline points="7 10 12 15 17 10" stroke="#ffffff" />
    <line x1="12" y1="15" x2="12" y2="3" stroke="#ffffff" />
  </svg>
);

const WhitePlusIcon = ({ size = 16, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffffff"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ stroke: '#ffffff', color: '#ffffff', flexShrink: 0, ...style }}
  >
    <line x1="12" y1="5" x2="12" y2="19" stroke="#ffffff" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="#ffffff" />
  </svg>
);

const STATUS_CONFIG = {
  published: {
    label: 'Published',
    color: '#0fa958',
    bg: '#e8fbf0',
    border: '#bbf7d0',
    dot: '#10b981'
  },
  draft: {
    label: 'Draft',
    color: '#d97706',
    bg: '#fef3c7',
    border: '#fde68a',
    dot: '#f59e0b'
  },
  retired: {
    label: 'Retired',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    dot: '#94a3b8'
  }
};

const CATEGORIES = [
  'Attendance & Working Hours',
  'Leave & Employee Conduct',
  'IT & Data Security',
  'Benefits & Compensation',
  'General'
];

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function ClientAdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft' | 'retired'

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
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const getHeaders = () => {
    const token = sessionStorage.getItem('sa_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchPolicies = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await axios.get('/api/policies', { headers: getHeaders() });
      if (res.data.success) {
        setPolicies(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      toast.error('Failed to load HR policies.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      title: '',
      category: 'Attendance & Working Hours',
      summary: '',
      contentHtml: '',
      keywords: '',
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
        toast.error('Please upload an official PDF or DOCX document.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error('File size exceeds 15MB limit.');
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
      data.append('title', formData.title.trim());
      data.append('category', formData.category.trim());
      data.append('summary', formData.summary.trim());
      data.append('contentHtml', formData.contentHtml.trim());
      data.append('keywords', formData.keywords.trim());
      data.append('versionNumber', formData.versionNumber.trim() || '1.0');
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
        if (viewingPolicy && viewingPolicy.policy_id === policyId) {
          setViewingPolicy(null);
        }
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

  // Stats calculation
  const stats = useMemo(() => {
    const total = policies.length;
    const published = policies.filter((p) => p.is_published && p.is_active).length;
    const draft = policies.filter((p) => !p.is_published && p.is_active).length;
    const retired = policies.filter((p) => !p.is_active).length;
    return { total, published, draft, retired };
  }, [policies]);

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (Array.isArray(p.keywords) && p.keywords.some((k) => k.toLowerCase().includes(q)));

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'published') matchesStatus = p.is_published && p.is_active;
      if (statusFilter === 'draft') matchesStatus = !p.is_published && p.is_active;
      if (statusFilter === 'retired') matchesStatus = !p.is_active;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [policies, search, selectedCategory, statusFilter]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#111827', fontFamily: FONT_BODY }}>
      <ClientAdminSidebar active="policies" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar />

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* Page Header */}
          <PageHeader
            icon={FiFileText}
            title="HR Policies & Compliance"
            subtitle="Publish, control versioning, and distribute official signed HR policies across the organization"
            actions={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => fetchPolicies(true)}
                  disabled={refreshing}
                  title="Refresh policies"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: refreshing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <FiRefreshCw size={14} color={BRAND.red} className={refreshing ? 'animate-spin' : ''} />
                  <span>Sync</span>
                </button>

                {/* Create Policy Button - White Icon & White Text */}
                <button
                  onClick={handleOpenCreateModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                    fontFamily: FONT_BODY
                  }}
                >
                  <AddIcon size={20} />
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>Create Policy</span>
                </button>
              </div>
            }
          />

          {/* ── Figma-style KPI Stat Cards (No Border, All Red Icons) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {/* Card 1: Total Policies */}
            <div
              onClick={() => setStatusFilter('all')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 16,
                padding: '18px 22px',
                boxShadow: cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChartIcon size={25} color={BRAND.red} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 25, fontWeight: 800, color: BRAND.navy, lineHeight: 1 }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: BRAND.navy, marginTop: 3 }}>
                  Total Policies
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                  All catalog records
                </div>
              </div>
            </div>

            {/* Card 2: Published & Active */}
            <div
              onClick={() => setStatusFilter('published')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 16,
                padding: '16px 20px',
                boxShadow: cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleOutlineIcon size={25} color={BRAND.red} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 25, fontWeight: 800, color: BRAND.navy, lineHeight: 1 }}>
                  {stats.published}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: BRAND.navy, marginTop: 3 }}>
                  Published & Active
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                  Live in Portal & AI
                </div>
              </div>
            </div>

            {/* Card 3: Draft Policies */}
            <div
              onClick={() => setStatusFilter('draft')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 16,
                padding: '16px 20px',
                boxShadow: cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockOutlineIcon size={25} color={BRAND.red} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 25, fontWeight: 800, color: BRAND.navy, lineHeight: 1 }}>
                  {stats.draft}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: BRAND.navy, marginTop: 3 }}>
                  Draft Policies
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                  In progress / review
                </div>
              </div>
            </div>

            {/* Card 4: Retired Records */}
            <div
              onClick={() => setStatusFilter('retired')}
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 16,
                padding: '16px 20px',
                boxShadow: cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArchiveOutlineIcon size={25} color={BRAND.red} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 25, fontWeight: 800, color: BRAND.navy, lineHeight: 1 }}>
                  {stats.retired}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: BRAND.navy, marginTop: 3 }}>
                  Retired Policies
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                  Archived versions
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Policy Content Card (Figma Style) ── */}
          <div
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: 16,
              padding: 24,
              boxShadow: cardShadow
            }}
          >
            {/* Toolbar: Search, Filters & View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
                {/* Search Bar with Red Icon */}
                <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                  <FiSearch size={14} color={BRAND.red} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: BRAND.red }} />
                  <input
                    type="text"
                    placeholder="Search policies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 34px',
                      borderRadius: 9,
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                      color: '#0f172a',
                      fontFamily: FONT_BODY
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{
                        position: 'absolute',
                        right: 9,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: BRAND.red,
                        padding: 2,
                        display: 'flex'
                      }}
                    >
                      <FiX size={13} color={BRAND.red} />
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: FONT_BODY
                  }}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: FONT_BODY
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Drafts</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              {/* Right Side Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Count Pill */}
                <span
                  style={{
                    background: BRAND.redTint,
                    color: BRAND.red,
                    padding: '5px 13px',
                    borderRadius: 18,
                    fontWeight: 650,
                    fontSize: 12,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {filteredPolicies.length} Policies
                </span>

                {/* View Switcher: Table vs Cards */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#f1f5f9',
                    borderRadius: 8,
                    padding: 2.5,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <button
                    onClick={() => setViewMode('table')}
                    title="Table View"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: viewMode === 'table' ? '#ffffff' : 'transparent',
                      color: viewMode === 'table' ? BRAND.red : '#64748b',
                      fontSize: 12.5,
                      fontWeight: viewMode === 'table' ? 650 : 500,
                      cursor: 'pointer',
                      boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <FiList size={14} color={BRAND.red} />
                    <span>Table</span>
                  </button>

                  <button
                    onClick={() => setViewMode('grid')}
                    title="Card View"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                      color: viewMode === 'grid' ? BRAND.red : '#64748b',
                      fontSize: 12.5,
                      fontWeight: viewMode === 'grid' ? 650 : 500,
                      cursor: 'pointer',
                      boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <FiGrid size={14} color={BRAND.red} />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table or Grid Rendering */}
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: BRAND.red, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Loading policy records...</div>
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <FiFileText size={38} color={BRAND.red} style={{ color: BRAND.red, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 4 }}>No Policies Found</div>
                <div style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto 16px' }}>
                  No HR policies match your current query or category filter.
                </div>
                {(search || selectedCategory !== 'All' || statusFilter !== 'all') ? (
                  <button
                    onClick={() => { setSearch(''); setSelectedCategory('All'); setStatusFilter('all'); }}
                    style={{
                      padding: '6px 14px',
                      background: BRAND.redTint,
                      border: 'none',
                      borderRadius: 8,
                      color: BRAND.red,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={handleOpenCreateModal}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 18px',
                      background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)'
                    }}
                  >
                    <FiPlus size={15} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} style={{ color: '#ffffff', stroke: '#ffffff' }} />
                    <span style={{ color: '#ffffff' }}>Create Policy</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              /* ── TABLE VIEW ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Policy Details</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Version & Date</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Status</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Document</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPolicies.map((policy, idx) => {
                      const sm = policy.is_active
                        ? policy.is_published
                          ? STATUS_CONFIG.published
                          : STATUS_CONFIG.draft
                        : STATUS_CONFIG.retired;

                      return (
                        <tr
                          key={policy.policy_id}
                          style={{
                            borderBottom: idx < filteredPolicies.length - 1 ? '1px solid #f1f5f9' : 'none',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbff')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Title & Overview */}
                          <td style={{ padding: '13px 16px', maxWidth: 360 }}>
                            <div
                              onClick={() => setViewingPolicy(policy)}
                              style={{ fontWeight: 650, color: BRAND.navy, fontSize: 14.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = BRAND.red)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = BRAND.navy)}
                            >
                              <span>{policy.title}</span>
                              <FiChevronRight size={13.5} color={BRAND.red} style={{ color: BRAND.red }} />
                            </div>
                            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>
                              {policy.summary || 'No overview provided.'}
                            </div>
                            {Array.isArray(policy.keywords) && policy.keywords.length > 0 && (
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                                {policy.keywords.slice(0, 3).map((kw, i) => (
                                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, fontSize: 11, padding: '2px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, color: '#475569', fontWeight: 600 }}>
                                    <FiTag size={10} color={BRAND.red} style={{ color: BRAND.red }} /> {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-block', padding: '4px 10px', background: BRAND.redTint, borderRadius: 6, fontSize: 11.5, fontWeight: 650, color: BRAND.red }}>
                              {policy.category}
                            </span>
                          </td>

                          {/* Version & Date */}
                          <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 650, color: BRAND.navy, fontSize: 13.5 }}>v{policy.version_number || '1.0'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                              <FiCalendar size={12} color={BRAND.red} /> {formatDate(policy.effective_date)}
                            </div>
                          </td>

                          {/* AI RAG Status */}
                          <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                            {policy.ai_status === 'indexed' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 14, fontSize: 11.5, fontWeight: 650, color: '#4338ca' }}>
                                <FiCpu size={13} color={BRAND.red} /> AI Synced
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                                AI Ready
                              </span>
                            )}
                          </td>

                          {/* Document Download */}
                          <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleDownloadDoc(policy)}
                              title={policy.document_name || 'Download PDF'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 7,
                                cursor: 'pointer',
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: '#1e293b',
                                fontFamily: FONT_BODY,
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND.red; e.currentTarget.style.color = BRAND.red; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                            >
                              <FiDownload size={13.5} color={BRAND.red} />
                              <span style={{ maxWidth: 125, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {policy.document_name || 'Download PDF'}
                              </span>
                              {policy.document_size > 0 && (
                                <span style={{ fontSize: 11, color: '#64748b' }}>({formatFileSize(policy.document_size)})</span>
                              )}
                            </button>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: sm.bg, border: `1px solid ${sm.border}`, borderRadius: 20, fontSize: 11.5, fontWeight: 650, color: sm.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot }} />
                              {sm.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                              <button
                                onClick={() => setViewingPolicy(policy)}
                                title="Read Policy"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5.5px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              >
                                <FiEye size={13} color={BRAND.red} /> Read
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(policy)}
                                title="Edit Policy"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5.5px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              >
                                <FiEdit2 size={12} color={BRAND.red} /> Edit
                              </button>

                              {policy.is_published ? (
                                <button
                                  onClick={() => handleToggleStatus(policy, false, true)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5.5px 10px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 7, cursor: 'pointer', fontSize: 11.5, fontWeight: 650, color: '#d97706', transition: 'all 0.15s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fde68a'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
                                >
                                  <FiSlash size={12} color={BRAND.red} /> Unpublish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(policy, true, true)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5.5px 10px', background: '#e8fbf0', border: '1px solid #bbf7d0', borderRadius: 7, cursor: 'pointer', fontSize: 11.5, fontWeight: 650, color: '#0fa958', transition: 'all 0.15s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#d1fae5'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#e8fbf0'; }}
                                >
                                  <FiCheckCircle size={12} color={BRAND.red} /> Publish
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(policy.policy_id)}
                                title="Delete Policy"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5.5px 8px', background: '#feecee', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer', color: BRAND.red, transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fca5a5'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#feecee'; }}
                              >
                                <FiTrash2 size={13} color={BRAND.red} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── CARD / REPOSITORY GRID VIEW ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {filteredPolicies.map((policy) => {
                  const sm = policy.is_active
                    ? policy.is_published
                      ? STATUS_CONFIG.published
                      : STATUS_CONFIG.draft
                    : STATUS_CONFIG.retired;

                  return (
                    <div
                      key={policy.policy_id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 14,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                      }}
                    >
                      <div>
                        {/* Top Badge Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ padding: '4px 9px', background: BRAND.redTint, borderRadius: 6, fontSize: 11.5, fontWeight: 650, color: BRAND.red }}>
                            {policy.category}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: sm.bg, border: `1px solid ${sm.border}`, borderRadius: 20, fontSize: 11.5, fontWeight: 650, color: sm.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot }} />
                            {sm.label}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          onClick={() => setViewingPolicy(policy)}
                          style={{
                            margin: '0 0 6px',
                            fontSize: 14.5,
                            fontWeight: 650,
                            color: BRAND.navy,
                            cursor: 'pointer',
                            lineHeight: 1.3
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = BRAND.red)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = BRAND.navy)}
                        >
                          {policy.title}
                        </h4>

                        {/* Version & Date */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                          <span style={{ fontWeight: 650, color: BRAND.navy, fontSize: 13 }}>v{policy.version_number || '1.0'}</span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FiCalendar size={12} color={BRAND.red} /> {formatDate(policy.effective_date)}
                          </span>
                        </div>

                        {/* Summary */}
                        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#475569', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {policy.summary || 'No overview summary provided.'}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div>
                        {policy.document_url && (
                          <div style={{ padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <FiPaperclip size={13} color={BRAND.red} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {policy.document_name || 'Official_Policy.pdf'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownloadDoc(policy)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.red, padding: 2 }}
                              title="Download"
                            >
                              <FiDownload size={13} color={BRAND.red} />
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                          <button
                            onClick={() => setViewingPolicy(policy)}
                            style={{ flex: 1, padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          >
                            <FiEye size={12} color={BRAND.red} /> Read
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(policy)}
                            style={{ padding: '6px 9px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                            title="Edit"
                          >
                            <FiEdit2 size={12} color={BRAND.red} />
                          </button>
                          <button
                            onClick={() => handleDelete(policy.policy_id)}
                            style={{ padding: '6px 9px', background: '#feecee', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: BRAND.red, cursor: 'pointer' }}
                            title="Delete"
                          >
                            <FiTrash2 size={12} color={BRAND.red} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── CREATE / EDIT POLICY MODAL ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: 'none',
              padding: 26,
              width: 680,
              maxWidth: '95vw',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              fontFamily: FONT_BODY
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: BRAND.redTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiFileText size={18} color={BRAND.red} stroke={BRAND.red} style={{ stroke: BRAND.red, color: BRAND.red }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BRAND.navy }}>
                    {editingPolicy ? 'Edit HR Policy' : 'Create New HR Policy'}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Official policy document configuration and organizational distribution
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.red, padding: 4 }}
              >
                <FiX size={20} color={BRAND.red} stroke={BRAND.red} style={{ stroke: BRAND.red, color: BRAND.red }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                  Policy Title <span style={{ color: BRAND.red }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Employee Code of Conduct"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 13px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: FONT_BODY
                  }}
                />
              </div>

              {/* Grid: Category & Version */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                    Category <span style={{ color: BRAND.red }}>*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 13px',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      fontSize: 13,
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      fontFamily: FONT_BODY
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                    Version Number
                  </label>
                  <input
                    type="text"
                    placeholder="1.0"
                    value={formData.versionNumber}
                    onChange={(e) => setFormData({ ...formData, versionNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 13px',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      fontSize: 13,
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: FONT_BODY
                    }}
                  />
                </div>
              </div>

              {/* Grid: Effective Date & Keywords */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 13px',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      fontSize: 13,
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: FONT_BODY
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                    Keywords / RAG Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="attendance, grace period, core hours"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 13px',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      fontSize: 13,
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: FONT_BODY
                    }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                  Executive Overview / Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide a concise 2-3 sentence overview..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 13px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: FONT_BODY
                  }}
                />
              </div>

              {/* Document Attachment */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                  Attach Signed Document (PDF/DOCX) {!editingPolicy && <span style={{ color: BRAND.red }}>*</span>}
                </label>
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 12,
                    padding: 20,
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <FiUploadCloud size={28} color={BRAND.red} stroke={BRAND.red} style={{ stroke: BRAND.red, color: BRAND.red }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>
                      {selectedFile ? selectedFile.name : editingPolicy ? `Current: ${editingPolicy.document_name} (Click to replace)` : 'Click to upload official PDF or DOCX file'}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Maximum file size: 15MB</span>
                  </div>
                </div>
              </div>

              {/* Optional HTML Text */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>
                  Policy Text Overview (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional plain text or HTML for web readers... (Full PDF text is extracted automatically for AI chatbot answers)"
                  value={formData.contentHtml}
                  onChange={(e) => setFormData({ ...formData, contentHtml: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 13px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 13,
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: FONT_BODY
                  }}
                />
              </div>

              {/* Publish Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#e8fbf0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0fa958' }}>Publish Immediately</div>
                  <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                    When checked, policy will immediately become visible to employees and the AI Assistant.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0fa958' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#4b5563',
                    fontFamily: FONT_BODY
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 22px',
                    background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    border: 'none',
                    borderRadius: 10,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                    fontFamily: FONT_BODY
                  }}
                >
                  <span style={{ color: '#ffffff' }}>
                    {submitting ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Save Policy'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── POLICY READER MODAL ── */}
      {viewingPolicy && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setViewingPolicy(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: 'none',
              padding: 28,
              width: 760,
              maxWidth: '95vw',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: FONT_BODY
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: BRAND.red, background: BRAND.redTint, padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {viewingPolicy.category}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: BRAND.navy, background: '#f1f5f9', padding: '3px 9px', borderRadius: 6 }}>
                    v{viewingPolicy.version_number || '1.0'}
                  </span>
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: BRAND.navy }}>
                  {viewingPolicy.title}
                </h2>
              </div>
              <button onClick={() => setViewingPolicy(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.red, padding: 4 }}>
                <FiX size={20} color={BRAND.red} stroke={BRAND.red} style={{ stroke: BRAND.red, color: BRAND.red }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {viewingPolicy.summary && (
                <div style={{ padding: 16, background: BRAND.redTint, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.red, textTransform: 'uppercase', marginBottom: 5 }}>
                    Executive Summary
                  </div>
                  <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.55 }}>
                    {viewingPolicy.summary}
                  </div>
                </div>
              )}

              {viewingPolicy.content_html ? (
                <div
                  style={{ fontSize: 14.5, color: '#111827', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: viewingPolicy.content_html }}
                />
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13.5, background: '#f8fafc', borderRadius: 8 }}>
                  This policy content is maintained in the attached official document file. Click below to download.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                <FiCalendar size={14} color={BRAND.red} stroke={BRAND.red} style={{ stroke: BRAND.red, color: BRAND.red }} /> Effective: {formatDate(viewingPolicy.effective_date)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 16px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#374151',
                    fontFamily: FONT_BODY
                  }}
                >
                  <FiPrinter size={15} color={BRAND.red} stroke={BRAND.red} style={{ stroke: BRAND.red, color: BRAND.red }} /> Print
                </button>
                <button
                  onClick={() => handleDownloadDoc(viewingPolicy)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 20px',
                    background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: '#ffffff',
                    boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)',
                    fontFamily: FONT_BODY
                  }}
                >
                  <WhiteDownloadIcon size={15} />
                  <span style={{ color: '#ffffff' }}>Download Official Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
