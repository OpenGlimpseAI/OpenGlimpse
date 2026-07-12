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
    const { delegates, delegateIds, delegateId, name, badge, routeId } = body;
    const Delegate = require('./Delegate');

    if (delegates && Array.isArray(delegates)) {
        const added = [];
        for (const d of delegates) {
            const [del] = await Delegate.findOrCreate({
                where: { name: d.name },
                defaults: { name: d.name, badge: d.badge || null },
            });
            await ProgrammeDelegate.findOrCreate({
                where: { programme_id: programmeId, delegate_id: del.id },
                defaults: { programmeId, delegateId: del.id, routeId: d.routeId || routeId || null },
            });
            added.push({ delegateId: del.id, name: del.name });
        }
        return added;
    }

    if (delegateIds && Array.isArray(delegateIds)) {
        for (const id of delegateIds) {
            await ProgrammeDelegate.findOrCreate({
                where: { programme_id: programmeId, delegate_id: id },
                defaults: { programmeId, delegateId: id, routeId: routeId || null },
            });
        }
        return delegateIds.map(id => ({ delegateId: id }));
    }

    if (delegateId) {
        await ProgrammeDelegate.findOrCreate({
            where: { programme_id: programmeId, delegate_id: delegateId },
            defaults: { programmeId, delegateId, routeId: routeId || null },
        });
        return [{ delegateId }];
    }

    if (name) {
        const del = await Delegate.create({ name, badge: badge || null });
        await ProgrammeDelegate.create({ programmeId, delegateId: del.id, routeId: routeId || null });
        return [{ delegateId: del.id, name }];
    }

    throw new Error('Provide delegates array, delegateIds, delegateId, or name');
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
