const service = require('./nineBox.service');

async function generateGrid(req, res, next) {
  try {
    const { cycleId } = req.body;

    if (!cycleId) {
      return res.status(400).json({
        success: false,
        message: 'Appraisal cycle ID is required',
      });
    }

    const result = await service.generateNineBox(cycleId);

    return res.status(200).json({
      success: true,
      message: '9-Box grid generated successfully',
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('9-Box generation error:', error);
    next(error);
  }
}

async function getGrid(req, res, next) {
  try {
    const { cycleId } = req.params;

    const grid = await service.fetchNineBoxGrid(cycleId);

    return res.json({
      success: true,
      data: grid,
    });
  } catch (err) {
    next(err);
  }
}

async function updatePotential(req, res) {
  try {
    const { employeeId } = req.params;
    const { cycleId, potentialLevel } = req.body;

    if (!cycleId || !potentialLevel) {
      return res.status(400).json({
        success: false,
        message: 'cycleId and potentialLevel are required',
      });
    }

  const result = await service.updatePotentialLevel(
  employeeId,
  cycleId,
  potentialLevel
);

    res.json({
      success: true,
      message: 'Potential level updated',
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  generateGrid,
  getGrid,
  updatePotential,
};
