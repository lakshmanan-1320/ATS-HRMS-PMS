const ApiError = require('../utils/apiError');
const { STATUS_CODES } = require('../constants/statusCodes');

const validate = (validateFn) => {
  return (req, res, next) => {
    const { error, value } = validateFn(req.body);
    if (error) {
      return next(new ApiError(STATUS_CODES.BAD_REQUEST, error));
    }
    req.validatedBody = value;
    next();
  };
};

module.exports = validate;
