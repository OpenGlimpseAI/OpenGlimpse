const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/sequelize');

const AttendanceRecord = sequelize.define('AttendanceRecord', {
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
    status: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { isIn: [['present', 'absent']] },
    },
    method: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { isIn: [['auto', 'manual']] },
    },
    checkedInAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'checked_in_at',
    },
    checkedInBy: {
        type: DataTypes.UUID,
        field: 'checked_in_by',
    },
    notes: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
}, {
    tableName: 'attendance_records',
    timestamps: false,
    indexes: [
        { fields: ['programme_id'] },
        { fields: ['delegate_id'] },
    ],
});

// ── Class methods ──────────────────────────────────────────

AttendanceRecord.getAttendance = async function (programmeId) {
    const present = await sequelize.query(`
        SELECT d.id, d.name, pd.route_id, r.name AS route_name,
               ar.method, ar.checked_in_at, ar.notes
        FROM attendance_records ar
        JOIN delegates d ON d.id = ar.delegate_id
        LEFT JOIN programme_delegates pd ON pd.delegate_id = d.id AND pd.programme_id = ar.programme_id
        LEFT JOIN routes r ON r.id = pd.route_id
        WHERE ar.programme_id = $1 AND ar.status = 'present'
        ORDER BY ar.checked_in_at DESC
    `, { bind: [programmeId], type: sequelize.QueryTypes.SELECT });

    const missing = await sequelize.query(`
        SELECT d.id, d.name, pd.route_id, r.name AS route_name, pd.notes
        FROM programme_delegates pd
        JOIN delegates d ON d.id = pd.delegate_id
        LEFT JOIN routes r ON r.id = pd.route_id
        WHERE pd.programme_id = $1
          AND NOT EXISTS (
              SELECT 1 FROM attendance_records ar
              WHERE ar.programme_id = pd.programme_id AND ar.delegate_id = pd.delegate_id AND ar.status = 'present'
          )
        ORDER BY d.name
    `, { bind: [programmeId], type: sequelize.QueryTypes.SELECT });

    const unidentified = await sequelize.query(`
        SELECT id AS scan_id, scanned_at
        FROM scan_events
        WHERE programme_id = $1 AND status = 'unverified'
        ORDER BY scanned_at DESC
    `, { bind: [programmeId], type: sequelize.QueryTypes.SELECT });

    return {
        present: present.map(r => ({
            delegateId: r.id, name: r.name, routeName: r.route_name,
            method: r.method, checkedInAt: r.checked_in_at, notes: r.notes,
        })),
        missing: missing.map(r => ({
            delegateId: r.id, name: r.name, routeName: r.route_name, notes: r.notes || '',
        })),
        unidentified: unidentified.map(r => ({
            scanId: r.scan_id, scannedAt: r.scanned_at,
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

    const [membership] = await sequelize.query(
        'SELECT 1 FROM programme_delegates WHERE programme_id = $1 AND delegate_id = $2',
        { bind: [programmeId, delegateId], type: sequelize.QueryTypes.SELECT }
    );
    if (!membership) {
        throw new Error('Delegate is not in this programme');
    }

    const [row] = await sequelize.query(`
        INSERT INTO attendance_records (programme_id, delegate_id, status, method, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (programme_id, delegate_id)
        DO UPDATE SET status = $3, method = COALESCE($4, attendance_records.method),
                      checked_in_at = now(), notes = COALESCE($5, attendance_records.notes)
        RETURNING id, programme_id, delegate_id, status, method, checked_in_at
    `, { bind: [programmeId, delegateId, status, method || 'manual', notes || ''], type: sequelize.QueryTypes.SELECT });

    const [nameRow] = await sequelize.query(
        'SELECT name FROM delegates WHERE id = $1',
        { bind: [delegateId], type: sequelize.QueryTypes.SELECT }
    );
    const delegateName = nameRow?.name || '';

    const payload = {
        programmeId: row.programme_id,
        delegateId: row.delegate_id,
        name: delegateName,
        status: row.status,
        method: row.method,
        checkedInAt: row.checked_in_at,
    };

    if (io) {
        io.to(`programme:${programmeId}`).emit('attendance:updated', payload);
    }

    return payload;
};

AttendanceRecord.getSummary = async function (programmeId) {
    const [totalRow] = await sequelize.query(
        'SELECT COUNT(*)::int AS count FROM programme_delegates WHERE programme_id = $1',
        { bind: [programmeId], type: sequelize.QueryTypes.SELECT }
    );
    const [checkedRow] = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM attendance_records
         WHERE programme_id = $1 AND status = 'present'`,
        { bind: [programmeId], type: sequelize.QueryTypes.SELECT }
    );
    const [unidRow] = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM scan_events
         WHERE programme_id = $1 AND status = 'unverified'`,
        { bind: [programmeId], type: sequelize.QueryTypes.SELECT }
    );

    const byRoute = await sequelize.query(`
        SELECT r.id AS route_id, r.name AS route_name,
            COUNT(pd.id)::int AS total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present')::int AS checked_in
        FROM routes r
        LEFT JOIN programme_delegates pd ON pd.route_id = r.id
        LEFT JOIN attendance_records ar ON ar.delegate_id = pd.delegate_id AND ar.programme_id = pd.programme_id
        WHERE r.programme_id = $1
        GROUP BY r.id, r.name
        ORDER BY r.name
    `, { bind: [programmeId], type: sequelize.QueryTypes.SELECT });

    const total = Number(totalRow.count);
    const checkedIn = Number(checkedRow.count);

    return {
        total,
        checkedIn,
        missing: total - checkedIn,
        unidentified: Number(unidRow.count),
        byRoute: byRoute.map(r => ({
            routeId: r.route_id, routeName: r.route_name,
            total: Number(r.total), checkedIn: Number(r.checked_in),
            missing: Number(r.total) - Number(r.checked_in),
        })),
    };
};

module.exports = AttendanceRecord;
