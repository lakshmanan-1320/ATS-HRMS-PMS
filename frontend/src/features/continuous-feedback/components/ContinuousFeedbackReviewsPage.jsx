import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Progress, Button, Space, Typography, Spin, Row, Col, Statistic, Alert } from 'antd';
import { MessageOutlined, CheckCircleOutlined, TrophyOutlined, ClockCircleOutlined, ArrowRightOutlined, RightOutlined } from '@ant-design/icons';
import { getContinuousFeedbackOverview, getContinuousFeedbackDashboard } from '../api/continuousFeedback.api';

const { Title, Text } = Typography;

export default function ContinuousFeedbackReviewsPage({ onSelectGoal }) {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, statsRes] = await Promise.all([
        getContinuousFeedbackOverview(),
        getContinuousFeedbackDashboard()
      ]);
      if (overviewRes.data?.success) {
        setGoals(overviewRes.data.data || []);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (e) {
      console.error('Failed to load continuous feedback overview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#001233' }}>{r.employee_name || 'Unassigned'}</div>
          <div style={{ fontSize: 11, color: '#7D8597' }}>{r.employee_designation || 'Team Member'}</div>
        </div>
      )
    },
    {
      title: 'Development Goal',
      key: 'goal',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0466C8' }}>{r.title}</div>
          {r.description && <div style={{ fontSize: 11, color: '#7D8597', maxLines: 1 }}>{r.description}</div>}
        </div>
      )
    },
    {
      title: 'Status & Progress',
      key: 'progress',
      render: (_, r) => (
        <div style={{ width: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <Tag color={r.status === 'COMPLETED' ? 'green' : 'blue'} style={{ fontSize: 10, fontWeight: 700 }}>
              {r.status}
            </Tag>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{parseFloat(r.progress || 0)}%</span>
          </div>
          <Progress percent={parseFloat(r.progress || 0)} showInfo={false} size="small" strokeColor="#0f766e" />
        </div>
      )
    },
    {
      title: 'Coaching Activity',
      key: 'activity',
      render: (_, r) => (
        <Space size="small">
          {r.pending_actions_count > 0 && (
            <Tag color="orange" style={{ fontWeight: 700 }}>
              ⏳ {r.pending_actions_count} Pending Actions
            </Tag>
          )}
          {r.unverified_actions_count > 0 && (
            <Tag color="volcano" style={{ fontWeight: 700 }}>
              ⚠️ {r.unverified_actions_count} Need Verification
            </Tag>
          )}
          {r.reflection_count > 0 && (
            <Tag color="cyan" style={{ fontWeight: 700 }}>
              💡 {r.reflection_count} Reflections
            </Tag>
          )}
          {r.praise_count > 0 && (
            <Tag color="gold" style={{ fontWeight: 700 }}>
              🏆 {r.praise_count} Praises
            </Tag>
          )}
          {r.pending_actions_count === 0 && r.unverified_actions_count === 0 && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Up to date</span>
          )}
        </Space>
      )
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
          style={{ background: '#0f766e', borderColor: '#0f766e', borderRadius: 6, fontWeight: 700 }}
        >
          Coaching Drawer
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* 1. Continuous Coaching Lifecycle Bar */}
      <Card size="small" style={{ borderRadius: 14, border: '1px solid #ccfbf1', background: '#f0fdf4', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Continuous Coaching & Behavioral Growth Lifecycle
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          {[
            { step: '1', title: 'Manager Coaches', icon: '💬' },
            { step: '2', title: 'Employee Reflects', icon: '💡' },
            { step: '3', title: 'Action Assigned', icon: '📋' },
            { step: '4', title: 'Employee Completes', icon: '⚡' },
            { step: '5', title: 'Manager Verifies', icon: '✓' },
            { step: '6', title: 'Manager Praises', icon: '🏆' },
            { step: '7', title: 'Goal Completed', icon: '🎯' }
          ].map((item, idx) => (
            <React.Fragment key={item.step}>
              {idx > 0 && <ArrowRightOutlined style={{ color: '#0f766e', fontSize: 12 }} />}
              <div style={{
                background: '#ffffff', border: '1px solid #99f6e4', borderRadius: 8,
                padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f766e' }}>{item.title}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* 2. Coaching Stats Summary Bar */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#7D8597', fontWeight: 600 }}>Development Goals</span>}
              value={stats?.total_development_goals || 0}
              valueStyle={{ color: '#0f766e', fontWeight: 800, fontSize: 22 }}
              prefix={<MessageOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#7D8597', fontWeight: 600 }}>Pending Actions</span>}
              value={stats?.pending_action_items || 0}
              valueStyle={{ color: '#b45309', fontWeight: 800, fontSize: 22 }}
              prefix={<ClockCircleOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#7D8597', fontWeight: 600 }}>Praise Badges Awarded</span>}
              value={stats?.praise_sent || 0}
              valueStyle={{ color: '#166534', fontWeight: 800, fontSize: 22 }}
              prefix={<TrophyOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #E3E7EE' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#7D8597', fontWeight: 600 }}>Coaching Notes Added</span>}
              value={stats?.feedback_given || 0}
              valueStyle={{ color: '#0466C8', fontWeight: 800, fontSize: 22 }}
              prefix={<CheckCircleOutlined style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 3. Development Goals Coaching Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#001233' }}>
              💬 Development Goals & Coaching Streams ({goals.length})
            </span>
            <Button size="small" onClick={loadData}>Refresh</Button>
          </div>
        }
        style={{ borderRadius: 14, border: '1px solid #E3E7EE' }}
      >
        <Table
          dataSource={goals}
          columns={columns}
          rowKey="goal_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
