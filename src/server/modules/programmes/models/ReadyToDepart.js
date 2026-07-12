const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/sequelize');

const ReadyToDepart = sequelize.define('ReadyToDepart', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    programmeId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: 'programme_id',
    },
    ready: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    toggledBy: {
        type: DataTypes.UUID,
        field: 'toggled_by',
    },
    toggledAt: {
        type: DataTypes.DATE,
        field: 'toggled_at',
    },
}, {
    tableName: 'ready_to_depart',
    timestamps: false,
});

// ── Class methods ──────────────────────────────────────────

ReadyToDepart.getStatus = async function (programmeId) {
    const record = await ReadyToDepart.findOne({
        where: { programmeId },
        attributes: ['ready', 'toggledBy', 'toggledAt'],
    });
    if (!record) return { ready: false, toggledBy: null, toggledAt: null };
    return { ready: record.ready, toggledBy: record.toggledBy, toggledAt: record.toggledAt };
};

ReadyToDepart.setStatus = async function (programmeId, ready) {
    const [record, created] = await ReadyToDepart.findOrCreate({
        where: { programmeId },
        defaults: { programmeId, ready, toggledAt: new Date() },
    });
    if (!created) {
        await record.update({ ready, toggledAt: new Date() });
    }
    return { ready: record.ready, toggledBy: record.toggledBy, toggledAt: record.toggledAt };
};

module.exports = ReadyToDepart;
