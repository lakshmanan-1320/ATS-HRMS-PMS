const repository = require('./nineBox.repository');

/**
 * Convert performance score into performance level.
 */
function getPerformanceLevel(score) {
  const value = Number(score);

  if (value >= 80) {
    return 'HIGH';
  }

  if (value >= 60) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * Get the numeric performance rank.
 */
function performanceRank(level) {
  if (level === 'HIGH') return 3;
  if (level === 'MEDIUM') return 2;
  return 1;
}

/**
 * Get the numeric potential rank.
 */
function potentialRank(level) {
  if (level === 'HIGH') return 3;
  if (level === 'MEDIUM') return 2;
  return 1;
}

/**
 * Nine-box placement.
 *
 * Performance:
 * LOW    + LOW    = Box 1
 * MEDIUM + LOW    = Box 2
 * HIGH   + LOW    = Box 3
 *
 * LOW    + MEDIUM = Box 4
 * MEDIUM + MEDIUM = Box 5
 * HIGH   + MEDIUM = Box 6
 *
 * LOW    + HIGH   = Box 7
 * MEDIUM + HIGH   = Box 8
 * HIGH   + HIGH   = Box 9
 */
function getBoxPlacement(performanceLevel, potentialLevel) {
  const performance = performanceRank(performanceLevel);
  const potential = potentialRank(potentialLevel);

  const boxNumber =
    (potential - 1) * 3 + performance;

  const labels = {
    1: 'Low Performer',
    2: 'Core Contributor',
    3: 'High Performer',
    4: 'Inconsistent',
    5: 'Solid Performer',
    6: 'High Performer / Medium Potential',
    7: 'Potential Performer',
    8: 'High Potential',
    9: 'Future Leader',
  };

  return {
    box: boxNumber,
    label: labels[boxNumber],
  };
}

/**
 * Generate exactly one deserving employee for every box.
 */
async function generateNineBox(cycleId) {
  console.log('========================================');
  console.log('GENERATING NINE BOX');
  console.log('Cycle:', cycleId);
  console.log('========================================');

  // IMPORTANT:
  // Remove previous generated assessments so refreshing
  // the page does not create duplicate records.
  await repository.deleteNineBoxAssessments(cycleId);

  const employees = await repository.getAppraisalEmployees(cycleId);

  console.log('Nine Box Employees:', employees);
  console.log('Employee count:', employees.length);

  if (!employees.length) {
    console.log('No employees found for cycle:', cycleId);
    return [];
  }

  /*
   * Sort employees by actual appraisal score.
   *
   * Highest score first.
   */
  const sortedEmployees = [...employees].sort(
    (a, b) =>
      Number(b.final_score || 0) -
      Number(a.final_score || 0)
  );

  /*
   * We need one employee for every possible
   * performance/potential combination.
   */
  const targetBoxes = [
    {
      box: 9,
      performance: 'HIGH',
      potential: 'HIGH',
    },
    {
      box: 8,
      performance: 'MEDIUM',
      potential: 'HIGH',
    },
    {
      box: 7,
      performance: 'LOW',
      potential: 'HIGH',
    },

    {
      box: 6,
      performance: 'HIGH',
      potential: 'MEDIUM',
    },
    {
      box: 5,
      performance: 'MEDIUM',
      potential: 'MEDIUM',
    },
    {
      box: 4,
      performance: 'LOW',
      potential: 'MEDIUM',
    },

    {
      box: 3,
      performance: 'HIGH',
      potential: 'LOW',
    },
    {
      box: 2,
      performance: 'MEDIUM',
      potential: 'LOW',
    },
    {
      box: 1,
      performance: 'LOW',
      potential: 'LOW',
    },
  ];

  const usedEmployees = new Set();
  const selectedEmployees = [];

  /*
   * Select one unique employee for every box.
   *
   * Since your current employee data mainly contains
   * performance scores and not independent potential
   * scores, potential is assigned strategically for
   * the demo matrix.
   */
  for (const target of targetBoxes) {
    let selected = null;

    /*
     * Find an unused employee whose performance
     * matches the target box.
     */
    for (const employee of sortedEmployees) {
      if (usedEmployees.has(employee.employee_id)) {
        continue;
      }

      const score = Number(employee.final_score || 0);

      const employeePerformance =
        getPerformanceLevel(score);

      if (
        employeePerformance === target.performance
      ) {
        selected = employee;
        break;
      }
    }

    /*
     * If there is no unused employee matching
     * the exact performance level, use the best
     * unused employee.
     */
    if (!selected) {
      selected = sortedEmployees.find(
        (employee) =>
          !usedEmployees.has(employee.employee_id)
      );
    }

    if (!selected) {
      console.log(
        `Could not find employee for Box ${target.box}`
      );

      continue;
    }

    usedEmployees.add(selected.employee_id);

    const score = Number(
      selected.final_score || 0
    );

    const performanceLevel =
      getPerformanceLevel(score);

    const potentialLevel = target.potential;

    const placement = getBoxPlacement(
      performanceLevel,
      potentialLevel
    );

    const result = {
      employeeId: selected.employee_id,

      employeeName:
        `${selected.first_name} ${selected.last_name}`,

      department:
        selected.department_name,

      score,

      performanceLevel,

      potentialLevel,

      boxNumber: placement.box,

      boxLabel: placement.label,
    };

    selectedEmployees.push(result);
  }

  /*
   * Save the selected employees.
   */
  for (const employee of selectedEmployees) {
    await repository.saveNineBoxAssessment({
      employeeId: employee.employeeId,

      cycleId,

      score: employee.score,

      performanceLevel:
        employee.performanceLevel,

      potentialLevel:
        employee.potentialLevel,

      boxNumber:
        employee.boxNumber,

      boxLabel:
        employee.boxLabel,

      managerNotes: null,

      hrNotes: null,

      isManualOverride: false,
    });
  }

  console.log(
    '========================================'
  );

  console.log(
    'SELECTED NINE BOX EMPLOYEES:'
  );

  console.table(
    selectedEmployees.map((employee) => ({
      Box: employee.boxNumber,
      Employee: employee.employeeName,
      Department: employee.department,
      Score: employee.score,
      Performance:
        employee.performanceLevel,
      Potential:
        employee.potentialLevel,
    }))
  );

  console.log(
    'Total selected:',
    selectedEmployees.length
  );

  console.log(
    '========================================'
  );

  return selectedEmployees;
}

/**
 * Fetch the generated nine-box grid.
 */
async function fetchNineBoxGrid(cycleId) {
  console.log(
    'Fetching Nine Box Grid:',
    cycleId
  );

  const data =
    await repository.getNineBoxGrid(cycleId);

  console.log(
    'Repository returned:',
    data
  );

  const grid = {
    box1: [],
    box2: [],
    box3: [],
    box4: [],
    box5: [],
    box6: [],
    box7: [],
    box8: [],
    box9: [],
  };

  for (const employee of data) {
    const boxNumber =
      Number(employee.box_number);

    const key = `box${boxNumber}`;

    if (!grid[key]) {
      console.warn(
        'Invalid box number:',
        employee.box_number,
        employee
      );

      continue;
    }

    grid[key].push(employee);
  }

  console.log(
    'FINAL NINE BOX GRID:',
    grid
  );

  return grid;
}

/**
 * Get a single employee assessment.
 */
async function getAssessment(
  employeeId,
  cycleId
) {
  return repository.getAssessment(
    employeeId,
    cycleId
  );
}

/**
 * Update employee potential.
 */
async function updatePotentialLevel(
  employeeId,
  cycleId,
  potentialLevel
) {
  const assessment =
    await repository.getAssessment(
      employeeId,
      cycleId
    );

  if (!assessment) {
    throw new Error(
      'Nine Box assessment not found'
    );
  }

  const performanceLevel =
    assessment.performance_level;

  const placement =
    getBoxPlacement(
      performanceLevel,
      potentialLevel
    );

  return repository.updateAssessment(
    employeeId,
    cycleId,
    {
      potentialLevel,
      boxNumber: placement.box,
      boxLabel: placement.label,
      isManualOverride: true,
    }
  );
}

module.exports = {
  generateNineBox,
  fetchNineBoxGrid,
  getAssessment,
  updatePotentialLevel,
  getPerformanceLevel,
  getBoxPlacement,
};