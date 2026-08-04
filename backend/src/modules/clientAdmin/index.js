const routes = require('./clientAdmin.routes');
const controller = require('./clientAdmin.controller');
const service = require('./clientAdmin.service');
const repository = require('./clientAdmin.repository');
const mapper = require('./clientAdmin.mapper');

module.exports = {
  routes,
  controller,
  service,
  repository,
  mapper,
};
