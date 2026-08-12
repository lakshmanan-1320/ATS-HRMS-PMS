function calculateOverallProgress(metrics) {
  if (!Array.isArray(metrics) || metrics.length === 0) return 0.00;

  let totalWeight = 0;
  let weightedSum = 0;

  metrics.forEach(m => {
    const weight = parseFloat(m.weight) || 0;
    const completion = Math.min(100.00, parseFloat(m.completion_pct) || 0);

    weightedSum += (completion * weight);
    totalWeight += weight;
  });

  if (totalWeight === 0) return 0.00;
  return parseFloat((weightedSum / totalWeight).toFixed(2));
}

function generateRecommendation(progress, settings, isMonitoring = false) {
  if (isMonitoring) {
    const closeThreshold = parseFloat(settings.monitoring_close_threshold_pct) || 80.00;
    const extendThreshold = parseFloat(settings.monitoring_extend_threshold_pct) || 50.00;

    if (progress >= closeThreshold) {
      return {
        recommendation: 'CLOSE',
        reason: `Overall monitoring progress of ${progress}% is at or above the Close threshold of ${closeThreshold}%. Recommend closing the monitoring plan successfully.`
      };
    }

    if (progress < extendThreshold) {
      return {
        recommendation: 'ESCALATE',
        reason: `Overall monitoring progress of ${progress}% is below the PIP Conversion threshold of ${extendThreshold}%. Recommend converting to a formal Active PIP.`
      };
    }

    return {
      recommendation: 'EXTEND',
      reason: `Overall monitoring progress of ${progress}% is between the Conversion threshold (${extendThreshold}%) and Close threshold (${closeThreshold}%). Recommend extending the monitoring period.`
    };
  }

  const closeThreshold = parseFloat(settings.close_threshold_pct) || 80.00;
  const extendThreshold = parseFloat(settings.extend_threshold_pct) || 50.00;
  const escalateThreshold = parseFloat(settings.escalate_threshold_pct) || 50.00;

  if (progress >= closeThreshold) {
    return {
      recommendation: 'CLOSE',
      reason: `Overall progress of ${progress}% is at or above the Close threshold of ${closeThreshold}%. Recommend closing the PIP successfully.`
    };
  }

  if (progress < escalateThreshold) {
    return {
      recommendation: 'ESCALATE',
      reason: `Overall progress of ${progress}% is below the Escalate threshold of ${escalateThreshold}%. Recommend escalating for exit or disciplinary action.`
    };
  }

  return {
    recommendation: 'EXTEND',
    reason: `Overall progress of ${progress}% is between the Escalate threshold (${escalateThreshold}%) and Close threshold (${closeThreshold}%). Recommend extending the PIP duration.`
  };
}

module.exports = {
  calculateOverallProgress,
  generateRecommendation
};
