import React from 'react';
import { Card, Statistic, Progress, Row, Col } from 'antd';
import { 
  ProjectOutlined, ClockCircleOutlined, CheckCircleOutlined, 
  HourglassOutlined, ExclamationCircleOutlined, DashboardOutlined 
} from '@ant-design/icons';

export default function KpiDashboardCards({ dashboard }) {
  const cardStyle = {
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    border: '1px solid #f0f0f0',
    transition: 'all 0.3s ease'
  };

  const onHover = (e, color) => {
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.08)';
    e.currentTarget.style.borderColor = color;
  };

  const onLeave = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
    e.currentTarget.style.borderColor = '#f0f0f0';
  };

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={12} md={6}>
        <div 
          style={cardStyle}
          onMouseEnter={(e) => onHover(e, '#1890ff')}
          onMouseLeave={onLeave}
        >
          <Card bordered={false}>
            <Statistic
              title="Total KPIs"
              value={dashboard.total}
              prefix={<ProjectOutlined style={{ color: '#1890ff', marginRight: 8 }} />}
            />
          </Card>
        </div>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div 
          style={cardStyle}
          onMouseEnter={(e) => onHover(e, '#faad14')}
          onMouseLeave={onLeave}
        >
          <Card bordered={false}>
            <Statistic
              title="Pending Reviews"
              value={dashboard.pendingReviews}
              prefix={<ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />}
              valueStyle={{ color: dashboard.pendingReviews > 0 ? '#d46b08' : 'inherit' }}
            />
          </Card>
        </div>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div 
          style={cardStyle}
          onMouseEnter={(e) => onHover(e, '#52c41a')}
          onMouseLeave={onLeave}
        >
          <Card bordered={false}>
            <Statistic
              title="Completed KPIs"
              value={dashboard.completed}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
            />
          </Card>
        </div>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div 
          style={cardStyle}
          onMouseEnter={(e) => onHover(e, '#722ed1')}
          onMouseLeave={onLeave}
        >
          <Card bordered={false} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14 }}>Avg Progress</span>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1', marginTop: 4 }}>
                  {parseFloat(dashboard.averageProgress)}%
                </div>
              </div>
              <Progress 
                type="circle" 
                percent={parseFloat(dashboard.averageProgress)} 
                width={50} 
                strokeColor="#722ed1"
              />
            </div>
          </Card>
        </div>
      </Col>
    </Row>
  );
}
