const { Sequelize,DataTypes } = require("sequelize");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
});
const sequelize = new Sequelize(
    process.env.DB_NAME || 'openglimpse',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
    }
)

const user = sequelize.define("users", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    enName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    zhName: {
        type: DataTypes.STRING,
        allowNull: true,
    }
})

const messages = sequelize.define("messages", {
    content: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: user,
            key: "id",
        },
    }
})

const attendee = sequelize.define("attendee", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    }
})

const admin = sequelize.define("admin", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    privileges: {
        type: DataTypes.STRING,
    }
})


const faceEmbeddings = sequelize.define("faceEmbeddings", {
    imageHash: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: user,
            key: "id",
        },
    },
    // imageType must be 'primary' or 'cache'
    imageType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    imageData: {
        type: DataTypes.BLOB("long"),
        allowNull: false,
    },
    embeddings: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false,
    },
})

// ── Programme models ────────────────────────────────────

const Programme = sequelize.define('Programme', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    status: {
        type: DataTypes.TEXT,
        defaultValue: 'draft',
        validate: { isIn: [['draft', 'active', 'completed']] },
    },
}, { tableName: 'programmes', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Route = sequelize.define('Route', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    programmeId: { type: DataTypes.UUID, allowNull: false, field: 'programme_id' },
    name: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'routes', timestamps: true, createdAt: 'created_at', updatedAt: false });

const Delegate = sequelize.define('Delegate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    badge: { type: DataTypes.TEXT },
    photoUrl: { type: DataTypes.TEXT, field: 'photo_url' },
}, { tableName: 'delegates', timestamps: true, createdAt: 'created_at', updatedAt: false });

const AttendanceRecord = sequelize.define('AttendanceRecord', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    programmeId: { type: DataTypes.UUID, allowNull: false, field: 'programme_id' },
    delegateId: { type: DataTypes.UUID, allowNull: false, field: 'delegate_id' },
    status: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [['present', 'absent']] } },
    method: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [['auto', 'manual']] } },
    checkedInAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'checked_in_at' },
    checkedInBy: { type: DataTypes.UUID, field: 'checked_in_by' },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
}, {
    tableName: 'attendance_records', timestamps: false,
    indexes: [{ fields: ['programme_id'] }, { fields: ['delegate_id'] }],
});

const ReadyToDepart = sequelize.define('ReadyToDepart', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    programmeId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'programme_id' },
    ready: { type: DataTypes.BOOLEAN, defaultValue: false },
    toggledBy: { type: DataTypes.UUID, field: 'toggled_by' },
    toggledAt: { type: DataTypes.DATE, field: 'toggled_at' },
}, { tableName: 'ready_to_depart', timestamps: false });

const ProgrammeDelegate = sequelize.define('ProgrammeDelegate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    programmeId: { type: DataTypes.UUID, allowNull: false, field: 'programme_id' },
    delegateId: { type: DataTypes.UUID, allowNull: false, field: 'delegate_id' },
    routeId: { type: DataTypes.UUID, allowNull: true, field: 'route_id' },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
}, {
    tableName: 'programme_delegates', timestamps: false,
    indexes: [
        { unique: true, fields: ['programme_id', 'delegate_id'] },
        { fields: ['programme_id'] }, { fields: ['delegate_id'] },
    ],
});

const Staff = sequelize.define('Staff', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.TEXT, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.TEXT, allowNull: false, field: 'password_hash' },
    photoUrl: { type: DataTypes.TEXT, field: 'photo_url' },
    role: { type: DataTypes.TEXT, defaultValue: 'staff', validate: { isIn: [['admin', 'staff']] } },
}, { tableName: 'staff', timestamps: true, createdAt: 'created_at', updatedAt: false });

const ScanEvent = sequelize.define('ScanEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    programmeId: { type: DataTypes.UUID, allowNull: false, field: 'programme_id' },
    delegateId: { type: DataTypes.UUID, field: 'delegate_id' },
    confidence: { type: DataTypes.REAL },
    status: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [['verified', 'unverified']] } },
    unverifiedReason: { type: DataTypes.TEXT, field: 'unverified_reason' },
    boundingBoxId: { type: DataTypes.TEXT, field: 'bounding_box_id' },
    scannedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'scanned_at' },
}, { tableName: 'scan_events', timestamps: false });

const ChatMessage = sequelize.define('ChatMessage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    programmeId: { type: DataTypes.UUID, field: 'programme_id' },
    senderId: { type: DataTypes.UUID, allowNull: false, field: 'sender_id' },
    text: { type: DataTypes.TEXT, allowNull: false },
    sentAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'sent_at' },
}, { tableName: 'chat_messages', timestamps: false });

const OfflineQueue = sequelize.define('OfflineQueue', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    scanId: { type: DataTypes.TEXT, allowNull: false, unique: true, field: 'scan_id' },
    deviceId: { type: DataTypes.TEXT, allowNull: false, field: 'device_id' },
    programmeId: { type: DataTypes.UUID, allowNull: false, field: 'programme_id' },
    payload: { type: DataTypes.JSONB, allowNull: false },
    syncedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'synced_at' },
    processed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'offline_queue', timestamps: false });

// ── Associations ────────────────────────────────────────

messages.belongsTo(user, { foreignKey: 'senderId' })
user.hasMany(messages, { foreignKey: 'senderId' })

Programme.hasMany(Route, { foreignKey: 'programme_id', as: 'routes', onDelete: 'CASCADE' });
Route.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(AttendanceRecord, { foreignKey: 'programme_id', as: 'attendanceRecords', onDelete: 'CASCADE' });
AttendanceRecord.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });
AttendanceRecord.belongsTo(Delegate, { foreignKey: 'delegate_id', as: 'delegate' });
Delegate.hasMany(AttendanceRecord, { foreignKey: 'delegate_id', as: 'attendanceRecords' });

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

module.exports = { sequelize, user, messages, attendee, admin, faceEmbeddings, Programme, Route, Delegate, AttendanceRecord, ReadyToDepart, ProgrammeDelegate, Staff, ScanEvent, ChatMessage, OfflineQueue }
