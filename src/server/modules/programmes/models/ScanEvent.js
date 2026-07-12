const { DataTypes } = require("sequelize");
const sequelize = require("../../../database/sequelize");

const ScanEvent = sequelize.define("ScanEvent", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  programmeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: "programme_id",
  },
  delegateId: {
    type: DataTypes.UUID,
    field: "delegate_id",
  },
  confidence: {
    type: DataTypes.REAL,
  },
  status: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { isIn: [["verified", "unverified"]] },
  },
  unverifiedReason: {
    type: DataTypes.TEXT,
    field: "unverified_reason",
  },
  boundingBoxId: {
    type: DataTypes.TEXT,
    field: "bounding_box_id",
  },
  scannedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: "scanned_at",
  },
}, {
  tableName: "scan_events",
  timestamps: false,
});

module.exports = ScanEvent;
