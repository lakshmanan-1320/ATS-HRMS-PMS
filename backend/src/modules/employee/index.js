const routes = require('./employee.routes');
const controller = require('./employee.controller');
const service = require('./employee.service');
const repository = require('./employee.repository');
const mapper = require('./employee.mapper');

module.exports = {
  routes,
  controller,
  service,
  repository,
  mapper,
};
