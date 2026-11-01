import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, FiPlus, FiXCircle, FiSave, FiEdit, FiPlayCircle, 
  FiLock, FiArchive, FiAlertTriangle, FiInfo, FiSliders, FiEdit2, FiCheckCircle 
} from 'react-icons/fi';
import PageHeader from '../../components/common/PageHeader';
import * as api from './financialYears.api';
import GoalRulesCard from './GoalRulesCard';

const s = {
  card: {
    background: '#ffffff',
    border: '1px solid #E3E7EE',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    marginTop: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '800',
    color: '#001233'
  },
  desc: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#7D8597'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px'
  },
  th: {
    padding: '12px 20px',
    color: '#7D8597',
    fontWeight: '700',
    background: '#f8fafc',
    borderBottom: '1px solid #cbd5e1',
    textTransform: 'uppercase',
    fontSize: '10px',
    letterSpacing: '0.08em'
  },
  td: {
    padding: '16px 20px',
    borderBottom: '1px solid #F1F4F8',
    color: '#33415C',
    fontWeight: '500'
  },
  badge: {
    borderRadius: '9999px',
    padding: '2px 10px',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-block'
  },
  actionBtn: {
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#33415C',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s'
  },
  createBtn: {
    background: 'linear-gradient(135deg, #0466C8, #0353A4)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(4, 102, 200, 0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px'
  },
  modal: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '460px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#f8fafc',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#001233',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#33415C',
    display: 'block',
    marginBottom: '6px'
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 1000,
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

export default function FinancialYearsPage() {
  const [financialYears, setFinancialYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedFy, setSelectedFy] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);
  
  // Confirm Dialog state
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'activate'|'close'|'archive', fy: object }
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesData, setRulesData] = useState({});
  const [rulesErrors, setRulesErrors] = useState({});

  const handleOpenRules = async (fy) => {
    setSelectedFy(fy);
    setRulesErrors({});
    try {
      setSaving(true);
      const res = await api.getGoalSettings(fy.financial_year_id);
      setRulesData(res || {});
      setShowRulesModal(true);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load Goal Rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRules = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateGoalSettings(selectedFy.financial_year_id, rulesData);
      showToast('Goal Rules updated successfully.');
      setShowRulesModal(false);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save Goal Rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getFinancialYears();
      setFinancialYears(res.data || res || []);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load Financial Years', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({ name: '', start_date: '', end_date: '' });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (fy) => {
    setModalMode('edit');
    setSelectedFy(fy);
    setFormData({
      name: fy.name,
      start_date: fy.start_date ? fy.start_date.split('T')[0] : '',
      end_date: fy.end_date ? fy.end_date.split('T')[0] : ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleFieldChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Financial Year Name is required.';
    if (!formData.start_date) errors.start_date = 'Start Date is required.';
    if (!formData.end_date) errors.end_date = 'End Date is required.';

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        errors.start_date = 'Start date must be before or equal to end date.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (modalMode === 'create') {
        await api.createFinancialYear(formData);
        showToast('Financial Year created successfully.');
      } else {
        await api.updateFinancialYear(selectedFy.financial_year_id, formData);
        showToast('Financial Year updated successfully.');
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save Financial Year.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeStatusTransition = async () => {
    if (!confirmAction) return;
    const { type, fy } = confirmAction;
    const financialYearId = fy.financial_year_id;

    try {
      setSaving(true);
      if (type === 'activate') {
        await api.activateFinancialYear(financialYearId);
        showToast(`Financial Year "${fy.name}" is now Active.`);
      } else if (type === 'close') {
        await api.closeFinancialYear(financialYearId);
        showToast(`Financial Year "${fy.name}" has been Closed.`);
      } else if (type === 'archive') {
        await api.archiveFinancialYear(financialYearId);
        showToast(`Financial Year "${fy.name}" has been Archived.`);
      }
      setConfirmAction(null);
      loadData();
    } catch (e) {
      showToast(e.response?.data?.message || `Failed to transition state.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'ACTIVE':
        return { ...s.badge, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
      case 'DRAFT':
        return { ...s.badge, background: '#EEF8FF', color: '#0353A4', border: '1px solid #c7d2fe' };
      case 'CLOSED':
        return { ...s.badge, background: '#F1F4F8', color: '#33415C', border: '1px solid #cbd5e1' };
      case 'ARCHIVED':
        return { ...s.badge, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
      default:
        return { ...s.badge, background: '#F1F4F8', color: '#33415C', border: '1px solid #cbd5e1' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div style={s.card}>
      {/* Header */}
      <PageHeader
        icon={FiCalendar}
        title="Financial Years"
        subtitle="Create, manage, and configure active financial year rules for cycle constraints"
        actions={
          <button onClick={handleOpenCreate} style={s.createBtn}>
            <FiPlus size={16} />
            Create Financial Year
          </button>
        }
      />

      {/* Loading state */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ height: '36px', background: '#F1F4F8', borderRadius: '8px' }} />
          <div style={{ height: '50px', background: '#F1F4F8', borderRadius: '8px' }} />
          <div style={{ height: '50px', background: '#F1F4F8', borderRadius: '8px' }} />
        </div>
      ) : financialYears.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7D8597' }}>
          <FiInfo size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>No Financial Years found.</p>
          <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Get started by creating your first Financial Year cycle.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Duration</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {financialYears.map((fy) => (
                <tr key={fy.financial_year_id}>
                  <td style={{ ...s.td, fontWeight: '700', color: '#001233' }}>{fy.name}</td>
                  <td style={{ ...s.td, color: '#7D8597' }}>
                    {formatDate(fy.start_date)} — {formatDate(fy.end_date)}
                  </td>
                  <td style={s.td}>
                    <span style={getStatusBadgeStyle(fy.status)}>{fy.status}</span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {fy.status === 'DRAFT' && (
                        <>
                          <button 
                            onClick={() => handleOpenRules(fy)} 
                            style={s.actionBtn}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0466C8'; e.currentTarget.style.color = '#0466C8' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#33415C' }}
                          >
                            <FiCalendar size={12} /> Goal Rules
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(fy)} 
                            style={s.actionBtn}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0466C8'; e.currentTarget.style.color = '#0466C8' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#33415C' }}
                          >
                            <FiEdit size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => setConfirmAction({ type: 'activate', fy })} 
                            style={{ ...s.actionBtn, color: '#059669', borderColor: '#a7f3d0', background: '#f0fdf4' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4' }}
                          >
                            <FiPlayCircle size={12} /> Activate
                          </button>
                        </>
                      )}

                      {fy.status === 'ACTIVE' && (
                        <>
                          <button 
                            onClick={() => handleOpenRules(fy)} 
                            style={s.actionBtn}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0466C8'; e.currentTarget.style.color = '#0466C8' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#33415C' }}
                          >
                            <FiCalendar size={12} /> Goal Rules
                          </button>
                          <button 
                            onClick={() => setConfirmAction({ type: 'close', fy })} 
                            style={{ ...s.actionBtn, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                          >
                            <FiLock size={12} /> Close
                          </button>
                        </>
                      )}

                      {fy.status === 'CLOSED' && (
                        <button 
                          onClick={() => setConfirmAction({ type: 'archive', fy })} 
                          style={{ ...s.actionBtn, color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fffbeb' }}
                        >
                          <FiArchive size={12} /> Archive
                        </button>
                      )}
                      
                      {fy.status === 'ARCHIVED' && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', paddingRight: '8px' }}>Locked</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={s.modalOverlay}>
          <form onSubmit={handleSave} style={s.modal}>
            <div>
              <h3 style={s.title}>{modalMode === 'create' ? 'Create Financial Year' : 'Edit Financial Year'}</h3>
              <p style={s.desc}>Specify names and date spans. Active cycles must not overlap.</p>
            </div>

            <div>
              <label style={s.label}>Financial Year Name</label>
              <input
                type="text"
                placeholder="e.g. FY 2026-27"
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                style={{
                  ...s.input,
                  borderColor: formErrors.name ? '#f43f5e' : '#cbd5e1'
                }}
              />
              {formErrors.name && (
                <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                  {formErrors.name}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={s.label}>Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={e => handleFieldChange('start_date', e.target.value)}
                  style={{
                    ...s.input,
                    borderColor: formErrors.start_date ? '#f43f5e' : '#cbd5e1'
                  }}
                />
                {formErrors.start_date && (
                  <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                    {formErrors.start_date}
                  </span>
                )}
              </div>

              <div>
                <label style={s.label}>End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => handleFieldChange('end_date', e.target.value)}
                  style={{
                    ...s.input,
                    borderColor: formErrors.end_date ? '#f43f5e' : '#cbd5e1'
                  }}
                />
                {formErrors.end_date && (
                  <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                    {formErrors.end_date}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1',
                  color: '#33415C', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 16px', background: 'linear-gradient(135deg, #0466C8, #0353A4)',
                  color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(4, 102, 200,0.2)'
                }}
              >
                {saving ? 'Saving...' : 'Save Financial Year'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#b45309' }}>
              <FiAlertTriangle size={24} />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#001233', margin: 0 }}>
                {confirmAction.type === 'activate' && 'Confirm Activation'}
                {confirmAction.type === 'close' && 'Confirm Close'}
                {confirmAction.type === 'archive' && 'Confirm Archive'}
              </h3>
            </div>
            
            <p style={{ fontSize: '13px', color: '#33415C', lineHeight: 1.5, margin: 0 }}>
              {confirmAction.type === 'activate' && (
                <>Are you sure you want to activate <span style={{ fontWeight: '700' }}>"{confirmAction.fy.name}"</span>? Only one Financial Year can be Active at any time. Activating this will automatically CLOSE the currently active year.</>
              )}
              {confirmAction.type === 'close' && (
                <>Are you sure you want to CLOSE <span style={{ fontWeight: '700' }}>"{confirmAction.fy.name}"</span>? Once closed, you will not be able to edit its configurations, but it remains available for historical tracking.</>
              )}
              {confirmAction.type === 'archive' && (
                <>Are you sure you want to ARCHIVE <span style={{ fontWeight: '700' }}>"{confirmAction.fy.name}"</span>? This will hide/freeze it permanently.</>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1',
                  color: '#33415C', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={executeStatusTransition}
                style={{
                  padding: '8px 16px',
                  background: confirmAction.type === 'activate' ? '#059669' : (confirmAction.type === 'close' ? '#dc2626' : '#d97706'),
                  color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {saving ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div style={s.modalOverlay}>
          <form onSubmit={handleSaveRules} style={{ ...s.modal, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div>
              <h3 style={s.title}>Goal Settings Rules — {selectedFy.name}</h3>
              <p style={s.desc}>Configure creation limits and approval workflow policies for this year.</p>
            </div>

            <GoalRulesCard 
              formData={rulesData} 
              onChange={(field, val) => setRulesData(prev => ({ ...prev, [field]: val }))}
              errors={rulesErrors}
              readOnly={selectedFy.status !== 'DRAFT' && selectedFy.status !== 'ACTIVE'}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                style={{
                  padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1',
                  color: '#33415C', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              {(selectedFy.status === 'DRAFT' || selectedFy.status === 'ACTIVE') && (
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 16px', background: 'linear-gradient(135deg, #0466C8, #0353A4)',
                    color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '12px',
                    fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(4, 102, 200,0.2)'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Rules'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Local Toast */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.type === 'success' ? '#ecfdf5' : '#fff5f5',
          borderColor: toast.type === 'success' ? '#a7f3d0' : '#fecaca',
          color: toast.type === 'success' ? '#065f46' : '#991b1b'
        }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
