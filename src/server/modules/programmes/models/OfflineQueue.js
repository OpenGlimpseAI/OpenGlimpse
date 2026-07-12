const { DataTypes } = require("sequelize");
const sequelize = require("../../../database/sequelize");

const OfflineQueue = sequelize.define("OfflineQueue", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  scanId: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
    field: "scan_id",
  },
  deviceId: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: "device_id",
  },
  programmeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: "programme_id",
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  syncedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: "synced_at",
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "offline_queue",
  timestamps: false,
});

module.exports = OfflineQueue;
