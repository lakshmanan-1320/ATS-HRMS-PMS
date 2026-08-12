const { query } = require('../../config/db');

async function getLiveMetricValue(orgId, employeeId, source, metricKey, startDate, endDate) {
  try {
    switch (source) {
      case 'ATTENDANCE': {
        const sql = `
          SELECT 
            COUNT(CASE WHEN attendance_result = 'PRESENT' OR check_in_time IS NOT NULL THEN 1 END)::numeric as present,
            COUNT(*)::numeric as total
          FROM attendance_punches
          WHERE employee_id = $1
            AND attendance_date BETWEEN $2 AND $3
        `;
        const res = await query(sql, [employeeId, startDate, endDate]);
        const row = res.rows[0];
        if (!row || !row.total || parseInt(row.total, 10) === 0) {
          return 100.00; // default to 100% if no attendance records exist
        }
        return parseFloat(((parseFloat(row.present) / parseFloat(row.total)) * 100).toFixed(2));
      }

      case 'GOAL': {
        // Average progress of active goals for this employee
        const res = await query(
          `SELECT AVG(progress) as avg_progress 
           FROM goals 
           WHERE organization_id = $1 
             AND assigned_to_employee_id = $2 
             AND status IN ('ACTIVE', 'IN_PROGRESS')`,
          [orgId, employeeId]
        );
        const val = res.rows[0]?.avg_progress;
        return val ? parseFloat(parseFloat(val).toFixed(2)) : 0.00;
      }

      case 'KPI': {
        // Average KPI achievement rate
        const res = await query(
          `SELECT AVG(
             CASE 
               WHEN ka.target_value > 0 THEN (COALESCE(ka.achieved_value, 0) / ka.target_value) * 100 
               ELSE 0 
             END
           ) as avg_kpi
           FROM kpi_assignments ka
           JOIN goals g ON ka.goal_id = g.id
           WHERE g.organization_id = $1 
             AND g.assigned_to_employee_id = $2
             AND ka.status = 'approved'`,
          [orgId, employeeId]
        );
        const val = res.rows[0]?.avg_kpi;
        return val ? parseFloat(parseFloat(val).toFixed(2)) : 0.00;
      }

      case 'COMPETENCY': {
        // Average score from competency evaluations
        const res = await query(
          `SELECT AVG(rating) as avg_rating
           FROM competency_evaluations ce
           JOIN employees e ON ce.employee_id = e.employee_id
           WHERE e.organization_id = $1 AND ce.employee_id = $2`,
          [orgId, employeeId]
        );
        const val = res.rows[0]?.avg_rating;
        // Convert to percentage (assuming ratings out of 5)
        return val ? parseFloat(((parseFloat(val) / 5) * 100).toFixed(2)) : 0.00;
      }

      case 'CONTINUOUS_REVIEW': {
        // Average continuous feedback coaching rating
        const res = await query(
          `SELECT AVG(rating) as avg_rating
           FROM coaching_notes
           WHERE organization_id = $1 AND employee_id = $2 AND rating IS NOT NULL`,
          [orgId, employeeId]
        );
        const val = res.rows[0]?.avg_rating;
        // Convert to percentage (assuming rating out of 5)
        return val ? parseFloat(((parseFloat(val) / 5) * 100).toFixed(2)) : 0.00;
      }

      case 'SELF_ASSESSMENT': {
        // Average self assessment score
        const res = await query(
          `SELECT AVG(overall_employee_score) as avg_score
           FROM self_appraisal_submissions sas
           JOIN self_appraisals sa ON sas.self_appraisal_id = sa.self_appraisal_id
           WHERE sa.employee_id = $1`,
          [employeeId]
        );
        const val = res.rows[0]?.avg_score;
        return val ? parseFloat(parseFloat(val).toFixed(2)) : 0.00;
      }

      case 'FEEDBACK_360': {
        // Average multi-rater 360 feedback rating
        const res = await query(
          `SELECT AVG(rating) as avg_rating
           FROM feedback_360_ratings r
           JOIN feedback_360_submissions s ON r.submission_id = s.submission_id
           WHERE s.subject_employee_id = $1`,
          [employeeId]
        );
        const val = res.rows[0]?.avg_rating;
        return val ? parseFloat(((parseFloat(val) / 5) * 100).toFixed(2)) : 0.00;
      }

      case 'MANUAL':
      case 'CUSTOM':
      default:
        return null; // Return null so manual/custom inputs are not overwritten by background sync queries
    }
  } catch (err) {
    console.error(`Failed to fetch dynamic metric value for source ${source}:`, err);
    return 0.00;
  }
}

module.exports = {
  getLiveMetricValue
};
