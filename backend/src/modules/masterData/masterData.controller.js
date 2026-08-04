const { query } = require('../../config/db');
const clientModuleRepo = require('../clientModule/clientModule.repository');
const { STATUS_CODES } = require('../../constants/statusCodes');

const TECHNIQUE_DISPLAY_ORDERS = {
  'kpi': 1,
  'continuous_feedback': 2,
  'competency_assessment': 3,
  'self_assessment': 4,
  '360_feedback': 5
};

async function handleGetMasterData(req, res, next) {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Organization Context missing' });
    }

    // 1. Fetch Goal Types from database master table
    const typeResult = await query(
      `SELECT goal_type_id, code, name, icon, description, display_order, is_active 
       FROM goal_types 
       WHERE is_active = true 
       ORDER BY display_order ASC`
    );

    // 2. Fetch Priorities from database master table
    const priorityResult = await query(
      `SELECT priority_id, code, name, display_order, is_active 
       FROM goal_priorities 
       WHERE is_active = true 
       ORDER BY display_order ASC`
    );

    // 3. Fetch Visibility Options from database master table
    const visibilityResult = await query(
      `SELECT visibility_id, code, name, display_order, is_active 
       FROM goal_visibilities 
       WHERE is_active = true 
       ORDER BY display_order ASC`
    );

    // 4. Fetch performance techniques dynamically from enabled modules
    const rawModules = await clientModuleRepo.getModulesForOrganization(orgId);
    const performanceTechniques = rawModules
      .filter(m => m.category === 'TECHNIQUE' && m.is_enabled)
      .map(m => ({
        technique_id: m.module_key,
        code: m.module_key.toUpperCase(),
        name: m.module_name,
        icon: m.icon || '📊',
        description: m.description || '',
        display_order: TECHNIQUE_DISPLAY_ORDERS[m.module_key] || 99,
        is_active: m.is_enabled
      }))
      .sort((a, b) => a.display_order - b.display_order);

    // 5. Fetch departments
    const deptResult = await query(
      `SELECT department_id, name FROM departments WHERE organization_id = $1 ORDER BY name ASC`,
      [orgId]
    );

    // 6. Fetch goal categories
    const catResult = await query(
      `SELECT category_id, name FROM goal_categories WHERE organization_id = $1 ORDER BY name ASC`,
      [orgId]
    );

    // 7. Fetch financial years (repurposed as cycles for frontend compatibility)
    const cyclesResult = await query(
      `SELECT financial_year_id as cycle_id, name as cycle_name, start_date, end_date, status 
       FROM financial_years WHERE organization_id = $1 ORDER BY start_date DESC`,
      [orgId]
    );

    res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        goalTypes: typeResult.rows,
        priorities: priorityResult.rows,
        visibilityOptions: visibilityResult.rows,
        performanceTechniques,
        departments: deptResult.rows,
        categories: catResult.rows,
        cycles: cyclesResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetMasterData
};
