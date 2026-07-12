const Programme = require('./Programme');
const Route = require('./Route');
const Delegate = require('./Delegate');
const AttendanceRecord = require('./AttendanceRecord');
const ReadyToDepart = require('./ReadyToDepart');
const ProgrammeDelegate = require('./ProgrammeDelegate');
const Staff = require('./Staff');
const ScanEvent = require('./ScanEvent');
const ChatMessage = require('./ChatMessage');
const OfflineQueue = require('./OfflineQueue');

// ── Associations ───────────────────────────────────────────

Programme.hasMany(Route, { foreignKey: 'programme_id', as: 'routes', onDelete: 'CASCADE' });
Route.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(AttendanceRecord, { foreignKey: 'programme_id', as: 'attendanceRecords', onDelete: 'CASCADE' });
AttendanceRecord.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasOne(ReadyToDepart, { foreignKey: 'programme_id', as: 'readyStatus', onDelete: 'CASCADE' });
ReadyToDepart.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(ProgrammeDelegate, { foreignKey: 'programme_id', as: 'programmeDelegates', onDelete: 'CASCADE' });
Route.hasMany(ProgrammeDelegate, { foreignKey: 'route_id', as: 'delegates' });
Delegate.hasMany(ProgrammeDelegate, { foreignKey: 'delegate_id', as: 'programmeDelegates', onDelete: 'CASCADE' });
ProgrammeDelegate.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });
ProgrammeDelegate.belongsTo(Route, { foreignKey: 'route_id', as: 'route' });
ProgrammeDelegate.belongsTo(Delegate, { foreignKey: 'delegate_id', as: 'delegate' });

Programme.hasMany(ScanEvent, { foreignKey: 'programme_id', as: 'scanEvents', onDelete: 'CASCADE' });
ScanEvent.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(ChatMessage, { foreignKey: 'programme_id', as: 'chatMessages', onDelete: 'CASCADE' });

Programme.hasMany(OfflineQueue, { foreignKey: 'programme_id', as: 'offlineQueue', onDelete: 'CASCADE' });

module.exports = {
  Programme, Route, Delegate, AttendanceRecord,
  ReadyToDepart, ProgrammeDelegate, Staff, ScanEvent,
  ChatMessage, OfflineQueue,
};
