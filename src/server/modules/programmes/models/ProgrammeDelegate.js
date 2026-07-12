const { ProgrammeDelegate, sequelize } = require('../../../database/db.cjs');

// ── Class methods ──────────────────────────────────────────

ProgrammeDelegate.listForProgramme = async function (programmeId) {
    const { Delegate, Route } = require('../../../database/db.cjs');

    const rows = await ProgrammeDelegate.findAll({
        where: { programmeId },
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT status FROM attendance_records
                        WHERE programme_id = "ProgrammeDelegate"."programme_id"
                          AND delegate_id = "ProgrammeDelegate"."delegate_id"
                        LIMIT 1
                    )`),
                    'attendance_status',
                ],
                [
                    sequelize.literal(`(
                        SELECT method FROM attendance_records
                        WHERE programme_id = "ProgrammeDelegate"."programme_id"
                          AND delegate_id = "ProgrammeDelegate"."delegate_id"
                        LIMIT 1
                    )`),
                    'attendance_method',
                ],
                [
                    sequelize.literal(`(
                        SELECT checked_in_at FROM attendance_records
                        WHERE programme_id = "ProgrammeDelegate"."programme_id"
                          AND delegate_id = "ProgrammeDelegate"."delegate_id"
                        LIMIT 1
                    )`),
                    'checked_in_at',
                ],
            ],
        },
        include: [
            {
                model: Delegate,
                as: 'delegate',
                attributes: ['id', 'name', 'badge'],
                required: true,
            },
            {
                model: Route,
                as: 'route',
                attributes: ['id', 'name'],
                required: false,
            },
        ],
        order: [
            sequelize.literal(`"checked_in_at" DESC NULLS LAST`),
            sequelize.literal(`"delegate.name" ASC`),
        ],
    });

    return rows.map(r => ({
        id: r.delegate.id,
        name: r.delegate.name,
        badge: r.delegate.badge,
        routeId: r.route?.id || null,
        routeName: r.route?.name || null,
        status: r.get('attendance_status') || 'absent',
        method: r.get('attendance_method') || null,
        checkedInAt: r.get('checked_in_at') || null,
        notes: r.notes || '',
    }));
};

ProgrammeDelegate.addDelegates = async function (programmeId, body) {
    const { delegates, delegateIds, delegateId, name, badge, routeId } = body;
    const { Delegate } = require('../../../database/db.cjs');

    if (delegates && Array.isArray(delegates)) {
        const added = [];
        for (const d of delegates) {
            const [del] = await Delegate.findOrCreate({
                where: { name: d.name },
                defaults: { name: d.name, badge: d.badge || null },
            });
            await ProgrammeDelegate.findOrCreate({
                where: { programmeId, delegateId: del.id },
                defaults: { programmeId, delegateId: del.id, routeId: d.routeId || routeId || null },
            });
            added.push({ delegateId: del.id, name: del.name });
        }
        return added;
    }

    if (delegateIds && Array.isArray(delegateIds)) {
        for (const id of delegateIds) {
            await ProgrammeDelegate.findOrCreate({
                where: { programmeId, delegateId: id },
                defaults: { programmeId, delegateId: id, routeId: routeId || null },
            });
        }
        return delegateIds.map(id => ({ delegateId: id }));
    }

    if (delegateId) {
        await ProgrammeDelegate.findOrCreate({
            where: { programmeId, delegateId },
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
    const { AttendanceRecord } = require('../../../database/db.cjs');
    await AttendanceRecord.destroy({
        where: { programmeId, delegateId },
    });
    const count = await ProgrammeDelegate.destroy({
        where: { programmeId, delegateId },
    });
    return count > 0;
};

module.exports = ProgrammeDelegate;
