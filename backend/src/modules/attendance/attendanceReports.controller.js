const service = require('./attendanceReports.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

/* ─── Route Handlers: Get Report Data ─── */
async function handleGetSummaryReport(req, res, next) {
  try {
    const data = await service.getSummaryReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetDailyReport(req, res, next) {
  try {
    const data = await service.getDailyReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetMonthlyReport(req, res, next) {
  try {
    const data = await service.getMonthlyReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetLateArrivalsReport(req, res, next) {
  try {
    const data = await service.getLateArrivalReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetEarlyExitsReport(req, res, next) {
  try {
    const data = await service.getEarlyExitReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetGeofenceReport(req, res, next) {
  try {
    const data = await service.getGeofenceReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetDepartmentsReport(req, res, next) {
  try {
    const data = await service.getDepartmentReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetEmployeeReport(req, res, next) {
  const { employeeId } = req.params;
  try {
    const data = await service.getEmployeeReport(req.user.organizationId, employeeId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetPayrollReport(req, res, next) {
  try {
    const data = await service.getPayrollReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetExceptionsReport(req, res, next) {
  try {
    const data = await service.getExceptionsReport(req.user.organizationId, req.query, req.user);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/* ─── Route Handlers: File Exports ─── */
async function getExportData(orgId, reportType, queryParams, user) {
  switch (reportType) {
    case 'summary':
      const sum = await service.getSummaryReport(orgId, queryParams, user);
      return [sum];
    case 'daily':
      return await service.getDailyReport(orgId, queryParams, user);
    case 'monthly':
      return await service.getMonthlyReport(orgId, queryParams, user);
    case 'late-arrivals':
      return await service.getLateArrivalReport(orgId, queryParams, user);
    case 'early-exits':
      return await service.getEarlyExitReport(orgId, queryParams, user);
    case 'geofence':
      const geo = await service.getGeofenceReport(orgId, queryParams, user);
      return geo.records;
    case 'departments':
      return await service.getDepartmentReport(orgId, queryParams, user);
    case 'payroll':
      return await service.getPayrollReport(orgId, queryParams, user);
    case 'exceptions':
      return await service.getExceptionsReport(orgId, queryParams, user);
    case 'employee':
      if (!queryParams.employee_id) throw new Error('employee_id filter is required for employee history export.');
      return await service.getEmployeeReport(orgId, queryParams.employee_id, queryParams, user);
    default:
      throw new Error(`Invalid report type: ${reportType}`);
  }
}

async function handleExportCSV(req, res, next) {
  const { reportType } = req.query;
  try {
    const data = await getExportData(req.user.organizationId, reportType, req.query, req.user);
    const csvContent = service.generateCSV(reportType, data, req.user, req.query);

    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_report_csv_downloaded',
      target: reportType,
      metadata: { filters: req.query },
      ip: req.ip
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${reportType || 'report'}.csv"`);
    res.status(STATUS_CODES.OK).send(csvContent);
  } catch (err) {
    next(err);
  }
}

async function handleExportXLSX(req, res, next) {
  const { reportType } = req.query;
  try {
    const data = await getExportData(req.user.organizationId, reportType, req.query, req.user);
    const xlsxBuffer = service.generateXLSX(reportType, data, req.user, req.query);

    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_report_xlsx_downloaded',
      target: reportType,
      metadata: { filters: req.query },
      ip: req.ip
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${reportType || 'report'}.xlsx"`);
    res.status(STATUS_CODES.OK).send(xlsxBuffer);
  } catch (err) {
    next(err);
  }
}

async function handleExportPDF(req, res, next) {
  const { reportType } = req.query;
  try {
    const data = await getExportData(req.user.organizationId, reportType, req.query, req.user);
    const pdfBuffer = await service.generatePDF(reportType, data, req.user, req.query);

    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_report_pdf_downloaded',
      target: reportType,
      metadata: { filters: req.query },
      ip: req.ip
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${reportType || 'report'}.pdf"`);
    res.status(STATUS_CODES.OK).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetSummaryReport,
  handleGetDailyReport,
  handleGetMonthlyReport,
  handleGetLateArrivalsReport,
  handleGetEarlyExitsReport,
  handleGetGeofenceReport,
  handleGetDepartmentsReport,
  handleGetEmployeeReport,
  handleGetPayrollReport,
  handleGetExceptionsReport,
  handleExportCSV,
  handleExportXLSX,
  handleExportPDF
};
