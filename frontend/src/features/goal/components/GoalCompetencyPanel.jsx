import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Input, Rate, Typography, Space, Divider, Alert, Row, Col, Modal, Select, Progress, Tag } from 'antd';
import { FiCheckCircle, FiEdit3, FiSave, FiAward, FiInfo } from 'react-icons/fi';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function GoalCompetencyPanel({ goal, isManager, selectedEmployee, role, onRefreshAssignments }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  
  // Rating states (draft mappings)
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  
  // Submit complete modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [completionOutcome, setCompletionOutcome] = useState('ACHIEVED');

  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const assignmentId = selectedEmployee?.assignment_id || goal.assignment_id || null;

  const fetchAssessmentData = async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/client-admin/competency-assessment/goals/${goal.goal_id}/assignments/${assignmentId}/competency-assessment`,
        { headers }
      );
      const resData = res.data.data;
      setData(resData);
      
      // Populate state
      const initialRatings = {};
      const initialComments = {};
      resData.ratings?.forEach(r => {
        initialRatings[r.goal_competency_id] = r.rating;
        initialComments[r.goal_competency_id] = r.comment || '';
      });
      setRatings(initialRatings);
      setComments(initialComments);
    } catch (err) {
      console.error('Failed to load competency assessment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessmentData();
  }, [goal.goal_id, assignmentId]);

  if (!assignmentId) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <Alert 
          message="Department Parent Goal"
          description="Click on an employee sub-goal under Goal Hierarchy (Overview tab) to open their goal and rate competencies."
          type="info"
          showIcon
        />
      </div>
    );
  }

  if (loading || !data) {
    return <div style={{ padding: 30, textAlign: 'center' }}><Progress type="circle" percent={40} status="active" format={() => 'Loading...'} /></div>;
  }

  const { assignment, scales, competencies, indicators } = data;

  const handleRatingChange = (comp_id, val) => {
    setRatings(prev => ({ ...prev, [comp_id]: val }));
  };

  const handleCommentChange = (comp_id, text) => {
    setComments(prev => ({ ...prev, [comp_id]: text }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const ratingsPayload = competencies.map(c => ({
        goal_competency_id: c.goal_competency_id,
        rating: ratings[c.goal_competency_id] || 3, // default meets expectation
        comment: comments[c.goal_competency_id] || ''
      }));

      await axios.post(
        `/api/client-admin/competency-assessment/goals/${goal.goal_id}/assignments/${assignmentId}/competency-assessment`,
        { ratings: ratingsPayload, isSubmit: false },
        { headers }
      );
      alert('Draft evaluation saved successfully.');
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    // Check if comments mandatory constraint is enabled
    // Default: validate comment text is entered if rating is low (1 or 2)
    let invalid = false;
    for (const c of competencies) {
      const val = ratings[c.goal_competency_id];
      if (!val) {
        alert(`Please award a rating score for competency "${c.name}".`);
        return;
      }
      const commentText = comments[c.goal_competency_id];
      if (val <= 2 && (!commentText || !commentText.trim())) {
        alert(`A comment/behavior justification is required for rating score level ${val} on "${c.name}".`);
        return;
      }
    }

    setIsSubmitModalOpen(true);
  };

  const confirmFinalSubmit = async () => {
    setSaving(true);
    try {
      const ratingsPayload = competencies.map(c => ({
        goal_competency_id: c.goal_competency_id,
        rating: ratings[c.goal_competency_id],
        comment: comments[c.goal_competency_id] || ''
      }));

      await axios.post(
        `/api/client-admin/competency-assessment/goals/${goal.goal_id}/assignments/${assignmentId}/competency-assessment`,
        { ratings: ratingsPayload, isSubmit: true, outcome: completionOutcome },
        { headers }
      );
      
      setIsSubmitModalOpen(false);
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize assessment.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      await axios.post(
        `/api/client-admin/competency-assessment/goals/${goal.goal_id}/assignments/${assignmentId}/acknowledge`,
        {},
        { headers }
      );
      alert('Assessment results acknowledged.');
      fetchAssessmentData();
      if (onRefreshAssignments) onRefreshAssignments();
    } catch (err) {
      alert('Failed to acknowledge assessment.');
    }
  };

  const isCompleted = assignment.status === 'COMPLETED';
  const displayScore = assignment.weighted_score !== null ? assignment.weighted_score : '—';
  
  // Sum of weights
  const totalWeight = competencies.reduce((acc, c) => acc + parseFloat(c.weight || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Overview stats bar */}
      <Card style={{ borderRadius: 12, border: '1px solid #cbd5e1', background: '#f8fafc' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={8}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Weighted Final Score</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#4f46e5', marginTop: 4 }}>
              {displayScore}%
            </div>
          </Col>
          <Col span={8}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Completion Outcome</div>
            <div style={{ marginTop: 4 }}>
              {isCompleted ? (
                <Tag color={assignment.completion_outcome === 'ACHIEVED' ? 'green' : 'orange'} style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>
                  {assignment.completion_outcome}
                </Tag>
              ) : (
                <Tag color="blue" style={{ fontSize: 11, fontWeight: 700 }}>EVALUATION ACTIVE</Tag>
              )}
            </div>
          </Col>
          <Col span={8}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Employee Acknowledgement</div>
            <div style={{ marginTop: 4 }}>
              {assignment.employee_acknowledged ? (
                <Tag color="success" style={{ fontSize: 11, fontWeight: 700 }}>✓ ACKNOWLEDGED</Tag>
              ) : (
                <Tag color="default" style={{ fontSize: 11, fontWeight: 600 }}>PENDING ACKNOWLEDGEMENT</Tag>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Competencies Ratings Form */}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {competencies.map((comp, idx) => {
          const ratingVal = ratings[comp.goal_competency_id] || 0;
          const currentComment = comments[comp.goal_competency_id] || '';
          
          // Get rating scale label
          const scaleLabel = scales.find(s => s.rating_level === ratingVal)?.label || '';
          
          // Get behavioral indicator text
          const indicatorMatch = indicators.find(ind => ind.competency_id === comp.competency_library_id && ind.rating_level === ratingVal);
          
          return (
            <Card 
              key={comp.goal_competency_id} 
              style={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: 'none' }}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{idx + 1}. {comp.name}</span>
                  <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 700 }}>Weight: {comp.weight}%</Tag>
                </div>
              }
            >
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                {comp.description || 'No description configured.'}
              </Paragraph>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col xs={24} md={12}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Rating Level Score:</div>
                  {isCompleted || !isManager ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Rate disabled value={ratingVal} style={{ fontSize: 16 }} />
                      <Text style={{ fontWeight: 700, fontSize: 13, color: '#6366f1' }}>({ratingVal}/5 — {scaleLabel})</Text>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[1, 2, 3, 4, 5].map(val => {
                          const active = ratingVal === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleRatingChange(comp.goal_competency_id, val)}
                              style={{
                                width: 34, height: 34, borderRadius: '50%',
                                border: active ? 'none' : '1px solid #cbd5e1',
                                background: active ? '#4f46e5' : '#fff',
                                color: active ? '#fff' : '#1e293b',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      {scaleLabel && <Text style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>Selected Level: {scaleLabel}</Text>}
                    </div>
                  )}

                  {/* Behavioral indicator guidance alert */}
                  {ratingVal > 0 && indicatorMatch && (
                    <div style={{ marginTop: 12, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid #6366f1', fontSize: 12 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#475569', fontWeight: 700, marginBottom: 4 }}>
                        <FiInfo /> Behavioral Indicator Guide
                      </div>
                      <Text type="secondary">{indicatorMatch.behavioral_indicator}</Text>
                    </div>
                  )}
                </Col>

                <Col xs={24} md={12}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Feedback Comment:</div>
                  {isCompleted || !isManager ? (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0', color: '#334155', minHeight: 40 }}>
                      {currentComment || 'No comment recorded.'}
                    </div>
                  ) : (
                    <TextArea
                      rows={3}
                      placeholder="Detail specific behavioral evidence or comments..."
                      value={currentComment}
                      onChange={e => handleCommentChange(comp.goal_competency_id, e.target.value)}
                      style={{ borderRadius: 6, fontSize: 12 }}
                    />
                  )}
                </Col>
              </Row>
            </Card>
          );
        })}
      </Space>

      {/* Evaluator controls */}
      {!isCompleted && isManager && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
          <Button onClick={handleSaveDraft} loading={saving} style={{ borderRadius: 6, fontWeight: 700 }}>
            Save Draft
          </Button>
          <Button type="primary" onClick={handleFinalSubmit} loading={saving} style={{ background: '#4f46e5', borderColor: '#4f46e5', borderRadius: 6, fontWeight: 700 }}>
            Complete Evaluation
          </Button>
        </div>
      )}

      {/* Acknowledge buttons for employees */}
      {isCompleted && !isManager && !assignment.employee_acknowledged && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Button 
            type="primary" 
            icon={<FiCheckCircle />} 
            onClick={handleAcknowledge}
            style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8, padding: '10px 24px', height: 'auto', fontWeight: 800 }}
          >
            Acknowledge Competency Assessment Results
          </Button>
        </div>
      )}

      {/* Complete Assessment Dialog modal */}
      <Modal
        title={<span style={{ fontWeight: 800 }}>🏆 Finalize Competency Assessment</span>}
        open={isSubmitModalOpen}
        onOk={confirmFinalSubmit}
        onCancel={() => setIsSubmitModalOpen(false)}
        okText="Submit & Lock Score"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
          <Paragraph>
            You are finalising the assessment evaluation scores for <strong>{assignment.first_name} {assignment.last_name}</strong>.
            This action will submit and lock the final weighted score of <strong>{displayScore}%</strong>.
          </Paragraph>
          <div>
            <label style={{ fontWeight: 700, fontSize: 12, color: '#475569', display: 'block', marginBottom: 6 }}>Completion Performance Outcome *</label>
            <Select 
              value={completionOutcome} 
              onChange={setCompletionOutcome}
              style={{ width: '100%' }}
            >
              <Select.Option value="ACHIEVED">🏆 ACHIEVED (Passed minimum standard)</Select.Option>
              <Select.Option value="NEEDS_DEVELOPMENT">⚠️ NEEDS DEVELOPMENT (Requires improvement)</Select.Option>
            </Select>
          </div>
        </div>
      </Modal>

    </div>
  );
}
