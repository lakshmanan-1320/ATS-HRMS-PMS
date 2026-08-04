import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { FiBriefcase, FiBarChart2, FiBook, FiTrendingUp, FiLock, FiUsers, FiGrid, FiGlobe, FiUpload, FiUser, FiAlertTriangle } from 'react-icons/fi'
import { useAuthStore } from '../../auth/store'
import { useGoalStore } from '../goal.store'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import GoalDashboardCards from '../components/GoalDashboardCards'
import GoalProgressSummary from '../components/GoalProgressSummary'
import GoalFilters from '../components/GoalFilters'
import GoalList from '../components/GoalList'
import GoalForm from '../components/GoalForm'
import GoalDetailsDrawer from '../components/GoalDetailsDrawer'
import GoalDeleteDialog from '../components/GoalDeleteDialog'
import GoalSubmitDialog from '../components/GoalSubmitDialog'

/* ─── Status Colors ─── */
export const STATUS_META = {
  DRAFT: { label: 'Draft', color: '#64748b', bg: '#f1f5f9', border: 'rgba(100,116,139,0.25)' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#ea580c', bg: '#fff7ed', border: 'rgba(234,88,12,0.25)' },
  CHANGES_REQUESTED: { label: 'Changes Requested', color: '#7c3aed', bg: '#f5f3ff', border: 'rgba(124,58,237,0.25)' },
  ACTIVE: { label: 'Active', color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.25)' },
  IN_PROGRESS: { label: 'In Progress', color: '#0891b2', bg: '#ecfeff', border: 'rgba(8,145,178,0.25)' },
  COMPLETED: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.25)' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.25)' },
}

export const PRIORITY_META = {
  LOW: { label: 'Low', color: '#64748b', bg: '#f1f5f9' },
  MEDIUM: { label: 'Medium', color: '#2563eb', bg: '#dbeafe' },
  HIGH: { label: 'High', color: '#ea580c', bg: '#ffedd5' },
  CRITICAL: { label: 'Critical', color: '#dc2626', bg: '#fee2e2' },
}

export const CATEGORY_META = {
  BUSINESS: { label: 'Business', icon: FiBriefcase },
  PERFORMANCE: { label: 'Performance', icon: FiBarChart2 },
  LEARNING: { label: 'Learning', icon: FiBook },
  PERSONAL_DEVELOPMENT: { label: 'Personal Development', icon: FiTrendingUp },
}

export const VISIBILITY_META = {
  PRIVATE: { label: 'Private', icon: FiLock },
  TEAM: { label: 'Team', icon: FiUsers },
  DEPARTMENT: { label: 'Department', icon: FiGrid },
  ORGANIZATION: { label: 'Organization', icon: FiGlobe },
}

/* ─── Toast ─── */
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          minWidth: 280, maxWidth: 400,
          background: t.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#dc2626' : '#16a34a',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.3s ease',
        }}>
          {t.type === 'error' ? '✗ ' : '✓ '}{t.msg}
        </div>
      ))}
    </div>
  )
}

/* ─── Pagination ─── */
function Pagination({ page, totalPages, onPrev, onNext, onPage }) {
  if (totalPages <= 1) return null
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }
  const btn = { borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', border: '1px solid #e2e8f0' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 }}>
      <button onClick={onPrev} disabled={page === 1} style={{ ...btn, padding: '8px 16px', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#475569', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: 13 }}>…</span>
        ) : (
          <button key={p} onClick={() => onPage(p)} style={{
            ...btn, width: 38, height: 38,
            background: p === page ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff',
            color: p === page ? '#fff' : '#475569',
            border: p === page ? 'none' : '1px solid #e2e8f0',
            boxShadow: p === page ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
            fontWeight: p === page ? 700 : 600,
          }}>{p}</button>
        )
      )}
      <button onClick={onNext} disabled={page === totalPages} style={{ ...btn, padding: '8px 16px', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#475569', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
    </div>
  )
}

/* ─── Main Page ─── */
export default function GoalPage({ isSubComponent = false }) {
  const { user, role } = useAuthStore()
  const isManager = sessionStorage.getItem('is_manager') === 'true'
  const store = useGoalStore()
  const {
    goals, loading, saving, dashboardSummary, activeConfig, pagination,
    fetchGoals, fetchDashboardSummary, fetchActiveConfig, fetchEmployees, fetchDepartments,
    setPage, setFilters, resetFilters, employees, departments, filters
  } = store

  const canCreateGoal = () => {
    if (role === 'client_admin' || role === 'hr') return true;
    if (role === 'employee') {
      return activeConfig?.goal_setting_direction !== 'TOP_DOWN' && activeConfig?.allow_employee_goal_creation !== false;
    }
    if (role === 'manager' || isManager) {
      return activeConfig?.allow_manager_goal_creation !== false;
    }
    return false;
  };

  // client_admin and hr goals are auto-approved at creation — no submit/approve flow needed
  const bypassesApproval = role === 'client_admin' || role === 'hr';

  const [toasts, setToasts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [detailGoal, setDetailGoal] = useState(null)
  const [deleteGoal, setDeleteGoal] = useState(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  // Tab handling: 'my' for user's own goals, 'team' for direct reports' goal plans
  const [activeTab, setActiveTab] = useState('my')

  // Master data from API
  const [masterData, setMasterData] = useState({ priorities: [], categories: [] });
  useEffect(() => {
    const token = sessionStorage.getItem('sa_token') || sessionStorage.getItem('token');
    axios.get('/api/master-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data?.success) setMasterData(res.data.data);
      })
      .catch(err => console.error('Failed to fetch master data:', err));
  }, []);

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  // Initial data load
  useEffect(() => {
    fetchGoals()
    fetchDashboardSummary()
    fetchActiveConfig()
    fetchEmployees()
    fetchDepartments()
    store.fetchActiveCategories()
  }, [])

  // Re-fetch when filters or page change
  useEffect(() => {
    fetchGoals()
  }, [filters, pagination.page])

  // ─── Event Handlers ───
  const handleCreateGoal = async (data) => {
    try {
      await store.createGoal(data)
      toast('Goal created successfully.')
      setShowForm(false)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create goal.', 'error')
    }
  }

  const handleUpdateGoal = async (id, data) => {
    try {
      await store.updateGoal(id, data)
      toast('Goal updated successfully.')
      setEditGoal(null)
      setShowForm(false)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update goal.', 'error')
    }
  }

  const handleDeleteGoal = async (id) => {
    try {
      await store.deleteGoal(id)
      toast('Goal deleted successfully.')
      setDeleteGoal(null)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete goal.', 'error')
    }
  }

  const handleStatusChange = async (id, status, payload = {}) => {
    try {
      await store.updateGoalStatus(id, { status, ...payload })
      toast(`Goal status updated to ${STATUS_META[status]?.label || status}.`)
      if (detailGoal) {
        const updated = await store.fetchGoalById(id)
        setDetailGoal(updated)
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Status update failed.', 'error')
    }
  }

  const handleSubmitPlan = async () => {
    // Submit all DRAFT and CHANGES_REQUESTED goals for the current user
    const pendingGoals = goals.filter(g => ['DRAFT', 'CHANGES_REQUESTED'].includes(g.status))
    let successCount = 0
    for (const g of pendingGoals) {
      try {
        await store.updateGoalStatus(g.goal_id, { status: 'PENDING_APPROVAL' })
        successCount++
      } catch (err) {
        toast(`Failed to submit goal "${g.title}": ${err.response?.data?.message || err.message}`, 'error')
      }
    }
    if (successCount > 0) {
      toast(`${successCount} goal${successCount > 1 ? 's' : ''} submitted for review.`)
    }
    setShowSubmitDialog(false)
    fetchGoals()
    fetchDashboardSummary()
  }

  const openDetail = async (goalId) => {
    const data = await store.fetchGoalById(goalId)
    setDetailGoal(data)
  }

  const openEdit = (goal) => {
    setEditGoal(goal)
    setShowForm(true)
  }

  // ─── Layout Decision ───
  const isAdmin = role === 'client_admin'
  const isEmployee = role === 'employee' || role === 'manager' || role === 'hr'
  const SidebarComponent = isAdmin ? ClientAdminSidebar : EmployeeSidebar
  const TopBarComponent = isAdmin ? ClientAdminTopBar : EmployeeTopBar

  // Filter goals based on tab selection (handled on backend via is_my_goals filter)
  const displayedGoals = goals

  // Compute weight summaries per goal type — each type has its own 100% bucket
  // Helper to determine if a goal is a root-level goal for the employee's plan (even if aligned to a Company/Dept goal)
  const isEmployeeRootGoal = (g) => {
    if (!g.parent_goal_id) return true;
    const parent = goals.find(x => x.goal_id === g.parent_goal_id);
    if (!parent) return true;
    return parent.goal_type !== 'individual';
  };

  const validGoals = goals.filter(g => isEmployeeRootGoal(g) && g.status !== 'REJECTED')
  const weightsByType = {
    individual: validGoals.filter(g => g.goal_type === 'individual').reduce((sum, g) => sum + (Number(g.weight) || 0), 0),
    department: validGoals.filter(g => g.goal_type === 'department').reduce((sum, g) => sum + (Number(g.weight) || 0), 0),
    company: validGoals.filter(g => g.goal_type === 'company').reduce((sum, g) => sum + (Number(g.weight) || 0), 0),
    team: validGoals.filter(g => g.goal_type === 'team').reduce((sum, g) => sum + (Number(g.weight) || 0), 0),
  }
  // totalWeight for progress summary = only the logged-in user's individual goals
  const totalWeight = weightsByType.individual
  const remainingWeight = Math.max(0, 100 - totalWeight)
  const rootGoalCount = goals.filter(isEmployeeRootGoal).length
  const maxGoals = activeConfig?.max_goals_per_employee || 10

  // Overall Plan Status Calculation
  let overallPlanStatus = 'DRAFT'
  if (goals.length > 0) {
    if (goals.some(g => g.status === 'CHANGES_REQUESTED')) {
      overallPlanStatus = 'CHANGES_REQUESTED'
    } else if (goals.some(g => g.status === 'PENDING_APPROVAL')) {
      overallPlanStatus = 'PENDING_APPROVAL'
    } else if (goals.every(g => ['ACTIVE', 'IN_PROGRESS', 'COMPLETED'].includes(g.status))) {
      overallPlanStatus = 'ACTIVE'
    }
  }


  const innerContent = (
    <>
      <Toast toasts={toasts} />

      {/* ─── Page Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Goals</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>Manage and track goal plans across your organization.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Submit Goal Plan — only for roles that go through approval flow */}
          {!bypassesApproval && activeTab === 'my' && goals.some(g => ['DRAFT', 'CHANGES_REQUESTED'].includes(g.status)) && (
            <button
              onClick={() => setShowSubmitDialog(true)}
              style={{
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FiUpload style={{ flexShrink: 0 }} /> Submit Goal Plan
            </button>
          )}

          {/* Create Goal */}
          {canCreateGoal() && (
            <button
              onClick={() => { setEditGoal(null); setShowForm(true) }}
              style={{
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              + Create Goal
            </button>
          )}
        </div>
      </div>

      {/* ─── Tab Switcher (For Managers & Admins) ─── */}
      {(role === 'client_admin' || isManager || role === 'manager' || role === 'hr') && (
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 24, gap: 16 }}>
          <button
            onClick={() => { setActiveTab('my'); store.setFilters({ is_my_goals: 'true' }) }}
            style={{
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === 'my' ? '3px solid #6366f1' : '3px solid transparent',
              color: activeTab === 'my' ? '#6366f1' : '#64748b', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s'
            }}
          ><FiUser style={{ marginRight: 6, verticalAlign: 'middle' }} /> My Goals</button>
          <button
            onClick={() => { setActiveTab('team'); store.setFilters({ is_my_goals: 'false' }) }}
            style={{
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === 'team' ? '3px solid #6366f1' : '3px solid transparent',
              color: activeTab === 'team' ? '#6366f1' : '#64748b', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s'
            }}
          ><FiUsers style={{ marginRight: 6, verticalAlign: 'middle' }} /> Team Goal Plans</button>
        </div>
      )}

      {/* ─── Overall Plan Status Card (For Employee View) ─── */}
      {activeTab === 'my' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderRadius: 12, background: STATUS_META[overallPlanStatus]?.bg || '#f8fafc',
          border: `1px solid ${STATUS_META[overallPlanStatus]?.border || '#e2e8f0'}`,
          marginBottom: 20
        }}>
          <div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Overall Goal Plan Status</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: STATUS_META[overallPlanStatus]?.color || '#1e293b', marginTop: 4 }}>
              {overallPlanStatus === 'ACTIVE' ? '✓ Approved & Active' : STATUS_META[overallPlanStatus]?.label || overallPlanStatus}
            </div>
          </div>
          {overallPlanStatus === 'CHANGES_REQUESTED' && (
            <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiAlertTriangle style={{ flexShrink: 0 }} /> Please check manager review comments below.
            </div>
          )}
        </div>
      )}

      {/* ─── Progress Summary ─── */}
      {activeTab === 'my' && (
        <GoalProgressSummary
          totalWeight={totalWeight}
          remainingWeight={remainingWeight}
          goalCount={rootGoalCount}
          maxGoals={maxGoals}
          draftCount={goals.filter(g => g.status === 'DRAFT').length}
        />
      )}

      {/* ─── Dashboard Cards ─── */}
      <GoalDashboardCards summary={dashboardSummary} role={role} />

      {/* ─── Filters ─── */}
      <GoalFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={resetFilters}
        employees={employees}
        departments={departments}
        resultCount={displayedGoals.length}
        priorities={masterData.priorities || []}
        categories={masterData.categories || []}
      />

      {/* ─── Goal List ─── */}
      <GoalList
        goals={displayedGoals}
        loading={loading}
        role={role}
        onView={openDetail}
        onEdit={openEdit}
        onDelete={setDeleteGoal}
        onStatusChange={handleStatusChange}
        allGoals={goals}
        groupView={activeTab === 'team'}
      />

      {/* ─── Pagination ─── */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPrev={() => setPage(Math.max(1, pagination.page - 1))}
        onNext={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
        onPage={setPage}
      />
    </>
  );

  const modals = (
    <>
      {showForm && (
        <GoalForm
          goal={editGoal}
          goals={goals}
          employees={employees}
          departments={departments}
          activeConfig={activeConfig}
          weightsByType={weightsByType}
          goalCount={rootGoalCount}
          maxGoals={maxGoals}
          saving={saving}
          categories={store.categories}
          onSave={editGoal ? (data) => handleUpdateGoal(editGoal.goal_id, data) : handleCreateGoal}
          onClose={() => { setShowForm(false); setEditGoal(null) }}
        />
      )}

      {detailGoal && (
        <GoalDetailsDrawer
          goal={goals.find(g => g.goal_id === detailGoal.goal_id) || detailGoal}
          allGoals={goals}
          role={role}
          onClose={() => setDetailGoal(null)}
          onEdit={(g) => { setDetailGoal(null); openEdit(g) }}
          onStatusChange={handleStatusChange}
        />
      )}

      {deleteGoal && (
        <GoalDeleteDialog
          goal={deleteGoal}
          role={role}
          onConfirm={() => handleDeleteGoal(deleteGoal.goal_id)}
          onCancel={() => setDeleteGoal(null)}
        />
      )}

      {!bypassesApproval && showSubmitDialog && (
        <GoalSubmitDialog
          draftGoals={goals.filter(g => ['DRAFT', 'CHANGES_REQUESTED'].includes(g.status))}
          totalWeight={totalWeight}
          onConfirm={handleSubmitPlan}
          onCancel={() => setShowSubmitDialog(false)}
          saving={saving}
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );

  if (isSubComponent) {
    return (
      <div style={{ padding: '0px' }}>
        {innerContent}
        {modals}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', color: '#1e293b', fontFamily: "'Inter', 'Roboto', system-ui, -apple-system, sans-serif" }}>
      <SidebarComponent active="goals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBarComponent />
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
          {innerContent}
        </main>
      </div>
      {modals}
    </div>
  );
}
