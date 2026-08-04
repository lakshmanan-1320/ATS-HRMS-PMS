import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Input, Space, Card, Typography, Row, Col, message, Empty, Divider } from 'antd';
import { CheckOutlined, CloseOutlined, RetweetOutlined, EyeOutlined, GithubOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { useKpiStore } from '../store/kpi.store';
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar';
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar';
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar';
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function KpiReviewsPage({ isSubComponent = false }) {
  const { pendingSubmissions, loading, loadPendingSubmissions, reviewSubmission } = useKpiStore();
  const [selectedSub, setSelectedSub] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const role = sessionStorage.getItem('sa_role') || sessionStorage.getItem('user_role') || 'employee';
  const SidebarComponent = role === 'client_admin' ? ClientAdminSidebar : EmployeeSidebar;
  const TopBarComponent = role === 'client_admin' ? ClientAdminTopBar : EmployeeTopBar;

  useEffect(() => {
    loadPendingSubmissions();
  }, [loadPendingSubmissions]);

  const handleOpenReview = (submission) => {
    setSelectedSub(submission);
    setComment('');
    setReviewModalVisible(true);
  };

  const handleAction = async (status) => {
    if (!selectedSub) return;
    if ((status === 'REJECTED' || status === 'CHANGES_REQUESTED') && !comment.trim()) {
      message.warning('Please enter a review comment explaining the reason.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reviewSubmission(
        selectedSub.submission_id,
        { status, reviewComment: comment },
        selectedSub.goal_id,
        selectedSub.kpi_id
      );

      if (res.success) {
        message.success(`Submission successfully ${status.toLowerCase().replace('_', ' ')}.`);
        setReviewModalVisible(false);
        setSelectedSub(null);
        loadPendingSubmissions();
      } else {
        message.error(res.message || 'Review failed.');
      }
    } catch (err) {
      message.error('An error occurred while saving the review.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSubmittedProof = (sub) => {
    const { measurement_type, submitted_value, target_value, unit, submitted_text, submitted_boolean } = sub;

    if (measurement_type === 'checklist' || measurement_type === 'CHECKLIST') {
      let tasks = [];
      try {
        tasks = JSON.parse(submitted_text || '[]');
      } catch (e) {
        tasks = [];
      }
      
      const completedCount = tasks.filter(t => t.is_completed).length;
      const totalCount = tasks.length;
      const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>
            Checklist Progress: {completedCount} / {totalCount} Completed ({pct}%)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            {tasks.map((t, idx) => (
              <div key={t.task_id || idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ fontSize: 16, color: t.is_completed ? '#10b981' : '#cbd5e1' }}>{t.is_completed ? '✅' : '⬜'}</span>
                <span style={{ textDecoration: t.is_completed ? 'line-through' : 'none', color: t.is_completed ? '#94a3b8' : '#334155' }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (measurement_type === 'boolean' || measurement_type === 'BOOLEAN') {
      return (
        <div style={{ marginTop: 8 }}>
          <Tag color={submitted_boolean ? 'green' : 'orange'} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 6 }}>
            {submitted_boolean ? '✅ Yes / Completed (100%)' : '❌ No / Incomplete'}
          </Tag>
        </div>
      );
    }

    if (measurement_type === 'number' || measurement_type === 'NUMBER') {
      return (
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 14 }}>
            Submitted Value: <Text strong style={{ color: '#10b981', fontSize: 16 }}>{submitted_value}</Text> / {target_value} {unit || ''}
          </Text>
        </div>
      );
    }

    if (measurement_type === 'percentage' || measurement_type === 'PERCENTAGE') {
      return (
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 14 }}>
            Submitted Progress: <Text strong style={{ color: '#10b981', fontSize: 16 }}>{submitted_value}%</Text> / {target_value}%
          </Text>
        </div>
      );
    }

    if (measurement_type === 'currency' || measurement_type === 'CURRENCY') {
      const formattedSub = new Intl.NumberFormat().format(submitted_value);
      const formattedTgt = new Intl.NumberFormat().format(target_value);
      return (
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 14 }}>
            Submitted Value: <Text strong style={{ color: '#10b981', fontSize: 16 }}>{unit || '₹'}{formattedSub}</Text> / {unit || '₹'}{formattedTgt}
          </Text>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 8 }}>
        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{submitted_text || 'No description submitted.'}</Paragraph>
      </div>
    );
  };

  const renderProofsSection = (sub) => {
    const { attachments = [], links = [] } = sub;
    if (attachments.length === 0 && links.length === 0) return null;

    const getIcon = (name) => {
      const ext = name.split('.').pop().toLowerCase();
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <FileTextOutlined style={{ color: '#10b981' }} />;
      return <FileTextOutlined style={{ color: '#ef4444' }} />;
    };

    return (
      <Col span={24} style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Proofs Attached</Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          {links.map((lnk, idx) => {
            const isGithub = lnk.link_url?.includes('github.com');
            return (
              <Card size="small" key={lnk.id || idx} style={{ borderRadius: 8, background: '#f8fafc' }} bodyStyle={{ padding: '8px 12px' }}>
                <Space>
                  {isGithub ? <GithubOutlined style={{ color: '#000', fontSize: 16 }} /> : <LinkOutlined style={{ color: '#2563eb' }} />}
                  <a href={lnk.link_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 13 }}>
                    {lnk.link_name || lnk.link_url}
                  </a>
                </Space>
              </Card>
            );
          })}
          {attachments.map((att, idx) => (
            <Card size="small" key={att.id || idx} style={{ borderRadius: 8, background: '#f8fafc' }} bodyStyle={{ padding: '8px 12px' }}>
              <Space>
                {getIcon(att.file_name)}
                <a href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 13 }}>
                  {att.file_name}
                </a>
              </Space>
            </Card>
          ))}
        </Space>
      </Col>
    );
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text, record) => (
        <div>
          <Text strong>{text || 'Admin'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.employee_email}</Text>
        </div>
      ),
    },
    {
      title: 'Goal & KPI',
      key: 'goal_kpi',
      render: (_, record) => (
        <div>
          <Tag color="blue">{record.goal_title}</Tag>
          <div style={{ marginTop: 4 }}>
            <Text strong>{record.kpi_title}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Submitted Value',
      key: 'submitted_value',
      render: (_, record) => {
        if (record.measurement_type?.toLowerCase() === 'checklist') {
          let tasks = [];
          try { tasks = JSON.parse(record.submitted_text || '[]'); } catch (e) {}
          const completedCount = tasks.filter(t => t.is_completed).length;
          const totalCount = tasks.length;
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          return <Tag color="green">{completedCount} / {totalCount} Completed ({pct}%)</Tag>;
        }
        if (record.measurement_type?.toLowerCase() === 'boolean') {
          return record.submitted_boolean ? <Tag color="green">Completed (100%)</Tag> : <Tag color="orange">Incomplete</Tag>;
        }
        if (record.measurement_type?.toLowerCase() === 'percentage') {
          return <Text strong>{record.submitted_value}%</Text>;
        }
        if (record.measurement_type?.toLowerCase() === 'currency') {
          return <Text strong>{record.unit || '₹'}{new Intl.NumberFormat().format(record.submitted_value)}</Text>;
        }
        return (
          <div>
            <Text strong>{record.submitted_value}</Text>{' '}
            <Text type="secondary" style={{ fontSize: 12 }}>
              / {record.target_value} {record.unit || ''}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Submitted Date',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date) => new Date(date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleOpenReview(record)}
        >
          Review
        </Button>
      ),
    },
  ];

  const innerContent = (
    <Card style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: 'none' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>🎯 Pending KPI Reviews</Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Review performance submissions from team members and update KPI progress.
          </Paragraph>
        </Col>
        <Col>
          <Tag color="gold" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 8 }}>
            {pendingSubmissions.length} Pending
          </Tag>
        </Col>
      </Row>

      <Table
        dataSource={pendingSubmissions}
        columns={columns}
        rowKey="submission_id"
        loading={loading}
        locale={{ emptyText: <Empty description="No pending KPI reviews" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );

  const reviewModal = (
    <Modal
      title={
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>Review KPI Submission</Title>
          <Text type="secondary">Submitted by {selectedSub?.employee_name}</Text>
        </div>
      }
      open={reviewModalVisible}
      onCancel={() => setReviewModalVisible(false)}
      footer={null}
      width={650}
      destroyOnClose
    >
      {selectedSub && (
        <div style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 12 }}>Goal</Text>
              <div><Text strong>{selectedSub.goal_title}</Text></div>
            </Col>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 12 }}>KPI Details</Text>
              <div><Text strong>{selectedSub.kpi_title}</Text></div>
            </Col>
            
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>Measurement Mode</Text>
              <div><Tag color="cyan">{selectedSub.measurement_type?.toUpperCase()}</Tag></div>
            </Col>
            
            <Col span={24} style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Submission Detail</Text>
              <div style={{ marginTop: 4 }}>
                {renderSubmittedProof(selectedSub)}
              </div>
            </Col>

            {selectedSub.submitted_text && selectedSub.measurement_type?.toLowerCase() !== 'checklist' && (
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>Submission Proof Description</Text>
                <Card size="small" style={{ background: '#f8fafc', borderRadius: 8, marginTop: 4 }}>
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedSub.submitted_text}</Paragraph>
                </Card>
              </Col>
            )}

            {selectedSub.comment && (
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>Employee Notes</Text>
                <Paragraph style={{ margin: 0, fontStyle: 'italic' }}>"{selectedSub.comment}"</Paragraph>
              </Col>
            )}

            {/* Display dynamic attachments & links */}
            {renderProofsSection(selectedSub)}
          </Row>

          <Divider />

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Review Feedback</Text>
            <TextArea
              rows={3}
              placeholder="Enter feedback or explanation (required for changes request or reject)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <Row justify="end" gutter={12}>
            <Col>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => handleAction('REJECTED')}
                loading={submitting}
                style={{ borderRadius: 8 }}
              >
                Reject
              </Button>
            </Col>
            <Col>
              <Button
                icon={<RetweetOutlined />}
                onClick={() => handleAction('CHANGES_REQUESTED')}
                loading={submitting}
                style={{ borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none' }}
              >
                Request Changes
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleAction('APPROVED')}
                loading={submitting}
                style={{ borderRadius: 8, background: '#10b981', borderColor: '#10b981' }}
              >
                Approve
              </Button>
            </Col>
          </Row>
        </div>
      )}
    </Modal>
  );

  if (isSubComponent) {
    return (
      <div style={{ padding: '0px' }}>
        {innerContent}
        {reviewModal}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: "'Inter', 'Roboto', system-ui, -apple-system, sans-serif" }}>
      <SidebarComponent active="kpi-reviews" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBarComponent />
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
          {innerContent}
        </main>
      </div>
      {reviewModal}
    </div>
  );
}
