const routes = require('./company.routes');
const controller = require('./company.controller');
const service = require('./company.service');
const repository = require('./company.repository');
const mapper = require('./company.mapper');

module.exports = {
  routes,
  controller,
  service,
  repository,
  mapper,
};
