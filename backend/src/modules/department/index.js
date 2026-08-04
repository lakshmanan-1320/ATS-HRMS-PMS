const routes = require('./department.routes');
const controller = require('./department.controller');
const service = require('./department.service');
const repository = require('./department.repository');
const mapper = require('./department.mapper');

module.exports = {
  routes,
  controller,
  service,
  repository,
  mapper,
};
