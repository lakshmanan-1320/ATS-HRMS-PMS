import React, { useState, useEffect } from 'react';
import { Tabs, Empty, Timeline as AntTimeline, Card, Typography, Spin, Space, Tag as AntTag, Progress, Alert } from 'antd';
import { ClockCircleOutlined, AuditOutlined, InfoCircleOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { FiGrid, FiGlobe } from 'react-icons/fi';
import { STATUS_META, PRIORITY_META, CATEGORY_META, VISIBILITY_META } from '../pages/GoalPage';
import GoalKpiTab from '../../kpi/pages/GoalKpiTab';
import GoalFeedbackPanel from '../../continuous-feedback/components/GoalFeedbackPanel';
import GoalCompetencyPanel from './GoalCompetencyPanel';
import GoalSelfAssessmentPanel from './GoalSelfAssessmentPanel';
import Feedback360GoalPanel from './Feedback360GoalPanel';
import { getGoalProgressHistory } from '../../kpi/api/kpi.api';
import { getGoalDocuments, getGoalActivityLogs, getGoalById } from '../goal.api';
import { useContinuousFeedbackStore } from '../../continuous-feedback/store/continuousFeedback.store';
import { useModules } from '../../../hooks/useModules';

const { Text, Title } = Typography;

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Status Timeline ─── */
const STATUS_FLOW = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED'];

function GoalStatusTimeline({ currentStatus }) {
  const idx = STATUS_FLOW.indexOf(currentStatus);
  const isRejected = currentStatus === 'REJECTED';
  const isChangesReq = currentStatus === 'CHANGES_REQUESTED';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
      {STATUS_FLOW.map((s, i) => {
        const meta = STATUS_META[s] || { color: '#E3E7EE', label: s };
        const isActive = i <= idx && !isRejected && !isChangesReq;
        const isCurrent = s === currentStatus;

        return (
          <React.Fragment key={s}>
            {i > 0 && (
              <div style={{
                flex: 1, height: 3, borderRadius: 2,
                background: isActive ? meta.color : '#E3E7EE',
                transition: 'background 0.3s',
              }} />
            )}
            <div style={{
              width: isCurrent ? 28 : 22, height: isCurrent ? 28 : 22,
              borderRadius: '50%',
              background: isActive ? meta.color : '#E3E7EE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isCurrent ? 12 : 10, color: isActive ? '#fff' : '#94a3b8',
              fontWeight: 700, transition: 'all 0.3s',
              boxShadow: isCurrent ? `0 0 0 4px ${meta.color}20` : 'none',
              flexShrink: 0,
            }} title={meta.label}>
              {isActive ? '✓' : i + 1}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Goal Hierarchy Tree ─── */
function GoalTree({ goal, allGoals, currentGoalId, onSelectGoal, depth = 0 }) {
  const children = allGoals.filter(g => g.parent_goal_id === goal.goal_id);
  const isCurrent = goal.goal_id === currentGoalId;

  return (
    <div style={{ paddingLeft: depth > 0 ? 18 : 0 }}>
      <div
        onClick={() => onSelectGoal && onSelectGoal(goal)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
          borderRadius: 8,
          background: isCurrent ? 'rgba(4, 102, 200,0.12)' : depth === 0 ? 'rgba(4, 102, 200,0.04)' : '#ffffff',
          border: isCurrent ? '1.5px solid #0466C8' : depth === 0 ? '1px solid rgba(4, 102, 200,0.1)' : '1px solid #E3E7EE',
          marginBottom: 6, cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {depth > 0 && (
          <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 600 }}>└──</span>
        )}
        <span style={{
          fontSize: 12, fontWeight: isCurrent ? 800 : depth === 0 ? 700 : 600,
          color: isCurrent ? '#023E7D' : depth === 0 ? '#0466C8' : '#33415C',
          flex: 1
        }}>
          {goal.assigned_to_employee_name ? `👤 ${goal.assigned_to_employee_name} — ` : ''}{goal.title}
        </span>
        <span style={{
          fontSize: 10, color: STATUS_META[goal.status]?.color || '#7D8597',
          background: STATUS_META[goal.status]?.bg || '#F1F4F8',
          padding: '1px 6px', borderRadius: 4, fontWeight: 700,
        }}>{STATUS_META[goal.status]?.label}</span>
      </div>
      {children.map(child => (
        <GoalTree key={child.goal_id} goal={child} allGoals={allGoals} currentGoalId={currentGoalId} onSelectGoal={onSelectGoal} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ─── Detail Section ─── */
function DetailField({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #E3E7EE' }}>
      <div style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#001233', fontWeight: 700 }}>{value || '—'}</div>
    </div>
  );
}

export default function GoalDetailsDrawer({ goal: propGoal, allGoals = [], role, onClose, onEdit, onStatusChange, onSelectGoal: externalSelectGoal }) {
  const [selectedGoal = propGoal, setSelectedGoal] = useState(propGoal);
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { isEnabled } = useModules();

  const fetchGoalFeedbackData = useContinuousFeedbackStore(s => s.fetchGoalFeedbackData);
  const fetchTechniqueConfiguration = useContinuousFeedbackStore(s => s.fetchTechniqueConfiguration);
  const techniqueConfigs = useContinuousFeedbackStore(s => s.techniqueConfigs);
  const reflections = useContinuousFeedbackStore(s => s.reflections);
  const feedbacks = useContinuousFeedbackStore(s => s.feedbacks);
  const actionItems = useContinuousFeedbackStore(s => s.actionItems);

  useEffect(() => {
    setSelectedGoal(propGoal);
  }, [propGoal]);

  const handleSelectGoalNode = (targetGoal) => {
    setSelectedGoal(targetGoal);
    if (externalSelectGoal) externalSelectGoal(targetGoal);
  };

  const [goalDetail, setGoalDetail] = useState(null);

  useEffect(() => {
    const gid = selectedGoal?.goal_id || propGoal?.goal_id;
    if (gid) {
      getGoalById(gid)
        .then(res => {
          if (res.success && res.data) {
            setGoalDetail(res.data);
          }
        })
        .catch(err => {
          console.error("Failed to fetch full goal details in drawer:", err);
        });
    } else {
      setGoalDetail(null);
    }
  }, [selectedGoal?.goal_id, propGoal?.goal_id, selectedGoal?.status, selectedGoal?.progress, propGoal?.status, propGoal?.progress]);

  const goal = goalDetail || selectedGoal || propGoal;

  const fetchAssignments = () => {
    if (goal?.goal_id) {
      const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
      fetch(`/api/client-admin/goals/${goal.goal_id}/assignments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(r => r.json())
        .then(res => {
          const list = res.data || [];
          setAssignments(list);
          if (selectedEmployee) {
            const updatedEmp = list.find(e => e.employee_id === selectedEmployee.employee_id);
            if (updatedEmp) {
              setSelectedEmployee(updatedEmp);
            } else if (list.length > 0) {
              setSelectedEmployee(list[0]);
            }
          } else if (list.length > 0) {
            const targetEmp = list.find(e => e.employee_id === goal.assigned_to_employee_id);
            setSelectedEmployee(targetEmp || list[0]);
          } else {
            setSelectedEmployee(null);
          }
        })
        .catch(() => {
          setAssignments([]);
          setSelectedEmployee(null);
        });
    }
  };

  useEffect(() => {
    const loggedInEmpId = sessionStorage.getItem('employee_id');
    const isReviewerMode = goal?.employee_id && goal.employee_id !== loggedInEmpId;
    if (isReviewerMode) {
      const reviewerSubject = {
        employee_id: goal.employee_id,
        employee_name: goal.employee_name || 'Subject Employee',
        assignment_id: goal.assignment_id,
        status: 'ACTIVE'
      };
      setAssignments([reviewerSubject]);
      setSelectedEmployee(reviewerSubject);
    } else {
      fetchAssignments();
    }
  }, [goal?.goal_id, goal?.employee_id]);

  useEffect(() => {
    if (goal?.goal_id && goal.performance_technique === 'CONTINUOUS_FEEDBACK') {
      fetchTechniqueConfiguration('CONTINUOUS_FEEDBACK');
    }
  }, [goal?.goal_id, goal?.performance_technique, fetchTechniqueConfiguration]);

  useEffect(() => {
    if (goal?.goal_id && selectedEmployee?.employee_id && goal.performance_technique === 'CONTINUOUS_FEEDBACK') {
      fetchGoalFeedbackData(goal.goal_id, selectedEmployee.employee_id);
    }
  }, [goal?.goal_id, selectedEmployee?.employee_id, goal?.performance_technique, fetchGoalFeedbackData]);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showChanges, setShowChanges] = useState(false);
  const [changesReason, setChangesReason] = useState('');

  // Timeline progress history state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [documents, setDocuments] = useState({ attachments: [], links: [] });
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (activeTab === 'timeline' && goal?.goal_id) {
      fetchHistory();
    } else if (activeTab === 'documents' && goal?.goal_id) {
      fetchDocuments();
    } else if (activeTab === 'activity' && goal?.goal_id) {
      fetchActivities();
    }
  }, [activeTab, goal]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getGoalProgressHistory(goal.goal_id);
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await getGoalDocuments(goal.goal_id);
      if (res.success) {
        setDocuments(res.data || { attachments: [], links: [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await getGoalActivityLogs(goal.goal_id);
      if (res.success) {
        setActivities(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivities(false);
    }
  };

  if (!goal) return null;

  const feedbackReadOnly = goal.performance_technique === 'CONTINUOUS_FEEDBACK' && !isEnabled('continuous_feedback');
  const canSelectAssignedEmployee = ['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true';

  const canEdit = ['DRAFT', 'CHANGES_REQUESTED'].includes(goal.status) && !feedbackReadOnly;
  const canApprove = goal.status === 'PENDING_APPROVAL' && ['client_admin', 'manager', 'hr'].includes(role);
  const statusMeta = STATUS_META[goal.status] || STATUS_META.DRAFT;
  const categoryMeta = CATEGORY_META[goal.category] || {};
  const priorityMeta = PRIORITY_META[goal.priority] || {};
  const visibilityMeta = VISIBILITY_META[goal.visibility] || {};

  const rootGoal = goal.parent_goal_id
    ? allGoals.find(g => g.goal_id === goal.parent_goal_id) || goal
    : goal;

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        width: activeTab === 'kpis' ? 920 : 580, height: '100vh', overflowY: 'auto',
        background: '#ffffff', borderLeft: '1px solid #cbd5e1',
        padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
        transition: 'width 0.3s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #F1F4F8', paddingBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {goal.goal_code && (
                <span style={{
                  fontSize: 11, color: '#0466C8', background: 'rgba(4, 102, 200,0.08)',
                  padding: '2px 8px', borderRadius: 5, fontWeight: 700,
                  border: '1px solid rgba(4, 102, 200,0.15)', fontFamily: 'monospace',
                }}>{goal.goal_code}</span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                color: statusMeta.color, background: statusMeta.bg,
                border: `1px solid ${statusMeta.border}`,
              }}>{statusMeta.label}</span>
              {goal.priority && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  color: priorityMeta.color, background: priorityMeta.bg,
                }}>{priorityMeta.label} Priority</span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#001233' }}>{goal.title}</h2>
            {(goal.status === 'CHANGES_REQUESTED' || goal.status === 'REJECTED') && (
              <Alert
                message={goal.status === 'CHANGES_REQUESTED' ? 'Action Required: Changes Requested' : 'Goal Plan Rejected'}
                description={
                  <div style={{ marginTop: 4 }}>
                    <Text strong>Feedback: </Text>
                    <Text style={{ color: '#c2410c' }}>
                      {goal.rejection_reason || 'Please adjust your goal settings and resubmit.'}
                    </Text>
                  </div>
                }
                type={goal.status === 'CHANGES_REQUESTED' ? 'warning' : 'error'}
                showIcon
                style={{ marginTop: 12, borderRadius: 8 }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && (
              <button onClick={() => onEdit(goal)} style={{
                padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(4, 102, 200,0.2)',
                background: 'rgba(4, 102, 200,0.06)', color: '#0466C8', fontSize: 12,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>✏ Edit</button>
            )}
            <button onClick={onClose} style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8,
              cursor: 'pointer', color: '#7D8597', fontSize: 16,
            }}>✕</button>
          </div>
        </div>

        {/* ─── Navigation Tabs ─── */}
        <Tabs activeKey={activeTab} onChange={handleTabChange} style={{ flexGrow: 1 }}>
          <Tabs.TabPane tab="Overview" key="overview">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {feedbackReadOnly && (
                <Alert
                  type="warning"
                  showIcon
                  message="Read-Only Mode"
                  description="The Continuous Feedback technique has been disabled by the administrator. Existing feedback history is preserved in read-only mode."
                  style={{ borderRadius: 8 }}
                />
              )}

              {/* Goal Completion Stats */}
              {canSelectAssignedEmployee && assignments.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <Card size="small" style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #E3E7EE', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Members</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#001233', marginTop: 4 }}>{assignments.length}</div>
                  </Card>
                  <Card size="small" style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#166534', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Achieved</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                      {assignments.filter(a => a.status === 'COMPLETED' && a.completion_outcome === 'ACHIEVED').length}
                    </div>
                  </Card>
                  <Card size="small" style={{ background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#92400e', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Needs Dev</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
                      {assignments.filter(a => a.status === 'COMPLETED' && a.completion_outcome === 'NEEDS_DEVELOPMENT').length}
                    </div>
                  </Card>
                </div>
              )}

              {canSelectAssignedEmployee && assignments.length > 1 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🎯 Goal Achievement Rate</span>
                  <strong>
                    {assignments.filter(a => a.status === 'COMPLETED' && a.completion_outcome === 'ACHIEVED').length} of {assignments.length} employees achieved ({assignments.length > 0 ? Math.round((assignments.filter(a => a.status === 'COMPLETED' && a.completion_outcome === 'ACHIEVED').length / assignments.length) * 100) : 0}%)
                  </strong>
                </div>
              )}

              {/* Selected Employee Assignment / Status bar on Overview tab */}
              {goal.performance_technique === 'CONTINUOUS_FEEDBACK' && selectedEmployee && (
                <div style={{ background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#33415C' }}>Selected Member:</span>
                    <strong style={{ fontSize: 14, color: '#001233' }}>👤 {selectedEmployee.employee_name}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#33415C' }}>Status:</span>
                      {['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true' ? (
                        <select
                          value={selectedEmployee.status}
                          onChange={async (e) => {
                            try {
                              const newStatus = e.target.value;
                              const defaultOutcome = newStatus === 'COMPLETED' ? 'ACHIEVED' : null;
                              const updateAssignmentStatusAction = useContinuousFeedbackStore.getState().updateAssignmentStatus;
                              await updateAssignmentStatusAction(goal.goal_id, selectedEmployee.assignment_id, newStatus, defaultOutcome, selectedEmployee.employee_id);
                              fetchAssignments();
                            } catch (err) {
                              alert(err.message);
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
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
                          <option value="PENDING" style={{ background: '#fff', color: '#33415C' }}>PENDING</option>
                          <option value="CANCELLED" style={{ background: '#fff', color: '#94a3b8' }}>CANCELLED</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: selectedEmployee.status === 'COMPLETED' ? '#16a34a' : '#2563eb', background: selectedEmployee.status === 'COMPLETED' ? '#dcfce7' : '#dbeafe', padding: '3px 8px', borderRadius: 6 }}>
                          {selectedEmployee.status}
                        </span>
                      )}
                    </div>

                    {selectedEmployee.status === 'COMPLETED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#33415C' }}>Completion Outcome:</span>
                        {['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true' ? (
                          <select
                            value={selectedEmployee.completion_outcome || 'ACHIEVED'}
                            onChange={async (e) => {
                              try {
                                const outcome = e.target.value;
                                const updateAssignmentStatusAction = useContinuousFeedbackStore.getState().updateAssignmentStatus;
                                await updateAssignmentStatusAction(goal.goal_id, selectedEmployee.assignment_id, 'COMPLETED', outcome, selectedEmployee.employee_id);
                                fetchAssignments();
                              } catch (err) {
                                alert(err.message);
                              }
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
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
                            fontSize: 12,
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
                  </div>
                </div>
              )}

              {/* Goal Progress bar */}
              <Card size="small" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                {goal.performance_technique === 'CONTINUOUS_FEEDBACK' && selectedEmployee ? (
                  <>
                    <span style={{ fontSize: 12, color: '#7D8597', display: 'block', marginBottom: 4 }}>
                      Target Progress ({selectedEmployee.employee_name})
                    </span>
                    <Progress percent={parseFloat(selectedEmployee.progress || 0)} status={parseFloat(selectedEmployee.progress || 0) >= 100 ? 'success' : 'active'} />
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 12, color: '#7D8597', display: 'block', marginBottom: 4 }}>Goal Target Completion</span>
                    <Progress percent={parseFloat(goal.progress)} status={parseFloat(goal.progress) >= 100 ? 'success' : 'active'} />
                  </>
                )}
              </Card>

              {/* Goal Continuous Feedback Components Progress List */}
              {goal.performance_technique === 'CONTINUOUS_FEEDBACK' && selectedEmployee && (
                <div style={{ marginTop: 4 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: '#001233', margin: '0 0 4px 0' }}>Goal Continuous Feedback Components</h3>
                  <p style={{ fontSize: 11, color: '#7D8597', margin: '0 0 12px 0' }}>
                    Coaching components map specific actions to align with the goal milestones and targets.
                  </p>
                  <div style={{ border: '1px solid #E3E7EE', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #E3E7EE' }}>
                          <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#33415C', textTransform: 'uppercase' }}>Component Name</th>
                          <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#33415C', textTransform: 'uppercase', width: '70px', textAlign: 'center' }}>Weight</th>
                          <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#33415C', textTransform: 'uppercase' }}>Target / Current</th>
                          <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#33415C', textTransform: 'uppercase', width: '130px' }}>Completion</th>
                          <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#33415C', textTransform: 'uppercase', width: '100px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const config = techniqueConfigs['CONTINUOUS_FEEDBACK'] || {
                            reflection: { enabled: true, weight: 20 },
                            manager_feedback: { enabled: true, weight: 20 },
                            verified_action_items: { enabled: true, weight: 40 },
                            goal_closure: { enabled: true, weight: 20 }
                          };

                          const isReflectionDone = reflections.length > 0;
                          const isFeedbackDone = feedbacks.some(f => f.feedback_type === 'COACHING');
                          const totalActions = actionItems.length;
                          const verifiedActions = actionItems.filter(ai => ai.verified_by_manager).length;
                          const isClosed = selectedEmployee.status === 'COMPLETED';

                          const rows = [
                            config.reflection?.enabled && {
                              title: 'Reflection Submission',
                              desc: 'Employee submits self-reflection answers',
                              weight: `${config.reflection.weight}%`,
                              targetCurrent: `1 reflection / ${isReflectionDone ? '1 submitted' : '0 submitted'}`,
                              percent: isReflectionDone ? 100 : 0,
                              status: isReflectionDone ? 'COMPLETED' : 'ACTIVE'
                            },
                            config.manager_feedback?.enabled && {
                              title: 'Manager Coaching Feedback',
                              desc: 'Manager posts at least one coaching note',
                              weight: `${config.manager_feedback.weight}%`,
                              targetCurrent: `1 coaching note / ${isFeedbackDone ? '1 added' : '0 added'}`,
                              percent: isFeedbackDone ? 100 : 0,
                              status: isFeedbackDone ? 'COMPLETED' : 'ACTIVE'
                            },
                            config.verified_action_items?.enabled && {
                              title: 'Verified Action Items',
                              desc: 'Assigned action items verified by manager',
                              weight: `${config.verified_action_items.weight}%`,
                              targetCurrent: `All verified / ${verifiedActions} of ${totalActions} verified`,
                              percent: totalActions > 0 ? Math.round((verifiedActions / totalActions) * 100) : 0,
                              status: totalActions > 0 && verifiedActions === totalActions ? 'COMPLETED' : 'ACTIVE'
                            },
                            config.goal_closure?.enabled && {
                              title: 'Manager Final Goal Closure',
                              desc: 'Manager finalizes cycle by marking assignment completed',
                              weight: `${config.goal_closure.weight}%`,
                              targetCurrent: `Goal completed / ${isClosed ? 'Completed' : 'Active'}`,
                              percent: isClosed ? 100 : 0,
                              status: isClosed ? 'COMPLETED' : 'ACTIVE'
                            }
                          ].filter(Boolean);

                          return rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F1F4F8' : 'none' }}>
                              <td style={{ padding: '16px' }}>
                                <strong style={{ fontSize: 13, color: '#001233', display: 'block' }}>{r.title}</strong>
                                <span style={{ fontSize: 11, color: '#7D8597', marginTop: 2, display: 'block' }}>{r.desc}</span>
                              </td>
                              <td style={{ padding: '16px', fontSize: 13, color: '#33415C', fontWeight: 600, textAlign: 'center' }}>{r.weight}</td>
                              <td style={{ padding: '16px', fontSize: 12, color: '#33415C' }}>{r.targetCurrent}</td>
                              <td style={{ padding: '16px' }}>
                                <Progress percent={r.percent} status={r.percent >= 100 ? 'success' : 'active'} />
                              </td>
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 800,
                                  color: r.status === 'COMPLETED' ? '#16a34a' : '#2563eb',
                                  background: r.status === 'COMPLETED' ? '#dcfce7' : '#dbeafe',
                                  padding: '3px 8px', borderRadius: 4
                                }}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {goal.performance_technique === 'COMPETENCY_ASSESSMENT' && !selectedEmployee && goal.competency_stats && (
                <div style={{ marginTop: 8, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: '#001233', margin: '0 0 10px 0' }}>📋 Competency Assessment Overview</h3>
                  <Row gutter={[12, 12]}>
                    <Col span={6}>
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
                        <div style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', fontWeight: 700 }}>Average Progress</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0466C8', marginTop: 4 }}>{parseFloat(goal.competency_stats.avg_progress || 0).toFixed(1)}%</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #E3E7EE' }}>
                        <div style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', fontWeight: 700 }}>Average Score</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0353A4', marginTop: 4 }}>{parseFloat(goal.competency_stats.avg_score || 0).toFixed(1)}%</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: 10, color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Employees Achieved</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#15803d', marginTop: 4 }}>{goal.competency_stats.achieved_count}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ background: '#fff7ed', padding: '12px 14px', borderRadius: 10, border: '1px solid #fed7aa' }}>
                        <div style={{ fontSize: 10, color: '#9a3412', textTransform: 'uppercase', fontWeight: 700 }}>Need Dev.</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#c2410c', marginTop: 4 }}>{goal.competency_stats.needs_development_count}</div>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Status Timeline */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #E3E7EE' }}>
                <div style={{ fontSize: 11, color: '#7D8597', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Status Timeline</div>
                <GoalStatusTimeline currentStatus={goal.status} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {STATUS_FLOW.map(s => (
                    <span key={s} style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textAlign: 'center', flex: 1 }}>
                      {STATUS_META[s]?.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DetailField label="Category" value={goal.goal_category_name || goal.goal_category || '—'} />
                {goal.performance_technique !== 'SELF_ASSESSMENT' && (
                  <DetailField label="Weight" value={`${goal.weight}%`} />
                )}
                <DetailField label="Start Date" value={fmtDate(goal.start_date)} />
                <DetailField label="Due Date" value={fmtDate(goal.due_date)} />
                <DetailField label="Visibility" value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {visibilityMeta.icon ? React.createElement(visibilityMeta.icon, { style: { verticalAlign: 'middle' } }) : null}
                    {visibilityMeta.label || goal.visibility || '—'}
                  </span>
                } />
                <DetailField label="Department" value={
                  goal.assigned_to_department_name
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><FiGrid style={{ verticalAlign: 'middle' }} /> {goal.assigned_to_department_name}</span>
                    : (goal.goal_type === 'department' ? 'Department' : '—')
                } />
                <DetailField label="Owner / Target" value={
                  goal.goal_type === 'department'
                    ? (goal.assigned_to_department_name
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><FiGrid style={{ verticalAlign: 'middle' }} /> {goal.assigned_to_department_name} (Department)</span>
                        : 'Department Goal')
                    : goal.goal_type === 'company'
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><FiGlobe style={{ verticalAlign: 'middle' }} /> All Employees (Company)</span>
                      : (goal.assigned_to_employee_name || '—')
                } />
                <DetailField label="Created By" value={goal.created_by_name || '—'} />
                <DetailField label="Approved By" value={goal.approved_by_name || '—'} />
                <DetailField label="Assigned By" value={goal.assigned_by_name || '—'} />
              </div>

              {/* Description */}
              {goal.description && (
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #E3E7EE' }}>
                  <div style={{ fontSize: 10, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>Description</div>
                  <div style={{ fontSize: 13, color: '#33415C', lineHeight: 1.6, fontWeight: 500 }}>{goal.description}</div>
                </div>
              )}

              {/* Managers choose an employee; employees always use their own assignment. */}
              {canSelectAssignedEmployee && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Assigned Employees ({assignments.length})
                    </div>
                    {selectedEmployee && (
                      <span style={{ fontSize: 11, color: '#0466C8', fontWeight: 700 }}>
                        Active Selection: {selectedEmployee.employee_name}
                      </span>
                    )}
                  </div>

                  {assignments.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                      {assignments.map(emp => {
                        const isSelected = selectedEmployee?.employee_id === emp.employee_id;
                        const statusColor = emp.status === 'COMPLETED' ? '#16a34a' : emp.status === 'ON_HOLD' ? '#dc2626' : '#2563eb';
                        const statusBg = emp.status === 'COMPLETED' ? '#dcfce7' : emp.status === 'ON_HOLD' ? '#fee2e2' : '#dbeafe';

                        return (
                          <div
                            key={emp.assignment_id}
                            onClick={() => setSelectedEmployee(emp)}
                            style={{
                              padding: '12px 14px', borderRadius: 10,
                              border: isSelected ? '2px solid #0466C8' : '1px solid #E3E7EE',
                              background: isSelected ? 'rgba(4, 102, 200,0.06)' : '#ffffff',
                              cursor: 'pointer', transition: 'all 0.15s ease',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              boxShadow: isSelected ? '0 4px 12px rgba(4, 102, 200,0.12)' : 'none'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#023E7D' : '#001233', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>👤</span> {emp.employee_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#7D8597', marginTop: 2 }}>
                                {emp.department_name || 'Department Member'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg, padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 4 }}>
                                {emp.status}
                              </span>
                              {emp.status === 'COMPLETED' && emp.completion_outcome && (
                                <div style={{
                                  fontSize: 9, fontWeight: 700,
                                  color: emp.completion_outcome === 'ACHIEVED' ? '#15803d' : '#b45309',
                                  background: emp.completion_outcome === 'ACHIEVED' ? '#f0fdf4' : '#fffbeb',
                                  border: `1px solid ${emp.completion_outcome === 'ACHIEVED' ? '#bbf7d0' : '#fde68a'}`,
                                  padding: '1px 5px', borderRadius: 4, marginTop: 2, marginBottom: 4, textAlign: 'center', whiteSpace: 'nowrap'
                                }}>
                                  {emp.completion_outcome === 'ACHIEVED' ? 'Achieved' : 'Needs Dev'}
                                </div>
                              )}
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#0466C8' }}>
                                {emp.progress || 0}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, padding: '12px 0' }}>
                      No employee assignments.
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {canApprove && (
                <div style={{ borderTop: '1px solid #E3E7EE', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Manager Actions</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => onStatusChange(goal.goal_id, 'ACTIVE')} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)',
                      background: 'rgba(22,163,74,0.06)', color: '#16a34a', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>✓ Approve</button>

                    <button onClick={() => setShowChanges(true)} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)',
                      background: 'rgba(124,58,237,0.06)', color: '#7c3aed', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>↺ Request Changes</button>

                    <button onClick={() => setShowReject(true)} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)',
                      background: 'rgba(220,38,38,0.06)', color: '#dc2626', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>✖ Reject</button>
                  </div>

                  {/* Changes Requested Form */}
                  {showChanges && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7D8597', textTransform: 'uppercase', marginBottom: 4 }}>Comment for Employee</label>
                      <textarea value={changesReason} onChange={e => setChangesReason(e.target.value)} rows={2}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                          background: '#fff', border: '1px solid #E3E7EE', color: '#001233',
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
                        }} placeholder="What changes are needed?" />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => {
                          onStatusChange(goal.goal_id, 'CHANGES_REQUESTED', { reason: changesReason });
                          setShowChanges(false);
                          setChangesReason('');
                        }} style={{
                          padding: '7px 14px', borderRadius: 8, border: 'none',
                          background: '#7c3aed', color: '#fff', fontSize: 12,
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>Send Changes</button>
                        <button onClick={() => setShowChanges(false)} style={{
                          padding: '7px 14px', borderRadius: 8, border: '1px solid #E3E7EE',
                          background: '#f8fafc', color: '#7D8597', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Reject Form */}
                  {showReject && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7D8597', textTransform: 'uppercase', marginBottom: 4 }}>Rejection Reason</label>
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                          background: '#fff', border: '1px solid #E3E7EE', color: '#001233',
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
                        }} placeholder="Why is this goal being rejected?" />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => {
                          onStatusChange(goal.goal_id, 'REJECTED', { reason: rejectReason });
                          setShowReject(false);
                          setRejectReason('');
                        }} style={{
                          padding: '7px 14px', borderRadius: 8, border: 'none',
                          background: '#dc2626', color: '#fff', fontSize: 12,
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>Confirm Reject</button>
                        <button onClick={() => setShowReject(false)} style={{
                          padding: '7px 14px', borderRadius: 8, border: '1px solid #E3E7EE',
                          background: '#f8fafc', color: '#7D8597', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs.TabPane>

          {/* Conditional Tabs based on Goal Performance Technique */}
          {goal.performance_technique === 'CONTINUOUS_FEEDBACK' && (
            <>
              <Tabs.TabPane tab="Feedback" key="feedback">
                <GoalFeedbackPanel goal={goal} allGoals={allGoals} activeTab="Feedback" isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'} selectedEmployee={selectedEmployee} assignments={assignments} onSelectEmployee={setSelectedEmployee} onRefreshAssignments={fetchAssignments} readOnly={feedbackReadOnly} />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Action Items" key="action_items">
                <GoalFeedbackPanel goal={goal} allGoals={allGoals} activeTab="Action Items" isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'} selectedEmployee={selectedEmployee} assignments={assignments} onSelectEmployee={setSelectedEmployee} onRefreshAssignments={fetchAssignments} readOnly={feedbackReadOnly} />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Reflections" key="reflections">
                <GoalFeedbackPanel goal={goal} allGoals={allGoals} activeTab="Reflections" isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'} selectedEmployee={selectedEmployee} assignments={assignments} onSelectEmployee={setSelectedEmployee} onRefreshAssignments={fetchAssignments} readOnly={feedbackReadOnly} />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Praise" key="praise">
                <GoalFeedbackPanel goal={goal} allGoals={allGoals} activeTab="Praise" isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'} selectedEmployee={selectedEmployee} assignments={assignments} onSelectEmployee={setSelectedEmployee} onRefreshAssignments={fetchAssignments} readOnly={feedbackReadOnly} />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Timeline" key="timeline">
                <GoalFeedbackPanel goal={goal} allGoals={allGoals} activeTab="Timeline" isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'} selectedEmployee={selectedEmployee} assignments={assignments} onSelectEmployee={setSelectedEmployee} onRefreshAssignments={fetchAssignments} readOnly={feedbackReadOnly} />
              </Tabs.TabPane>
            </>
          )}

          {goal.performance_technique === 'COMPETENCY_ASSESSMENT' && (
            <>
              <Tabs.TabPane tab="Competencies" key="competencies">
                <GoalCompetencyPanel
                  goal={goal}
                  isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'}
                  selectedEmployee={selectedEmployee}
                  role={role}
                  onRefreshAssignments={fetchAssignments}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Timeline" key="timeline">
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
                ) : history.length > 0 ? (
                  <AntTimeline mode="left" style={{ padding: '20px 10px' }}>
                    {history.map((h, idx) => (
                      <AntTimeline.Item
                        key={h.history_id}
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>
                              Progress Shift: {parseFloat(h.old_progress)}% → {parseFloat(h.new_progress)}%
                            </span>
                            <AntTag color={STATUS_META[h.status]?.bg ? 'default' : 'cyan'}>{h.status}</AntTag>
                          </Space>
                          <div style={{ fontSize: 12, color: '#33415C', marginTop: 4 }}>
                            {h.comment}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Updated by: {h.updated_by_name || h.updated_by_email || 'System'}</span>
                            <span>{new Date(h.created_at).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </AntTimeline.Item>
                    ))}
                  </AntTimeline>
                ) : (
                  <Empty description="No progress history logs recorded yet." />
                )}
              </Tabs.TabPane>
            </>
          )}

          {goal.performance_technique === 'SELF_ASSESSMENT' && (
            <>
              <Tabs.TabPane tab="Self Assessment" key="self_assessment">
                <GoalSelfAssessmentPanel
                  goal={goal}
                  isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'}
                  selectedEmployee={selectedEmployee}
                  role={role}
                  onRefreshAssignments={fetchAssignments}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Timeline" key="timeline">
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
                ) : history.length > 0 ? (
                  <AntTimeline mode="left" style={{ padding: '20px 10px' }}>
                    {history.map((h, idx) => (
                      <AntTimeline.Item
                        key={h.history_id}
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>
                              Progress Shift: {parseFloat(h.old_progress)}% → {parseFloat(h.new_progress)}%
                            </span>
                            <AntTag color={STATUS_META[h.status]?.bg ? 'default' : 'cyan'}>{h.status}</AntTag>
                          </Space>
                          <div style={{ fontSize: 12, color: '#33415C', marginTop: 4 }}>
                            {h.comment}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Updated by: {h.updated_by_name || h.updated_by_email || 'System'}</span>
                            <span>{new Date(h.created_at).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </AntTimeline.Item>
                    ))}
                  </AntTimeline>
                ) : (
                  <Empty description="No progress history logs recorded yet." />
                )}
              </Tabs.TabPane>
            </>
          )}

          {goal.performance_technique === '360_FEEDBACK' && (
            <>
              <Tabs.TabPane tab="360 Feedback" key="feedback360">
                <Feedback360GoalPanel
                  goal={goal}
                  isManager={['client_admin', 'hr', 'manager'].includes(role) || sessionStorage.getItem('is_manager') === 'true'}
                  selectedEmployee={selectedEmployee}
                  role={role}
                  onRefreshAssignments={fetchAssignments}
                  onSelectEmployee={setSelectedEmployee}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Timeline" key="timeline">
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
                ) : history.length > 0 ? (
                  <AntTimeline mode="left" style={{ padding: '20px 10px' }}>
                    {history.map((h, idx) => (
                      <AntTimeline.Item
                        key={h.history_id}
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>
                              Progress Shift: {parseFloat(h.old_progress)}% → {parseFloat(h.new_progress)}%
                            </span>
                            <AntTag color={STATUS_META[h.status]?.bg ? 'default' : 'cyan'}>{h.status}</AntTag>
                          </Space>
                          <div style={{ fontSize: 12, color: '#33415C', marginTop: 4 }}>
                            {h.comment}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Updated by: {h.updated_by_name || h.updated_by_email || 'System'}</span>
                            <span>{new Date(h.created_at).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </AntTimeline.Item>
                    ))}
                  </AntTimeline>
                ) : (
                  <Empty description="No progress history logs recorded yet." />
                )}
              </Tabs.TabPane>
            </>
          )}

          {goal.performance_technique !== 'CONTINUOUS_FEEDBACK' && goal.performance_technique !== 'COMPETENCY_ASSESSMENT' && goal.performance_technique !== 'SELF_ASSESSMENT' && goal.performance_technique !== '360_FEEDBACK' && (
            <>
              <Tabs.TabPane tab="KPIs" key="kpis">
                <GoalKpiTab
                  goalId={goal.goal_id}
                  parentGoal={goal}
                  role={role}
                  onGoalUpdate={fetchHistory}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Timeline" key="timeline">
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
                ) : history.length > 0 ? (
                  <AntTimeline mode="left" style={{ padding: '20px 10px' }}>
                    {history.map((h, idx) => (
                      <AntTimeline.Item
                        key={h.history_id}
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>
                              Progress Shift: {parseFloat(h.old_progress)}% → {parseFloat(h.new_progress)}%
                            </span>
                            <AntTag color={STATUS_META[h.status]?.bg ? 'default' : 'cyan'}>{h.status}</AntTag>
                          </Space>
                          <div style={{ fontSize: 12, color: '#33415C', marginTop: 4 }}>
                            {h.comment}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Updated by: {h.updated_by_name || h.updated_by_email || 'System'}</span>
                            <span>{new Date(h.created_at).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </AntTimeline.Item>
                    ))}
                  </AntTimeline>
                ) : (
                  <Empty description="No progress history logs recorded yet." />
                )}
              </Tabs.TabPane>

              {/* Documents Tab */}
              <Tabs.TabPane tab="Documents" key="documents">
                {loadingDocs ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
                ) : (documents.attachments?.length > 0 || documents.links?.length > 0) ? (
                  <div style={{ padding: '16px 8px' }}>
                    {documents.attachments?.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <Title level={5} style={{ fontSize: 13, color: '#33415C', marginBottom: 10 }}>Uploaded Evidence Files</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {documents.attachments.map((att) => (
                            <div key={att.attachment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #E3E7EE' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileTextOutlined style={{ color: '#0466C8', fontSize: 16 }} />
                                <div>
                                  <strong style={{ fontSize: 12, display: 'block', color: '#001233' }}>{att.file_name}</strong>
                                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Submitted for KPI {att.kpi_code} • {new Date(att.uploaded_at).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                              <a href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#0466C8' }}>
                                View / Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {documents.links?.length > 0 && (
                      <div>
                        <Title level={5} style={{ fontSize: 13, color: '#33415C', marginBottom: 10 }}>Evidence Reference Links</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {documents.links.map((link) => (
                            <div key={link.link_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #E3E7EE' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <LinkOutlined style={{ color: '#10b981', fontSize: 16 }} />
                                <div>
                                  <strong style={{ fontSize: 12, display: 'block', color: '#001233' }}>{link.link_name}</strong>
                                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Submitted for KPI {link.kpi_code} • {new Date(link.created_at).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                              <a href={link.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                                Open Link
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span style={{ color: '#94a3b8' }}><FileTextOutlined style={{ fontSize: 24, display: 'block', margin: '0 auto 8px' }} /> No documents attached to this goal yet.</span>}
                  />
                )}
              </Tabs.TabPane>
            </>
          )}

          {/* Activity Tab */}
          <Tabs.TabPane tab="Activity" key="activity">
            {loadingActivities ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
            ) : activities.length > 0 ? (
              <AntTimeline mode="left" style={{ padding: '20px 10px' }}>
                {activities.map((act) => (
                  <AntTimeline.Item
                    key={act.audit_log_id}
                    dot={<ClockCircleOutlined style={{ fontSize: '14px', color: '#10b981' }} />}
                    color="green"
                  >
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#001233', textTransform: 'capitalize' }}>
                          {act.action_name.replace(/_/g, ' ')}
                        </span>
                        <AntTag color="blue">{act.actor_role}</AntTag>
                      </Space>
                      <div style={{ fontSize: 11, color: '#33415C', marginTop: 4 }}>
                        Performed on: <strong style={{ color: '#0466C8' }}>{act.entity_name}</strong>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Actor: {act.actor_name} ({act.actor_email})</span>
                        <span>{new Date(act.created_at).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </AntTimeline.Item>
                ))}
              </AntTimeline>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: '#94a3b8' }}><AuditOutlined style={{ fontSize: 24, display: 'block', margin: '0 auto 8px' }} /> No activity logs captured for this goal yet.</span>}
              />
            )}
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
}
