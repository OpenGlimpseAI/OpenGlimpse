const { handleSync } = require('./syncController');
const { authMiddleware } = require('../auth/authRoutes');

function registerSyncRoutes(app) {
  app.post('/sync', authMiddleware, handleSync);
}

module.exports = registerSyncRoutes;
