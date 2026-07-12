const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/sequelize');

const Route = sequelize.define('Route', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    programmeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'programme_id',
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: 'routes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

// ── Class methods ──────────────────────────────────────────

Route.listForProgramme = async function (programmeId) {
    const rows = await sequelize.query(`
        SELECT r.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE route_id = r.id)::int AS delegate_count,
            (SELECT COUNT(*) FROM attendance_records ar
             JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id
             WHERE pd.route_id = r.id AND ar.status = 'present')::int AS checked_in
        FROM routes r WHERE r.programme_id = $1 ORDER BY r.created_at
    `, { bind: [programmeId], type: sequelize.QueryTypes.SELECT });

    return rows.map(r => ({
        id: r.id, programmeId: r.programme_id, name: r.name,
        delegateCount: Number(r.delegate_count), checkedIn: Number(r.checked_in),
    }));
};

Route.createForProgramme = async function (programmeId, name) {
    const [row] = await sequelize.query(
        `INSERT INTO routes (programme_id, name) VALUES ($1, $2)
         RETURNING id, programme_id, name`,
        { bind: [programmeId, name], type: sequelize.QueryTypes.SELECT }
    );
    return {
        id: row.id, programmeId: row.programme_id, name: row.name,
        delegateCount: 0, checkedIn: 0,
    };
};

Route.updateForProgramme = async function (routeId, programmeId, body) {
    const { name, addDelegateIds, removeDelegateIds } = body;

    const [existing] = await sequelize.query(
        'SELECT id FROM routes WHERE id = $1 AND programme_id = $2',
        { bind: [routeId, programmeId], type: sequelize.QueryTypes.SELECT }
    );
    if (!existing) return null;

    if (name !== undefined) {
        await sequelize.query(
            'UPDATE routes SET name = $1 WHERE id = $2',
            { bind: [name, routeId] }
        );
    }

    if (addDelegateIds?.length > 0) {
        for (const delegateId of addDelegateIds) {
            await sequelize.query(
                'UPDATE programme_delegates SET route_id = $1 WHERE programme_id = $2 AND delegate_id = $3',
                { bind: [routeId, programmeId, delegateId] }
            );
        }
    }

    if (removeDelegateIds?.length > 0) {
        await sequelize.query(
            `UPDATE programme_delegates SET route_id = NULL
             WHERE programme_id = $1 AND delegate_id = ANY($2) AND route_id = $3`,
            { bind: [programmeId, removeDelegateIds, routeId] }
        );
    }

    const [row] = await sequelize.query(`
        SELECT r.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE route_id = r.id)::int AS delegate_count,
            (SELECT COUNT(*) FROM attendance_records ar
             JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id
             WHERE pd.route_id = r.id AND ar.status = 'present')::int AS checked_in
        FROM routes r WHERE r.id = $1
    `, { bind: [routeId], type: sequelize.QueryTypes.SELECT });

    return {
        id: row.id, programmeId: row.programme_id, name: row.name,
        delegateCount: Number(row.delegate_count), checkedIn: Number(row.checked_in),
    };
};

Route.removeById = async function (routeId, programmeId) {
    const result = await sequelize.query(
        'DELETE FROM routes WHERE id = $1 AND programme_id = $2',
        { bind: [routeId, programmeId] }
    );
    return result[1]?.rowCount > 0;
};

module.exports = Route;
