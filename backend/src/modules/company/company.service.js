const companyRepository = require('./company.repository');
const { mapCompany } = require('./company.mapper');

async function getCompany(id) {
  const row = await companyRepository.getCompanyById(id);
  return mapCompany(row);
}

async function updateCompany(id, data) {
  await companyRepository.upsertCompany(id, data);
}

module.exports = {
  getCompany,
  updateCompany,
};
