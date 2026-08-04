const routes = require('./auth.routes');
const controller = require('./auth.controller');
const service = require('./auth.service');
const repository = require('./user.repository');

module.exports = {
  routes,
  controller,
  service,
  repository,
};
