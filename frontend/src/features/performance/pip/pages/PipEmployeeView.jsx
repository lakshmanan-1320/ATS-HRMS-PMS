import React, { useState, useEffect } from 'react';
import { Card, Tag, Progress, Button, Space, Typography, Spin, Form, Input, Row, Col, List, message, Divider } from 'antd';
import { FiCheckCircle, FiFileText, FiClock, FiActivity, FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import EmployeeSidebar from '../../../../components/layout/EmployeeSidebar';
import EmployeeTopBar from '../../../../components/layout/EmployeeTopBar';
import { usePipStore } from '../pip.store';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const { Title, Text, Paragraph } = Typography;

export default function PipEmployeeView() {
  const store = usePipStore();
  const { selectedPip, fetchPip, confirmRead, addEmployeeComment, loading, saving, error } = store;
  const [commentText, setCommentText] = useState('');
  const [activeCheckin, setActiveCheckin] = useState(null);

  // Auto-load current active employee PIP
  useEffect(() => {
    const empId = sessionStorage.getItem('employee_id');
    if (empId) {
      // Find the active/monitoring PIP for this employee
      api.get('/pip/active', { params: { employee_id: empId } })
        .then(res => {
          const active = res.data?.data?.find(p => ['ACTIVE', 'MONITORING', 'EXTENDED'].includes(p.status));
          if (active) {
            fetchPip(active.pip_id);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleConfirmRead = async () => {
    try {
      await confirmRead(selectedPip.pip_id);
      message.success('Read confirmation submitted successfully.');
      fetchPip(selectedPip.pip_id);
    } catch (e) {
      message.error(error || 'Failed to submit read confirmation.');
    }
  };

  const handleAddComment = async (checkinId) => {
    if (!commentText.trim()) return;
    try {
      await addEmployeeComment(checkinId, commentText);
      message.success('Comment added successfully.');
      setCommentText('');
      setActiveCheckin(null);
      fetchPip(selectedPip.pip_id);
    } catch (e) {
      message.error(error || 'Failed to submit comment.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading Performance Development Plan..." />
        </div>
      );
    }

    if (!selectedPip) {
      return (
        <Card style={{ borderRadius: 12, padding: '40px 20px', textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
          <div style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}><FiCheckCircle size={48} /></div>
          <Title level={4}>No Active Development Plan</Title>
          <Text type="secondary">You are not currently enrolled in any active Performance Improvement Plans (PIP).</Text>
        </Card>
      );
    }

    return (
      <div style={{ padding: '0 24px 40px 24px' }}>
        {/* Read Confirmation Alert Bar */}
        {!selectedPip.employee_acknowledged && (
          <AlertBar onConfirm={handleConfirmRead} selectedPip={selectedPip} />
        )}

        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {/* Left Main column */}
          <Col span={16}>
            <Card title={selectedPip.is_monitoring ? "Monitoring Objectives & Metric Targets" : "PIP Objectives & Metric Targets"} style={{ borderRadius: 12, marginBottom: 24 }}>
              <List
                dataSource={selectedPip.metrics}
                renderItem={m => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <strong>{m.metric_name} ({m.metric_source})</strong>
                        <Text type="secondary">Target: {m.target_value}% | Weight: {m.weight}% | Mode: {m.calculation_type || m.direction || 'HIGHER_IS_BETTER'}</Text>
                      </div>
                      <Progress percent={Math.round(m.completion_pct)} size="small" strokeColor="#0466C8" />
                      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <Text type="secondary">My current score: {m.current_value}%</Text>
                        {m.required && <Tag color="red">Required</Tag>}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>

            <Card title="Progress Check-ins History" style={{ borderRadius: 12 }}>
              <List
                dataSource={selectedPip.checkins}
                renderItem={(c, index) => (
                  <List.Item extra={
                    c.status === 'COMPLETED' ? (
                      <Tag color="green">Reviewed ({c.overall_progress_at_checkin}%)</Tag>
                    ) : <Tag color="orange">Scheduled</Tag>
                  }>
                    <List.Item.Meta
                      title={`Review Session #${index + 1} (${c.checkin_date})`}
                      description={
                        c.status === 'COMPLETED' ? (
                          <div style={{ marginTop: 8 }}>
                            <div><strong>Manager Feedback Notes:</strong> {c.manager_notes}</div>
                            {c.action_items && <div style={{ marginTop: 4 }}><strong>Action Items:</strong> {c.action_items}</div>}
                            {c.employee_comments ? (
                              <div style={{ marginTop: 6, background: '#f8fafc', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #cbd5e1' }}>
                                <strong>My Comments:</strong> {c.employee_comments}
                              </div>
                            ) : (
                              <div style={{ marginTop: 8 }}>
                                {activeCheckin === c.checkin_id ? (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <Input placeholder="Enter your response comments..." value={commentText} onChange={e => setCommentText(e.target.value)} />
                                    <Button type="primary" onClick={() => handleAddComment(c.checkin_id)}>Submit</Button>
                                    <Button onClick={() => setActiveCheckin(null)}>Cancel</Button>
                                  </div>
                                ) : (
                                  <Button size="small" icon={<FiMessageSquare />} onClick={() => { setActiveCheckin(c.checkin_id); setCommentText(''); }}>Add Comments Feedback</Button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : 'Pending review meeting.'
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Right Summary column */}
          <Col span={8}>
            <Card title="Plan Details" style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <Text type="secondary">Current Overall Progress</Text>
                  <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{selectedPip.overall_progress}%</Title>
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <div>
                  <Text type="secondary">Start Date</Text>
                  <div><strong>{selectedPip.start_date}</strong></div>
                </div>
                <div>
                  <Text type="secondary">Target End Date</Text>
                  <div><strong>{selectedPip.end_date}</strong></div>
                </div>
                <div>
                  <Text type="secondary">Check-in Interval</Text>
                  <div><strong>{selectedPip.checkin_frequency}</strong></div>
                </div>
                <div>
                  <Text type="secondary">Read Confirmation Status</Text>
                  <div>{selectedPip.employee_acknowledged ? <Tag color="green">Confirmed Read ({selectedPip.employee_acknowledged_at?.split('T')[0]})</Tag> : <Tag color="red">Unread</Tag>}</div>
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <div>
                  <Text type="secondary">Reason / Details</Text>
                  <Paragraph style={{ marginTop: 4, fontSize: 13 }}>{selectedPip.reason}</Paragraph>
                </div>
              </div>
            </Card>

            {selectedPip.history?.length > 0 && (
              <Card title="Historical Plans" style={{ borderRadius: 12, marginTop: 20 }}>
                <List
                  dataSource={selectedPip.history}
                  renderItem={h => (
                    <List.Item>
                      <List.Item.Meta
                        title={h.template_name || 'Performance Improvement'}
                        description={<div>Closed status: <Tag>{h.status}</Tag> ({h.overall_progress}% progress)</div>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#001233', fontFamily: "'Inter', sans-serif" }}>
      <EmployeeSidebar active="performance" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar />
        
        <div className="pms-content-flush" style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
          <div style={{ padding: '24px 24px 8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#001233' }}>
                {selectedPip?.is_monitoring ? 'My Performance Monitoring Plan' : 'My Performance Improvement Plan (PIP)'}
              </Title>
              <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
                {selectedPip?.is_monitoring ? 'Review goals, metrics progress, and log check-in comments.' : 'Review metrics, check-in schedules, and submit read confirmation notes.'}
              </Paragraph>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function AlertBar({ onConfirm, selectedPip }) {
  const isMon = selectedPip?.is_monitoring;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      border: '1px solid #f59e0b',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16
    }}>
      <div>
        <strong style={{ color: '#92400e', display: 'block', fontSize: 14 }}>Read Confirmation Required</strong>
        <Text style={{ color: '#b45309', fontSize: 13 }}>
          Please review the targets, dates, and metrics defined in this {isMon ? 'Performance Monitoring Plan' : 'Performance Improvement Plan (PIP)'}, and submit your Read Confirmation.
        </Text>
      </div>
      <Button type="primary" style={{ background: '#d97706', borderColor: '#d97706' }} onClick={onConfirm}>
        Confirm I Have Read This Plan
      </Button>
    </div>
  );
}
