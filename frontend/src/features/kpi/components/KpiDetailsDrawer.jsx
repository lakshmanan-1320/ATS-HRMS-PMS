import React, { useState } from 'react';
import { Drawer, Descriptions, Tag, Button, Tabs, Card, List, Space, Typography, Collapse, Empty, Alert } from 'antd';
import { 
  FilePdfOutlined, FileExcelOutlined, FileImageOutlined, LinkOutlined, 
  UserOutlined, ClockCircleOutlined, AuditOutlined, MessageOutlined,
  CheckSquareOutlined, EyeOutlined
} from '@ant-design/icons';
import KpiStatusTimeline from './KpiStatusTimeline';

const { Link, Text } = Typography;

const PRIORITY_COLORS = {
  LOW: 'blue',
  MEDIUM: 'orange',
  HIGH: 'volcano',
  CRITICAL: 'red'
};

const STATUS_COLORS = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'processing',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  REJECTED: 'error',
  CHANGES_REQUESTED: 'error'
};

const SUBMISSION_STATUS_COLORS = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CHANGES_REQUESTED: 'error'
};

export default function KpiDetailsDrawer({ 
  visible, kpi, onClose, role, onStatusChange, onOpenReview, onOpenSubmitCompletion 
}) {
  const [activeTab, setActiveTab] = useState('info');

  if (!kpi) return null;

  const isManagerOrAdmin = ['client_admin', 'manager', 'hr'].includes(role);
  const isEmployee = role === 'employee';

  const getAttachmentIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (ext === 'csv' || ext === 'xlsx') return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (['png', 'jpg', 'jpeg'].includes(ext)) return <FileImageOutlined style={{ color: '#1890ff' }} />;
    return <ClockCircleOutlined />;
  };

  const renderSubmissionValue = (sub) => {
    if (kpi.measurement_type === 'CHECKLIST') {
      let subTasks = [];
      try {
        subTasks = JSON.parse(sub.submitted_text || '[]');
      } catch (e) {}
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          {subTasks.map((t, idx) => (
            <div key={t.task_id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span>{t.is_completed ? '✅' : '⬜'}</span>
              <span style={{ textDecoration: t.is_completed ? 'line-through' : 'none', color: t.is_completed ? '#94a3b8' : 'inherit' }}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      );
    }
    if (kpi.measurement_type === 'BOOLEAN') {
      return <Tag color={sub.submitted_boolean ? 'success' : 'error'}>{sub.submitted_boolean ? 'YES' : 'NO'}</Tag>;
    }
    if (kpi.measurement_type === 'TEXT') {
      return <Text>{sub.submitted_text}</Text>;
    }
    return <Text strong>{parseFloat(sub.submitted_value)} / {parseFloat(kpi.target_value)} {kpi.unit || ''}</Text>;
  };

  return (
    <Drawer
      title={`KPI Details — ${kpi.kpi_code || 'Details'}`}
      placement="right"
      onClose={onClose}
      open={visible}
      width={640}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* KPI Code, Title, Target and weights */}
        <div>
          <Space style={{ marginBottom: 8 }} wrap>
            <Tag color={STATUS_COLORS[kpi.status]}>{kpi.status}</Tag>
            <Tag color={PRIORITY_COLORS[kpi.priority]}>{kpi.priority} Priority</Tag>
            <Tag color="purple">{kpi.kpi_type}</Tag>
            <Tag color="cyan">Weight: {parseFloat(kpi.weight_percentage)}%</Tag>
          </Space>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{kpi.title}</h2>
          {kpi.status === 'CHANGES_REQUESTED' && (
            <Alert
              message="Action Required: Changes Requested"
              description={
                <div style={{ marginTop: 4 }}>
                  <Text strong>Manager Feedback: </Text>
                  <Text style={{ color: '#c2410c' }}>
                    {kpi.latestSubmission?.review_comment || 'The reviewer requested revisions. Please check the submissions tab or submit new proof.'}
                  </Text>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginTop: 12, borderRadius: 8 }}
            />
          )}
          {kpi.description && (
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>{kpi.description}</p>
          )}
        </div>

        {/* Timeline step block */}
        <Card size="small" title="KPI Status Timeline">
          <KpiStatusTimeline currentStatus={kpi.status} />
        </Card>

        {/* Tab Controls */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Overview" key="info">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Measurement Type" span={2}>{kpi.measurement_type}</Descriptions.Item>
              
              {kpi.measurement_type !== 'CHECKLIST' && kpi.measurement_type !== 'BOOLEAN' && kpi.measurement_type !== 'TEXT' && (
                <>
                  <Descriptions.Item label="Target">{parseFloat(kpi.target_value)} {kpi.unit || ''}</Descriptions.Item>
                  <Descriptions.Item label="Approved Value">{parseFloat(kpi.approved_value)} {kpi.unit || ''}</Descriptions.Item>
                </>
              )}

              {kpi.measurement_type === 'BOOLEAN' && (
                <>
                  <Descriptions.Item label="Target Boolean">{kpi.target_boolean ? 'YES' : 'NO'}</Descriptions.Item>
                  <Descriptions.Item label="Approved Boolean">{kpi.approved_boolean === null ? '—' : (kpi.approved_boolean ? 'YES' : 'NO')}</Descriptions.Item>
                </>
              )}

              {kpi.measurement_type === 'TEXT' && (
                <>
                  <Descriptions.Item label="Target text" span={2}>{kpi.target_text}</Descriptions.Item>
                  <Descriptions.Item label="Approved text" span={2}>{kpi.approved_text || '—'}</Descriptions.Item>
                </>
              )}

              <Descriptions.Item label="Completion Progress" span={2}>
                <Typography.Text strong style={{ color: '#16a34a', fontSize: 16 }}>
                  {parseFloat(kpi.completion_percentage)}%
                </Typography.Text>
              </Descriptions.Item>

              <Descriptions.Item label="Owner">{kpi.owner_name || kpi.owner_email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Frequency">{kpi.frequency}</Descriptions.Item>
              <Descriptions.Item label="Start Date">{kpi.start_date ? new Date(kpi.start_date).toLocaleDateString('en-IN') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{kpi.due_date ? new Date(kpi.due_date).toLocaleDateString('en-IN') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Approved By">{kpi.approved_by_name || '—'}</Descriptions.Item>
            </Descriptions>

            {/* Checklist Tasks Sub-section if checklist */}
            {kpi.measurement_type === 'CHECKLIST' && kpi.tasks && kpi.tasks.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <Typography.Title level={5}><CheckSquareOutlined /> Checklist Subtasks</Typography.Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {kpi.tasks.map((task, idx) => (
                    <div key={task.task_id || idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <span style={{ fontSize: 18, color: task.is_completed ? '#10b981' : '#cbd5e1' }}>
                        {task.is_completed ? '☑' : '☐'}
                      </span>
                      <span style={{ textDecoration: task.is_completed ? 'line-through' : 'none', color: task.is_completed ? '#94a3b8' : 'inherit' }}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab={`Submissions (${kpi.submissions?.length || 0})`} key="submissions">
            {kpi.submissions && kpi.submissions.length > 0 ? (
              <Collapse defaultActiveKey={['0']} accordion>
                {kpi.submissions.map((sub, idx) => (
                  <Collapse.Panel 
                    key={String(idx)} 
                    header={
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <span>
                          <Tag color={SUBMISSION_STATUS_COLORS[sub.status]}>{sub.status}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(sub.submitted_at).toLocaleDateString('en-IN')}
                          </Text>
                        </span>
                        {isManagerOrAdmin && sub.status === 'PENDING' && (
                          <Button 
                            type="primary" 
                            size="small" 
                            icon={<EyeOutlined />} 
                            onClick={(e) => { e.stopPropagation(); onOpenReview(sub); }}
                          >
                            Review
                          </Button>
                        )}
                      </Space>
                    }
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Submitted Value</Text>
                        <div style={{ marginTop: 4 }}>{renderSubmissionValue(sub)}</div>
                      </div>

                      {sub.comment && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}><MessageOutlined /> Employee Comment</Text>
                          <Text style={{ display: 'block', fontStyle: 'italic', background: '#f8fafc', padding: 8, borderRadius: 6, marginTop: 4 }}>
                            {sub.comment}
                          </Text>
                        </div>
                      )}

                      {/* Attachments inside collapse */}
                      {sub.attachments && sub.attachments.length > 0 && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Proofs (Attachments)</Text>
                          <List
                            size="small"
                            dataSource={sub.attachments}
                            renderItem={att => (
                              <List.Item style={{ padding: '4px 0' }}>
                                <Space>
                                  {getAttachmentIcon(att.file_name)}
                                  <Link href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                                    {att.file_name}
                                  </Link>
                                </Space>
                              </List.Item>
                            )}
                          />
                        </div>
                      )}

                      {/* Links inside collapse */}
                      {sub.links && sub.links.length > 0 && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}>Proof Links</Text>
                          <List
                            size="small"
                            dataSource={sub.links}
                            renderItem={link => (
                              <List.Item style={{ padding: '4px 0' }}>
                                <Space>
                                  <LinkOutlined style={{ color: '#1890ff' }} />
                                  <Link href={link.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                                    {link.link_name}
                                  </Link>
                                </Space>
                              </List.Item>
                            )}
                          />
                        </div>
                      )}

                      {/* Review results */}
                      {sub.status !== 'PENDING' && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 8 }}>
                          <Space wrap>
                            <Tag color="blue"><AuditOutlined /> Reviewed by {sub.reviewer_name || sub.reviewer_email || 'Manager'}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {sub.reviewed_at ? new Date(sub.reviewed_at).toLocaleDateString('en-IN') : ''}
                            </Text>
                          </Space>
                          {sub.review_comment && (
                            <div style={{ marginTop: 6 }}>
                              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Reviewer Remarks</Text>
                              <Text style={{ display: 'block', background: '#f5f3ff', padding: 8, borderRadius: 6, color: '#5b21b6', fontSize: 12 }}>
                                {sub.review_comment}
                              </Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Collapse.Panel>
                ))}
              </Collapse>
            ) : (
              <Empty description="No submissions logged yet." />
            )}
          </Tabs.TabPane>
        </Tabs>

        {/* Manager/Employee actions at the bottom of Details drawer */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', gap: 10 }}>
          {isEmployee && ['ACTIVE', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(kpi.status) && (
            <Button type="primary" block onClick={onOpenSubmitCompletion}>
              Submit Completed Work Proof
            </Button>
          )}

          {isManagerOrAdmin && kpi.status === 'PENDING_APPROVAL' && (
            <Space style={{ width: '100%' }}>
              <Button 
                danger 
                onClick={() => onStatusChange(kpi.kpi_id, 'REJECTED', 'Rejected by manager.')}
              >
                Reject KPI
              </Button>
              <Button 
                onClick={() => onStatusChange(kpi.kpi_id, 'CHANGES_REQUESTED', 'Changes requested by manager.')}
              >
                Request Changes
              </Button>
              <Button 
                type="primary" 
                style={{ background: '#389e0d', borderColor: '#389e0d' }}
                onClick={() => onStatusChange(kpi.kpi_id, 'ACTIVE', 'Approved & Activated KPI.')}
              >
                Approve & Activate
              </Button>
            </Space>
          )}
        </div>
      </div>
    </Drawer>
  );
}
