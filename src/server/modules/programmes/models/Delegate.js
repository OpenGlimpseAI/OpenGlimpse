const { DataTypes } = require("sequelize");
const sequelize = require("../../../database/sequelize");

const Delegate = sequelize.define("Delegate", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  badge: {
    type: DataTypes.TEXT,
  },
  photoUrl: {
    type: DataTypes.TEXT,
    field: "photo_url",
  },
}, {
  tableName: "delegates",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Delegate;
