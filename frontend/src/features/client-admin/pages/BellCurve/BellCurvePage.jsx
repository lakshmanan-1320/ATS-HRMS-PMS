import React, { useState } from 'react';
import { Typography, Row, Col, Card } from 'antd';
import { FiTrendingUp, FiSettings, FiCheckCircle } from 'react-icons/fi';
import ClientAdminSidebar from '../../../../components/layout/ClientAdminSidebar';
import ClientAdminTopBar from '../../../../components/layout/ClientAdminTopBar';
import BellCurveDashboard from './BellCurveDashboard';
import BellCurveConfig from './BellCurveConfig';

const { Title, Text, Paragraph } = Typography;

export default function BellCurvePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <BellCurveDashboard />;
      case 'configurations':
        return <BellCurveConfig />;
      default:
        return <BellCurveDashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <ClientAdminSidebar active="bell-curve" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar />
        
        {/* Header Header section */}
        <div style={{ padding: '24px 32px 12px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: 10, borderRadius: 12, display: 'flex' }}>
                  <FiTrendingUp size={24} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Performance Calibration Workspace
                  </Title>
                  <Paragraph style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14 }}>
                    Calibrate employee ratings using forced ranking distributions (Bell Curve) to eliminate grading biases.
                  </Paragraph>
                </div>
              </div>
            </Col>
          </Row>

          {/* Sub-tabs menu */}
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '12px 8px', background: 'none', border: 'none',
                borderBottom: activeTab === 'dashboard' ? '3px solid #6366f1' : '3px solid transparent',
                color: activeTab === 'dashboard' ? '#6366f1' : '#64748b',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Calibration Workspace
            </button>
            <button
              onClick={() => setActiveTab('configurations')}
              style={{
                padding: '12px 8px', background: 'none', border: 'none',
                borderBottom: activeTab === 'configurations' ? '3px solid #6366f1' : '3px solid transparent',
                color: activeTab === 'configurations' ? '#6366f1' : '#64748b',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Distribution Templates & Rules
            </button>
          </div>
        </div>

        {/* Content workspace */}
        <div style={{ padding: 32, flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
