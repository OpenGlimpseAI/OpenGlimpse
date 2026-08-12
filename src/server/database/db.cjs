const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
});
const connectionString = process.env.DATABASE_URL;
const sequelize = connectionString
  ? new Sequelize(connectionString, {
      dialect: "postgres",
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    })
  : new Sequelize(
      process.env.DB_NAME || "openglimpse",
      process.env.DB_USER || "postgres",
      process.env.DB_PASSWORD || "postgres",
      {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        dialect: "postgres",
      }
    );

// ── Core models ────────────────────────────────────────────

const user = sequelize.define("users", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  enName: { type: DataTypes.STRING, allowNull: false },
  zhName: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.TEXT, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.TEXT, allowNull: true, field: "password_hash" },
  photoUrl: { type: DataTypes.TEXT, allowNull: true, field: "photo_url" },
  role: { type: DataTypes.TEXT, defaultValue: "participant", allowNull: true, validate: { isIn: [["staff", "participant"]] } },
}, { timestamps: true, createdAt: "created_at", updatedAt: false });

const messages = sequelize.define("messages", {
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, allowNull: false },
  senderId: { type: DataTypes.UUID, allowNull: false, references: { model: user, key: "id" } },
  programmeId: { type: DataTypes.UUID, allowNull: true, field: "programme_id" },
});

const attendee = sequelize.define("attendee", {
  name: { type: DataTypes.STRING, allowNull: false },
});

const admin = sequelize.define("admin", {
  name: { type: DataTypes.STRING, allowNull: false },
  privileges: { type: DataTypes.STRING },
});

const faceEmbeddings = sequelize.define("faceEmbeddings", {
  imageHash: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: user, key: "id" } },
  imageType: { type: DataTypes.STRING, allowNull: false },
  imageData: { type: DataTypes.BLOB("long"), allowNull: false },
  embeddings: { type: DataTypes.TEXT, allowNull: false },
  model: { type: DataTypes.STRING, allowNull: false },
});

// ── Programme models ───────────────────────────────────────

const Programme = sequelize.define("Programme", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.TEXT, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false, field: "start_date" },
  endDate: { type: DataTypes.DATEONLY, allowNull: false, field: "end_date" },
  status: { type: DataTypes.TEXT, defaultValue: "draft", validate: { isIn: [["draft", "active", "completed"]] } },
}, { tableName: "programmes", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });

const Route = sequelize.define("Route", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  name: { type: DataTypes.TEXT, allowNull: false },
  archived: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "routes", timestamps: true, createdAt: "created_at", updatedAt: false });

const Delegate = sequelize.define("Delegate", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.TEXT, allowNull: false },
  badge: { type: DataTypes.TEXT },
  photoUrl: { type: DataTypes.TEXT, field: "photo_url" },
  userId: { type: DataTypes.UUID, allowNull: true, field: "user_id", references: { model: user, key: "id" } },
}, { tableName: "delegates", timestamps: true, createdAt: "created_at", updatedAt: false });

const AttendanceRecord = sequelize.define("AttendanceRecord", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  delegateId: { type: DataTypes.UUID, allowNull: false, field: "delegate_id" },
  status: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [["present", "absent"]] } },
  method: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [["auto", "manual", "qr"]] } },
  checkedInAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "checked_in_at" },
  checkedInBy: { type: DataTypes.UUID, field: "checked_in_by" },
  notes: { type: DataTypes.TEXT, defaultValue: "" },
}, {
  tableName: "attendance_records", timestamps: false,
  indexes: [{ fields: ["programme_id"] }, { fields: ["delegate_id"] }],
});

const ReadyToDepart = sequelize.define("ReadyToDepart", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  routeId: { type: DataTypes.UUID, allowNull: true, field: "route_id" },
  ready: { type: DataTypes.BOOLEAN, defaultValue: false },
  toggledBy: { type: DataTypes.UUID, field: "toggled_by" },
  toggledAt: { type: DataTypes.DATE, field: "toggled_at" },
}, {
  tableName: "ready_to_depart", timestamps: false,
  indexes: [{ unique: true, fields: ["route_id"] }],
});

const ProgrammeDelegate = sequelize.define("ProgrammeDelegate", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  delegateId: { type: DataTypes.UUID, allowNull: false, field: "delegate_id" },
  notes: { type: DataTypes.TEXT, defaultValue: "" },
}, {
  tableName: "programme_delegates", timestamps: false,
  indexes: [{ unique: true, fields: ["programme_id", "delegate_id"] }, { fields: ["programme_id"] }, { fields: ["delegate_id"] }],
});

const RouteMember = sequelize.define("RouteMember", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  routeId: { type: DataTypes.UUID, allowNull: false, field: "route_id" },
  delegateId: { type: DataTypes.UUID, allowNull: false, field: "delegate_id" },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
}, {
  tableName: "route_members", timestamps: false,
  indexes: [
    { unique: true, fields: ["programme_id", "delegate_id"] },
    { fields: ["route_id"] },
    { fields: ["delegate_id"] },
    { fields: ["programme_id"] },
  ],
});

const Staff = sequelize.define("Staff", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.TEXT, allowNull: false },
  email: { type: DataTypes.TEXT, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.TEXT, allowNull: false, field: "password_hash" },
  photoUrl: { type: DataTypes.TEXT, field: "photo_url" },
  role: { type: DataTypes.TEXT, defaultValue: "staff", validate: { isIn: [["admin", "staff"]] } },
}, { tableName: "staff", timestamps: true, createdAt: "created_at", updatedAt: false });

const ScanEvent = sequelize.define("ScanEvent", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  delegateId: { type: DataTypes.UUID, field: "delegate_id" },
  confidence: { type: DataTypes.REAL },
  status: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [["verified", "unverified"]] } },
  unverifiedReason: { type: DataTypes.TEXT, field: "unverified_reason" },
  boundingBoxId: { type: DataTypes.TEXT, field: "bounding_box_id" },
  scannedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "scanned_at" },
}, { tableName: "scan_events", timestamps: false });

const ChatMessage = sequelize.define("ChatMessage", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, field: "programme_id" },
  senderId: { type: DataTypes.UUID, allowNull: false, field: "sender_id" },
  text: { type: DataTypes.TEXT, allowNull: false },
  sentAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "sent_at" },
}, { tableName: "chat_messages", timestamps: false });

const MessageReaction = sequelize.define("MessageReaction", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  messageId: { type: DataTypes.UUID, allowNull: false, field: "message_id", references: { model: messages, key: "id" } },
  userId: { type: DataTypes.UUID, allowNull: false, field: "user_id", references: { model: user, key: "id" } },
  emoji: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: "message_reactions", timestamps: false,
  indexes: [{ unique: true, fields: ["message_id", "user_id"] }],
});

const OfflineQueue = sequelize.define("OfflineQueue", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scanId: { type: DataTypes.TEXT, allowNull: false, unique: true, field: "scan_id" },
  deviceId: { type: DataTypes.TEXT, allowNull: false, field: "device_id" },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  payload: { type: DataTypes.JSONB, allowNull: false },
  syncedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "synced_at" },
  processed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "offline_queue", timestamps: false });

const SyncOpLog = sequelize.define("SyncOpLog", {
  opId: { type: DataTypes.TEXT, primaryKey: true, allowNull: false, field: "op_id" },
  appliedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "applied_at" },
}, { tableName: "sync_op_log", timestamps: false });

// ── Associations ───────────────────────────────────────────

messages.belongsTo(user, { foreignKey: "senderId" });
user.hasMany(messages, { foreignKey: "senderId" });

messages.hasMany(MessageReaction, { foreignKey: "message_id", as: "reactions", onDelete: "CASCADE" });
MessageReaction.belongsTo(messages, { foreignKey: "message_id", as: "message" });
MessageReaction.belongsTo(user, { foreignKey: "user_id", as: "user" });

Programme.hasMany(Route, { foreignKey: "programme_id", as: "routes", onDelete: "CASCADE" });
Route.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });

Programme.hasMany(AttendanceRecord, { foreignKey: "programme_id", as: "attendanceRecords", onDelete: "CASCADE" });
AttendanceRecord.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });
AttendanceRecord.belongsTo(Delegate, { foreignKey: "delegate_id", as: "delegate" });
Delegate.hasMany(AttendanceRecord, { foreignKey: "delegate_id", as: "attendanceRecords" });

Route.hasOne(ReadyToDepart, { foreignKey: "route_id", as: "readyStatus", onDelete: "CASCADE" });
ReadyToDepart.belongsTo(Route, { foreignKey: "route_id", as: "route" });
ReadyToDepart.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });

Route.hasMany(RouteMember, { foreignKey: "route_id", as: "routeMembers", onDelete: "CASCADE" });
RouteMember.belongsTo(Route, { foreignKey: "route_id", as: "route" });
RouteMember.belongsTo(Delegate, { foreignKey: "delegate_id", as: "delegate" });
RouteMember.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });

Programme.hasMany(ProgrammeDelegate, { foreignKey: "programme_id", as: "programmeDelegates", onDelete: "CASCADE" });
Delegate.hasMany(ProgrammeDelegate, { foreignKey: "delegate_id", as: "programmeDelegates", onDelete: "CASCADE" });
ProgrammeDelegate.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });
ProgrammeDelegate.belongsTo(Delegate, { foreignKey: "delegate_id", as: "delegate" });
Delegate.belongsTo(user, { foreignKey: "user_id", as: "user" });

Programme.hasMany(ScanEvent, { foreignKey: "programme_id", as: "scanEvents", onDelete: "CASCADE" });
ScanEvent.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });

Programme.hasMany(ChatMessage, { foreignKey: "programme_id", as: "chatMessages", onDelete: "CASCADE" });

Programme.hasMany(OfflineQueue, { foreignKey: "programme_id", as: "offlineQueue", onDelete: "CASCADE" });

// ── Programme class methods ────────────────────────────────

// Programme
Programme.listAll = async function () {
  const programmes = await Programme.findAll({
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM programme_delegates WHERE programme_id = "Programme".id)`), "total_delegates"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records WHERE programme_id = "Programme".id AND status = 'present')`), "checked_in"],
      ],
    },
    order: [["created_at", "DESC"]],
  });
  return programmes.map((p) => ({
    id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, status: p.status,
    totalDelegates: Number(p.get("total_delegates")), checkedIn: Number(p.get("checked_in")),
  }));
};
Programme.createWithDetails = async function ({ name, startDate, endDate, routes }) {
  const routeNames = (routes || []).map((r) => r?.name?.trim()).filter(Boolean);
  if (routeNames.length === 0) {
    throw new Error("routes (at least one route) is required");
  }
  return sequelize.transaction(async (t) => {
    const p = await Programme.create({ name, startDate, endDate }, { transaction: t });
    const createdRoutes = await Route.bulkCreate(
      routeNames.map((routeName) => ({ programmeId: p.id, name: routeName })),
      { transaction: t }
    );
    return {
      id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, status: p.status,
      routes: createdRoutes.map((r) => ({ id: r.id, name: r.name })),
    };
  });
};
Programme.updateWithDetails = async function (id, body) {
  const { name, startDate, endDate, addDelegateIds, removeDelegateIds } = body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (Object.keys(updateData).length > 0) await Programme.update(updateData, { where: { id } });
  if (addDelegateIds?.length > 0) {
    await ProgrammeDelegate.bulkCreate(
      addDelegateIds.map((did) => ({ programmeId: id, delegateId: did })),
      { ignoreDuplicates: true }
    );
  }
  if (removeDelegateIds?.length > 0) {
    await ProgrammeDelegate.destroy({ where: { programmeId: id, delegateId: removeDelegateIds } });
  }
  const p = await Programme.findByPk(id, {
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM programme_delegates WHERE programme_id = "Programme".id)`), "total_delegates"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records WHERE programme_id = "Programme".id AND status = 'present')`), "checked_in"],
      ],
    },
  });
  if (!p) return null;
  return {
    id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, status: p.status,
    totalDelegates: Number(p.get("total_delegates")), checkedIn: Number(p.get("checked_in")),
  };
};
Programme.removeById = async function (id) {
  return (await Programme.destroy({ where: { id } })) > 0;
};

// Route
Route.listForProgramme = async function (programmeId, opts = {}) {
  const where = { programmeId };
  if (opts.archived !== undefined) where.archived = opts.archived;
  const routes = await Route.findAll({
    where,
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM route_members WHERE route_id = "Route".id)`), "delegate_count"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN route_members rm ON rm.delegate_id = ar.delegate_id AND rm.programme_id = ar.programme_id WHERE rm.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
        [sequelize.literal(`(SELECT COALESCE(bool_or(ready), false) FROM ready_to_depart WHERE route_id = "Route".id)`), "ready"],
      ],
    },
    order: [["created_at", "ASC"]],
  });
  return routes.map((r) => ({
    id: r.id, programmeId: r.programmeId, name: r.name, archived: r.archived,
    delegateCount: Number(r.get("delegate_count")), checkedIn: Number(r.get("checked_in")), ready: r.get("ready") || false,
  }));
};
Route.getById = async function (routeId, programmeId) {
  const r = await Route.findOne({
    where: { id: routeId, programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM route_members WHERE route_id = "Route".id)`), "delegate_count"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN route_members rm ON rm.delegate_id = ar.delegate_id AND rm.programme_id = ar.programme_id WHERE rm.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
        [sequelize.literal(`(SELECT COALESCE(bool_or(ready), false) FROM ready_to_depart WHERE route_id = "Route".id)`), "ready"],
      ],
    },
  });
  if (!r) return null;
  return {
    id: r.id, programmeId: r.programmeId, name: r.name, archived: r.archived,
    delegateCount: Number(r.get("delegate_count")), checkedIn: Number(r.get("checked_in")), ready: r.get("ready") || false,
  };
};
Route.createForProgramme = async function (programmeId, name) {
  const r = await Route.create({ programmeId, name });
  return { id: r.id, programmeId: r.programmeId, name: r.name, delegateCount: 0, checkedIn: 0 };
};
Route.updateForProgramme = async function (routeId, programmeId, body) {
  const { name, addDelegateIds, removeDelegateIds } = body;
  if (!(await Route.findOne({ where: { id: routeId, programmeId } }))) return null;
  if (name !== undefined) await Route.update({ name }, { where: { id: routeId } });
  if (addDelegateIds?.length > 0) {
    // One route per delegate: move to this route, remove from any other
    await RouteMember.destroy({ where: { programmeId, delegateId: addDelegateIds } });
    await RouteMember.bulkCreate(
      addDelegateIds.map((did) => ({ routeId, programmeId, delegateId: did })),
      { ignoreDuplicates: true }
    );
  }
  if (removeDelegateIds?.length > 0) {
    await RouteMember.destroy({ where: { routeId, delegateId: removeDelegateIds } });
  }
  const r = await Route.findByPk(routeId, {
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM route_members WHERE route_id = "Route".id)`), "delegate_count"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN route_members rm ON rm.delegate_id = ar.delegate_id AND rm.programme_id = ar.programme_id WHERE rm.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
      ],
    },
  });
  return {
    id: r.id, programmeId: r.programmeId, name: r.name,
    delegateCount: Number(r.get("delegate_count")), checkedIn: Number(r.get("checked_in")),
  };
};
Route.removeById = async function (routeId, programmeId) {
  return (await Route.destroy({ where: { id: routeId, programmeId } })) > 0;
};
Route.archiveById = async function (routeId, programmeId) {
  const r = await Route.findOne({ where: { id: routeId, programmeId } });
  if (!r) return null;
  await r.update({ archived: true });
  const delegateCount = await RouteMember.count({ where: { routeId } });
  const checkedIn = await AttendanceRecord.count({
    where: { programmeId, status: "present", delegateId: { [Sequelize.Op.in]: sequelize.literal(`(SELECT delegate_id FROM route_members WHERE route_id = '${routeId}')`) } },
  });
  return { id: r.id, programmeId: r.programmeId, name: r.name, archived: true, delegateCount, checkedIn };
};
Route.restoreById = async function (routeId, programmeId) {
  const r = await Route.findOne({ where: { id: routeId, programmeId, archived: true } });
  if (!r) return null;
  await r.update({ archived: false });
  return { id: r.id, programmeId: r.programmeId, name: r.name, archived: false };
};

// ProgrammeDelegate
ProgrammeDelegate.listForProgramme = async function (programmeId) {
  const rows = await ProgrammeDelegate.findAll({
    where: { programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(SELECT status FROM attendance_records WHERE programme_id = "ProgrammeDelegate"."programme_id" AND delegate_id = "ProgrammeDelegate"."delegate_id" LIMIT 1)`), "attendance_status"],
        [sequelize.literal(`(SELECT method FROM attendance_records WHERE programme_id = "ProgrammeDelegate"."programme_id" AND delegate_id = "ProgrammeDelegate"."delegate_id" LIMIT 1)`), "attendance_method"],
        [sequelize.literal(`(SELECT checked_in_at FROM attendance_records WHERE programme_id = "ProgrammeDelegate"."programme_id" AND delegate_id = "ProgrammeDelegate"."delegate_id" LIMIT 1)`), "checked_in_at"],
        [sequelize.literal(`(
          SELECT COALESCE(json_agg(json_build_object('id', rm.route_id, 'name', r.name) ORDER BY r.name), '[]'::json)
          FROM route_members rm
          JOIN routes r ON r.id = rm.route_id
          WHERE rm.delegate_id = "ProgrammeDelegate"."delegate_id" AND rm.programme_id = "ProgrammeDelegate"."programme_id"
        )`), "routes_json"],
      ],
    },
    include: [
      { model: Delegate, as: "delegate", attributes: ["id", "name", "badge", "userId"], required: true },
    ],
    order: [sequelize.literal(`"checked_in_at" DESC NULLS LAST`), sequelize.literal(`"delegate.name" ASC`)],
  });
  return rows.map((r) => {
    const routes = r.get("routes_json") || [];
    return {
      id: r.delegate.id, name: r.delegate.name, badge: r.delegate.badge,
      userId: r.delegate.userId,
      routeId: routes.length > 0 ? routes[0].id : null,
      routeName: routes.length > 0 ? routes[0].name : null,
      routeIds: routes.map((rt) => rt.id),
      routeNames: routes.map((rt) => rt.name),
      status: r.get("attendance_status") || "absent", method: r.get("attendance_method") || null,
      checkedInAt: r.get("checked_in_at") || null, notes: r.notes || "",
    };
  });
};
ProgrammeDelegate.addDelegates = async function (programmeId, body) {
  const { delegates, delegateIds, delegateId, name, badge, routeId, userIds } = body;
  const addToRoute = async (did) => {
    if (routeId) {
      // One route per delegate: move, don't duplicate
      await RouteMember.destroy({ where: { programmeId, delegateId: did } });
      await RouteMember.findOrCreate({ where: { routeId, delegateId: did, programmeId }, defaults: { routeId, delegateId: did, programmeId } });
    }
  };
  // New: accept userIds — find-or-create delegates by userId
  if (userIds && Array.isArray(userIds)) {
    if (!routeId) throw new Error('routeId is required when adding delegates');
    const route = await Route.findOne({ where: { id: routeId, programmeId } });
    if (!route) throw new Error(`Invalid routeId: ${routeId}`);
    const added = [];
    for (const uid of userIds) {
      let del = await Delegate.findOne({ where: { userId: uid } });
      if (!del) {
        const u = await user.findByPk(uid);
        if (!u) continue;
        del = await Delegate.create({ name: u.enName, userId: uid });
      }
      await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId: del.id }, defaults: { programmeId, delegateId: del.id } });
      await addToRoute(del.id);
      added.push({ delegateId: del.id, name: del.name });
    }
    return added;
  }
  if (delegates && Array.isArray(delegates)) {
    const added = [];
    for (const d of delegates) {
      const [del] = await Delegate.findOrCreate({ where: { name: d.name }, defaults: { name: d.name, badge: d.badge || null } });
      await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId: del.id }, defaults: { programmeId, delegateId: del.id } });
      await addToRoute(del.id);
      added.push({ delegateId: del.id, name: del.name });
    }
    return added;
  }
  if (delegateIds && Array.isArray(delegateIds)) {
    for (const id of delegateIds) {
      await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId: id }, defaults: { programmeId, delegateId: id } });
      await addToRoute(id);
    }
    return delegateIds.map((id) => ({ delegateId: id }));
  }
  if (delegateId) {
    await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId }, defaults: { programmeId, delegateId } });
    await addToRoute(delegateId);
    return [{ delegateId }];
  }
  if (name) {
    const del = await Delegate.create({ name, badge: badge || null });
    await ProgrammeDelegate.create({ programmeId, delegateId: del.id });
    await addToRoute(del.id);
    return [{ delegateId: del.id, name }];
  }
  throw new Error("Provide delegates array, delegateIds, delegateId, or name");
};
ProgrammeDelegate.removeFromProgramme = async function (programmeId, delegateId) {
  await AttendanceRecord.destroy({ where: { programmeId, delegateId } });
  await RouteMember.destroy({ where: { programmeId, delegateId } });
  return (await ProgrammeDelegate.destroy({ where: { programmeId, delegateId } })) > 0;
};

// AttendanceRecord
AttendanceRecord.getAttendance = async function (programmeId) {
  const presentRecords = await AttendanceRecord.findAll({ where: { programmeId, status: "present" }, order: [["checked_in_at", "DESC"]] });
  const presentDelegateIds = presentRecords.map((r) => r.delegateId);
  const allPds = await ProgrammeDelegate.findAll({
    where: { programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(
          SELECT COALESCE(json_agg(json_build_object('id', rm.route_id, 'name', r.name) ORDER BY r.name), '[]'::json)
          FROM route_members rm
          JOIN routes r ON r.id = rm.route_id
          WHERE rm.delegate_id = "ProgrammeDelegate"."delegate_id" AND rm.programme_id = "ProgrammeDelegate"."programme_id"
        )`), "routes_json"],
      ],
    },
    include: [
      { model: Delegate, as: "delegate", attributes: ["id", "name"], required: true },
    ],
  });
  const pdByDelegateId = {};
  for (const pd of allPds) pdByDelegateId[pd.delegateId] = pd;
  const present = presentRecords.filter((rec) => pdByDelegateId[rec.delegateId]).map((rec) => {
    const pd = pdByDelegateId[rec.delegateId];
    const routes = pd.get("routes_json") || [];
    return {
      delegateId: rec.delegateId, name: pd.delegate.name,
      routeId: routes.length > 0 ? routes[0].id : null, routeName: routes.length > 0 ? routes[0].name : null,
      routeIds: routes.map((rt) => rt.id), routeNames: routes.map((rt) => rt.name),
      method: rec.method, checkedInAt: rec.checkedInAt, notes: rec.notes,
    };
  });
  const presentSet = new Set(presentDelegateIds);
  const missing = allPds.filter((pd) => !presentSet.has(pd.delegateId)).map((pd) => {
    const routes = pd.get("routes_json") || [];
    return {
      delegateId: pd.delegate.id, name: pd.delegate.name,
      routeId: routes.length > 0 ? routes[0].id : null, routeName: routes.length > 0 ? routes[0].name : null,
      routeIds: routes.map((rt) => rt.id), routeNames: routes.map((rt) => rt.name),
      notes: pd.notes || "",
    };
  });
  const unidentifiedEvents = await ScanEvent.findAll({ where: { programmeId, status: "unverified" }, attributes: ["id", "scannedAt"], order: [["scanned_at", "DESC"]] });
  return { present, missing, unidentified: unidentifiedEvents.map((s) => ({ scanId: s.id, scannedAt: s.scannedAt })) };
};
AttendanceRecord.markAttendance = async function (programmeId, delegateId, { status, method, notes }, io) {
  if (!["present", "absent"].includes(status)) throw new Error('status must be "present" or "absent"');
  if (status === "present" && !method) throw new Error("method is required when marking present");
  if (!(await ProgrammeDelegate.findOne({ where: { programmeId, delegateId } }))) throw new Error("Delegate is not in this programme");
  const existing = await AttendanceRecord.findOne({ where: { programmeId, delegateId } });
  let row;
  if (existing) {
    await existing.update({ status, method: method || "manual", notes: notes || "", checkedInAt: new Date() });
    row = existing;
  } else {
    row = await AttendanceRecord.create({ programmeId, delegateId, status, method: method || "manual", notes: notes || "", checkedInAt: new Date() });
  }
  if (status === "present") {
    await ScanEvent.destroy({ where: { programmeId, delegateId: null, status: "unverified" } });
  }
  const delegate = await Delegate.findByPk(delegateId, { attributes: ["name"] });
  const delegateName = delegate?.name || "";
  const payload = { programmeId: row.programmeId, delegateId: row.delegateId, name: delegateName, status: row.status, method: row.method, checkedInAt: row.checkedInAt };
  if (io) io.to(`programme:${programmeId}`).emit("attendance:updated", payload);
  return payload;
};
AttendanceRecord.markAttendanceBatch = async function (programmeId, records, io) {
  const success = [];
  const errors = [];
  for (const rec of records) {
    try {
      const result = await AttendanceRecord.markAttendance(programmeId, rec.delegateId, rec, io);
      success.push(result);
    } catch (e) {
      errors.push({ delegateId: rec.delegateId, error: e.message });
    }
  }
  return { success, errors };
};
AttendanceRecord.getSummary = async function (programmeId) {
  const total = await ProgrammeDelegate.count({ where: { programmeId } });
  const checkedIn = await AttendanceRecord.count({ where: { programmeId, status: "present" } });
  const unidentified = await ScanEvent.count({ where: { programmeId, status: "unverified" } });
  const unidentifiedScans = await ScanEvent.findAll({
    where: { programmeId, status: "unverified" },
    attributes: ["id", "scannedAt"],
    order: [["scanned_at", "DESC"]],
  });
  const routes = await Route.findAll({
    where: { programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM route_members WHERE route_id = "Route".id)`), "total"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN route_members rm ON rm.delegate_id = ar.delegate_id AND rm.programme_id = ar.programme_id WHERE rm.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM scan_events WHERE programme_id = "Route"."programme_id" AND status = 'unverified')`), "unidentified"],
      ],
    },
    order: [["name", "ASC"]],
  });
  return {
    total, checkedIn, missing: total - checkedIn, unidentified,
    unidentifiedScans: unidentifiedScans.map((s) => ({ scanId: s.id, scannedAt: s.scannedAt })),
    byRoute: routes.map((r) => ({
      routeId: r.id, routeName: r.name, total: Number(r.get("total")), checkedIn: Number(r.get("checked_in")), missing: Number(r.get("total")) - Number(r.get("checked_in")), unidentified: Number(r.get("unidentified")),
    })),
  };
};

// ReadyToDepart (per-route)
ReadyToDepart.getStatus = async function (routeId) {
  const r = await ReadyToDepart.findOne({ where: { routeId }, attributes: ["routeId", "ready", "toggledBy", "toggledAt"] });
  if (!r) return { ready: false, toggledBy: null, toggledAt: null };
  return { routeId: r.routeId, ready: r.ready, toggledBy: r.toggledBy, toggledAt: r.toggledAt };
};
ReadyToDepart.setStatus = async function (routeId, programmeId, ready) {
  if (ready === true) {
    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM programme_delegates pd
       WHERE pd.programme_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM route_members rm
           WHERE rm.delegate_id = pd.delegate_id AND rm.programme_id = pd.programme_id
         )`,
      { bind: [programmeId] }
    );
    const unassigned = rows[0]?.n || 0;
    if (unassigned > 0) {
      throw new Error(`assign every delegate to a route (${unassigned} delegate${unassigned === 1 ? "" : "s"} unassigned)`);
    }
  }
  const [record] = await ReadyToDepart.findOrCreate({ where: { routeId }, defaults: { routeId, programmeId, ready, toggledAt: new Date() } });
  if (record.ready !== ready) await record.update({ ready, toggledAt: new Date() });
  return { routeId: record.routeId, ready: record.ready, toggledBy: record.toggledBy, toggledAt: record.toggledAt };
};

module.exports = { sequelize, user, messages, attendee, admin, faceEmbeddings, Programme, Route, Delegate, AttendanceRecord, ReadyToDepart, ProgrammeDelegate, Staff, ScanEvent, ChatMessage, MessageReaction, OfflineQueue, SyncOpLog, RouteMember };
