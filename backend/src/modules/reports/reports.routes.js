const router = require('express').Router()
const { requireAuth } = require('../../middlewares/auth.middleware')
const {
  handleGetFilters,
  handleGoalReport,
  handleAppraisalReport,
  handleKpiReport,
  handlePayrollReport,
  handleDashboardReport,
  handleEmployeeReport,
  handleAttendanceReport,
  handleRegularizationReport,
  handleLeaveReport,
  handleOvertimeReport,
  handleHolidayReport,
  handleShiftReport,
  handleSalaryRevisionReport,
  handlePayrollAuditReport,
  handleCompetencyGapReport,
  handleCompetencyDistributionReport,
  handleCompetencyDepartmentReport
} = require('./reports.controller')

router.get('/filters',        requireAuth, handleGetFilters)
router.get('/goals',          requireAuth, handleGoalReport)
router.get('/appraisal',      requireAuth, handleAppraisalReport)
router.get('/kpi',            requireAuth, handleKpiReport)
router.get('/payroll',        requireAuth, handlePayrollReport)
router.get('/dashboard',      requireAuth, handleDashboardReport)
router.get('/employees',      requireAuth, handleEmployeeReport)
router.get('/attendance',     requireAuth, handleAttendanceReport)
router.get('/regularizations',requireAuth, handleRegularizationReport)
router.get('/leaves',         requireAuth, handleLeaveReport)
router.get('/overtime',       requireAuth, handleOvertimeReport)
router.get('/holidays',       requireAuth, handleHolidayReport)
router.get('/shifts',         requireAuth, handleShiftReport)
router.get('/revisions',      requireAuth, handleSalaryRevisionReport)
router.get('/audits',         requireAuth, handlePayrollAuditReport)
router.get('/competency-gap',          requireAuth, handleCompetencyGapReport)
router.get('/competency-distribution', requireAuth, handleCompetencyDistributionReport)
router.get('/competency-department',   requireAuth, handleCompetencyDepartmentReport)

module.exports = router
