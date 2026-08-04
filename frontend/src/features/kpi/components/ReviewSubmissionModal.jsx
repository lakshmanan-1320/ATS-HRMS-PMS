import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Card, Descriptions, Tag, List, Typography, Space } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, FileImageOutlined, LinkOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Link } = Typography;

export default function ReviewSubmissionModal({ visible, submission, kpi, onClose, onReview, confirmLoading }) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      setComment('');
    }
  }, [visible]);

  if (!submission || !kpi) return null;

  // Checklist tasks parsing
  let submittedTasks = [];
  if (kpi.measurement_type === 'CHECKLIST' && submission.submitted_text) {
    try {
      submittedTasks = JSON.parse(submission.submitted_text);
    } catch (e) {
      console.error('Failed to parse checklist tasks JSON', e);
    }
  }

  const handleAction = (status) => {
    onReview(submission.submission_id, { status, comment });
  };

  const getAttachmentIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (ext === 'csv' || ext === 'xlsx') return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (['png', 'jpg', 'jpeg'].includes(ext)) return <FileImageOutlined style={{ color: '#1890ff' }} />;
    return <ClockCircleOutlined />;
  };

  return (
    <Modal
      title={`Review KPI Submission — ${kpi.title}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={confirmLoading}>
          Close
        </Button>,
        <Button 
          key="changes" 
          onClick={() => handleAction('CHANGES_REQUESTED')} 
          loading={confirmLoading}
          style={{ background: '#096dd9', borderColor: '#096dd9', color: '#fff' }}
        >
          Request Changes
        </Button>,
        <Button 
          key="reject" 
          danger 
          onClick={() => handleAction('REJECTED')} 
          loading={confirmLoading}
        >
          Reject
        </Button>,
        <Button 
          key="approve" 
          type="primary" 
          onClick={() => handleAction('APPROVED')} 
          loading={confirmLoading}
          style={{ background: '#389e0d', borderColor: '#389e0d' }}
        >
          Approve
        </Button>
      ]}
      width={600}
    >
      <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label={<Space><UserOutlined /> Submitter</Space>}>
          {submission.submitter_name || submission.submitter_email || 'Employee'}
        </Descriptions.Item>
        <Descriptions.Item label={<Space><ClockCircleOutlined /> Submitted At</Space>}>
          {new Date(submission.submitted_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </Descriptions.Item>
        
        {/* Dynamic value display based on type */}
        {kpi.measurement_type === 'CHECKLIST' ? (
          <Descriptions.Item label="Tasks Completion">
            <List
              size="small"
              bordered
              dataSource={submittedTasks}
              renderItem={t => (
                <List.Item>
                  <Tag color={t.is_completed ? 'success' : 'default'}>
                    {t.is_completed ? 'COMPLETED' : 'PENDING'}
                  </Tag>
                  <span>{t.title || `Task ID: ${t.task_id}`}</span>
                </List.Item>
              )}
            />
          </Descriptions.Item>
        ) : kpi.measurement_type === 'BOOLEAN' ? (
          <Descriptions.Item label="Submitted Answer">
            <Tag color={submission.submitted_boolean ? 'success' : 'error'}>
              {submission.submitted_boolean ? 'YES' : 'NO'}
            </Tag>
          </Descriptions.Item>
        ) : kpi.measurement_type === 'TEXT' ? (
          <Descriptions.Item label="Summary Text">
            {submission.submitted_text}
          </Descriptions.Item>
        ) : (
          <Descriptions.Item label="Submitted Progress Value">
            <Typography.Text strong style={{ fontSize: 16 }}>
              {parseFloat(submission.submitted_value)} / {parseFloat(kpi.target_value)} {kpi.unit || ''}
            </Typography.Text>
          </Descriptions.Item>
        )}

        {submission.comment && (
          <Descriptions.Item label="Employee Comment">
            {submission.comment}
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Attachments list */}
      {submission.attachments && submission.attachments.length > 0 && (
        <Card size="small" title="Supporting Attachments (Proofs)" style={{ marginBottom: 16 }}>
          <List
            size="small"
            dataSource={submission.attachments}
            renderItem={item => (
              <List.Item>
                <Space>
                  {getAttachmentIcon(item.file_name)}
                  <Link href={item.file_url} target="_blank" rel="noopener noreferrer">
                    {item.file_name}
                  </Link>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* External Links list */}
      {submission.links && submission.links.length > 0 && (
        <Card size="small" title="External Proof Links" style={{ marginBottom: 16 }}>
          <List
            size="small"
            dataSource={submission.links}
            renderItem={item => (
              <List.Item>
                <Space>
                  <LinkOutlined style={{ color: '#1890ff' }} />
                  <Link href={item.link_url} target="_blank" rel="noopener noreferrer">
                    {item.link_name}
                  </Link>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        <Typography.Text strong>Review Comments / Feedback</Typography.Text>
        <Input.TextArea
          placeholder="Add comments explaining your review action (required for rejections or changes requested)..."
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </div>
    </Modal>
  );
}
