const Programme = require('./Programme');
const Route = require('./Route');
const AttendanceRecord = require('./AttendanceRecord');
const ReadyToDepart = require('./ReadyToDepart');
const ProgrammeDelegate = require('./ProgrammeDelegate');

// ── Associations ───────────────────────────────────────────

Programme.hasMany(Route, { foreignKey: 'programme_id', as: 'routes', onDelete: 'CASCADE' });
Route.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(AttendanceRecord, { foreignKey: 'programme_id', as: 'attendanceRecords', onDelete: 'CASCADE' });
AttendanceRecord.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasOne(ReadyToDepart, { foreignKey: 'programme_id', as: 'readyStatus', onDelete: 'CASCADE' });
ReadyToDepart.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(ProgrammeDelegate, { foreignKey: 'programme_id', as: 'delegates', onDelete: 'CASCADE' });
Route.hasMany(ProgrammeDelegate, { foreignKey: 'route_id', as: 'delegates' });
ProgrammeDelegate.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });
ProgrammeDelegate.belongsTo(Route, { foreignKey: 'route_id', as: 'route' });

module.exports = { Programme, Route, AttendanceRecord, ReadyToDepart, ProgrammeDelegate };
