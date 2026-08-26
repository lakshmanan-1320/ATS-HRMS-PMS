import Login from '../features/auth/pages/Login.jsx'
import VerifyOtp from '../features/auth/pages/VerifyOtp.jsx'
import ForgotPassword from '../features/auth/pages/ForgotPassword.jsx'
import ResetPassword from '../features/auth/pages/ResetPassword.jsx'
import ForceChangePassword from '../features/auth/pages/ForceChangePassword.jsx'
import Dashboard from '../features/dashboard/pages/Dashboard.jsx'
import ClientAdminDashboard from '../features/client-admin/pages/ClientAdminDashboard.jsx'
import Departments from '../features/department/pages/Departments.jsx'
import HierarchyLevels from '../features/department/pages/HierarchyLevels.jsx'
import Employees from '../features/employee/pages/Employees.jsx'
import AddEmployee from '../features/employee/pages/AddEmployee.jsx'
import EditEmployee from '../features/employee/pages/EditEmployee.jsx'
import ViewEmployee from '../features/employee/pages/ViewEmployee.jsx'
import OrgChart from '../features/employee/pages/OrgChart.jsx'
import ClientAdmins from '../features/super-admin/pages/ClientAdmins.jsx'
import Companies from '../features/super-admin/pages/Companies.jsx'
import CompanyDetails from '../features/super-admin/pages/CompanyDetails.jsx'
import SmtpSettings from '../features/super-admin/pages/SmtpSettings.jsx'
import ModuleManagement from '../features/super-admin/pages/ModuleManagement.jsx'
import SecuritySettings from '../features/super-admin/pages/SecuritySettings.jsx'
import AuditLogs from '../features/super-admin/pages/AuditLogs.jsx'
import NotificationSettings from '../features/super-admin/pages/NotificationSettings.jsx'
import PasswordPolicy from '../features/super-admin/pages/PasswordPolicy.jsx'
import SessionTimeout from '../features/super-admin/pages/SessionTimeout.jsx'
import ChangePassword from '../features/super-admin/pages/ChangePassword.jsx'
import EmployeeDashboard from '../features/employee-portal/pages/EmployeeDashboard.jsx'
import MyGoals from '../features/employee-portal/pages/MyGoals.jsx'
import CreateGoal from '../features/employee-portal/pages/CreateGoal.jsx'
import EditGoal from '../features/employee-portal/pages/EditGoal.jsx'
import MyTeam from '../features/employee-portal/pages/MyTeam.jsx'
import MyProfile from '../features/employee-portal/pages/MyProfile.jsx'
import ManagerGoals from '../features/employee-portal/pages/ManagerGoals.jsx'
import MyAppraisal from '../features/employee-portal/pages/MyAppraisal.jsx'
import ManagerAppraisal from '../features/employee-portal/pages/ManagerAppraisal.jsx'
import Goals from '../features/goal/pages/Goals.jsx'
import GoalPage from '../features/goal/pages/GoalPage.jsx'
import KPIManagement from '../features/kpi/pages/KPIManagement.jsx'
import KpiReviewsPage from '../features/kpi/pages/KpiReviewsPage.jsx'
import AppraisalCycles from '../features/appraisal/pages/AppraisalCycles.jsx'
import GoalCategoryConfig from '../features/client-admin/pages/GoalCategoryConfig.jsx'
import PerformanceHub from '../features/client-admin/pages/PerformanceHub.jsx'
import BellCurvePage from '../features/client-admin/pages/BellCurve/BellCurvePage.jsx'
import NineBoxPage from '../features/client-admin/pages/NineBoxGrid/NineBoxPage.jsx';
import EmployeePerformanceHub from '../features/employee-portal/pages/EmployeePerformanceHub.jsx'
import LeaveTypesConfig from '../features/client-admin/pages/LeaveTypesConfig.jsx'
import LeaveSettingsConfig from '../features/client-admin/pages/LeaveSettingsConfig.jsx'
import LeavePlansConfig from '../features/client-admin/pages/LeavePlansConfig.jsx'
import LeaveDashboard from '../features/employee-portal/pages/LeaveDashboard.jsx'
import LeaveRequest from '../features/employee-portal/pages/LeaveRequest.jsx'
import LeaveApprovals from '../features/employee-portal/pages/LeaveApprovals.jsx'
import HolidayManagement from '../features/client-admin/pages/HolidayManagement.jsx'
import HolidayList from '../features/employee-portal/pages/HolidayList.jsx'
import EmployeeRegularization from '../features/employee-portal/pages/EmployeeRegularization.jsx'
import ManagerRegularizationApprovals from '../features/employee-portal/pages/ManagerRegularizationApprovals.jsx'
import AttendanceRegularizationSettings from '../features/client-admin/pages/AttendanceRegularizationSettings.jsx'
import ClientAdminPayroll from '../features/payroll/pages/ClientAdminPayroll.jsx'
import ClientAdminAuditLogs from '../features/client-admin/pages/ClientAdminAuditLogs.jsx'
import ClientAdminAttendanceDashboard from '../features/client-admin/pages/ClientAdminAttendanceDashboard.jsx'
import ClientAdminAttendanceTracking from '../features/client-admin/pages/ClientAdminAttendanceTracking.jsx'
import AttendanceReports from '../features/client-admin/pages/AttendanceReports.jsx'
import ClientAdminLeaveApprovals from '../features/client-admin/pages/ClientAdminLeaveApprovals.jsx'
import ClientAdminReports from '../features/client-admin/pages/ClientAdminReports.jsx'
import ClientAdminChangePassword from '../features/client-admin/pages/ChangePassword.jsx'
import PermissionManagement from '../features/client-admin/pages/PermissionManagement.jsx'
import EmployeePayslips from '../features/payroll/pages/EmployeePayslips.jsx'
import TeamAttendance from '../features/employee-portal/pages/TeamAttendance.jsx'
import MyAttendance from '../features/employee-portal/pages/MyAttendance.jsx'
import EmployeeChangePassword from '../features/employee-portal/pages/ChangePassword.jsx'
import AttendancePolicies from '../features/client-admin/pages/AttendancePolicies.jsx'
import AttendancePolicyDetails from '../features/client-admin/pages/AttendancePolicyDetails.jsx'
import OfficeLocations from '../features/client-admin/pages/OfficeLocations.jsx'
import OfficeLocationDetails from '../features/client-admin/pages/OfficeLocationDetails.jsx'
import ShiftsSchedules from '../features/client-admin/pages/ShiftsSchedules.jsx'
import ShiftDetails from '../features/client-admin/pages/ShiftDetails.jsx'
import EmployeeOvertime from '../features/employee-portal/pages/EmployeeOvertime.jsx'
import ManagerOvertimeApprovals from '../features/employee-portal/pages/ManagerOvertimeApprovals.jsx'
import PipPortal from '../features/performance/pip/pages/PipPortal.jsx'
import PipEmployeeView from '../features/performance/pip/pages/PipEmployeeView.jsx'
import ClientAdminPolicies from '../features/client-admin/pages/ClientAdminPolicies.jsx'
import EmployeePolicies from '../features/employee-portal/pages/EmployeePolicies.jsx'


export const publicRoutes = [
  { path: '/login', component: Login },
  { path: '/verify-otp', component: VerifyOtp },
  { path: '/forgot-password', component: ForgotPassword },
  { path: '/reset-password', component: ResetPassword },
  { path: '/force-change-password', component: ForceChangePassword },
]

export const superAdminRoutes = [
  { path: '/dashboard', component: Dashboard },
  { path: '/settings/companies', component: Companies },
  { path: '/settings/smtp', component: SmtpSettings },
  { path: '/settings/company', component: CompanyDetails },
  { path: '/settings/client-admins', component: ClientAdmins },
  { path: '/settings/modules', component: ModuleManagement },
  { path: '/settings/security', component: SecuritySettings },
  { path: '/settings/notifications', component: NotificationSettings },
  { path: '/settings/password-policy', component: PasswordPolicy },
  { path: '/settings/session-timeout', component: SessionTimeout },
  { path: '/settings/change-password', component: ChangePassword },
]

export const employeeRoutes = [
  { path: '/employee/dashboard',              component: EmployeeDashboard },
  { path: '/employee/goals/create',           component: CreateGoal },
  { path: '/employee/goals/edit/:id',         component: EditGoal },
  { path: '/employee/performance',            component: EmployeePerformanceHub },
  { path: '/employee/leave',                  component: LeaveDashboard },
  { path: '/employee/leave-request',          component: LeaveRequest },
  { path: '/employee/leave-approvals',        component: LeaveApprovals },
  { path: '/employee/holidays',               component: HolidayList },
  { path: '/employee/regularization',         component: EmployeeRegularization },
  { path: '/employee/regularization-approvals', component: ManagerRegularizationApprovals },
  { path: '/employee/payslips',               component: EmployeePayslips },
  { path: '/employee/payslips/:employee_payroll_id', component: EmployeePayslips },
  { path: '/employee/attendance',              component: MyAttendance },
  { path: '/employee/team-attendance',        component: TeamAttendance },
  { path: '/employee/change-password',        component: EmployeeChangePassword },
  { path: '/employee/overtime',               component: EmployeeOvertime },
  { path: '/employee/overtime-approvals',     component: ManagerOvertimeApprovals },
  { path: '/employee/team',                   component: MyTeam },
  { path: '/employee/profile',                component: MyProfile },
  { path: '/employee/pip',                    component: PipEmployeeView },
  { path: '/employee/policies',               component: EmployeePolicies },
  { path: '/employee/policies/:id',           component: EmployeePolicies },
  { path: '/settings/audit',                  component: AuditLogs },
]

export const clientAdminRoutes = [
  { path: '/client-admin/dashboard', component: ClientAdminDashboard },
  { path: '/client-admin/departments', component: Departments },
  { path: '/client-admin/hierarchy', component: HierarchyLevels },
  { path: '/client-admin/employees', component: Employees },
  { path: '/client-admin/employees/add', component: AddEmployee },
  { path: '/client-admin/employees/:id/edit', component: EditEmployee },
  { path: '/client-admin/employees/:id', component: ViewEmployee },
  { path: '/client-admin/org-chart', component: OrgChart },
  { path: '/client-admin/performance', component: PerformanceHub },
  { path: '/client-admin/bell-curve', component: BellCurvePage },
  { path: '/client-admin/nine-box', component: NineBoxPage },
  { path: '/client-admin/policies', component: ClientAdminPolicies },
  { path: '/client-admin/leave',          component: LeaveTypesConfig },
  { path: '/client-admin/leave-settings', component: LeaveSettingsConfig },
  { path: '/client-admin/leave/plans',    component: LeavePlansConfig },
  { path: '/client-admin/holidays',  component: HolidayManagement },
  { path: '/client-admin/regularizations', component: AttendanceRegularizationSettings },
  { path: '/client-admin/payroll',   component: ClientAdminPayroll },
  { path: '/client-admin/payroll/salary-structures', component: ClientAdminPayroll },
  { path: '/client-admin/payroll/runs', component: ClientAdminPayroll },
  { path: '/client-admin/audit',       component: ClientAdminAuditLogs },
  { path: '/client-admin/attendance',           component: ClientAdminAttendanceDashboard },
  { path: '/client-admin/attendance/dashboard',  component: ClientAdminAttendanceDashboard },
  { path: '/client-admin/attendance/tracking',   component: ClientAdminAttendanceTracking },
  { path: '/client-admin/attendance/reports',    component: AttendanceReports },
  { path: '/client-admin/attendance/policies',   component: AttendancePolicies },
  { path: '/client-admin/attendance/policies/:id', component: AttendancePolicyDetails },
  { path: '/client-admin/attendance/office-locations', component: OfficeLocations },
  { path: '/client-admin/attendance/office-locations/:id', component: OfficeLocationDetails },
  { path: '/client-admin/attendance/shifts-schedules', component: ShiftsSchedules },
  { path: '/client-admin/attendance/shifts-schedules/:id', component: ShiftDetails },

  { path: '/client-admin/leave-approvals',  component: ClientAdminLeaveApprovals },
  { path: '/client-admin/reports',          component: ClientAdminReports },
  { path: '/client-admin/change-password',  component: ClientAdminChangePassword },
  { path: '/client-admin/permissions',      component: PermissionManagement },
  { path: '/client-admin/pip',              component: PipPortal },
]
