const PERFORMANCE_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

// function getPerformanceLevel(score) {
//   if (score === null || score === undefined) {
//     throw new Error('Performance score is required');
//   }

//   if (score >= 4.0) return PERFORMANCE_LEVELS.HIGH;
//   if (score >= 3.0) return PERFORMANCE_LEVELS.MEDIUM;
//   return PERFORMANCE_LEVELS.LOW;
// }
function getPerformanceLevel(score) {
  const numericScore = Number(score);

  if (numericScore >= 80) return 'HIGH';
  if (numericScore >= 60) return 'MEDIUM';
  return 'LOW';
}
const BOX_MAP = {
  HIGH: {
    HIGH: { box: 9, label: 'Star / Future Leader' },
    MEDIUM: { box: 6, label: 'Core Player' },
    LOW: { box: 3, label: 'Workhorse' },
  },
  MEDIUM: {
    HIGH: { box: 8, label: 'High Potential' },
    MEDIUM: { box: 5, label: 'Solid Performer' },
    LOW: { box: 2, label: 'Plateau Risk' },
  },
  LOW: {
    HIGH: { box: 7, label: 'Enigma' },
    MEDIUM: { box: 4, label: 'Inconsistent' },
    LOW: { box: 1, label: 'Underperformer' },
  },
};

function getBoxPlacement(performance, potential) {
  const placement = BOX_MAP[performance]?.[potential];

  if (!placement) {
    throw new Error(
      `Invalid 9-box combination: ${performance} / ${potential}`
    );
  }

  return placement;
}

module.exports = {
  PERFORMANCE_LEVELS,
  getPerformanceLevel,
  getBoxPlacement,
};