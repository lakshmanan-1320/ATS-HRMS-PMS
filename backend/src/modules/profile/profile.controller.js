const service = require('./profile.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGetMyProfile(req, res, next) {
  try {
    const result = await service.getMyProfile(req.user);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetEmployeeProfileById(req, res, next) {
  try {
    const { employeeId } = req.params;
    const result = await service.getEmployeeProfileById(req.user, employeeId);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetMyProfile,
  handleGetEmployeeProfileById
};
