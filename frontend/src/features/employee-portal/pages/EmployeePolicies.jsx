import React, { useState, useEffect, useRef } from 'react';
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
  FiLink,
  FiLayers,
  FiClock
} from 'react-icons/fi';
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx';
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar';
import { useChatbot } from '../../../context/ChatbotContext.jsx';
import { PMS } from '../theme';
import { PmsCard, CardHeader, HeaderChip, BigStat, Pill, EmptyBox, T } from '../components/shared/PmsUI';
import { NeedHelpCard } from '../components/dashboard/DashboardFooterBanners';

const CATEGORIES = [
  'All',
  'Attendance & Working Hours',
  'Leave & Employee Conduct',
  'IT & Data Security',
  'Benefits & Compensation',
  'General'
];

export default function EmployeePolicies() {
  const { id: routePolicyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { openChat } = useChatbot();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const modalContentRef = useRef(null);

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

  useEffect(() => {
    if (selectedPolicy) {
      const queryParams = new URLSearchParams(location.search);
      const targetSection = queryParams.get('section');

      if (targetSection) {
        // Extract section number (e.g. "Section 4.2" -> "4.2")
        const sectionNumMatch = targetSection.match(/[\d.]+/);
        const sectionNum = sectionNumMatch ? sectionNumMatch[0] : targetSection;

        setTimeout(() => {
          if (!modalContentRef.current) return;
          
          if (sectionNum.toLowerCase() === 'general') {
            modalContentRef.current.scrollTop = 0;
            return;
          }

          const h3s = modalContentRef.current.querySelectorAll('h3');
          let found = false;
          for (const h3 of h3s) {
            if (h3.textContent.includes(sectionNum)) {
              h3.scrollIntoView({ behavior: 'smooth', block: 'center' });
              found = true;
              
              const originalBg = h3.style.backgroundColor;
              h3.style.transition = 'background-color 0.3s ease';
              h3.style.backgroundColor = '#fef08a';
              
              setTimeout(() => {
                if (h3) {
                  h3.style.transition = 'background-color 1s ease';
                  h3.style.backgroundColor = originalBg || 'transparent';
                }
              }, 3000);
              break;
            }
          }
          if (!found) {
            modalContentRef.current.scrollTop = 0;
          }
        }, 200);
      }
    }
  }, [selectedPolicy, location.search]);

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

  // ── Derived stats (real data only) ─────────────────────────────────────────
  const categoryCount = (cat) => (cat === 'All' ? policies.length : policies.filter((p) => p.category === cat).length);
  const activeCategories = new Set(policies.map((p) => p.category).filter(Boolean)).size;
  const now = new Date();
  const recentCount = policies.filter((p) => p.effective_date && (now - new Date(p.effective_date)) / 864e5 <= 90 && new Date(p.effective_date) <= now).length;
  const latest = [...policies]
    .filter((p) => p.effective_date)
    .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))[0];
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  const roundBtn = {
    width: 34, height: 34, borderRadius: '50%', flexShrink: 0, padding: 0,
    background: PMS.white, border: `1px solid ${PMS.border}`, color: PMS.navy,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  };

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: PMS.white, fontFamily: PMS.fontHead }}>
      <EmployeeSidebar active="policies" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <EmployeeTopBar title="Company Policies" />

        <main className="pms-main" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* ── Heading + search ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px 24px', flexWrap: 'wrap', paddingTop: 19 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: PMS.fontHead, fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, lineHeight: 1.5, color: PMS.navy, letterSpacing: '-0.5px' }}>
                Company <span style={{ color: PMS.blue }}>Policies</span>
              </div>
              <div style={{ fontFamily: PMS.fontHead, fontSize: 13, color: PMS.muted, lineHeight: '20px', marginTop: -2 }}>
                Browse official company policies, codes of conduct and workplace guidelines.
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 16px', width: 340, maxWidth: '100%',
              background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: 21, boxSizing: 'border-box',
            }}>
              <FiSearch size={14} color={PMS.navy} style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search title, summary or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search policies"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: PMS.fontHead, fontSize: 12, color: PMS.navy }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} title="Clear search" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: PMS.muted, display: 'flex' }}>
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ── Summary cards ────────────────────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: 39 }}>
            <PmsCard style={{ minHeight: 0 }}>
              <CardHeader title="Total Policies" chip={<HeaderChip icon={<FiFileText size={14} />} />} />
              <BigStat value={loading ? '—' : policies.length} pill="Published" pillTone="blue" caption="Available to all employees" />
            </PmsCard>
            <PmsCard style={{ minHeight: 0 }}>
              <CardHeader title="Categories" chip={<HeaderChip icon={<FiLayers size={14} />} />} />
              <BigStat value={loading ? '—' : activeCategories} pill={`of ${CATEGORIES.length - 1}`} caption="Policy areas covered" />
            </PmsCard>
            <PmsCard style={{ minHeight: 0 }}>
              <CardHeader title="Recently Effective" chip={<HeaderChip icon={<FiClock size={14} />} />} />
              <BigStat value={loading ? '—' : recentCount} pill="Last 90 days" caption={recentCount ? 'New or updated policies' : 'No recent changes'} />
            </PmsCard>
            <PmsCard style={{ minHeight: 0 }}>
              <CardHeader
                title="Latest Policy"
                chip={<HeaderChip onClick={latest ? () => openPolicyReader(latest) : undefined} icon={latest ? undefined : <FiShield size={14} />} title="Read latest policy" />}
              />
              <div style={{ marginTop: 3 }}>
                <div style={{ fontFamily: PMS.fontHead, fontSize: 16, fontWeight: 700, color: PMS.navy, lineHeight: '24px', marginTop: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {latest ? latest.title : '—'}
                </div>
                <div style={{ ...T.caption, marginTop: 4 }}>
                  {latest ? `Effective ${fmtDate(latest.effective_date)}` : 'No effective dates yet'}
                </div>
              </div>
            </PmsCard>
          </div>

          {/* ── Category tabs ────────────────────────────────────────────── */}
          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div role="tablist" aria-label="Policy category" className="pms-tabs-scroll" style={{
              display: 'flex', alignItems: 'center', height: 44, padding: '0 5px', gap: 2, maxWidth: '100%',
              background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, borderRadius: 22, boxSizing: 'border-box',
            }}>
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat)}
                    className="pms-focus"
                    style={{
                      height: 34, padding: '0 16px', borderRadius: 17, border: 'none', flexShrink: 0,
                      background: active ? PMS.white : 'transparent',
                      boxShadow: active ? '0 4px 12px rgba(0,18,51,0.08)' : 'none',
                      color: active ? PMS.navy : PMS.muted,
                      fontFamily: PMS.fontHead, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {cat}
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 10, padding: '0 5px', boxSizing: 'border-box', fontSize: 10.5,
                      background: active ? PMS.gradBlue : PMS.white, color: active ? PMS.white : PMS.navy,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>{categoryCount(cat)}</span>
                  </button>
                );
              })}
            </div>
            <span style={{ ...T.caption, whiteSpace: 'nowrap' }}>
              {loading ? 'Loading…' : `${filteredPolicies.length} of ${policies.length} policies`}
            </span>
          </div>

          {/* ── Policy catalog ───────────────────────────────────────────── */}
          <div style={{ marginTop: 25 }}>
            {loading ? (
              <EmptyBox icon={<FiFileText size={14} />} title="Loading policies…" sub="Fetching the latest published versions" style={{ minHeight: 180 }} />
            ) : filteredPolicies.length === 0 ? (
              <EmptyBox
                icon={<FiFileText size={14} />}
                title="No matching policies"
                sub="No published policies match your search or selected category."
                style={{ minHeight: 180 }}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 25 }}>
                {filteredPolicies.map((policy) => (
                  <PmsCard key={policy.policy_id} className="pms-hover-lift" style={{ minHeight: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <Pill tone="blue" style={{ maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{policy.category}</Pill>
                      <Pill>v{policy.version_number}</Pill>
                    </div>

                    <button
                      type="button"
                      onClick={() => openPolicyReader(policy)}
                      className="pms-focus"
                      style={{ background: 'none', border: 'none', padding: 0, margin: '16px 0 0', textAlign: 'left', cursor: 'pointer', fontFamily: PMS.fontHead, fontSize: 16, fontWeight: 700, color: PMS.navy, lineHeight: '24px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = PMS.blue; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = PMS.navy; }}
                    >
                      {policy.title}
                    </button>

                    <div style={{ ...T.caption, marginTop: 6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {policy.summary || 'No overview summary provided.'}
                    </div>

                    {policy.keywords && policy.keywords.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                        {policy.keywords.slice(0, 3).map((kw, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 9px', borderRadius: 11, background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, fontFamily: PMS.fontHead, fontSize: 10, color: PMS.slate }}>
                            <FiTag size={9} color={PMS.muted} /> {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 14, borderTop: `1px solid ${PMS.pillGrey}`, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...T.small }}>
                          <FiCalendar size={12} /> {policy.effective_date ? fmtDate(policy.effective_date) : 'Active'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={(e) => copyDirectLink(policy, e)} title="Copy direct link" aria-label="Copy direct link" className="pms-icon-btn pms-focus" style={roundBtn}>
                            <FiShare2 size={13} />
                          </button>
                          <button type="button" onClick={() => handleDownloadDoc(policy)} title="Download official PDF" aria-label="Download official PDF" className="pms-icon-btn pms-focus" style={roundBtn}>
                            <FiDownload size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPolicyReader(policy)}
                            className="pms-hover-lift pms-focus"
                            style={{ height: 34, padding: '0 18px', borderRadius: 17, border: 'none', background: PMS.gradBlue, color: PMS.white, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: PMS.fontHead, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: PMS.shadowCta }}
                          >
                            <FiEye size={13} /> Read
                          </button>
                        </div>
                      </div>
                    </div>
                  </PmsCard>
                ))}
              </div>
            )}
          </div>

          {/* ── Help ─────────────────────────────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: 40 }}>
            <section className="pms-span-3" style={{
              background: PMS.navy, borderRadius: PMS.radiusPanel, minHeight: 120, padding: '24px 28px', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', gap: 18, minWidth: 0,
            }}>
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: PMS.steel, color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiShield size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: PMS.fontHead, fontSize: 16, fontWeight: 700, color: PMS.white }}>Stay informed, stay compliant.</div>
                <div style={{ fontFamily: PMS.fontHead, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                  Policies apply from their effective date. Share a direct link to point teammates to the exact policy.
                </div>
              </div>
            </section>
            <NeedHelpCard onContact={() => openChat()} />
          </div>
        </main>
      </div>

      {/* ── Policy reader ──────────────────────────────────────────────── */}
      {selectedPolicy && (
        <div
          onClick={closePolicyReader}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 18, 51, 0.55)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedPolicy.title}
            onClick={(e) => e.stopPropagation()}
            style={{ background: PMS.white, borderRadius: PMS.radiusInner, border: `1px solid ${PMS.border}`, width: 820, maxWidth: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,18,51,0.25)', overflow: 'hidden', fontFamily: PMS.fontHead }}
          >
            {/* Header */}
            <div style={{ padding: '22px 24px 18px', borderBottom: `1px solid ${PMS.pillGrey}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Pill tone="blue">{selectedPolicy.category}</Pill>
                  <Pill>Version {selectedPolicy.version_number}</Pill>
                </div>
                <div style={{ fontFamily: PMS.fontHead, fontSize: 20, fontWeight: 700, color: PMS.navy, lineHeight: '30px', marginTop: 10 }}>
                  {selectedPolicy.title}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={(e) => copyDirectLink(selectedPolicy, e)} title="Copy direct link" aria-label="Copy direct link" className="pms-icon-btn pms-focus" style={roundBtn}>
                  <FiLink size={14} />
                </button>
                <button type="button" onClick={closePolicyReader} title="Close" aria-label="Close" className="pms-icon-btn pms-focus" style={roundBtn}>
                  <FiX size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div ref={modalContentRef} className="pms-policy-content" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedPolicy.summary && (
                <div style={{ padding: '14px 16px', background: PMS.ice, border: `1px solid ${PMS.barSoft}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: PMS.blue, marginBottom: 4 }}>Executive overview</div>
                  <div style={{ fontSize: 13, color: PMS.slate, lineHeight: 1.6 }}>{selectedPolicy.summary}</div>
                </div>
              )}
              <div
                style={{ fontFamily: PMS.fontBody, fontSize: 14, color: PMS.navy, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: selectedPolicy.content_html }}
              />
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${PMS.pillGrey}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...T.caption }}>
                <FiCalendar size={13} /> Effective {fmtDate(selectedPolicy.effective_date)}
              </span>
              <button
                type="button"
                onClick={() => handleDownloadDoc(selectedPolicy)}
                className="pms-hover-lift pms-focus"
                style={{ height: 44, padding: '0 22px', borderRadius: 22, border: 'none', background: PMS.gradBlue, color: PMS.white, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: PMS.shadowCta }}
              >
                <FiDownload size={15} /> Download official PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
