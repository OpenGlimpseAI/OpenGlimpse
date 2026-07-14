const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
});
const sequelize = new Sequelize(
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
});

const messages = sequelize.define("messages", {
  content: { type: DataTypes.STRING, allowNull: false },
  timestamp: { type: DataTypes.DATE, allowNull: false },
  senderId: { type: DataTypes.UUID, allowNull: false, references: { model: user, key: "id" } },
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
  method: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [["auto", "manual"]] } },
  checkedInAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "checked_in_at" },
  checkedInBy: { type: DataTypes.UUID, field: "checked_in_by" },
  notes: { type: DataTypes.TEXT, defaultValue: "" },
}, {
  tableName: "attendance_records", timestamps: false,
  indexes: [{ fields: ["programme_id"] }, { fields: ["delegate_id"] }],
});

const ReadyToDepart = sequelize.define("ReadyToDepart", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "programme_id" },
  ready: { type: DataTypes.BOOLEAN, defaultValue: false },
  toggledBy: { type: DataTypes.UUID, field: "toggled_by" },
  toggledAt: { type: DataTypes.DATE, field: "toggled_at" },
}, { tableName: "ready_to_depart", timestamps: false });

const ProgrammeDelegate = sequelize.define("ProgrammeDelegate", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  delegateId: { type: DataTypes.UUID, allowNull: false, field: "delegate_id" },
  routeId: { type: DataTypes.UUID, allowNull: true, field: "route_id" },
  notes: { type: DataTypes.TEXT, defaultValue: "" },
}, {
  tableName: "programme_delegates", timestamps: false,
  indexes: [{ unique: true, fields: ["programme_id", "delegate_id"] }, { fields: ["programme_id"] }, { fields: ["delegate_id"] }],
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

const OfflineQueue = sequelize.define("OfflineQueue", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scanId: { type: DataTypes.TEXT, allowNull: false, unique: true, field: "scan_id" },
  deviceId: { type: DataTypes.TEXT, allowNull: false, field: "device_id" },
  programmeId: { type: DataTypes.UUID, allowNull: false, field: "programme_id" },
  payload: { type: DataTypes.JSONB, allowNull: false },
  syncedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "synced_at" },
  processed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "offline_queue", timestamps: false });

// ── Associations ───────────────────────────────────────────

messages.belongsTo(user, { foreignKey: "senderId" });
user.hasMany(messages, { foreignKey: "senderId" });

Programme.hasMany(Route, { foreignKey: "programme_id", as: "routes", onDelete: "CASCADE" });
Route.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });

Programme.hasMany(AttendanceRecord, { foreignKey: "programme_id", as: "attendanceRecords", onDelete: "CASCADE" });
AttendanceRecord.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });
AttendanceRecord.belongsTo(Delegate, { foreignKey: "delegate_id", as: "delegate" });
Delegate.hasMany(AttendanceRecord, { foreignKey: "delegate_id", as: "attendanceRecords" });

Programme.hasOne(ReadyToDepart, { foreignKey: "programme_id", as: "readyStatus", onDelete: "CASCADE" });
ReadyToDepart.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });

Programme.hasMany(ProgrammeDelegate, { foreignKey: "programme_id", as: "programmeDelegates", onDelete: "CASCADE" });
Route.hasMany(ProgrammeDelegate, { foreignKey: "route_id", as: "delegates" });
Delegate.hasMany(ProgrammeDelegate, { foreignKey: "delegate_id", as: "programmeDelegates", onDelete: "CASCADE" });
ProgrammeDelegate.belongsTo(Programme, { foreignKey: "programme_id", as: "programme" });
ProgrammeDelegate.belongsTo(Route, { foreignKey: "route_id", as: "route" });
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
Programme.createWithDetails = async function ({ name, startDate, endDate }) {
  const p = await Programme.create({ name, startDate, endDate });
  return { id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, status: p.status };
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
Route.listForProgramme = async function (programmeId) {
  const routes = await Route.findAll({
    where: { programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM programme_delegates WHERE route_id = "Route".id)`), "delegate_count"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id WHERE pd.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
      ],
    },
    order: [["created_at", "ASC"]],
  });
  return routes.map((r) => ({
    id: r.id, programmeId: r.programmeId, name: r.name,
    delegateCount: Number(r.get("delegate_count")), checkedIn: Number(r.get("checked_in")),
  }));
};
Route.createForProgramme = async function (programmeId, name) {
  const r = await Route.create({ programmeId, name });
  return { id: r.id, programmeId: r.programmeId, name: r.name, delegateCount: 0, checkedIn: 0 };
};
Route.updateForProgramme = async function (routeId, programmeId, body) {
  const { name, addDelegateIds, removeDelegateIds } = body;
  if (!(await Route.findOne({ where: { id: routeId, programmeId } }))) return null;
  if (name !== undefined) await Route.update({ name }, { where: { id: routeId } });
  if (addDelegateIds?.length > 0) await ProgrammeDelegate.update({ routeId }, { where: { programmeId, delegateId: addDelegateIds } });
  if (removeDelegateIds?.length > 0) await ProgrammeDelegate.update({ routeId: null }, { where: { programmeId, delegateId: removeDelegateIds, routeId } });
  const r = await Route.findByPk(routeId, {
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM programme_delegates WHERE route_id = "Route".id)`), "delegate_count"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id WHERE pd.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
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

// ProgrammeDelegate
ProgrammeDelegate.listForProgramme = async function (programmeId) {
  const rows = await ProgrammeDelegate.findAll({
    where: { programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(SELECT status FROM attendance_records WHERE programme_id = "ProgrammeDelegate"."programme_id" AND delegate_id = "ProgrammeDelegate"."delegate_id" LIMIT 1)`), "attendance_status"],
        [sequelize.literal(`(SELECT method FROM attendance_records WHERE programme_id = "ProgrammeDelegate"."programme_id" AND delegate_id = "ProgrammeDelegate"."delegate_id" LIMIT 1)`), "attendance_method"],
        [sequelize.literal(`(SELECT checked_in_at FROM attendance_records WHERE programme_id = "ProgrammeDelegate"."programme_id" AND delegate_id = "ProgrammeDelegate"."delegate_id" LIMIT 1)`), "checked_in_at"],
      ],
    },
    include: [
      { model: Delegate, as: "delegate", attributes: ["id", "name", "badge"], required: true },
      { model: Route, as: "route", attributes: ["id", "name"], required: false },
    ],
    order: [sequelize.literal(`"checked_in_at" DESC NULLS LAST`), sequelize.literal(`"delegate.name" ASC`)],
  });
  return rows.map((r) => ({
    id: r.delegate.id, name: r.delegate.name, badge: r.delegate.badge,
    routeId: r.route?.id || null, routeName: r.route?.name || null,
    status: r.get("attendance_status") || "absent", method: r.get("attendance_method") || null,
    checkedInAt: r.get("checked_in_at") || null, notes: r.notes || "",
  }));
};
ProgrammeDelegate.addDelegates = async function (programmeId, body) {
  const { delegates, delegateIds, delegateId, name, badge, routeId } = body;
  if (delegates && Array.isArray(delegates)) {
    const added = [];
    for (const d of delegates) {
      const [del] = await Delegate.findOrCreate({ where: { name: d.name }, defaults: { name: d.name, badge: d.badge || null } });
      await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId: del.id }, defaults: { programmeId, delegateId: del.id, routeId: d.routeId || routeId || null } });
      added.push({ delegateId: del.id, name: del.name });
    }
    return added;
  }
  if (delegateIds && Array.isArray(delegateIds)) {
    for (const id of delegateIds) {
      await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId: id }, defaults: { programmeId, delegateId: id, routeId: routeId || null } });
    }
    return delegateIds.map((id) => ({ delegateId: id }));
  }
  if (delegateId) {
    await ProgrammeDelegate.findOrCreate({ where: { programmeId, delegateId }, defaults: { programmeId, delegateId, routeId: routeId || null } });
    return [{ delegateId }];
  }
  if (name) {
    const del = await Delegate.create({ name, badge: badge || null });
    await ProgrammeDelegate.create({ programmeId, delegateId: del.id, routeId: routeId || null });
    return [{ delegateId: del.id, name }];
  }
  throw new Error("Provide delegates array, delegateIds, delegateId, or name");
};
ProgrammeDelegate.removeFromProgramme = async function (programmeId, delegateId) {
  await AttendanceRecord.destroy({ where: { programmeId, delegateId } });
  return (await ProgrammeDelegate.destroy({ where: { programmeId, delegateId } })) > 0;
};

// AttendanceRecord
AttendanceRecord.getAttendance = async function (programmeId) {
  const presentRecords = await AttendanceRecord.findAll({ where: { programmeId, status: "present" }, order: [["checked_in_at", "DESC"]] });
  const presentDelegateIds = presentRecords.map((r) => r.delegateId);
  const allPds = await ProgrammeDelegate.findAll({
    where: { programmeId },
    include: [
      { model: Delegate, as: "delegate", attributes: ["id", "name"], required: true },
      { model: Route, as: "route", attributes: ["id", "name"], required: false },
    ],
  });
  const pdByDelegateId = {};
  for (const pd of allPds) pdByDelegateId[pd.delegateId] = pd;
  const present = presentRecords.filter((rec) => pdByDelegateId[rec.delegateId]).map((rec) => {
    const pd = pdByDelegateId[rec.delegateId];
    return { delegateId: rec.delegateId, name: pd.delegate.name, routeId: pd.routeId || null, routeName: pd.route?.name || null, method: rec.method, checkedInAt: rec.checkedInAt, notes: rec.notes };
  });
  const presentSet = new Set(presentDelegateIds);
  const missing = allPds.filter((pd) => !presentSet.has(pd.delegateId)).map((pd) => ({
    delegateId: pd.delegate.id, name: pd.delegate.name, routeId: pd.routeId || null, routeName: pd.route?.name || null, notes: pd.notes || "",
  }));
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
  const routes = await Route.findAll({
    where: { programmeId },
    attributes: {
      include: [
        [sequelize.literal(`(SELECT COUNT(*)::int FROM programme_delegates WHERE route_id = "Route".id)`), "total"],
        [sequelize.literal(`(SELECT COUNT(*)::int FROM attendance_records ar JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id WHERE pd.route_id = "Route".id AND ar.status = 'present')`), "checked_in"],
      ],
    },
    order: [["name", "ASC"]],
  });
  return {
    total, checkedIn, missing: total - checkedIn, unidentified,
    byRoute: routes.map((r) => ({
      routeId: r.id, routeName: r.name, total: Number(r.get("total")), checkedIn: Number(r.get("checked_in")), missing: Number(r.get("total")) - Number(r.get("checked_in")),
    })),
  };
};

// ReadyToDepart
ReadyToDepart.getStatus = async function (programmeId) {
  const r = await ReadyToDepart.findOne({ where: { programmeId }, attributes: ["ready", "toggledBy", "toggledAt"] });
  if (!r) return { ready: false, toggledBy: null, toggledAt: null };
  return { ready: r.ready, toggledBy: r.toggledBy, toggledAt: r.toggledAt };
};
ReadyToDepart.setStatus = async function (programmeId, ready) {
  const [record, created] = await ReadyToDepart.findOrCreate({ where: { programmeId }, defaults: { programmeId, ready, toggledAt: new Date() } });
  if (!created) await record.update({ ready, toggledAt: new Date() });
  return { ready: record.ready, toggledBy: record.toggledBy, toggledAt: record.toggledAt };
};

module.exports = { sequelize, user, messages, attendee, admin, faceEmbeddings, Programme, Route, Delegate, AttendanceRecord, ReadyToDepart, ProgrammeDelegate, Staff, ScanEvent, ChatMessage, OfflineQueue };

