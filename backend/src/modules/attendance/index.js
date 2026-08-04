const routes = require('./attendance.routes');
const controller = require('./attendance.controller');
const service = require('./attendance.service');
const repository = require('./attendance.repository');

module.exports = {
  routes,
  controller,
  service,
  repository,
};
