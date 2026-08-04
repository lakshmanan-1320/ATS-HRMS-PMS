const router = require('express').Router()
const { requireClientAdmin, requireEmployee } = require('../../middlewares/auth.middleware')
const c = require('./appraisal.controller')

/* ── client-admin routes: /api/client-admin/appraisal ───────────────── */
const adminRouter = require('express').Router()
adminRouter.use(requireClientAdmin)

adminRouter.get('/',                           c.handleListCycles)
adminRouter.post('/',                          c.handleCreateCycle)
adminRouter.put('/:id',                        c.handleUpdateCycle)
adminRouter.delete('/:id',                     c.handleDeleteCycle)
adminRouter.get('/:id/employees',              c.handleGetCycleEmployees)

/* ── employee routes: /api/employee/appraisal ───────────────────────── */
const employeeRouter = require('express').Router()
employeeRouter.use(requireEmployee)

// Common: list active cycles
employeeRouter.get('/cycles',                                            c.handleGetActiveCycles)

// Self-appraisal
employeeRouter.get('/cycles/:cycleId/self',                              c.handleGetSelfAppraisal)
employeeRouter.put('/cycles/:cycleId/self',                              c.handleSaveSelfAppraisal)
employeeRouter.post('/cycles/:cycleId/self/submit',                      c.handleSubmitSelfAppraisal)

// Manager appraisal
employeeRouter.get('/cycles/:cycleId/team',                              c.handleGetManagerTeamStatus)
employeeRouter.get('/cycles/:cycleId/employees/:employeeId',             c.handleGetManagerAppraisal)
employeeRouter.put('/cycles/:cycleId/employees/:employeeId',             c.handleSaveManagerAppraisal)
employeeRouter.post('/cycles/:cycleId/employees/:employeeId/submit',     c.handleSubmitManagerAppraisal)

module.exports = { adminRouter, employeeRouter }
