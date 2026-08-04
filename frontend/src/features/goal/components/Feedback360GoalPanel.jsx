import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Spin, Rate, Alert, Button, Input, Select, Tag, Space, Card, Progress, message, Modal, Popconfirm, Empty, Tooltip } from 'antd';
import {
  UserOutlined, TeamOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SendOutlined, ClockCircleOutlined, DeleteOutlined, PlusOutlined,
  TrophyOutlined, EyeOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

const headers = () => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

const RELATIONSHIP_COLORS = {
  MANAGER: '#6366f1', PEER: '#0891b2', DIRECT_REPORT: '#059669'
};
const RELATIONSHIP_LABELS = {
  MANAGER: 'Manager', PEER: 'Peer', DIRECT_REPORT: 'Direct Report'
};
const STATUS_COLORS = {
  INVITED: 'blue', ACCEPTED: 'cyan', SUBMITTED: 'green', DECLINED: 'red', EXPIRED: 'default', PENDING: 'orange'
};

export default function Feedback360GoalPanel({ goal, isManager, selectedEmployee, role, onRefreshAssignments, onSelectEmployee }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [addingReviewer, setAddingReviewer] = useState(false);
  const [newReviewer, setNewReviewer] = useState({ employeeId: '', type: 'PEER' });
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Reviewer's own answers
  const [myAnswers, setMyAnswers] = useState([]);

  // Logged-in user states
  const [reviewRequests, setReviewRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeReviewRequest, setActiveReviewRequest] = useState(null);
  const [subTab, setSubTab] = useState('about_me');

  const fetchReviewRequests = () => {
    if (!goal?.goal_id) return;
    setLoadingRequests(true);
    axios.get(`/api/client-admin/360-feedback/submissions?goal_id=${goal.goal_id}`, { headers: headers() })
      .then(res => {
        if (res.data?.success) {
          const list = res.data.data || [];
          const myEmpId = sessionStorage.getItem('employee_id');
          // Filter: only rows where the logged-in user is a reviewer AND exclude self
          const filtered = list.filter(r => r.my_reviewer_status != null && r.employee_id !== myEmpId);
          setReviewRequests(filtered);
        }
      })
      .catch(err => console.error('Failed to load review requests:', err))
      .finally(() => setLoadingRequests(false));
  };

  const fetchData = () => {
    const targetAssignmentId = activeReviewRequest ? activeReviewRequest.assignment_id : selectedEmployee?.assignment_id;
    if (!targetAssignmentId) return;
    setLoading(true);
    axios.get(`/api/goals/${goal.goal_id}/assignments/${targetAssignmentId}/360-feedback`, { headers: headers() })
      .then(res => {
        setData(res.data.data);
        if (res.data.data.myAnswers?.length) {
          setMyAnswers(res.data.data.myAnswers);
        } else if (res.data.data.templates?.length) {
          setMyAnswers(res.data.data.templates.map(t => ({
            question_id: t.feedback_template_id,
            rating: null,
            comment: '',
            question: t.question,
            question_type: t.question_type,
            weight: t.weight,
            required: t.required
          })));
        }
      })
      .catch(err => message.error(err.response?.data?.message || 'Failed to load 360° feedback data.'))
      .finally(() => setLoading(false));
  };

  const fetchEmployees = () => {
    const depId = data?.subjectDepartmentId || selectedEmployee?.department_id || '';
    axios.get(`/api/employees/search?department_id=${depId}`, { headers: headers() })
      .then(res => {
        const list = res.data?.data || [];
        setEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, [goal?.goal_id, selectedEmployee?.assignment_id, activeReviewRequest]);

  useEffect(() => {
    fetchReviewRequests();
  }, [goal?.goal_id, activeReviewRequest]);

  useEffect(() => { 
    if (isManager) fetchEmployees(); 
  }, [isManager, data?.subjectDepartmentId, selectedEmployee?.department_id]);

  if (!selectedEmployee) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Alert message="Please select an assigned employee from the list to view or manage their 360° feedback." type="info" showIcon />
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '80px 0', textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (!data) {
    return <Empty description="No 360° feedback data available." />;
  }

  const { config, templates, participants, summary, myParticipant, canFinalize, completionPercentage, subjectEmployeeId, allParticipantAnswers, subjectDepartmentId } = data;
  const isSubject = sessionStorage.getItem('employee_id') === subjectEmployeeId;
  const isReviewer = !!myParticipant;
  const myStatus = myParticipant?.status;
  const isFinalized = summary?.final_score != null;

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleAddReviewer = async () => {
    if (!newReviewer.employeeId) return;
    setSubmitting(true);
    try {
      await axios.post(
        `/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/360-feedback/participants`,
        { reviewerEmployeeId: newReviewer.employeeId, relationshipType: newReviewer.type },
        { headers: headers() }
      );
      message.success('Reviewer added.');
      setNewReviewer({ employeeId: '', type: 'PEER' });
      setAddingReviewer(false);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to add reviewer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveReviewer = async (participantId) => {
    try {
      await axios.delete(
        `/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/360-feedback/participants/${participantId}`,
        { headers: headers() }
      );
      message.success('Reviewer removed.');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to remove reviewer.');
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/360-feedback/participants/${myParticipant.feedback_participant_id}/accept`, {}, { headers: headers() });
      message.success('Invitation accepted.');
      fetchData();
      fetchReviewRequests();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/360-feedback/participants/${myParticipant.feedback_participant_id}/decline`, {}, { headers: headers() });
      message.success('Review declined.');
      fetchData();
      fetchReviewRequests();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to decline.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/360-feedback/participants/${myParticipant.feedback_participant_id}/answers`, { answers: myAnswers }, { headers: headers() });
      message.success('Draft saved.');
      fetchData();
      fetchReviewRequests();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/360-feedback/participants/${myParticipant.feedback_participant_id}/answers`, { answers: myAnswers }, { headers: headers() });
      await axios.post(`/api/360-feedback/participants/${myParticipant.feedback_participant_id}/submit`, {}, { headers: headers() });
      message.success('Review submitted successfully.');
      fetchData();
      fetchReviewRequests();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/360-feedback/finalize`, {}, { headers: headers() });
      message.success('360° Feedback finalized successfully.');
      fetchData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to finalize.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResults = async () => {
    try {
      await axios.post(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/360-feedback/view-results`, {}, { headers: headers() });
      fetchData();
    } catch (_) {}
  };

  const updateAnswer = (questionId, field, val) => {
    setMyAnswers(prev => prev.map(a => a.question_id === questionId ? { ...a, [field]: val } : a));
  };

  // ─── Render: Summary Scores Card ────────────────────────────────────────

  const renderSummaryCard = () => {
    if (!summary && !isFinalized) return null;
    const s = summary || {};
    return (
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: isFinalized ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' : '#f8fafc', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
            {isFinalized ? '🎉 Feedback Results' : '📊 Current Scores'}
          </span>
          {isFinalized && (
            <Tag color="green" style={{ fontWeight: 700, fontSize: 13, padding: '2px 12px' }}>
              Final Score: {parseFloat(s.final_score || 0).toFixed(1)}%
            </Tag>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Manager', value: s.manager_average, color: RELATIONSHIP_COLORS.MANAGER },
            { label: 'Peers', value: s.peer_average, color: RELATIONSHIP_COLORS.PEER },
            { label: 'Direct Reports', value: s.direct_report_average, color: RELATIONSHIP_COLORS.DIRECT_REPORT },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.value != null ? item.color : '#cbd5e1' }}>
                {item.value != null ? `${parseFloat(item.value).toFixed(1)}%` : '—'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            <span>Completion</span>
            <span>{parseFloat(s.completion_percentage || completionPercentage || 0).toFixed(0)}%</span>
          </div>
          <Progress percent={parseFloat(s.completion_percentage || completionPercentage || 0)} size="small" showInfo={false} strokeColor="#6366f1" />
        </div>
      </Card>
    );
  };

  // ─── Render: Participants List (Manager View) ───────────────────────────

  const renderParticipants = () => {
    if (!isManager && !isSubject) return null;
    return (
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }} title={<span style={{ fontWeight: 700, fontSize: 13 }}>👥 Reviewers ({participants.length})</span>}>
        {participants.length === 0 ? (
          <Empty description="No reviewers assigned yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {participants.map(p => (
              <div key={p.feedback_participant_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: RELATIONSHIP_COLORS[p.relationship_type] || '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 12
                  }}>
                    {(p.reviewer_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                      {config?.anonymous_enabled && isSubject && !isManager ? 'Anonymous Reviewer' : p.reviewer_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {RELATIONSHIP_LABELS[p.relationship_type]} • {p.reviewer_department_name || '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={STATUS_COLORS[p.status]} style={{ fontSize: 10, fontWeight: 700, borderRadius: 4 }}>
                    {p.status}
                  </Tag>
                  {isManager && ['INVITED', 'PENDING'].includes(p.status) && !isFinalized && (
                    <Popconfirm title="Remove this reviewer?" onConfirm={() => handleRemoveReviewer(p.feedback_participant_id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Reviewer Button */}
        {isManager && !isFinalized && (
          <div style={{ marginTop: 12 }}>
            {!addingReviewer ? (
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddingReviewer(true)} block>
                Add Reviewer
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Employee</div>
                  <Select
                    showSearch
                    placeholder="Select employee..."
                    value={newReviewer.employeeId || undefined}
                    onChange={val => setNewReviewer(prev => ({ ...prev, employeeId: val }))}
                    style={{ width: '100%' }}
                    filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}
                  >
                    {employees
                      .filter(emp => emp.employee_id !== subjectEmployeeId && !participants.some(p => p.reviewer_employee_id === emp.employee_id))
                      .map(emp => (
                        <Select.Option key={emp.employee_id} value={emp.employee_id}>
                          {`${emp.first_name} ${emp.last_name}`}
                        </Select.Option>
                      ))
                    }
                  </Select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Type</div>
                  <Select value={newReviewer.type} onChange={val => setNewReviewer(prev => ({ ...prev, type: val }))} style={{ width: 150 }}>
                    <Select.Option value="MANAGER">Manager</Select.Option>
                    <Select.Option value="PEER">Peer</Select.Option>
                    <Select.Option value="DIRECT_REPORT">Direct Report</Select.Option>
                  </Select>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddReviewer} loading={submitting}>Add</Button>
                <Button onClick={() => setAddingReviewer(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  // ─── Render: Reviewer Questionnaire ─────────────────────────────────────

  const renderReviewerForm = () => {
    if (!isReviewer) return null;
    if (myStatus === 'SUBMITTED') {
      return (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />}
          message="Your review has been submitted."
          description="Thank you for providing your feedback."
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      );
    }
    if (myStatus === 'DECLINED') {
      return (
        <Alert type="warning" showIcon
          message="You have declined this feedback invitation."
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      );
    }
    if (myStatus === 'EXPIRED') {
      return (
        <Alert type="error" showIcon
          message="The deadline for this feedback has passed."
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      );
    }

    // INVITED or ACCEPTED — show questionnaire
    return (
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #e0e7ff', background: '#fafaff', marginBottom: 16 }}
        title={<span style={{ fontWeight: 700, fontSize: 14, color: '#4338ca' }}>📝 Your Feedback Questionnaire</span>}
      >
        {myStatus === 'INVITED' && (
          <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
            message="You have been invited to provide feedback."
            description="You can start answering below, which will auto-accept the invitation, or explicitly accept/decline."
            action={
              <Space>
                <Button size="small" type="primary" onClick={handleAccept} loading={submitting}>Accept</Button>
                <Popconfirm title="Are you sure you want to decline?" onConfirm={handleDecline}>
                  <Button size="small" danger>Decline</Button>
                </Popconfirm>
              </Space>
            }
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(templates || []).map((t, idx) => {
            const ans = myAnswers.find(a => a.question_id === t.feedback_template_id) || {};
            return (
              <div key={t.feedback_template_id} style={{ padding: 14, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                    {idx + 1}. {t.question}
                    {t.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                  </span>
                  <Tag style={{ fontSize: 10, fontWeight: 600 }}>Weight: {t.weight}%</Tag>
                </div>

                {(t.question_type === 'RATING_1_5') && (
                  <Rate
                    value={ans.rating || 0}
                    onChange={val => updateAnswer(t.feedback_template_id, 'rating', val)}
                  />
                )}
                {(t.question_type === 'SCALE_1_10') && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <Button key={n} size="small"
                        type={ans.rating === n ? 'primary' : 'default'}
                        onClick={() => updateAnswer(t.feedback_template_id, 'rating', n)}
                        style={{ minWidth: 32 }}
                      >{n}</Button>
                    ))}
                  </div>
                )}
                {(t.question_type === 'YES_NO') && (
                  <Space>
                    <Button type={ans.rating === 100 ? 'primary' : 'default'} onClick={() => updateAnswer(t.feedback_template_id, 'rating', 100)}>Yes</Button>
                    <Button type={ans.rating === 0 ? 'primary' : 'default'} onClick={() => updateAnswer(t.feedback_template_id, 'rating', 0)}>No</Button>
                  </Space>
                )}
                {(t.question_type === 'PERCENTAGE') && (
                  <Input type="number" min={0} max={100} placeholder="0-100%" value={ans.rating ?? ''} onChange={e => updateAnswer(t.feedback_template_id, 'rating', parseFloat(e.target.value) || null)} style={{ width: 120 }} />
                )}

                <Input.TextArea
                  value={ans.comment || ''}
                  onChange={e => updateAnswer(t.feedback_template_id, 'comment', e.target.value)}
                  placeholder="Add a comment (optional)..."
                  rows={2}
                  style={{ marginTop: 8, borderRadius: 8 }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={handleSaveDraft} loading={submitting}>Save Draft</Button>
          <Popconfirm title="Submit your review? This cannot be undone." onConfirm={handleSubmitReview}>
            <Button type="primary" icon={<SendOutlined />} loading={submitting}>Submit Review</Button>
          </Popconfirm>
        </div>
      </Card>
    );
  };

  // ─── Render: Manager Review of All Submissions ──────────────────────────

  const renderSubmittedReviews = () => {
    if (!isManager || !allParticipantAnswers || Object.keys(allParticipantAnswers).length === 0) return null;

    return (
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}
        title={<span style={{ fontWeight: 700, fontSize: 13 }}>📋 Submitted Reviews</span>}
      >
        {Object.entries(allParticipantAnswers).map(([pid, pData]) => (
          <div key={pid} style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Tag color={RELATIONSHIP_COLORS[pData.relationship_type]} style={{ fontWeight: 700, fontSize: 11 }}>
                {RELATIONSHIP_LABELS[pData.relationship_type]}
              </Tag>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                {pData.reviewer_name || 'Anonymous'}
              </span>
            </div>
            {pData.answers.map(ans => (
              <div key={ans.feedback_answer_id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{ans.question}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {ans.rating != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>
                      Rating: {ans.rating}{ans.question_type === 'RATING_1_5' ? '/5' : ans.question_type === 'SCALE_1_10' ? '/10' : '%'}
                    </span>
                  )}
                  {ans.comment && <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>"{ans.comment}"</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>
    );
  };

  // ─── Render: Finalize Button ────────────────────────────────────────────

  const renderFinalizeSection = () => {
    if (!isManager || isFinalized) return null;

    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <Tooltip title={!canFinalize ? 'Not all reviewers have completed their feedback, or minimum completion threshold not met.' : ''}>
          <Popconfirm title="Finalize this 360° feedback? This will publish results to the employee." onConfirm={handleFinalize} disabled={!canFinalize}>
            <Button type="primary" size="large" icon={<TrophyOutlined />} loading={submitting} disabled={!canFinalize}
              style={{ background: canFinalize ? '#059669' : undefined, borderColor: canFinalize ? '#059669' : undefined, fontWeight: 700 }}
            >
              Finalize Feedback
            </Button>
          </Popconfirm>
        </Tooltip>
      </div>
    );
  };

  // ─── Render: Review Requests List ──────────────────────────────────────

  const renderReviewRequests = () => {
    if (loadingRequests) {
      return <div style={{ padding: '20px 0', textAlign: 'center' }}><Spin size="small" /></div>;
    }
    if (reviewRequests.length === 0) return null;
    const isSelf = selectedEmployee?.employee_id === sessionStorage.getItem('employee_id');
    if (!isSelf && isManager) return null;

    return (
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #e0e7ff', background: '#fafaff', marginBottom: 16 }}
        title={<span style={{ fontWeight: 800, fontSize: 13, color: '#4338ca' }}>📝 Pending Feedback Requests for Others</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviewRequests.map(req => {
            const isCompleted = req.my_reviewer_status === 'SUBMITTED';
            return (
              <div key={req.assignment_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                    Review {req.employee_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Status: <Tag color={STATUS_COLORS[req.my_reviewer_status] || 'blue'} style={{ fontSize: 10, fontWeight: 700, borderRadius: 4 }}>{req.my_reviewer_status}</Tag>
                  </div>
                </div>
                <div>
                  <Button 
                    type={isCompleted ? 'default' : 'primary'} 
                    size="small" 
                    onClick={() => {
                      setActiveReviewRequest(req);
                    }}
                    style={{ borderRadius: 6, fontWeight: 700 }}
                  >
                    {isCompleted ? 'View Questionnaire' : 'Provide Feedback'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderSubTabs = () => {
    if (!isSubject) return null;
    return (
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 16, gap: 16 }}>
        <button
          onClick={() => setSubTab('about_me')}
          style={{
            padding: '8px 12px', background: 'none', border: 'none',
            borderBottom: subTab === 'about_me' ? '2px solid #4338ca' : '2px solid transparent',
            color: subTab === 'about_me' ? '#4338ca' : '#64748b', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s'
          }}
        >
          About Me
        </button>
        <button
          onClick={() => setSubTab('feedback_to_give')}
          style={{
            padding: '8px 12px', background: 'none', border: 'none',
            borderBottom: subTab === 'feedback_to_give' ? '2px solid #4338ca' : '2px solid transparent',
            color: subTab === 'feedback_to_give' ? '#4338ca' : '#64748b', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s'
          }}
        >
          Feedback To Give ({reviewRequests.length})
        </button>
      </div>
    );
  };

  // ─── Render: Employee Results View ──────────────────────────────────────

  const renderEmployeeResults = () => {
    if (!isSubject || !isFinalized) return null;

    // Mark as viewed
    if (!data.summary?.results_viewed_at) {
      handleViewResults();
    }

    return (
      <Card size="small" style={{ borderRadius: 12, border: '1px solid #d1fae5', background: '#f0fdf4', marginBottom: 16 }}
        title={<span style={{ fontWeight: 700, fontSize: 14, color: '#166534' }}>🎉 Your 360° Feedback Results</span>}
      >
        <Alert type="success" showIcon
          message={`Overall Score: ${parseFloat(summary?.final_score || 0).toFixed(1)}%`}
          description="This score is calculated as a weighted average of all submitted feedback from your reviewers."
          style={{ marginBottom: 12, borderRadius: 8 }}
        />
      </Card>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────

  if (activeReviewRequest) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Button 
          type="link" 
          icon={<span>&larr;</span>} 
          onClick={() => setActiveReviewRequest(null)}
          style={{ paddingLeft: 0, marginBottom: 16, fontWeight: 700 }}
        >
          Back to Feedback To Give List
        </Button>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>
          Providing Feedback for {activeReviewRequest.employee_name}
        </div>
        {renderReviewerForm()}
      </div>
    );
  }


  return (
    <div style={{ padding: '16px 0' }}>
      {renderSubTabs()}

      {/* Tab 1: About Me */}
      {(!isSubject || subTab === 'about_me') && (
        <>
          {renderReviewerForm()}
          {renderSummaryCard()}
          {renderEmployeeResults()}
          {renderParticipants()}
        </>
      )}

      {/* Tab 2: Feedback To Give */}
      {(isSubject && subTab === 'feedback_to_give') && (
        <>
          {renderReviewRequests()}
        </>
      )}

      {/* Manager-only or Reviewer-only sections */}
      {renderSubmittedReviews()}
      {renderFinalizeSection()}
    </div>
  );
}
