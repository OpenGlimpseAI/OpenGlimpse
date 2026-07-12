const { Programme, sequelize } = require('../../../database/db.cjs');

// ── Class methods ──────────────────────────────────────────

Programme.listAll = async function () {
    const programmes = await Programme.findAll({
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM programme_delegates
                        WHERE programme_id = "Programme".id
                    )`),
                    'total_delegates',
                ],
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM attendance_records
                        WHERE programme_id = "Programme".id AND status = 'present'
                    )`),
                    'checked_in',
                ],
            ],
        },
        order: [['created_at', 'DESC']],
    });

    return programmes.map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        totalDelegates: Number(p.get('total_delegates')),
        checkedIn: Number(p.get('checked_in')),
    }));
};

Programme.createWithDetails = async function ({ name, startDate, endDate }) {
    const programme = await Programme.create({ name, startDate, endDate });
    return {
        id: programme.id,
        name: programme.name,
        startDate: programme.startDate,
        endDate: programme.endDate,
        status: programme.status,
    };
};

Programme.updateWithDetails = async function (id, body) {
    const { name, startDate, endDate, addDelegateIds, removeDelegateIds } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;

    if (Object.keys(updateData).length > 0) {
        await Programme.update(updateData, { where: { id } });
    }

    if (addDelegateIds?.length > 0) {
        const { ProgrammeDelegate } = require('../../../database/db.cjs');
        const records = addDelegateIds.map(delegateId => ({
            programmeId: id,
            delegateId,
        }));
        await ProgrammeDelegate.bulkCreate(records, { ignoreDuplicates: true });
    }

    if (removeDelegateIds?.length > 0) {
        const { ProgrammeDelegate } = require('../../../database/db.cjs');
        await ProgrammeDelegate.destroy({
            where: { programmeId: id, delegateId: removeDelegateIds },
        });
    }

    const programme = await Programme.findByPk(id, {
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM programme_delegates
                        WHERE programme_id = "Programme".id
                    )`),
                    'total_delegates',
                ],
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM attendance_records
                        WHERE programme_id = "Programme".id AND status = 'present'
                    )`),
                    'checked_in',
                ],
            ],
        },
    });

    if (!programme) return null;
    return {
        id: programme.id,
        name: programme.name,
        startDate: programme.startDate,
        endDate: programme.endDate,
        status: programme.status,
        totalDelegates: Number(programme.get('total_delegates')),
        checkedIn: Number(programme.get('checked_in')),
    };
};

Programme.removeById = async function (id) {
    const count = await Programme.destroy({ where: { id } });
    return count > 0;
};

module.exports = Programme;
