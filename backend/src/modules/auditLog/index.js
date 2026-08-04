const routes = require('./auditLog.routes');
const service = require('./auditLog.service');
const repository = require('./auditLog.repository');
const controller = require('./auditLog.controller');

module.exports = {
  routes: routes.routes,
  service,
  repository,
  controller
};
