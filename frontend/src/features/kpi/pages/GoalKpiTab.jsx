import React, { useEffect, useState } from 'react';
import { Button, Space, Typography, message, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useKpiStore } from '../store/kpi.store';
import { useGoalStore } from '../../goal/goal.store';
import KpiDashboardCards from '../components/KpiDashboardCards';
import KpiList from '../components/KpiList';
import KpiFormModal from '../components/KpiFormModal';
import KpiDetailsDrawer from '../components/KpiDetailsDrawer';
import SubmitCompletionModal from '../components/SubmitCompletionModal';
import ReviewSubmissionModal from '../components/ReviewSubmissionModal';
import DeleteKpiDialog from '../components/DeleteKpiDialog';

const { Title, Text } = Typography;

export default function GoalKpiTab({ goalId, parentGoal, role, onGoalUpdate }) {
  const store = useKpiStore();
  const goalStore = useGoalStore();
  
  const { 
    goalKpis, selectedKpi, dashboard, loading, saving,
    loadGoalKpis, loadDashboard, loadKpi, createKpi, updateKpi,
    deleteKpi, updateStatus, submitCompletion, reviewSubmission
  } = store;

  // Modal / Drawer visible states
  const [formVisible, setFormVisible] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [submitKpi, setSubmitKpi] = useState(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewSub, setReviewSub] = useState(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingKpi, setDeletingKpi] = useState(null);

  // Initial load
  useEffect(() => {
    if (goalId) {
      loadGoalKpis(goalId);
      loadDashboard();
    }
  }, [goalId]);

  const handleCreateOrUpdate = async (data) => {
    if (editingKpi) {
      const res = await updateKpi(editingKpi.kpi_id, data);
      if (res.success) {
        message.success('KPI updated successfully.');
        setFormVisible(false);
        setEditingKpi(null);
      } else {
        message.error(res.message);
      }
    } else {
      const res = await createKpi(goalId, data);
      if (res.success) {
        message.success('KPI created successfully.');
        setFormVisible(false);
      } else {
        message.error(res.message);
      }
    }
    // Refresh parent goal details
    if (onGoalUpdate) onGoalUpdate();
  };

  const handleDeleteConfirm = async () => {
    if (deletingKpi) {
      const res = await deleteKpi(deletingKpi.kpi_id, goalId);
      if (res.success) {
        message.success('KPI deleted successfully.');
        setDeleteVisible(false);
        setDeletingKpi(null);
      } else {
        message.error(res.message);
      }
    }
    if (onGoalUpdate) onGoalUpdate();
  };

  const handleStatusChange = async (kpiId, status, reason) => {
    const res = await updateStatus(kpiId, status, reason, goalId);
    if (res.success) {
      message.success(`KPI status set to ${status}.`);
      if (selectedKpi?.kpi_id === kpiId) {
        await loadKpi(kpiId);
      }
    } else {
      message.error(res.message);
    }
    if (onGoalUpdate) onGoalUpdate();
  };

  const handleSubmitCompletion = async (data) => {
    if (submitKpi) {
      const res = await submitCompletion(submitKpi.kpi_id, data, goalId);
      if (res.success) {
        message.success('Completed work submitted for review.');
        setSubmitVisible(false);
        setSubmitKpi(null);
      } else {
        message.error(res.message);
      }
    }
    if (onGoalUpdate) onGoalUpdate();
  };

  const handleReviewSubmission = async (submissionId, reviewData) => {
    const res = await reviewSubmission(submissionId, reviewData, goalId, selectedKpi?.kpi_id);
    if (res.success) {
      message.success(`Submission status set to ${reviewData.status}.`);
      setReviewVisible(false);
      setReviewSub(null);
      
      // Auto-trigger refreshing the parent goal lists/stats
      if (goalStore.fetchGoals) goalStore.fetchGoals();
      if (goalStore.fetchDashboardSummary) goalStore.fetchDashboardSummary();
      if (onGoalUpdate) onGoalUpdate();
    } else {
      message.error(res.message);
    }
  };

  const handleViewDetails = async (kpiId) => {
    await loadKpi(kpiId);
    setDetailsVisible(true);
  };

  const isManagerOrAdmin = ['client_admin', 'manager', 'hr'].includes(role);
  const isEmployee = role === 'employee';

  const canAddKpi = () => {
    if (role === 'client_admin' || role === 'hr') return true;
    if (role === 'manager') return true;
    if (role === 'employee') {
      const isCompanyOrDeptOrTeam = ['company', 'department', 'team'].includes(parentGoal?.goal_type);
      if (isCompanyOrDeptOrTeam) {
        return false;
      }
      return parentGoal?.status === 'DRAFT';
    }
    return false;
  };

  const goalDashboard = React.useMemo(() => {
    const total = goalKpis.length;
    const completed = goalKpis.filter(k => k.status === 'COMPLETED').length;
    const pendingReviews = goalKpis.reduce((sum, k) => sum + (k.pending_reviews_count || 0), 0);
    
    let weightedProgress = 0;
    let totalWeight = 0;
    goalKpis.forEach(k => {
      // Exclude DRAFT or REJECTED from active progress weight if they don't count,
      // but usually all configured KPIs in active goal count.
      if (k.status !== 'REJECTED') {
        const weight = parseFloat(k.weight_percentage) || 0;
        const progress = parseFloat(k.completion_percentage) || 0;
        totalWeight += weight;
        weightedProgress += (progress * weight);
      }
    });
    
    const averageProgress = totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 100) / 100 : 0;
    
    return {
      total,
      pendingReviews,
      completed,
      averageProgress
    };
  }, [goalKpis]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Dashboard summary cards */}
      <KpiDashboardCards dashboard={goalDashboard} />

      {/* 2. List Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Goal Key Performance Indicators (KPIs)</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            KPIs map specific metrics to align with the goal milestones and targets.
          </Text>
        </Col>
        <Col>
          {canAddKpi() && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => { setEditingKpi(null); setFormVisible(true); }}
            >
              Add KPI
            </Button>
          )}
        </Col>
      </Row>

      {/* 3. Table list */}
      <KpiList
        kpis={goalKpis}
        role={role}
        loading={loading}
        onView={handleViewDetails}
        onEdit={(kpi) => { setEditingKpi(kpi); setFormVisible(true); }}
        onDelete={(kpi) => { setDeletingKpi(kpi); setDeleteVisible(true); }}
        onSubmitWork={(kpi) => { setSubmitKpi(kpi); setSubmitVisible(true); }}
        parentGoal={parentGoal}
      />

      {/* 4. Form Modal (Create / Edit) */}
      <KpiFormModal
        visible={formVisible}
        kpi={editingKpi}
        goalKpis={goalKpis}
        parentGoal={parentGoal}
        onClose={() => { setFormVisible(false); setEditingKpi(null); }}
        onSave={handleCreateOrUpdate}
        confirmLoading={saving}
      />

      {/* 5. Details Drawer */}
      <KpiDetailsDrawer
        visible={detailsVisible}
        kpi={selectedKpi}
        onClose={() => setDetailsVisible(false)}
        role={role}
        onStatusChange={handleStatusChange}
        onOpenReview={(sub) => { setReviewSub(sub); setReviewVisible(true); }}
        onOpenSubmitCompletion={() => { setSubmitKpi(selectedKpi); setSubmitVisible(true); }}
      />

      {/* 6. Submit Completion Modal */}
      <SubmitCompletionModal
        visible={submitVisible}
        kpi={submitKpi}
        onClose={() => { setSubmitVisible(false); setSubmitKpi(null); }}
        onSubmit={handleSubmitCompletion}
        confirmLoading={saving}
      />

      {/* 7. Manager Review Modal */}
      <ReviewSubmissionModal
        visible={reviewVisible}
        submission={reviewSub}
        kpi={selectedKpi}
        onClose={() => { setReviewVisible(false); setReviewSub(null); }}
        onReview={handleReviewSubmission}
        confirmLoading={saving}
      />

      {/* 8. Delete Confirmation Dialog */}
      <DeleteKpiDialog
        visible={deleteVisible}
        kpiTitle={deletingKpi?.title}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteVisible(false); setDeletingKpi(null); }}
        confirmLoading={saving}
      />
    </div>
  );
}
