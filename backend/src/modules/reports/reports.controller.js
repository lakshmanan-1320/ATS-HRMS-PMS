const repo = require('./reports.repository')
const ApiError = require('../../utils/apiError')
const { STATUS_CODES } = require('../../constants/statusCodes')

async function resolveClientId(orgId) {
  const id = await repo.getClientAdminIdByOrg(orgId)
  if (!id) throw new ApiError(STATUS_CODES.FORBIDDEN, 'Client admin profile not found.')
  return id
}

// Security scope decider: resolves recursive reporting line for managers or returns null for admins
async function resolveVisibleEmployeeIds(user) {
  if (user.role === 'client_admin' || user.role === 'super_admin') {
    return null;
  }
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Employee profile reference is required.');
  }
  return await repo.getVisibleEmployeeIds(employeeId);
}

// Utility to generate and send CSV download attachment
function sendCSV(res, filename, rows, columnsMap) {
  const headers = Object.values(columnsMap).join(',')
  const keys = Object.keys(columnsMap)
  
  const body = rows.map(row => 
    keys.map(key => {
      let val = ''
      if (key.includes('.')) {
        const parts = key.split('.')
        val = row[parts[0]] ? row[parts[0]][parts[1]] : ''
      } else {
        val = row[key] ?? ''
      }
      
      const valStr = String(val)
      if (valStr.includes(',') || valStr.includes('"') || valStr.includes('\n')) {
        return `"${valStr.replace(/"/g, '""')}"`
      }
      return valStr
    }).join(',')
  )

  const csv = [headers, ...body].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.status(STATUS_CODES.OK).send(csv)
}

// --- Executive Dashboard Stats ---
async function handleDashboardReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const visibleIds = await resolveVisibleEmployeeIds(req.user)
    const dashboardData = await repo.getExecutiveDashboard(orgId, visibleIds)
    res.json(dashboardData)
  } catch (err) { next(err) }
}

// --- Employee Directory Report ---
async function handleEmployeeReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { department_id, manager_employee_id, status, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getEmployeeReport(orgId, {
      department_id: department_id || null,
      manager_employee_id: manager_employee_id || null,
      status: status || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'employee_report.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Name',
        email: 'Email',
        phone: 'Phone',
        department_name: 'Department',
        designation: 'Designation',
        status: 'Status',
        date_of_joining: 'Joining Date'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Attendance Logs Report (Daily, Missing Punches, etc.) ---
async function handleAttendanceReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { start_date, end_date, department_id, shift_id, attendance_result, location_status, missing_punch, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getAttendanceReport(orgId, {
      start_date: start_date || null,
      end_date: end_date || null,
      department_id: department_id || null,
      shift_id: shift_id || null,
      attendance_result: attendance_result || null,
      location_status: location_status || null,
      missing_punch: missing_punch || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'attendance_report.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        attendance_date: 'Date',
        check_in: 'Check In',
        check_out: 'Check Out',
        working_hours: 'Working Hours',
        late_minutes: 'Late Minutes',
        early_exit_minutes: 'Early Exit Minutes',
        attendance_result: 'Status',
        location_status: 'Location',
        shift_name: 'Shift'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Attendance Regularizations Report ---
async function handleRegularizationReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { start_date, end_date, department_id, approval_status, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getRegularizationReport(orgId, {
      start_date: start_date || null,
      end_date: end_date || null,
      department_id: department_id || null,
      approval_status: approval_status || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'regularization_report.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        attendance_date: 'Date',
        regularization_type: 'Type',
        check_in_requested: 'Requested In',
        check_out_requested: 'Requested Out',
        approval_status: 'Status',
        reason: 'Reason',
        approved_by_name: 'Approver'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Leave Register Report ---
async function handleLeaveReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { start_date, end_date, department_id, status, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getLeaveReport(orgId, {
      start_date: start_date || null,
      end_date: end_date || null,
      department_id: department_id || null,
      status: status || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'leave_report.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        leave_type_name: 'Leave Type',
        start_date: 'Start Date',
        end_date: 'End Date',
        total_leave_days: 'Leave Days',
        session_type: 'Session Type',
        current_status: 'Status',
        reason: 'Reason',
        approved_by_name: 'Approver'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Overtime Register Report ---
async function handleOvertimeReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { start_date, end_date, department_id, status, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getOvertimeReport(orgId, {
      start_date: start_date || null,
      end_date: end_date || null,
      department_id: department_id || null,
      status: status || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'overtime_report.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        attendance_date: 'Date',
        day_type: 'Day Type',
        requested_hours: 'Requested Hours',
        approved_hours: 'Approved Hours',
        amount_paid: 'Amount Paid',
        approval_status: 'Status',
        approved_by_name: 'Approver'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Holiday List Report ---
async function handleHolidayReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { export: exportType } = req.query

    const rows = await repo.getHolidayReport(orgId)

    if (exportType === 'csv') {
      return sendCSV(res, 'holiday_list.csv', rows, {
        holiday_name: 'Name',
        holiday_date: 'Date',
        holiday_type: 'Type',
        description: 'Description'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Active Shift Report ---
async function handleShiftReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { department_id, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getShiftReport(orgId, {
      department_id: department_id || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'shift_assignments.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        shift_name: 'Shift',
        shift_code: 'Shift Code',
        start_time: 'Start Time',
        end_time: 'End Time'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Salary Revision History Report ---
async function handleSalaryRevisionReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { department_id, export: exportType } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getSalaryRevisionReport(orgId, {
      department_id: department_id || null
    }, visibleIds)

    if (exportType === 'csv') {
      return sendCSV(res, 'salary_revisions.csv', rows, {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        old_gross_salary: 'Old Gross',
        new_gross_salary: 'New Gross',
        effective_from: 'Effective Date',
        reason: 'Reason',
        current_status: 'Status'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Payroll Audit Register Report ---
async function handlePayrollAuditReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { export: exportType } = req.query

    const rows = await repo.getPayrollAuditReport(orgId)

    if (exportType === 'csv') {
      return sendCSV(res, 'payroll_audits.csv', rows, {
        payroll_month: 'Month',
        payroll_year: 'Year',
        current_status: 'Status',
        payroll_start_date: 'Start Date',
        payroll_end_date: 'End Date',
        generated_by_name: 'Generated By',
        generated_at: 'Generated At',
        approved_by_name: 'Approved By',
        approved_at: 'Approved At',
        locked_at: 'Locked At'
      })
    }

    res.json(rows)
  } catch (err) { next(err) }
}

// --- Filters for Dropdowns ---
async function handleGetFilters(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const clientId = await resolveClientId(orgId)
    const [departments, employees, kpiCategories, appraisalCycles, payrollRuns] = await Promise.all([
      repo.getDepartmentList(orgId),
      repo.getEmployeeList(orgId),
      repo.getKpiCategories(clientId),
      repo.getAppraisalCycleList(clientId),
      repo.getPayrollRunList(orgId),
    ])
    res.json({ departments, employees, kpiCategories, appraisalCycles, payrollRuns })
  } catch (err) { next(err) }
}

// --- Goals & Performance ---
async function handleGoalReport(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.organizationId)
    const { department_id, employee_id, status, goal_type, date_from, date_to } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getGoalReport(clientId, {
      department_id: department_id || null,
      employee_id: employee_id || null,
      status: status || null,
      goal_type: goal_type || null,
      date_from: date_from || null,
      date_to: date_to || null,
    }, visibleIds)
    res.json(rows)
  } catch (err) { next(err) }
}

async function handleAppraisalReport(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.organizationId)
    const { cycle_id } = req.query
    if (!cycle_id) return res.json([])
    const visibleIds = await resolveVisibleEmployeeIds(req.user)
    const rows = await repo.getAppraisalReport(clientId, cycle_id, visibleIds)
    res.json(rows)
  } catch (err) { next(err) }
}

async function handleKpiReport(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.organizationId)
    const { status, category, employee_id } = req.query
    const visibleIds = await resolveVisibleEmployeeIds(req.user)
    const rows = await repo.getKpiReport(clientId, {
      status: status || null,
      category: category || null,
      employee_id: employee_id || null,
    }, visibleIds)
    res.json(rows)
  } catch (err) { next(err) }
}

// --- Payroll Summary Register ---
async function handlePayrollReport(req, res, next) {
  try {
    const orgId = req.user.organizationId
    const { run_id, department_id, export: exportType } = req.query
    if (!run_id) return res.json([])
    const visibleIds = await resolveVisibleEmployeeIds(req.user)

    const rows = await repo.getPayrollReport(orgId, run_id, {
      department_id: department_id || null
    }, visibleIds)

    if (exportType === 'csv') {
      const baseColumns = {
        employee_code: 'Code',
        employee_name: 'Employee',
        department_name: 'Department',
        designation: 'Designation',
        structure_name: 'Salary Structure',
        working_days: 'Working Days',
        present_days: 'Present Days',
        paid_leave_days: 'Paid Leave',
        holiday_days: 'Holidays',
        week_off_days: 'Week Off',
        lop_days: 'LOP Days',
        gross_salary: 'Gross Salary'
      }

      // Collect all dynamic component codes
      const compCodes = new Set()
      rows.forEach(r => {
        if (r.components) {
          Object.keys(r.components).forEach(code => compCodes.add(code))
        }
      })

      compCodes.forEach(code => {
        baseColumns[`components.${code}`] = code.replace(/_/g, ' ')
      })

      baseColumns.total_additions = 'Additions'
      baseColumns.total_deductions = 'Deductions'
      baseColumns.net_salary = 'Net Salary'
      baseColumns.current_status = 'Status'

      return sendCSV(res, `payroll_summary_${run_id}.csv`, rows, baseColumns)
    }

    res.json(rows)
  } catch (err) { next(err) }
}

async function handleCompetencyGapReport(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { export: exportType } = req.query;
    const rows = await repo.getCompetencyGapReport(orgId);

    if (exportType === 'csv') {
      return sendCSV(res, 'competency_gap_report.csv', rows, {
        competency_name: 'Competency',
        average_rating: 'Average Rating',
        target_rating: 'Target Rating',
        rating_gap: 'Rating Gap'
      });
    }
    res.json(rows);
  } catch (err) { next(err); }
}

async function handleCompetencyDistributionReport(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { export: exportType } = req.query;
    const rows = await repo.getCompetencyDistribution(orgId);

    if (exportType === 'csv') {
      return sendCSV(res, 'competency_distribution_report.csv', rows, {
        rating_level: 'Rating Level',
        count: 'Total Ratings Awarded'
      });
    }
    res.json(rows);
  } catch (err) { next(err); }
}

async function handleCompetencyDepartmentReport(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { export: exportType } = req.query;
    const rows = await repo.getCompetencyDepartment(orgId);

    if (exportType === 'csv') {
      return sendCSV(res, 'competency_by_department.csv', rows, {
        department_name: 'Department',
        competency_name: 'Competency',
        average_rating: 'Average Rating'
      });
    }
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = {
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
}
