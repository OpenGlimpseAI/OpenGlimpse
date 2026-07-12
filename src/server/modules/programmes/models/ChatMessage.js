const { DataTypes } = require("sequelize");
const sequelize = require("../../../database/sequelize");

const ChatMessage = sequelize.define("ChatMessage", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  programmeId: {
    type: DataTypes.UUID,
    field: "programme_id",
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: "sender_id",
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: "sent_at",
  },
}, {
  tableName: "chat_messages",
  timestamps: false,
});

module.exports = ChatMessage;
