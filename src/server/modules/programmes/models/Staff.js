const { DataTypes } = require("sequelize");
const sequelize = require("../../../database/sequelize");

const Staff = sequelize.define("Staff", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  email: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: "password_hash",
  },
  photoUrl: {
    type: DataTypes.TEXT,
    field: "photo_url",
  },
  role: {
    type: DataTypes.TEXT,
    defaultValue: "staff",
    validate: { isIn: [["admin", "staff"]] },
  },
}, {
  tableName: "staff",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Staff;
