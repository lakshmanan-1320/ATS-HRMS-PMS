const pool = require('../../../config/db');


async function getAppraisalEmployees(cycleId) {
  const query = `
    SELECT
      e.employee_id,
      e.first_name,
      e.last_name,
      e.department_id,
      d.name AS department_name,
      ma.final_score
    FROM employees e
    LEFT JOIN manager_appraisals ma
      ON ma.employee_id = e.employee_id
      AND ma.cycle_id = $1
    LEFT JOIN departments d
      ON d.department_id = e.department_id
    WHERE e.status = 'active'
    ORDER BY d.name, e.first_name;
  `;

  const { rows } = await pool.query(query, [cycleId]);

  const demoScores = [95, 88, 82, 78, 72, 68, 58, 48, 35];

  return rows.map((employee, index) => ({
    ...employee,
    final_score:
      employee.final_score !== null
        ? Number(employee.final_score)
        : demoScores[index % demoScores.length],
  }));
}


async function saveNineBoxAssessment(data) {
  const query = `
    INSERT INTO nine_box_assessments (
      employee_id,
      appraisal_cycle_id,
      performance_score,
      performance_level,
      potential_level,
      box_number,
      box_label,
      manager_notes,
      hr_notes,
      is_manual_override
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);
  `;

  await pool.query(query, [
    data.employeeId,
    data.cycleId,
    data.score,
    data.performanceLevel,
    data.potentialLevel,
    data.boxNumber,
    data.boxLabel,
    data.managerNotes,
    data.hrNotes,
    data.isManualOverride,
  ]);
}

async function getNineBoxGrid(cycleId) {
  const query = `
    SELECT
      nba.assessment_id,
      nba.employee_id,
      nba.appraisal_cycle_id,

      nba.performance_score,
      nba.performance_level,
      nba.potential_level,

      nba.box_number,
      nba.box_label,

      nba.manager_notes,
      nba.hr_notes,
      nba.is_manual_override,

      e.first_name,
      e.last_name,

      e.department_id,
      d.name AS department_name

    FROM nine_box_assessments nba

    JOIN employees e
      ON e.employee_id = nba.employee_id

    LEFT JOIN departments d
      ON d.department_id = e.department_id

    WHERE nba.appraisal_cycle_id = $1

    ORDER BY
      nba.box_number DESC,
      d.name,
      e.first_name;
  `;

  const { rows } = await pool.query(query, [cycleId]);

  console.log(
    `Nine Box assessments found for cycle ${cycleId}:`,
    rows.length
  );

  return rows;
}
async function getAssessment(employeeId, cycleId) {
  const { rows } = await pool.query(
    `SELECT performance_level
     FROM nine_box_assessments
     WHERE employee_id = $1
       AND appraisal_cycle_id = $2`,
    [employeeId, cycleId]
  );

  return rows[0];
}

async function updateAssessment(employeeId, cycleId, data) {
  await pool.query(
    `UPDATE nine_box_assessments
     SET potential_level = $1,
         box_number = $2,
         box_label = $3,
         is_manual_override = $4,
         updated_at = NOW()
     WHERE employee_id = $5
       AND appraisal_cycle_id = $6`,
    [
      data.potentialLevel,
      data.boxNumber,
      data.boxLabel,
      data.isManualOverride,
      employeeId,
      cycleId,
    ]
  );
}
async function deleteNineBoxAssessments(cycleId) {
  await pool.query(
    `
      DELETE FROM nine_box_assessments
      WHERE appraisal_cycle_id = $1
    `,
    [cycleId]
  );
}
module.exports = {
  getAppraisalEmployees,
  saveNineBoxAssessment,
  getNineBoxGrid,
  getAssessment,
  updateAssessment,
  deleteNineBoxAssessments,
};
