const { AttendanceRecord, ProgrammeDelegate, sequelize } = require('../../../database/db.cjs');

// ── Class methods ──────────────────────────────────────────

AttendanceRecord.getAttendance = async function (programmeId) {
    const { Delegate, Route, ScanEvent } = require('../../../database/db.cjs');

    const presentRecords = await AttendanceRecord.findAll({
        where: { programmeId, status: 'present' },
        order: [['checked_in_at', 'DESC']],
    });
    const presentDelegateIds = presentRecords.map(r => r.delegateId);

    const allPds = await ProgrammeDelegate.findAll({
        where: { programmeId },
        include: [
            { model: Delegate, as: 'delegate', attributes: ['id', 'name'], required: true },
            { model: Route, as: 'route', attributes: ['id', 'name'], required: false },
        ],
    });

    const pdByDelegateId = {};
    for (const pd of allPds) {
        pdByDelegateId[pd.delegateId] = pd;
    }

    const present = presentRecords
        .filter(rec => pdByDelegateId[rec.delegateId])
        .map(rec => {
            const pd = pdByDelegateId[rec.delegateId];
            return {
                delegateId: rec.delegateId,
                name: pd.delegate.name,
                routeId: pd.routeId || null,
                routeName: pd.route?.name || null,
                method: rec.method,
                checkedInAt: rec.checkedInAt,
                notes: rec.notes,
            };
        });

    const presentSet = new Set(presentDelegateIds);
    const missing = allPds
        .filter(pd => !presentSet.has(pd.delegateId))
        .map(pd => ({
            delegateId: pd.delegate.id,
            name: pd.delegate.name,
            routeId: pd.routeId || null,
            routeName: pd.route?.name || null,
            notes: pd.notes || '',
        }));

    const unidentifiedEvents = await ScanEvent.findAll({
        where: { programmeId, status: 'unverified' },
        attributes: ['id', 'scannedAt'],
        order: [['scanned_at', 'DESC']],
    });

    return {
        present,
        missing,
        unidentified: unidentifiedEvents.map(s => ({
            scanId: s.id,
            scannedAt: s.scannedAt,
        })),
    };
};

/**
 * Mark a delegate present or absent. Returns the record + delegate name.
 * Pass `io` (Socket.IO server) to emit a real-time update.
 */
AttendanceRecord.markAttendance = async function (programmeId, delegateId, { status, method, notes }, io) {
    if (!['present', 'absent'].includes(status)) {
        throw new Error('status must be "present" or "absent"');
    }
    if (status === 'present' && !method) {
        throw new Error('method is required when marking present');
    }

    const membership = await ProgrammeDelegate.findOne({
        where: { programmeId, delegateId },
    });
    if (!membership) {
        throw new Error('Delegate is not in this programme');
    }

    const existing = await AttendanceRecord.findOne({
        where: { programmeId, delegateId },
    });

    let row;
    if (existing) {
        await existing.update({
            status,
            method: method || 'manual',
            notes: notes || '',
            checkedInAt: new Date(),
        });
        row = existing;
    } else {
        row = await AttendanceRecord.create({
            programmeId,
            delegateId,
            status,
            method: method || 'manual',
            notes: notes || '',
            checkedInAt: new Date(),
        });
    }

    const { Delegate } = require('../../../database/db.cjs');
    const delegate = await Delegate.findByPk(delegateId, { attributes: ['name'] });
    const delegateName = delegate?.name || '';

    const payload = {
        programmeId: row.programmeId,
        delegateId: row.delegateId,
        name: delegateName,
        status: row.status,
        method: row.method,
        checkedInAt: row.checkedInAt,
    };

    if (io) {
        io.to(`programme:${programmeId}`).emit('attendance:updated', payload);
    }

    return payload;
};

AttendanceRecord.getSummary = async function (programmeId) {
    const { Route, ScanEvent } = require('../../../database/db.cjs');

    const total = await ProgrammeDelegate.count({ where: { programmeId } });
    const checkedIn = await AttendanceRecord.count({
        where: { programmeId, status: 'present' },
    });
    const unidentified = await ScanEvent.count({
        where: { programmeId, status: 'unverified' },
    });

    const routes = await Route.findAll({
        where: { programmeId },
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)::int FROM programme_delegates
                        WHERE route_id = "Route".id
                    )`),
                    'total',
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
        order: [['name', 'ASC']],
    });

    return {
        total,
        checkedIn,
        missing: total - checkedIn,
        unidentified,
        byRoute: routes.map(r => ({
            routeId: r.id,
            routeName: r.name,
            total: Number(r.get('total')),
            checkedIn: Number(r.get('checked_in')),
            missing: Number(r.get('total')) - Number(r.get('checked_in')),
        })),
    };
};

module.exports = AttendanceRecord;
