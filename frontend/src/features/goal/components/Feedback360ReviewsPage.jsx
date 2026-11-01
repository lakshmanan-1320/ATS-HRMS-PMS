import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Progress, Button, Space, Typography, Spin, Row, Col, Statistic, message, Alert } from 'antd';
import { TrophyOutlined, RightOutlined, BarChartOutlined, TeamOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const { Title, Text } = Typography;

export default function Feedback360ReviewsPage({ onSelectGoal }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/client-admin/360-feedback/submissions');
      if (res.data?.success) {
        setSubmissions(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load 360° feedback reviews:', e);
      message.error('Failed to fetch 360° feedback data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Compute Statistics
  const totalAssignments = submissions.length;
  const finalizedCount = submissions.filter(s => s.final_score != null).length;
  const pendingCount = submissions.filter(s => s.final_score == null).length;
  const completionRate = totalAssignments > 0 ? Math.round((finalizedCount / totalAssignments) * 100) : 0;

  const avgScore = submissions.filter(s => s.final_score != null).length
    ? (submissions.filter(s => s.final_score != null).reduce((sum, s) => sum + parseFloat(s.final_score || 0), 0) / submissions.filter(s => s.final_score != null).length).toFixed(1)
    : '0.0';

  const totalReviewers = submissions.reduce((sum, s) => sum + (s.total_reviewers || 0), 0);
  const submittedReviewers = submissions.reduce((sum, s) => sum + (s.submitted_reviewers || 0), 0);
  const responseRate = totalReviewers > 0 ? Math.round((submittedReviewers / totalReviewers) * 100) : 0;

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#001233' }}>{r.employee_name}</div>
          <div style={{ fontSize: 11, color: '#7D8597' }}>Dept: {r.department_name || '—'}</div>
        </div>
      )
    },
    {
      title: 'Goal Plan',
      key: 'goal',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0353A4' }}>{r.title}</div>
          <div style={{ fontSize: 11, color: '#7D8597' }}>Cycle: {r.cycle_name || '—'}</div>
        </div>
      )
    },
    {
      title: 'Reviewers',
      key: 'reviewers',
      render: (_, r) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#001233' }}>
            {r.submitted_reviewers || 0}/{r.total_reviewers || 0}
          </div>
          <div style={{ fontSize: 10, color: '#7D8597' }}>Submitted</div>
          <Progress
            percent={r.total_reviewers > 0 ? Math.round(((r.submitted_reviewers || 0) / r.total_reviewers) * 100) : 0}
            size="small" showInfo={false}
            strokeColor="#0466C8"
            style={{ marginTop: 4, width: 60 }}
          />
        </div>
      )
    },
    {
      title: 'Scores',
      key: 'scores',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {r.manager_average != null && <Tag color="purple" style={{ fontSize: 10 }}>Mgr: {parseFloat(r.manager_average).toFixed(0)}%</Tag>}
          {r.peer_average != null && <Tag color="cyan" style={{ fontSize: 10 }}>Peer: {parseFloat(r.peer_average).toFixed(0)}%</Tag>}
          {r.direct_report_average != null && <Tag color="green" style={{ fontSize: 10 }}>DR: {parseFloat(r.direct_report_average).toFixed(0)}%</Tag>}
        </div>
      )
    },
    {
      title: 'Final Score',
      dataIndex: 'final_score',
      key: 'finalScore',
      render: (val) => (
        <span style={{ fontSize: 15, color: val != null ? '#059669' : '#cbd5e1', fontWeight: 800 }}>
          {val != null ? `${parseFloat(val).toFixed(1)}%` : '—'}
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const finalized = r.final_score != null;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={finalized ? 'green' : 'blue'} style={{ fontSize: 10, fontWeight: 700, borderRadius: 4 }}>
              {finalized ? 'FINALIZED' : 'IN PROGRESS'}
            </Tag>
            {r.results_viewed_at && (
              <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>✓ Viewed</span>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<RightOutlined />}
          onClick={() => onSelectGoal && onSelectGoal({
            ...r,
            goal_id: r.goal_id,
            performance_technique: '360_FEEDBACK',
            status: r.goal_status || 'ACTIVE'
          })}
        >
          {r.final_score != null ? 'View' : 'Manage'}
        </Button>
      )
    }
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 800 }}>🔄 360° Feedback Hub</Title>
          <Text type="secondary">Manage multi-rater feedback cycles across all employees and goal plans.</Text>
        </div>
      </div>

      <Alert
        message="360° Feedback collects ratings from managers, peers, and direct reports. Final scores are weighted averages calculated by relationship type."
        type="info" showIcon
      />

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Completion Rate</span>}
              value={`${completionRate}%`}
              prefix={<TrophyOutlined style={{ color: '#10b981', marginRight: 8 }} />}
            />
            <Progress percent={completionRate} size="small" showInfo={false} strokeColor="#10b981" style={{ marginTop: 8 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Reviewer Response Rate</span>}
              value={`${responseRate}%`}
              prefix={<TeamOutlined style={{ color: '#0466C8', marginRight: 8 }} />}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{submittedReviewers} of {totalReviewers} reviewers submitted</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Pending Finalization</span>}
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#ea580c', marginRight: 8 }} />}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Feedback cycles awaiting finalization</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Avg. Final Score</span>}
              value={`${avgScore}%`}
              prefix={<BarChartOutlined style={{ color: '#8b5cf6', marginRight: 8 }} />}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Average across finalized feedback</div>
          </Card>
        </Col>
      </Row>

      {/* Main Table */}
      <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E3E7EE' }}>
        <Table
          columns={columns}
          dataSource={submissions}
          rowKey="assignment_id"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
}
