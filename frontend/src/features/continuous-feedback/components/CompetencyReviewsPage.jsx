import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Progress, Button, Space, Typography, Spin, Row, Col, Statistic, message } from 'antd';
import { TrophyOutlined, RightOutlined, BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const { Title, Text } = Typography;

export default function CompetencyReviewsPage({ onSelectGoal }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/client-admin/competency-assessment/assessments');
      if (res.data?.success) {
        setAssessments(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load competency assessments list:', e);

      message.error('Failed to fetch competency assessments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate stats for the cards
  const totalCount = assessments.length;
  const completedCount = assessments.filter(a => a.status === 'COMPLETED').length;
  const pendingCount = totalCount - completedCount;
  const avgScore = assessments.length
    ? Math.round(assessments.reduce((sum, a) => sum + parseFloat(a.weighted_score || 0), 0) / assessments.length)
    : 0;

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{r.employee_name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Code: {r.employee_code || '—'}</div>
        </div>
      )
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department',
      render: (val) => <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{val || '—'}</span>
    },
    {
      title: 'Designation',
      dataIndex: 'employee_designation',
      key: 'designation',
      render: (val) => <span style={{ fontSize: 13, color: '#475569' }}>{val || '—'}</span>
    },
    {
      title: 'Assessment Goal Plan',
      key: 'goal',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#4f46e5' }}>{r.title}</div>
          {r.description && <div style={{ fontSize: 11, color: '#64748b', maxLines: 1 }}>{r.description}</div>}
        </div>
      )
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, r) => {
        const val = parseFloat(r.progress || 0);
        return (
          <div style={{ width: 130 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{val}% Rated</span>
            </div>
            <Progress percent={val} showInfo={false} size="small" strokeColor="#4f46e5" />
          </div>
        );
      }
    },
    {
      title: 'Weighted Score',
      dataIndex: 'weighted_score',
      key: 'score',
      render: (val) => (
        <span style={{ fontWeight: 800, fontSize: 14, color: '#10b981' }}>
          {val !== null ? `${parseFloat(val).toFixed(1)}%` : '—'}
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        if (r.status === 'COMPLETED') {
          return (
            <Space size={4} direction="vertical">
              <Tag color="green" style={{ fontSize: 10, fontWeight: 700, borderRadius: 4 }}>
                COMPLETED
              </Tag>
              {r.employee_acknowledged ? (
                <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>✓ Acknowledged</span>
              ) : (
                <span style={{ fontSize: 10, color: '#64748b' }}>Pending Ack</span>
              )}
            </Space>
          );
        }
        return (
          <Tag color="gold" style={{ fontSize: 10, fontWeight: 700, borderRadius: 4 }}>
            EVALUATION PENDING
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<RightOutlined />}
          onClick={() => onSelectGoal && onSelectGoal(r)}
          style={{ background: '#4f46e5', borderColor: '#4f46e5', borderRadius: 6, fontWeight: 700 }}
        >
          {r.status === 'COMPLETED' ? 'View Review' : 'Evaluate'}
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* 1. Competency Method Lifecycle Guide */}
      <Card size="small" style={{ borderRadius: 14, border: '1px solid #e0e7ff', background: '#f5f3ff', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Competency Assessment Review Workflow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          {[
            { title: 'Goal Template Configured', icon: '📋' },
            { title: 'Competencies Mapped', icon: '🔗' },
            { title: 'Manager Assesses & Rates (1-5)', icon: '⭐' },
            { title: 'Comments Provided', icon: '💬' },
            { title: 'Assessment Completed', icon: '✓' },
            { title: 'Employee Acknowledges', icon: '🤝' }
          ].map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ color: '#818cf8', fontSize: 12 }}>➔</span>}
              <div style={{
                background: '#ffffff', border: '1px solid #c7d2fe', borderRadius: 8,
                padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>{item.title}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* 2. Quick stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Assigned Assessments</span>}
              value={totalCount}
              valueStyle={{ color: '#4f46e5', fontWeight: 800, fontSize: 22 }}
              prefix={<TrophyOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Completed Reviews</span>}
              value={completedCount}
              valueStyle={{ color: '#16a34a', fontWeight: 800, fontSize: 22 }}
              prefix={<CheckCircleOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Pending Evaluations</span>}
              value={pendingCount}
              valueStyle={{ color: '#d97706', fontWeight: 800, fontSize: 22 }}
              prefix={<ClockCircleOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Average Score</span>}
              value={`${avgScore}%`}
              valueStyle={{ color: '#0ea5e9', fontWeight: 800, fontSize: 22 }}
              prefix={<BarChartOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 3. Assessments Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
              📋 Competency Assessment ({assessments.length})
            </span>
            <Button size="small" onClick={loadData}>Refresh</Button>
          </div>
        }
        style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}
      >
        <Table
          dataSource={assessments}
          columns={columns}
          rowKey="assignment_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
