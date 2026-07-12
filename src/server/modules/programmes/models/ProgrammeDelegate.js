const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/sequelize');

const ProgrammeDelegate = sequelize.define('ProgrammeDelegate', {
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
    delegateId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'delegate_id',
    },
    routeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'route_id',
    },
    notes: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
}, {
    tableName: 'programme_delegates',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['programme_id', 'delegate_id'] },
        { fields: ['programme_id'] },
        { fields: ['delegate_id'] },
    ],
});

// ── Class methods ──────────────────────────────────────────

ProgrammeDelegate.listForProgramme = async function (programmeId) {
    const rows = await sequelize.query(`
        SELECT d.id, d.name, d.badge, pd.route_id, r.name AS route_name,
               pd.notes,
               ar.status AS attendance_status, ar.method, ar.checked_in_at
        FROM programme_delegates pd
        JOIN delegates d ON d.id = pd.delegate_id
        LEFT JOIN routes r ON r.id = pd.route_id
        LEFT JOIN attendance_records ar ON ar.delegate_id = pd.delegate_id AND ar.programme_id = pd.programme_id
        WHERE pd.programme_id = $1
        ORDER BY ar.checked_in_at NULLS LAST, d.name
    `, { bind: [programmeId], type: sequelize.QueryTypes.SELECT });

    return rows.map(r => ({
        id: r.id, name: r.name, badge: r.badge,
        routeId: r.route_id, routeName: r.route_name,
        status: r.attendance_status || 'absent',
        method: r.method, checkedInAt: r.checked_in_at,
        notes: r.notes || '',
    }));
};

ProgrammeDelegate.addDelegates = async function (programmeId, body) {
    const { delegates, delegateId, name, badge, routeId } = body;

    if (delegates && Array.isArray(delegates)) {
        const added = [];
        for (const d of delegates) {
            const [delRow] = await sequelize.query(
                'INSERT INTO delegates (name, badge) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
                { bind: [d.name, d.badge || null], type: sequelize.QueryTypes.SELECT }
            );
            if (delRow) {
                await sequelize.query(
                    'INSERT INTO programme_delegates (programme_id, delegate_id, route_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                    { bind: [programmeId, delRow.id, d.routeId || routeId || null] }
                );
                added.push({ delegateId: delRow.id, name: d.name });
            }
        }
        return added;
    }

    if (delegateId) {
        await sequelize.query(
            'INSERT INTO programme_delegates (programme_id, delegate_id, route_id) VALUES ($1, $2, $3) ON CONFLICT (programme_id, delegate_id) DO NOTHING',
            { bind: [programmeId, delegateId, routeId || null] }
        );
        return [{ delegateId }];
    }

    if (name) {
        const [delRow] = await sequelize.query(
            'INSERT INTO delegates (name, badge) VALUES ($1, $2) RETURNING id',
            { bind: [name, badge || null], type: sequelize.QueryTypes.SELECT }
        );
        await sequelize.query(
            'INSERT INTO programme_delegates (programme_id, delegate_id, route_id) VALUES ($1, $2, $3)',
            { bind: [programmeId, delRow.id, routeId || null] }
        );
        return [{ delegateId: delRow.id, name }];
    }

    throw new Error('Provide delegates array, delegateId, or name');
};

ProgrammeDelegate.removeFromProgramme = async function (programmeId, delegateId) {
    await sequelize.query(
        'DELETE FROM attendance_records WHERE programme_id = $1 AND delegate_id = $2',
        { bind: [programmeId, delegateId] }
    );
    const result = await sequelize.query(
        'DELETE FROM programme_delegates WHERE programme_id = $1 AND delegate_id = $2',
        { bind: [programmeId, delegateId] }
    );
    return result[1]?.rowCount > 0;
};

module.exports = ProgrammeDelegate;
