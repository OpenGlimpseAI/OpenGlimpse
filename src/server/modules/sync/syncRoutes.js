const { handleSync } = require('./syncController');

function registerSyncRoutes(app) {
  app.post('/sync', handleSync);
}

module.exports = registerSyncRoutes;
