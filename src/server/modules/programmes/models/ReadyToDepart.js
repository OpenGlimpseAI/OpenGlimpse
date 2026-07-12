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
    const [row] = await sequelize.query(
        'SELECT ready, toggled_by, toggled_at FROM ready_to_depart WHERE programme_id = $1',
        { bind: [programmeId], type: sequelize.QueryTypes.SELECT }
    );
    if (!row) return { ready: false, toggledBy: null, toggledAt: null };
    return { ready: row.ready, toggledBy: row.toggled_by, toggledAt: row.toggled_at };
};

ReadyToDepart.setStatus = async function (programmeId, ready) {
    const [row] = await sequelize.query(`
        INSERT INTO ready_to_depart (programme_id, ready, toggled_at)
        VALUES ($1, $2, now())
        ON CONFLICT (programme_id)
        DO UPDATE SET ready = $2, toggled_at = now()
        RETURNING ready, toggled_by, toggled_at
    `, { bind: [programmeId, ready], type: sequelize.QueryTypes.SELECT });
    return { ready: row.ready, toggledBy: row.toggled_by, toggledAt: row.toggled_at };
};

module.exports = ReadyToDepart;
