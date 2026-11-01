import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Progress, Button, Space, Typography, Spin, Row, Col, Statistic, message, Alert } from 'antd';
import { TrophyOutlined, RightOutlined, BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { FiUsers } from 'react-icons/fi';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const { Title, Text } = Typography;

export default function SelfAssessmentReviewsPage({ onSelectGoal }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadData = async () => {
    setLoading(true);
    try {
      const subsRes = await api.get('/client-admin/self-assessment/submissions');

      if (subsRes.data?.success) {
        setSubmissions(subsRes.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load self assessment reviews:', e);
      message.error('Failed to fetch reviews data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerExport = (type) => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
    const url = `/api/self-assessment/reports/${type}?export=csv&token=${token}`;
    
    // Simple download trigger
    const link = document.createElement('a');
    link.href = url;
    link.download = `self_assessment_${type}_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Statistics
  const totalSubmissions = submissions.length;
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
  const pendingCount = submissions.filter(s => s.status === 'SUBMITTED').length;
  const completionRate = totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 100) : 0;
  
  const avgEmpRating = submissions.length
    ? (submissions.reduce((sum, s) => sum + parseFloat(s.overall_employee_score || 0), 0) / submissions.length).toFixed(1)
    : '0.0';
  
  const avgMgrRating = submissions.length
    ? (submissions.reduce((sum, s) => sum + parseFloat(s.overall_manager_score || 0), 0) / submissions.length).toFixed(1)
    : '0.0';

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
      title: 'Goal Plan Title',
      key: 'goal',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0353A4' }}>{r.title}</div>
          <div style={{ fontSize: 11, color: '#7D8597' }}>Cycle: {r.cycle_name || '—'}</div>
        </div>
      )
    },
    {
      title: 'Self rating',
      dataIndex: 'overall_employee_score',
      key: 'empScore',
      render: (val) => <span style={{ fontSize: 13, color: '#33415C', fontWeight: 600 }}>{val !== null ? `${parseFloat(val).toFixed(1)}%` : '—'}</span>
    },
    {
      title: 'Manager rating',
      dataIndex: 'overall_manager_score',
      key: 'mgrScore',
      render: (val) => <span style={{ fontSize: 13, color: '#33415C', fontWeight: 600 }}>{val !== null ? `${parseFloat(val).toFixed(1)}%` : '—'}</span>
    },
    {
      title: 'Final score',
      dataIndex: 'final_score',
      key: 'finalScore',
      render: (val) => <span style={{ fontSize: 14, color: '#10b981', fontWeight: 800 }}>{val !== null ? `${parseFloat(val).toFixed(1)}%` : '—'}</span>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const color = r.status === 'APPROVED' ? 'green' : r.status === 'SUBMITTED' ? 'orange' : r.status === 'RETURNED' ? 'red' : 'blue';
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color} style={{ fontSize: 10, fontWeight: 700, borderRadius: 4 }}>{r.status}</Tag>
            {r.employee_acknowledged ? (
              <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircleOutlined /> Acknowledged</span>
            ) : r.status === 'APPROVED' ? (
              <span style={{ fontSize: 10, color: '#7D8597' }}>Pending Ack</span>
            ) : null}
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
            status: r.goal_status || 'ACTIVE'
          })}
        >
          Evaluate
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Configuration & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><FiUsers style={{ color: '#0466C8' }} /> Employee Self Assessment Hub</Title>
          <Text type="secondary">Review submitted questionnaire responses and final score appraisal outcomes.</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => triggerExport('summary')}>Export Summary</Button>
          <Button icon={<DownloadOutlined />} onClick={() => triggerExport('comparison')}>Export Comparison</Button>
        </Space>
      </div>

      <Alert message="Final score is the manager's weighted appraisal: every question is rated from 1 to 5, then calculated using the questionnaire weights." type="info" showIcon />

      {/* Cards Statistics */}
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
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Pending Reviews</span>}
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#ea580c', marginRight: 8 }} />}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Assessments awaiting manager review</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Avg. Self Score</span>}
              value={`${avgEmpRating}%`}
              prefix={<BarChartOutlined style={{ color: '#3b82f6', marginRight: 8 }} />}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Average employee self-evaluation rating</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#7D8597' }}>Avg. Manager Score</span>}
              value={`${avgMgrRating}%`}
              prefix={<CheckCircleOutlined style={{ color: '#8b5cf6', marginRight: 8 }} />}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Average final score given by managers</div>
          </Card>
        </Col>
      </Row>

      {/* Main Submissions Table */}
      <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E3E7EE' }}>
        <Table
          columns={columns}
          dataSource={submissions}
          rowKey="submission_id"
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
}
