const db = require('../../../database/db.cjs');

// Load class methods by requiring model files that attach them
require('./Programme');
require('./Route');
require('./Delegate');
require('./AttendanceRecord');
require('./ReadyToDepart');
require('./ProgrammeDelegate');
require('./Staff');
require('./ScanEvent');
require('./ChatMessage');
require('./OfflineQueue');

module.exports = db;
