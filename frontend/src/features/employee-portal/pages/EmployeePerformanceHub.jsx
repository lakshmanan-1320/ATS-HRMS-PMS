import React, { useState } from 'react';
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar';
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar';
import GoalPage from '../../goal/pages/GoalPage';
import KpiReviewsPage from '../../kpi/pages/KpiReviewsPage';
import MyAppraisal from './MyAppraisal';
import ManagerAppraisal from './ManagerAppraisal';
import CompetencyReviewsPage from '../../continuous-feedback/components/CompetencyReviewsPage';
import ContinuousFeedbackReviewsPage from '../../continuous-feedback/components/ContinuousFeedbackReviewsPage';
import SelfAssessmentReviewsPage from '../../goal/components/SelfAssessmentReviewsPage';
import Feedback360ReviewsPage from '../../goal/components/Feedback360ReviewsPage';
import GoalDetailsDrawer from '../../goal/components/GoalDetailsDrawer';
import { useModules } from '../../../hooks/useModules';

export default function EmployeePerformanceHub() {
  const isManager = sessionStorage.getItem('is_manager') === 'true';
  const userRole = sessionStorage.getItem('user_role') || 'employee';
  const canManageTeam = isManager || ['manager', 'hr', 'client_admin'].includes(userRole);
  const { isEnabled, loading } = useModules();
  const [activeTab, setActiveTab] = useState('');
  const [selectedGoalForDrawer, setSelectedGoalForDrawer] = useState(null);

  const tabs = [
    isEnabled('goals')                 && { key: 'goals',                    label: 'Goals' },
    isEnabled('kpi')                   && { key: 'kpi-reviews',             label: 'KPI Reviews' },
    isEnabled('continuous_feedback')   && { key: 'continuous-feedback',     label: 'Continuous Feedback' },
    isEnabled('competency_assessment') && { key: 'competency-reviews',      label: 'Competency Assessment' },
    isEnabled('self_assessment')       && { key: 'self-assessment-reviews', label: 'Self Assessment' },
    isEnabled('360_feedback')          && { key: '360-feedback-reviews',    label: '360\u00b0 Feedback' },
    isEnabled('performance')           && { key: 'appraisal',                label: 'My Appraisal' },
    canManageTeam && isEnabled('performance') && { key: 'team-appraisal',    label: 'Team Appraisal' },
  ].filter(Boolean);

  React.useEffect(() => {
    if (!loading && !activeTab) {
      const firstTab = tabs[0]?.key;
      if (firstTab) setActiveTab(firstTab);
    }
  }, [loading, tabs, activeTab]);

  const renderSubTabs = () => {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', marginBottom: 24, gap: 0, background: '#fff', padding: '0 24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '16px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #6366f1' : '3px solid transparent',
              color: activeTab === tab.key ? '#6366f1' : '#64748b', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
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
                role={userRole}
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
                role={userRole}
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
                role={userRole}
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
                role={userRole}
                onClose={() => setSelectedGoalForDrawer(null)}
                onEdit={() => {}}
                onStatusChange={() => {}}
              />
            )}
          </>
        );

      case 'appraisal':
        return <MyAppraisal isSubComponent={true} />;

      case 'team-appraisal':
        return <ManagerAppraisal isSubComponent={true} />;

      default:
        return <GoalPage isSubComponent={true} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: "'Inter', 'Roboto', system-ui, -apple-system, sans-serif" }}>
      <EmployeeSidebar active="performance" />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="My Performance" />
        
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
          {renderSubTabs()}
          <div style={{ padding: '0 24px' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
