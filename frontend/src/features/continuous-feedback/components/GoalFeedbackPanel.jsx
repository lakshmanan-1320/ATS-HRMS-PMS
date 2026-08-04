import React, { useEffect, useState } from 'react';
import { useContinuousFeedbackStore } from '../store/continuousFeedback.store';
import ActionItemCard from './ActionItemCard';
import ActionItemDialog from './ActionItemDialog';
import PraiseCard from './PraiseCard';
import ReflectionCard from './ReflectionCard';
import FeedbackTimeline from './FeedbackTimeline';
import { getGoalReflectionTemplate, submitGoalReflectionAnswers } from '../api/continuousFeedback.api';
import { getEmployees } from '../../goal/goal.api';

export default function GoalFeedbackPanel({ goal, allGoals = [], activeTab, isManager, selectedEmployee, assignments = [], onSelectEmployee, onRefreshAssignments, readOnly = false }) {
  const {
    feedbacks, reflections, actionItems, praises, timeline, loading,
    feedbacksPagination, reflectionsPagination, actionItemsPagination, praisesPagination, timelinePagination,
    fetchGoalFeedbackData, loadMore, addFeedback, addReflection, addActionItem,
    toggleCompleteActionItem, verifyActionItem, addPraise
  } = useContinuousFeedbackStore();

  const [orgEmployees, setOrgEmployees] = useState([]);

  useEffect(() => {
    getEmployees()
      .then(data => {
        const empList = Array.isArray(data) ? data : (data?.data || []);
        setOrgEmployees(empList);
      })
      .catch(() => {});
  }, []);

  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('COACHING');
  
  // Reflection template state
  const [templateQuestions, setTemplateQuestions] = useState([]);
  const [isTemplateLocked, setIsTemplateLocked] = useState(false);
  const [dynamicAnswers, setDynamicAnswers] = useState({});

  // Legacy Reflection fields fallback
  const [learned, setLearned] = useState('');
  const [challenges, setChallenges] = useState('');
  const [support, setSupport] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  // Praise fields
  const [praiseCategory, setPraiseCategory] = useState('GREAT_LEADERSHIP');
  const [praiseMessage, setPraiseMessage] = useState('');
  const [praiseVisibility, setPraiseVisibility] = useState('PUBLIC');

  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (goal?.goal_id) {
      fetchGoalFeedbackData(goal.goal_id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null);
      loadTemplate(goal.goal_id);
    }
  }, [goal?.goal_id, selectedEmployee?.employee_id]);

  const loadTemplate = async (goalId) => {
    try {
      const res = await getGoalReflectionTemplate(goalId);
      if (res.data?.success) {
        setTemplateQuestions(res.data.data?.questions || []);
        setIsTemplateLocked(res.data.data?.is_locked || false);
      }
    } catch (e) {
      console.error('Failed to load reflection template:', e);
    }
  };

  const handlePostFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmitting(true);
    const empId = selectedEmployee?.employee_id || goal.assigned_to_employee_id || null;
    try {
      await addFeedback(goal.goal_id, {
        feedback_type: feedbackType,
        feedback_text: feedbackText,
        employee_id: empId
      }, empId);
      setFeedbackText('');
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReflection = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const empId = selectedEmployee?.employee_id || goal.assigned_to_employee_id || null;
    try {
      if (templateQuestions.length > 0) {
        const answersPayload = templateQuestions.map(q => ({
          template_id: q.template_id,
          answer: dynamicAnswers[q.template_id] || ''
        }));
        await submitGoalReflectionAnswers(goal.goal_id, { answers: answersPayload });
        setDynamicAnswers({});
      } else {
        await addReflection(goal.goal_id, {
          what_i_learned: learned,
          challenges_faced: challenges,
          support_needed: support,
          next_steps: nextSteps
        });
        setLearned('');
        setChallenges('');
        setSupport('');
        setNextSteps('');
      }
      fetchGoalFeedbackData(goal.goal_id, empId);
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateActionItem = async (data) => {
    const empId = selectedEmployee?.employee_id || goal.assigned_to_employee_id || null;
    try {
      await addActionItem(goal.goal_id, data, empId);
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePostPraise = async (e) => {
    e.preventDefault();
    if (!praiseMessage.trim()) return;
    setSubmitting(true);
    const empId = selectedEmployee?.employee_id || goal.assigned_to_employee_id || null;
    try {
      await addPraise(goal.goal_id, {
        category: praiseCategory,
        message: praiseMessage,
        visibility: praiseVisibility,
        to_user: empId
      }, empId);
      setPraiseMessage('');
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {isManager && assignments && assignments.length > 0 && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Employee Assignment:</span>
            <select
              value={selectedEmployee?.employee_id || ''}
              onChange={e => {
                const found = assignments.find(a => a.employee_id === e.target.value);
                if (found && onSelectEmployee) onSelectEmployee(found);
              }}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#1e293b', background: '#fff' }}
            >
              {assignments.map(a => (
                <option key={a.employee_id} value={a.employee_id}>
                  👤 {a.employee_name} ({a.department_name || 'Team Member'})
                </option>
              ))}
            </select>
          </div>
          {selectedEmployee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Status:</span>
                {isManager ? (
                  <select
                    value={selectedEmployee.status}
                    onChange={async (e) => {
                      try {
                        const newStatus = e.target.value;
                        const defaultOutcome = newStatus === 'COMPLETED' ? 'ACHIEVED' : null;
                        const updateAssignmentStatusAction = useContinuousFeedbackStore.getState().updateAssignmentStatus;
                        await updateAssignmentStatusAction(goal.goal_id, selectedEmployee.assignment_id, newStatus, defaultOutcome, selectedEmployee.employee_id);
                        if (onRefreshAssignments) onRefreshAssignments();
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 700,
                      color: selectedEmployee.status === 'COMPLETED' ? '#16a34a' : '#2563eb',
                      background: selectedEmployee.status === 'COMPLETED' ? '#dcfce7' : '#dbeafe',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="ACTIVE" style={{ background: '#fff', color: '#2563eb' }}>ACTIVE</option>
                    <option value="COMPLETED" style={{ background: '#fff', color: '#16a34a' }}>COMPLETED</option>
                    <option value="ON_HOLD" style={{ background: '#fff', color: '#dc2626' }}>ON_HOLD</option>
                    <option value="PENDING" style={{ background: '#fff', color: '#475569' }}>PENDING</option>
                    <option value="CANCELLED" style={{ background: '#fff', color: '#94a3b8' }}>CANCELLED</option>
                  </select>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: selectedEmployee.status === 'COMPLETED' ? '#16a34a' : '#2563eb', background: selectedEmployee.status === 'COMPLETED' ? '#dcfce7' : '#dbeafe', padding: '3px 8px', borderRadius: 6 }}>
                    {selectedEmployee.status}
                  </span>
                )}
              </div>

              {selectedEmployee.status === 'COMPLETED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Completion Outcome:</span>
                  {isManager ? (
                    <select
                      value={selectedEmployee.completion_outcome || 'ACHIEVED'}
                      onChange={async (e) => {
                        try {
                          const outcome = e.target.value;
                          const updateAssignmentStatusAction = useContinuousFeedbackStore.getState().updateAssignmentStatus;
                          await updateAssignmentStatusAction(goal.goal_id, selectedEmployee.assignment_id, 'COMPLETED', outcome, selectedEmployee.employee_id);
                          if (onRefreshAssignments) onRefreshAssignments();
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11,
                        fontWeight: 700,
                        color: selectedEmployee.completion_outcome === 'ACHIEVED' ? '#16a34a' : '#ea580c',
                        background: selectedEmployee.completion_outcome === 'ACHIEVED' ? '#dcfce7' : '#ffedd5',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="ACHIEVED" style={{ background: '#fff', color: '#16a34a' }}>✅ Achieved</option>
                      <option value="NEEDS_DEVELOPMENT" style={{ background: '#fff', color: '#ea580c' }}>⚠️ Needs Development</option>
                    </select>
                  ) : (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: selectedEmployee.completion_outcome === 'ACHIEVED' ? '#16a34a' : '#ea580c',
                      background: selectedEmployee.completion_outcome === 'ACHIEVED' ? '#dcfce7' : '#ffedd5',
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      {selectedEmployee.completion_outcome === 'ACHIEVED' ? '✅ Achieved' : '⚠️ Needs Development'}
                    </span>
                  )}
                </div>
              )}

              <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#e0e7ff', padding: '3px 8px', borderRadius: 6 }}>
                {selectedEmployee.progress || 0}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 1. Coaching / Feedback Tab */}
      {activeTab === 'Feedback' && (
        <div>
          {isManager && !readOnly && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>Add Manager Coaching Note</div>
              <form onSubmit={handlePostFeedback}>
                <div style={{ marginBottom: 8 }}>
                  <select
                    value={feedbackType}
                    onChange={e => setFeedbackType(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, marginRight: 8 }}
                  >
                    <option value="COACHING">💬 Coaching Note</option>
                    <option value="PRAISE">🏆 Praise / Kudos</option>
                    <option value="CORRECTIVE">🎯 Area of Improvement</option>
                    <option value="CHECKIN">📅 Check-in Note</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  placeholder="Provide constructive feedback or coaching note for employee growth..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    {submitting ? 'Posting...' : 'Post Coaching Note'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Coaching History ({feedbacks.length})</div>
          {feedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 13 }}>No feedback notes added yet.</div>
          ) : (
            <>
              {feedbacks.map(f => (
                <div key={f.feedback_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#6366f1' }}>{f.feedback_type} FEEDBACK</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(f.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>{f.feedback_text}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>By {f.manager_name || 'Manager'}</div>
                </div>
              ))}
              {feedbacksPagination.currentPage < feedbacksPagination.totalPages && (
                <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 10 }}>
                  <button 
                    onClick={() => loadMore('feedbacks', goal.goal_id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)}
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 2. Action Items Tab */}
      {activeTab === 'Action Items' && (
        <div>
          {!goal.assigned_to_employee_id && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
              💡 <strong>Department Parent Goal:</strong> Action items are assigned to individual employees on their goal instances. Click on an employee's sub-goal under <strong>Goal Hierarchy</strong> (Overview tab) to open their goal and assign action items.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Action Items ({actionItems.length})</span>
            {isManager && !readOnly && (
              <button onClick={() => setIsActionDialogOpen(true)} style={{ background: '#00b386', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + Assign Action Item
              </button>
            )}
          </div>

          {actionItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 13 }}>No action items assigned yet.</div>
          ) : (
            <>
              {actionItems.map(item => (
                <ActionItemCard
                  key={item.action_item_id}
                  item={item}
                  isManager={isManager}
                  readOnly={readOnly}
                  onToggleComplete={(id) => {
                    toggleCompleteActionItem(goal.goal_id, id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)
                      .then(() => { if (onRefreshAssignments) onRefreshAssignments(); });
                  }}
                  onVerify={(id) => {
                    verifyActionItem(goal.goal_id, id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)
                      .then(() => { if (onRefreshAssignments) onRefreshAssignments(); });
                  }}
                />
              ))}
              {actionItemsPagination.currentPage < actionItemsPagination.totalPages && (
                <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 10 }}>
                  <button 
                    onClick={() => loadMore('actionItems', goal.goal_id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)}
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}

          <ActionItemDialog
            isOpen={isActionDialogOpen}
            onClose={() => setIsActionDialogOpen(false)}
            onSubmit={handleCreateActionItem}
            defaultAssigneeId={selectedEmployee?.employee_id || goal.assigned_to_employee_id}
            assigneeName={selectedEmployee?.employee_name || goal.assigned_to_employee_name || goal.owner_employee_name}
            departmentName={goal.assigned_to_department_name}
          />
        </div>
      )}

      {/* 3. Reflections Tab */}
      {activeTab === 'Reflections' && (
        <div>
          {!isManager && reflections.length === 0 && !readOnly && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#166534' }}>Submit Self Reflection</div>
                {isTemplateLocked && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: 12 }}>
                    🔒 Template Locked
                  </span>
                )}
              </div>

              <form onSubmit={handlePostReflection}>
                {templateQuestions.length > 0 ? (
                  templateQuestions.map((q, idx) => (
                    <div key={q.template_id} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                        Q{idx + 1}. {q.question} {q.is_required && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      {(() => {
                        if (q.input_type === 'TEXT') {
                          return (
                            <input
                              type="text"
                              required={q.is_required}
                              value={dynamicAnswers[q.template_id] || ''}
                              onChange={e => setDynamicAnswers({ ...dynamicAnswers, [q.template_id]: e.target.value })}
                              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                            />
                          );
                        } else if (q.input_type === 'RATING') {
                          return (
                            <div style={{ display: 'flex', gap: 6, margin: '4px 0' }}>
                              {[1, 2, 3, 4, 5].map(val => {
                                const active = dynamicAnswers[q.template_id] === String(val);
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setDynamicAnswers({ ...dynamicAnswers, [q.template_id]: String(val) })}
                                    style={{
                                      padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1',
                                      background: active ? '#0f766e' : '#fff',
                                      color: active ? '#fff' : '#1e293b',
                                      fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {val} ★
                                  </button>
                                );
                              })}
                            </div>
                          );
                        } else if (q.input_type === 'BOOLEAN') {
                          return (
                            <div style={{ display: 'flex', gap: 12, margin: '4px 0' }}>
                              {['Yes', 'No'].map(val => (
                                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1e293b', cursor: 'pointer', fontWeight: 600 }}>
                                  <input
                                    type="radio"
                                    name={`q-${q.template_id}`}
                                    checked={dynamicAnswers[q.template_id] === val}
                                    onChange={() => setDynamicAnswers({ ...dynamicAnswers, [q.template_id]: val })}
                                  />
                                  {val}
                                </label>
                              ))}
                            </div>
                          );
                        } else if (q.input_type === 'CHOICE') {
                          return (
                            <select
                              required={q.is_required}
                              value={dynamicAnswers[q.template_id] || ''}
                              onChange={e => setDynamicAnswers({ ...dynamicAnswers, [q.template_id]: e.target.value })}
                              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, background: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="">-- Select Option --</option>
                              {(q.choices || '').split(',').map(choice => {
                                const clean = choice.trim();
                                return clean ? <option key={clean} value={clean}>{clean}</option> : null;
                              })}
                            </select>
                          );
                        } else if (q.input_type === 'CHECKLIST') {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '4px 0' }}>
                              {(q.choices || '').split(',').map(choice => {
                                const clean = choice.trim();
                                if (!clean) return null;
                                const currentSelections = (dynamicAnswers[q.template_id] || '').split(',').map(s => s.trim()).filter(Boolean);
                                const isChecked = currentSelections.includes(clean);
                                const handleCheckboxChange = (checked) => {
                                  let updated;
                                  if (checked) {
                                    updated = [...currentSelections, clean];
                                  } else {
                                    updated = currentSelections.filter(s => s !== clean);
                                  }
                                  setDynamicAnswers({ ...dynamicAnswers, [q.template_id]: updated.join(', ') });
                                };
                                return (
                                  <label key={clean} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1e293b', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => handleCheckboxChange(e.target.checked)}
                                    />
                                    {clean}
                                  </label>
                                );
                              })}
                            </div>
                          );
                        } else {
                          return (
                            <textarea
                              rows={2}
                              required={q.is_required}
                              value={dynamicAnswers[q.template_id] || ''}
                              onChange={e => setDynamicAnswers({ ...dynamicAnswers, [q.template_id]: e.target.value })}
                              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                            />
                          );
                        }
                      })()}
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>What I Learned</label>
                      <input type="text" placeholder="e.g. Learned delegation techniques..." value={learned} onChange={e => setLearned(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Challenges Faced</label>
                      <input type="text" placeholder="e.g. Managing initial task handoff..." value={challenges} onChange={e => setChallenges(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Support Needed</label>
                      <input type="text" placeholder="e.g. Weekly 10-min review with manager..." value={support} onChange={e => setSupport(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>My Next Steps</label>
                      <input type="text" placeholder="e.g. Conduct knowledge sharing session..." value={nextSteps} onChange={e => setNextSteps(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" disabled={submitting} style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {submitting ? 'Submitting...' : 'Submit Reflection'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Employee Reflections ({reflections.length})</div>
          {reflections.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 13 }}>No reflections submitted yet.</div>
          ) : (
            <>
              {reflections.map(r => <ReflectionCard key={r.reflection_id} reflection={r} />)}
              {reflectionsPagination.currentPage < reflectionsPagination.totalPages && (
                <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 10 }}>
                  <button 
                    onClick={() => loadMore('reflections', goal.goal_id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)}
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 4. Praise Tab */}
      {activeTab === 'Praise' && (
        <div>
          {isManager && !readOnly && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>Send Praise Badge</div>
              <form onSubmit={handlePostPraise}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#78350f' }}>Category</label>
                    <select value={praiseCategory} onChange={e => setPraiseCategory(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                      <option value="GREAT_LEADERSHIP">👑 Great Leadership</option>
                      <option value="EXCELLENT_COLLABORATION">🤝 Excellent Collaboration</option>
                      <option value="PROBLEM_SOLVER">🧩 Problem Solver</option>
                      <option value="CUSTOMER_APPRECIATION">🌟 Customer Appreciation</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#78350f' }}>Visibility</label>
                    <select value={praiseVisibility} onChange={e => setPraiseVisibility(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}>
                      <option value="PUBLIC">🌐 Public (All Org)</option>
                      <option value="TEAM">👥 Team Only</option>
                      <option value="PRIVATE">🔒 Private (Employee & Manager)</option>
                    </select>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Write a message of appreciation..."
                  value={praiseMessage}
                  onChange={e => setPraiseMessage(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={submitting} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {submitting ? 'Awarding...' : 'Award Praise'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Praise & Recognition Badges ({praises.length})</div>
          {praises.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 13 }}>No praise badges awarded yet.</div>
          ) : (
            <>
              {praises.map(p => <PraiseCard key={p.praise_id} praise={p} />)}
              {praisesPagination.currentPage < praisesPagination.totalPages && (
                <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 10 }}>
                  <button 
                    onClick={() => loadMore('praises', goal.goal_id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)}
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 5. Coaching Timeline */}
      {activeTab === 'Timeline' && (
        <div>
          <FeedbackTimeline timeline={timeline} loading={loading} />
          {timelinePagination.currentPage < timelinePagination.totalPages && (
            <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 10 }}>
              <button 
                onClick={() => loadMore('timeline', goal.goal_id, selectedEmployee?.employee_id || goal.assigned_to_employee_id || null)}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
