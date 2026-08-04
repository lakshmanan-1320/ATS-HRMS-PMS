import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Spin, Rate, Alert, Button, Input, Select, Checkbox, Space, Tag, Upload, message, Card } from 'antd';
import { UploadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const headers = () => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export default function GoalSelfAssessmentPanel({ goal, isManager, selectedEmployee, role, onRefreshAssignments }) {
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [config, setConfig] = useState({ employee_weight: 40, manager_weight: 60 });
  
  // Local changes state
  const [localAnswers, setLocalAnswers] = useState([]);
  const [employeeComments, setEmployeeComments] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssessmentData = () => {
    if (!selectedEmployee) return;
    setLoading(true);
    const apiHeaders = headers();
    
    // Fetch template configuration configuration
    axios.get('/api/self-assessment-config', { headers: apiHeaders })
      .then(res => setConfig(res.data.data))
      .catch(err => console.error(err));

    axios.get(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/self-assessment`, { headers: apiHeaders })
      .then(res => {
        const { submission: sub, answers: ans, attachments: atts } = res.data.data;
        setSubmission(sub);
        setAnswers(ans);
        setLocalAnswers(ans.map(a => ({
          template_id: a.template_id,
          answer: a.answer || '',
          employee_rating: a.employee_rating,
          manager_rating: a.manager_rating,
          manager_comment: a.manager_comment || '',
          employee_comment: a.employee_comment || '',
          weight: a.weight
        })));
        setEmployeeComments(sub?.employee_comments || '');
        setManagerComments(sub?.manager_comments || '');
        setAttachments(atts || []);
      })
      .catch(err => {
        message.error(err.response?.data?.message || 'Failed to load self assessment.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssessmentData();
  }, [goal?.goal_id, selectedEmployee?.assignment_id]);

  if (!selectedEmployee) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Alert message="Please select an assigned employee from the list to view or review their self assessment." type="info" showIcon />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}><Spin size="large" /></div>
    );
  }

  const isEmployeeSide = !isManager;
  const status = submission?.status || 'DRAFT';
  const isEditable = isEmployeeSide && (status === 'DRAFT' || status === 'RETURNED');
  const isReviewable = isManager && status === 'SUBMITTED';

  const updateAnswerField = (templateId, field, val) => {
    setLocalAnswers(prev => prev.map(a => a.template_id === templateId ? { ...a, [field]: val } : a));
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/self-assessment/save-draft`, {
        answers: localAnswers
      }, { headers: headers() });
      message.success('Self assessment draft saved.');
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/self-assessment/submit`, {
        employeeComments,
        answers: localAnswers
      }, { headers: headers() });
      message.success('Self assessment submitted successfully.');
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRatableQuestion = (questionType) => {
    return Object.prototype.hasOwnProperty.call(RATING_TYPES, questionType);
  };

  const missingManagerRatings = answers.some(answer => {
    if (!isRatableQuestion(answer.question_type)) return false;
    const local = localAnswers.find(a => a.template_id === answer.template_id) || {};
    const rating = Number(local.manager_rating);
    return !Number.isFinite(rating) || rating < 1 || rating > 5;
  });

  const canApprove = isReviewable && !missingManagerRatings;

  const handleReview = async (decision) => {
    if (decision === 'APPROVED' && missingManagerRatings) {
      message.error('Please provide ratings for all rating-based questions before approving.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/self-assessment/review`, {
        status: decision,
        managerComments,
        answers: localAnswers
      }, { headers: headers() });
      message.success(`Self assessment successfully ${decision === 'APPROVED' ? 'approved' : 'returned'}.`);
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to complete review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/goals/${goal.goal_id}/assignments/${selectedEmployee.assignment_id}/self-assessment/acknowledge`, {}, { headers: headers() });
      message.success('Review acknowledged successfully.');
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to acknowledge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (answerId, file) => {
    const formData = new FormData();
    formData.append('attachments', file);

    try {
      const res = await axios.post(`/api/answers/${answerId}/self-assessment/upload`, formData, {
        headers: {
          ...headers(),
          'Content-Type': 'multipart/form-data'
        }
      });
      message.success('File uploaded successfully.');
      fetchAssessmentData();
    } catch (err) {
      message.error('Upload failed.');
    }
  };

  const handleVerifyEvidence = async (attachmentId, verStatus, remarks) => {
    try {
      await axios.put(`/api/attachments/${attachmentId}/verify`, {
        status: verStatus,
        managerFeedback: remarks
      }, { headers: headers() });
      message.success('Evidence verified successfully.');
      fetchAssessmentData();
    } catch (err) {
      message.error('Verification failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 16 }}>
      
      {/* Assessment Header Alert */}
      <Alert
        message={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <strong>Assessment Status: </strong>
              <Tag color={status === 'APPROVED' ? 'green' : status === 'SUBMITTED' ? 'orange' : status === 'RETURNED' ? 'red' : 'blue'}>
                {status}
              </Tag>
            </span>
            {status === 'APPROVED' && (
              <span>
                <strong>Final Score: </strong>
                <Tag color="purple" style={{ fontSize: 13, fontWeight: 700 }}>{submission.final_score}%</Tag>
              </span>
            )}
          </div>
        }
        type={status === 'APPROVED' ? 'success' : status === 'SUBMITTED' ? 'warning' : 'info'}
      />

      {/* Questionnaire List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {answers.map((ans, idx) => {
          const local = localAnswers.find(la => la.template_id === ans.template_id) || {};
          const isRequired = ans.required;
          const options = ans.options_json || {};
          const choices = options.choices || [];
          const hasChoices = choices.length > 0;
          // Find attachments for this answer
          const answerAttachments = attachments.filter(att => att.template_id === ans.template_id);

          return (
            <Card
              key={ans.answer_id}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Q{idx + 1}. {ans.question} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                  </span>
                  <Tag color="default">{ans.weight}% Weight</Tag>
                </div>
              }
              bordered
              style={{ borderRadius: 10 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Guidelines / Instructions */}
                {options.instructions && (
                  <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                    Guidelines: {options.instructions}
                  </div>
                )}

                {/* Input Fields depending on Question Type */}
                <div>
                  {/* Rating 1-5 */}
                  {ans.question_type === 'RATING_1_5' && (
                    <div>
                      <Rate
                        disabled={!isEditable}
                        max={5}
                        value={local.employee_rating || 0}
                        onChange={val => updateAnswerField(ans.template_id, 'employee_rating', val)}
                      />
                      <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600 }}>
                        (Score: {local.employee_rating || 0}/5)
                      </span>
                    </div>
                  )}

                  {/* Scale 1-10 */}
                  {ans.question_type === 'SCALE_1_10' && (
                    <Select
                      disabled={!isEditable}
                      value={local.employee_rating}
                      onChange={val => updateAnswerField(ans.template_id, 'employee_rating', val)}
                      placeholder="Select rating scale 1 to 10"
                      style={{ width: 200 }}
                    >
                      {[...Array(10)].map((_, i) => (
                        <Select.Option key={i+1} value={i+1}>{i+1}</Select.Option>
                      ))}
                    </Select>
                  )}

                  {/* Yes / No */}
                  {ans.question_type === 'YES_NO' && (
                    <Select
                      disabled={!isEditable}
                      value={local.employee_rating === null ? undefined : (local.employee_rating === 100 ? 'YES' : 'NO')}
                      onChange={val => updateAnswerField(ans.template_id, 'employee_rating', val === 'YES' ? 100 : 0)}
                      placeholder="Select Option"
                      style={{ width: 120 }}
                    >
                      <Select.Option value="YES">Yes</Select.Option>
                      <Select.Option value="NO">No</Select.Option>
                    </Select>
                  )}

                  {/* Multiple Choice */}
                  {ans.question_type === 'MULTIPLE_CHOICE' && hasChoices && (
                    <Select
                      disabled={!isEditable}
                      value={local.answer || undefined}
                      onChange={val => updateAnswerField(ans.template_id, 'answer', val)}
                      placeholder="Select Answer"
                      style={{ width: '100%' }}
                    >
                      {choices.map(c => (
                        <Select.Option key={c} value={c}>{c}</Select.Option>
                      ))}
                    </Select>
                  )}

                  {/* Date Input */}
                  {ans.question_type === 'DATE' && (
                    <Input
                      type="date"
                      disabled={!isEditable}
                      value={local.answer || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'answer', e.target.value)}
                      style={{ width: 200 }}
                    />
                  )}

                  {/* Checklist (Checkbox group) */}
                  {ans.question_type === 'CHECKBOX' && hasChoices && (
                    <Checkbox.Group
                      disabled={!isEditable}
                      options={choices}
                      value={local.answer ? local.answer.split(',').map(s => s.trim()) : []}
                      onChange={checkedList => updateAnswerField(ans.template_id, 'answer', checkedList.join(', '))}
                    />
                  )}

                  {/* Numeric Inputs */}
                  {(ans.question_type === 'NUMBER' || ans.question_type === 'PERCENTAGE' || ans.question_type === 'CURRENCY') && (
                    <Input
                      type="number"
                      disabled={!isEditable}
                      value={local.answer || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'answer', e.target.value)}
                      addonBefore={ans.question_type === 'CURRENCY' ? '$' : undefined}
                      addonAfter={ans.question_type === 'PERCENTAGE' ? '%' : undefined}
                      style={{ width: 200 }}
                    />
                  )}

                  {/* Signatures */}
                  {ans.question_type === 'SIGNATURE' && (
                    <Input
                      disabled={!isEditable}
                      placeholder="Sign your full name (e.g. John Doe)"
                      value={local.answer || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'answer', e.target.value)}
                      style={{ fontStyle: 'italic', fontFamily: 'serif' }}
                    />
                  )}

                  {/* Standard Short and Long Text fallbacks */}
                  {(ans.question_type === 'SHORT_TEXT' || ans.question_type === 'URL') && (
                    <Input
                      type={ans.question_type === 'URL' ? 'url' : 'text'}
                      disabled={!isEditable}
                      value={local.answer || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'answer', e.target.value)}
                      placeholder={ans.question_type === 'URL' ? 'e.g. https://github.com/myproject' : 'Enter answer...'}
                    />
                  )}

                  {ans.question_type === 'LONG_TEXT' && (
                    <Input.TextArea
                      rows={3}
                      disabled={!isEditable}
                      value={local.answer || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'answer', e.target.value)}
                      placeholder="Enter detailed evaluation text..."
                    />
                  )}

                  {/* Legacy choice questions without configured choices remain answerable. */}
                  {['MULTIPLE_CHOICE', 'CHECKBOX'].includes(ans.question_type) && !hasChoices && (
                    <Input.TextArea
                      rows={3}
                      disabled={!isEditable}
                      value={local.answer || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'answer', e.target.value)}
                      placeholder="Enter your answer..."
                    />
                  )}
                </div>

                {/* Evidence Attachments Section */}
                {(options.evidence_required || options.attachments_required || ans.question_type === 'FILE_UPLOAD') && (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                      📁 EVIDENCE ATTACHMENTS {(options.attachments_required || ans.question_type === 'FILE_UPLOAD') && <span style={{ color: '#ef4444' }}>*</span>}
                    </div>
                    
                    {/* List Existing Files */}
                    {answerAttachments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {answerAttachments.map(att => (
                          <div key={att.attachment_id} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', padding: '8px 10px', borderRadius: 6, border: '1px solid #f1f5f9', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                              <FileTextOutlined style={{ color: '#4338ca', flexShrink: 0 }} />
                              <a
                                href={`/${att.storage_path}`}
                                target="_blank"
                                rel="noreferrer"
                                title={att.original_name}
                                style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: 12, fontWeight: 600 }}
                              >
                                {att.original_name}
                              </a>
                              <Tag color={att.verification_status === 'ACCEPTED' ? 'green' : att.verification_status === 'REJECTED' ? 'red' : 'blue'}>
                                {att.verification_status}
                              </Tag>
                            </div>
                            
                            {/* Manager Acceptance/Rejection Flow */}
                            {isReviewable && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Button 
                                  size="small" 
                                  type="default" 
                                  icon={<CheckCircleOutlined style={{ color: '#16a34a' }} />} 
                                  onClick={() => handleVerifyEvidence(att.attachment_id, 'ACCEPTED', 'Verified')}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  size="small" 
                                  type="text" 
                                  danger 
                                  icon={<CloseCircleOutlined />} 
                                  onClick={() => {
                                    const remarks = prompt('Enter rejection reason:');
                                    if (remarks) handleVerifyEvidence(att.attachment_id, 'REJECTED', remarks);
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 }}>No attachments uploaded yet.</div>
                    )}

                    {/* Upload button for employee */}
                    {isEditable && (
                      <Upload
                        beforeUpload={file => {
                          handleFileUpload(ans.answer_id, file);
                          return false; // Stop auto post
                        }}
                        showUploadList={false}
                      >
                        <Button size="small" icon={<UploadOutlined />}>Upload Attachment File</Button>
                      </Upload>
                    )}
                  </div>
                )}

                {/* Employee / Manager Comments and Scores */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  {/* Left Side: Employee Self Comment */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Self Rating Comment</label>
                    <Input
                      disabled={!isEditable}
                      value={local.employee_comment || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'employee_comment', e.target.value)}
                      placeholder="Comment on your self-score..."
                      size="small"
                    />
                  </div>

                  {/* Right Side: Manager Review rating */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Manager Review Score {isReviewable && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    {isReviewable ? (
                      <Rate
                        max={5}
                        value={local.manager_rating || 0}
                        onChange={val => updateAnswerField(ans.template_id, 'manager_rating', val)}
                      />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {ans.manager_rating !== null ? `${ans.manager_rating} / 5` : 'Not rated yet'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Manager evaluation comment */}
                {(isReviewable || ans.manager_comment) && (
                  <div style={{ marginTop: 4 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Manager Review Remarks</label>
                    <Input
                      disabled={!isReviewable}
                      value={local.manager_comment || ''}
                      onChange={e => updateAnswerField(ans.template_id, 'manager_comment', e.target.value)}
                      placeholder="Enter manager remarks..."
                      size="small"
                    />
                  </div>
                )}

              </div>
            </Card>
          );
        })}
      </div>

      {/* Global Comments Sections */}
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>EMPLOYEE OVERALL COMMENTS</label>
            <Input.TextArea
              rows={2}
              disabled={!isEditable}
              value={employeeComments}
              onChange={e => setEmployeeComments(e.target.value)}
              placeholder="Enter overall comments..."
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>MANAGER OVERALL REMARKS</label>
            <Input.TextArea
              rows={2}
              disabled={!isReviewable}
              value={managerComments}
              onChange={e => setManagerComments(e.target.value)}
              placeholder="Enter manager review feedback..."
            />
          </div>
        </div>
      </div>

      {/* Dynamic Action Buttons Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
        {isEditable && (
          <>
            <Button disabled={submitting} onClick={handleSaveDraft}>Save Draft</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>Submit Self Assessment</Button>
          </>
        )}
        
        {isReviewable && (
          <>
            <Button danger disabled={submitting} onClick={() => handleReview('RETURNED')}>Return for Changes</Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={!canApprove}
              onClick={() => handleReview('APPROVED')}
            >
              Approve & Complete
            </Button>
            {!canApprove && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 8 }}>
                Please rate all scoreable questions before approving.
              </Text>
            )}
          </>
        )}

        {isEmployeeSide && status === 'APPROVED' && !submission.employee_acknowledged && (
          <Button type="primary" loading={submitting} onClick={handleAcknowledge}>Acknowledge Review</Button>
        )}
      </div>

    </div>
  );
}

const RATING_TYPES = {
  RATING_1_5: 5,
  SCALE_1_10: 10,
  PERCENTAGE: 100,
  YES_NO: 100
};
