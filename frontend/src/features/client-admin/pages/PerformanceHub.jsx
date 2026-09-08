import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Typography, Row, Col, Statistic, Progress, Empty, Space } from 'antd';
import { FiTarget, FiCheckCircle, FiClock, FiSettings, FiBriefcase, FiAlertCircle, FiMessageSquare, FiCalendar, FiFolder, FiZap, FiClipboard } from 'react-icons/fi';
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar';
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar';
import PageHeader from '../../../components/common/PageHeader';
import GoalPage from '../../goal/pages/GoalPage';
import KpiReviewsPage from '../../kpi/pages/KpiReviewsPage';
import AppraisalCycles from '../../appraisal/pages/AppraisalCycles';
import FinancialYearsPage from '../../performanceConfiguration/FinancialYearsPage';
import GoalCategoryConfig from './GoalCategoryConfig';
import CompetencyLibraryPage from './CompetencyLibraryPage';
import ContinuousFeedbackReviewsPage from '../../continuous-feedback/components/ContinuousFeedbackReviewsPage';
import CompetencyReviewsPage from '../../continuous-feedback/components/CompetencyReviewsPage';
import SelfAssessmentReviewsPage from '../../goal/components/SelfAssessmentReviewsPage';
import Feedback360ReviewsPage from '../../goal/components/Feedback360ReviewsPage';
import GoalDetailsDrawer from '../../goal/components/GoalDetailsDrawer';
import TechniqueConfigurationPage from '../../performanceConfiguration/TechniqueConfigurationPage';
import { useGoalStore } from '../../goal/goal.store';
import { useKpiStore } from '../../kpi/store/kpi.store';
import { useContinuousFeedbackStore } from '../../continuous-feedback/store/continuousFeedback.store';
import { useModules } from '../../../hooks/useModules';

const { Title, Text, Paragraph } = Typography;

export default function PerformanceHub() {
  const [activeTab, setActiveTab] = useState('insights');
  const [activeSettingsTab, setActiveSettingsTab] = useState('financial-years');
  const [selectedGoalForDrawer, setSelectedGoalForDrawer] = useState(null);

  const { isEnabled, loading } = useModules();
  const { dashboardSummary, fetchDashboardSummary } = useGoalStore();
  const { dashboard, loadDashboard } = useKpiStore();
  const { dashboardStats, fetchDashboardStats } = useContinuousFeedbackStore();

  useEffect(() => {
    if (isEnabled('pms')) {
      fetchDashboardSummary();
      loadDashboard();
      fetchDashboardStats();
    }
  }, [isEnabled, fetchDashboardSummary, loadDashboard, fetchDashboardStats]);

  if (!loading && !isEnabled('pms')) {
    return <Navigate to="/client-admin/dashboard" replace />;
  }

  // Render horizontal secondary tabs in Keka style
  const renderSubTabs = () => {
    const tabs = [
      { key: 'insights', label: 'Insights' },
      isEnabled('goals') && { key: 'goals', label: 'Goal Plans' },
      isEnabled('kpi') && { key: 'kpi-reviews', label: 'KPI Reviews' },
      isEnabled('continuous_feedback') && { key: 'continuous-feedback', label: 'Continuous Feedback' },
      isEnabled('competency_assessment') && { key: 'competency-reviews', label: 'Competency Assessment' },
      isEnabled('self_assessment') && { key: 'self-assessment-reviews', label: 'Self Assessment' },
      isEnabled('360_feedback') && { key: '360-feedback-reviews', label: '360° Feedback' },
      isEnabled('performance') && { key: 'appraisal', label: 'Appraisal Cycles' },
      { key: 'settings', label: 'Settings' }
    ].filter(Boolean);

    return (
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 24, gap: 16, background: '#fff', padding: '0 24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '16px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #6366f1' : '3px solid transparent',
              color: activeTab === tab.key ? '#6366f1' : '#64748b', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderInsights = () => {
    const goalProgress = Math.round(dashboardSummary?.averageProgress || 0);
    const kpiProgress = Math.round(dashboardSummary?.weightedKpiProgress || dashboard?.averageProgress || 0);
    const progressSpan = (isEnabled('goals') && isEnabled('kpi')) ? 12 : 24;

    return (
      <div>
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>

          {/* Goal Plan Summary Cards */}
          {isEnabled('goals') && (
            <>
              <Col span={isEnabled('kpi') ? 6 : 12}>
                <Card style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#64748b' }}>Total Goal Plans</span>}
                    value={dashboardSummary?.totalGoals ?? dashboardSummary?.total ?? 0}
                    prefix={<FiTarget style={{ color: '#6366f1', marginRight: 8 }} />}
                  />
                </Card>
              </Col>
              <Col span={isEnabled('kpi') ? 6 : 12}>
                <Card style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#64748b' }}>Goals Completed</span>}
                    value={dashboardSummary?.completedGoals ?? dashboardSummary?.completed ?? 0}
                    prefix={<FiCheckCircle style={{ color: '#10b981', marginRight: 8 }} />}
                  />
                </Card>
              </Col>
            </>
          )}
          {isEnabled('kpi') && (
            <>
              <Col span={isEnabled('goals') ? 6 : 12}>
                <Card style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#64748b' }}>Total KPIs Monitored</span>}
                    value={dashboard?.total || 0}
                    prefix={<FiBriefcase style={{ color: '#0891b2', marginRight: 8 }} />}
                  />
                </Card>
              </Col>
              <Col span={isEnabled('goals') ? 6 : 12}>
                <Card style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 600, color: '#64748b' }}>Pending Reviews</span>}
                    value={dashboard?.pendingReviews || 0}
                    valueStyle={{ color: (dashboard?.pendingReviews || 0) > 0 ? '#ea580c' : '#1e293b' }}
                    prefix={<FiClock style={{ color: '#ea580c', marginRight: 8 }} />}
                  />
                </Card>
              </Col>
            </>
          )}

          {/* Progress Analytics */}
          {isEnabled('goals') && (
            <Col span={progressSpan}>
              <Card title={<span style={{ fontWeight: 700 }}>Overall Goal Progress</span>} style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                  <Progress 
                    type="circle" 
                    percent={goalProgress} 
                    format={() => `${parseFloat(dashboardSummary?.averageProgress || 0).toFixed(1)}%`}
                    strokeColor="#6366f1" 
                    width={140} 
                    strokeWidth={10} 
                  />
                  <div style={{ marginTop: 20, textAlign: 'center' }}>
                    <Text type="secondary">Average completion percentage across all assigned organizational goal plans.</Text>
                  </div>
                </div>
              </Card>
            </Col>
          )}

          {isEnabled('kpi') && (
            <Col span={progressSpan}>
              <Card title={<span style={{ fontWeight: 700 }}>KPI Submissions Progress</span>} style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                  <Progress 
                    type="circle" 
                    percent={kpiProgress} 
                    format={() => `${parseFloat(dashboardSummary?.weightedKpiProgress ?? dashboard?.averageProgress ?? 0).toFixed(1)}%`}
                    strokeColor="#10b981" 
                    width={140} 
                    strokeWidth={10} 
                  />
                  <div style={{ marginTop: 20, textAlign: 'center' }}>
                    <Text type="secondary">Weighted KPI completion % across all active-cycle goals (Σ completion × weight / Σ weights).</Text>
                  </div>
                </div>
              </Card>
            </Col>
          )}

          {/* Continuous Feedback Coaching Statistics */}
          {isEnabled('continuous_feedback') && (
            <Col span={24}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiMessageSquare style={{ color: '#6366f1', flexShrink: 0 }} />
                <span>Continuous Feedback Coaching Statistics</span>
              </div>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <Statistic title={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Development Goals</span>} value={dashboardStats?.total_development_goals || 0} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <Statistic title={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Pending Action Items</span>} value={dashboardStats?.pending_action_items || 0} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#b45309' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <Statistic title={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Praise Badges Sent</span>} value={dashboardStats?.praise_sent || 0} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#166534' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <Statistic title={<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Coaching Notes Added</span>} value={dashboardStats?.feedback_given || 0} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#0f766e' }} />
                  </Card>
                </Col>
              </Row>
            </Col>
          )}
        </Row>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', width: 'fit-content' }}>
          {(isEnabled('goals') || isEnabled('performance')) && (
            <button
              onClick={() => setActiveSettingsTab('financial-years')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: activeSettingsTab === 'financial-years' ? '#fff' : 'transparent',
                color: activeSettingsTab === 'financial-years' ? '#6366f1' : '#64748b',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: activeSettingsTab === 'financial-years' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <FiCalendar style={{ marginRight: 6, verticalAlign: 'middle' }} /> Financial Years
            </button>
          )}

          {isEnabled('goals') && (
            <button
              onClick={() => setActiveSettingsTab('categories')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: activeSettingsTab === 'categories' ? '#fff' : 'transparent',
                color: activeSettingsTab === 'categories' ? '#6366f1' : '#64748b',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: activeSettingsTab === 'categories' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <FiFolder style={{ marginRight: 6, verticalAlign: 'middle' }} /> Goal Categories
            </button>
          )}
          {isEnabled('continuous_feedback') && (
            <button
              onClick={() => setActiveSettingsTab('techniques')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: activeSettingsTab === 'techniques' ? '#fff' : 'transparent',
                color: activeSettingsTab === 'techniques' ? '#6366f1' : '#64748b',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: activeSettingsTab === 'techniques' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <FiZap style={{ marginRight: 6, verticalAlign: 'middle' }} /> Technique Configuration
            </button>
          )}
          {isEnabled('competency_assessment') && (
            <button
              onClick={() => setActiveSettingsTab('competencies')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: activeSettingsTab === 'competencies' ? '#fff' : 'transparent',
                color: activeSettingsTab === 'competencies' ? '#6366f1' : '#64748b',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: activeSettingsTab === 'competencies' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <FiClipboard style={{ marginRight: 6, verticalAlign: 'middle' }} /> Competency Library
            </button>
          )}
        </div>

        {activeSettingsTab === 'financial-years' && <FinancialYearsPage />}

        {activeSettingsTab === 'categories' && <GoalCategoryConfig isSubComponent={true} />}
        {activeSettingsTab === 'techniques' && <TechniqueConfigurationPage />}
        {activeSettingsTab === 'competencies' && <CompetencyLibraryPage />}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'insights':
        return renderInsights();
      case 'goals':
        return <GoalPage isSubComponent={true} />;
      case 'kpi-reviews':
        return <KpiReviewsPage isSubComponent={true} />;
      case 'continuous-feedback':
        return (
          <>
            <ContinuousFeedbackReviewsPage onSelectGoal={(goal) => setSelectedGoalForDrawer(goal)} />
            {selectedGoalForDrawer && (
              <GoalDetailsDrawer
                goal={selectedGoalForDrawer}
                role={sessionStorage.getItem('sa_role') || 'client_admin'}
                onClose={() => setSelectedGoalForDrawer(null)}
                onEdit={() => {}}
                onStatusChange={() => {}}
              />
            )}
          </>
        );
      case 'competency-reviews':
        return (
          <>
            <CompetencyReviewsPage onSelectGoal={(goal) => setSelectedGoalForDrawer(goal)} />
            {selectedGoalForDrawer && (
              <GoalDetailsDrawer
                goal={selectedGoalForDrawer}
                role={sessionStorage.getItem('sa_role') || 'client_admin'}
                onClose={() => setSelectedGoalForDrawer(null)}
                onEdit={() => {}}
                onStatusChange={() => {}}
              />
            )}
          </>
        );
      case 'self-assessment-reviews':
        return (
          <>
            <SelfAssessmentReviewsPage onSelectGoal={(goal) => setSelectedGoalForDrawer(goal)} />
            {selectedGoalForDrawer && (
              <GoalDetailsDrawer
                goal={selectedGoalForDrawer}
                role={sessionStorage.getItem('sa_role') || 'client_admin'}
                onClose={() => setSelectedGoalForDrawer(null)}
                onEdit={() => {}}
                onStatusChange={() => {}}
              />
            )}
          </>
        );
      case '360-feedback-reviews':
        return (
          <>
            <Feedback360ReviewsPage onSelectGoal={(goal) => setSelectedGoalForDrawer(goal)} />
            {selectedGoalForDrawer && (
              <GoalDetailsDrawer
                goal={selectedGoalForDrawer}
                role={sessionStorage.getItem('sa_role') || 'client_admin'}
                onClose={() => setSelectedGoalForDrawer(null)}
                onEdit={() => {}}
                onStatusChange={() => {}}
              />
            )}
          </>
        );
      case 'appraisal':
        return <AppraisalCycles isSubComponent={true} />;
      case 'settings':
        return renderSettings();
      default:
        return renderInsights();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: "'Inter', 'Roboto', system-ui, -apple-system, sans-serif" }}>
      <ClientAdminSidebar active="performance" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
          <div style={{ padding: '24px 24px 8px 24px' }}>
            <PageHeader
              icon={FiTarget}
              title="Performance Management Hub"
              subtitle="Consolidated administration panel for Goal setting, KPIs, reviews and appraisal cycles."
            />
          </div>

          {renderSubTabs()}
          <div style={{ padding: '0 24px' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
