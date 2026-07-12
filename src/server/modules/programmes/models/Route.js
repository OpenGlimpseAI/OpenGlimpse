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
    const routes = await Route.findAll({
        where: { programmeId },
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM programme_delegates
                        WHERE route_id = "Route".id
                    )`),
                    'delegate_count',
                ],
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM attendance_records ar
                        JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id
                                                   AND pd.programme_id = ar.programme_id
                        WHERE pd.route_id = "Route".id AND ar.status = 'present'
                    )`),
                    'checked_in',
                ],
            ],
        },
        order: [['created_at', 'ASC']],
    });

    return routes.map(r => ({
        id: r.id,
        programmeId: r.programmeId,
        name: r.name,
        delegateCount: Number(r.get('delegate_count')),
        checkedIn: Number(r.get('checked_in')),
    }));
};

Route.createForProgramme = async function (programmeId, name) {
    const route = await Route.create({ programmeId, name });
    return {
        id: route.id,
        programmeId: route.programmeId,
        name: route.name,
        delegateCount: 0,
        checkedIn: 0,
    };
};

Route.updateForProgramme = async function (routeId, programmeId, body) {
    const { name, addDelegateIds, removeDelegateIds } = body;

    const route = await Route.findOne({ where: { id: routeId, programmeId } });
    if (!route) return null;

    if (name !== undefined) {
        await Route.update({ name }, { where: { id: routeId } });
    }

    if (addDelegateIds?.length > 0) {
        const ProgrammeDelegate = require('./ProgrammeDelegate');
        await ProgrammeDelegate.update(
            { routeId },
            { where: { programmeId, delegateId: addDelegateIds } }
        );
    }

    if (removeDelegateIds?.length > 0) {
        const ProgrammeDelegate = require('./ProgrammeDelegate');
        await ProgrammeDelegate.update(
            { routeId: null },
            { where: { programmeId, delegateId: removeDelegateIds, routeId } }
        );
    }

    const updated = await Route.findByPk(routeId, {
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM programme_delegates
                        WHERE route_id = "Route".id
                    )`),
                    'delegate_count',
                ],
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM attendance_records ar
                        JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id
                                                   AND pd.programme_id = ar.programme_id
                        WHERE pd.route_id = "Route".id AND ar.status = 'present'
                    )`),
                    'checked_in',
                ],
            ],
        },
    });

    return {
        id: updated.id,
        programmeId: updated.programmeId,
        name: updated.name,
        delegateCount: Number(updated.get('delegate_count')),
        checkedIn: Number(updated.get('checked_in')),
    };
};

Route.removeById = async function (routeId, programmeId) {
    const count = await Route.destroy({ where: { id: routeId, programmeId } });
    return count > 0;
};

module.exports = Route;
