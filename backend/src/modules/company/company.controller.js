const companyService = require('./company.service');
const companyRepository = require('./company.repository');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGetCompany(req, res, next) {
  try {
    const company = await companyService.getCompany(1);
    res.status(STATUS_CODES.OK).json(company);
  } catch (err) {
    next(err);
  }
}

async function handleUpdateCompany(req, res, next) {
  try {
    await companyService.updateCompany(1, req.body);
    res.status(STATUS_CODES.OK).json({ message: 'Company details saved successfully.' });
  } catch (err) {
    next(err);
  }
}

async function handleGetCompanyName(req, res, next) {
  try {
    const row = await companyRepository.getCompanyById(1);
    res.status(STATUS_CODES.OK).json({ name: row?.name || null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetCompany,
  handleUpdateCompany,
  handleGetCompanyName,
};
