import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiFileText,
  FiSearch,
  FiDownload,
  FiEye,
  FiCalendar,
  FiTag,
  FiX,
  FiShield,
  FiZap,
  FiShare2,
  FiCopy,
  FiLink
} from 'react-icons/fi';
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx';
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar';

const CATEGORIES = [
  'All',
  'Attendance & Working Hours',
  'Leave & Employee Conduct',
  'IT & Data Security',
  'Benefits & Compensation',
  'General HR'
];

export default function EmployeePolicies() {
  const { id: routePolicyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    // Check URL params or route ID for direct deep-linking
    const queryParams = new URLSearchParams(location.search);
    const queryPolicyId = queryParams.get('id');
    const targetId = routePolicyId || queryPolicyId;

    if (targetId && policies.length > 0) {
      const match = policies.find((p) => String(p.policy_id) === String(targetId));
      if (match) {
        setSelectedPolicy(match);
      }
    }
  }, [routePolicyId, location.search, policies]);

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
      console.error('Error fetching employee policies:', err);
      toast.error('Failed to load company policies.');
    } finally {
      setLoading(false);
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

  const copyDirectLink = (policy, e) => {
    if (e) e.stopPropagation();
    const directUrl = `${window.location.origin}/employee/policies/${policy.policy_id}`;
    navigator.clipboard.writeText(directUrl);
    toast.success('Direct Policy link copied to clipboard!');
  };

  const openPolicyReader = (policy) => {
    setSelectedPolicy(policy);
    navigate(`/employee/policies/${policy.policy_id}`, { replace: true });
  };

  const closePolicyReader = () => {
    setSelectedPolicy(null);
    navigate('/employee/policies', { replace: true });
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.summary?.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.keywords && p.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase())));

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
    fontFamily: 'inherit'
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
      <EmployeeSidebar active="policies" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <EmployeeTopBar />

        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <FiShield size={14} /> Governance & Guidelines
              </div>
              <h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
                Company Policies & HR Guidelines
              </h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Browse official company policies, codes of conduct, and workplace guidelines. Share direct links with team members.
              </p>
            </div>

          </div>

          {/* Controls & Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 320 }}>
              <FiSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search policy title, summary, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...iStyle, paddingLeft: 38, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              />
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    background: selectedCategory === cat ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#ffffff',
                    border: selectedCategory === cat ? 'none' : '1px solid #cbd5e1',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                    boxShadow: selectedCategory === cat ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Policy Catalog Grid */}
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              Loading policies...
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px dashed #cbd5e1', boxShadow: cardShadow }}>
              <FiFileText size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>No Matching Policies</div>
              <div style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto' }}>
                No published company policies match your search term or selected category filter.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filteredPolicies.map((policy) => (
                <div
                  key={policy.policy_id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    border: '1px solid #cbd5e1',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: cardShadow,
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(99, 102, 241, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.borderColor = '#a5b4fc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = cardShadow;
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  <div>
                    {/* Category Tag & Version */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ display: 'inline-block', padding: '3px 9px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>
                        {policy.category}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>v{policy.version_number}</span>
                    </div>

                    {/* Policy Title */}
                    <h3
                      onClick={() => openPolicyReader(policy)}
                      style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#1e293b', cursor: 'pointer', lineHeight: 1.3, transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#6366f1')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
                    >
                      {policy.title}
                    </h3>

                    {/* Executive Summary */}
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {policy.summary || 'No overview summary provided.'}
                    </p>

                    {/* Keywords */}
                    {policy.keywords && policy.keywords.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                        {policy.keywords.slice(0, 3).map((kw, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#475569', fontWeight: 600 }}>
                            <FiTag size={10} style={{ color: '#94a3b8' }} /> {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer with Direct Share Link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 14, borderTop: '1px solid #f1f5f9', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                      <FiCalendar size={12} /> {policy.effective_date ? new Date(policy.effective_date).toLocaleDateString('en-IN') : 'Active'}
                    </span>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={(e) => copyDirectLink(policy, e)}
                        title="Copy Direct Link to Policy"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569' }}
                      >
                        <FiShare2 size={13} /> Share Link
                      </button>

                      <button
                        onClick={() => openPolicyReader(policy)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#ffffff', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)' }}
                      >
                        <FiEye size={13} /> Read
                      </button>

                      <button
                        onClick={() => handleDownloadDoc(policy)}
                        title="Download Official PDF"
                        style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', color: '#4338ca' }}
                      >
                        <FiDownload size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* POLICY READER MODAL */}
      {selectedPolicy && (
        <div style={BD} onClick={closePolicyReader}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #cbd5e1', padding: 28, width: 780, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedPolicy.category} • Version {selectedPolicy.version_number}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#1e293b' }}>
                  {selectedPolicy.title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={(e) => copyDirectLink(selectedPolicy, e)}
                  title="Copy Direct Link to Clipboard"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}
                >
                  <FiLink size={14} /> Copy Direct Link
                </button>
                <button onClick={closePolicyReader} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedPolicy.summary && (
                <div style={{ padding: 14, background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 4 }}>Executive Overview</div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{selectedPolicy.summary}</div>
                </div>
              )}

              <div
                style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: selectedPolicy.content_html }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <FiCalendar size={14} /> Effective: {selectedPolicy.effective_date ? new Date(selectedPolicy.effective_date).toLocaleDateString('en-IN') : 'N/A'}
              </div>
              <button
                onClick={() => handleDownloadDoc(selectedPolicy)}
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
