const pool = require('../../database/pool');

function makeAttendanceController(io) {
    async function getAttendance(req, res) {
        const { id } = req.params;

        const present = await pool.query(`
            SELECT d.id, d.name, pd.route_id, r.name AS route_name,
                   ar.method, ar.checked_in_at, ar.notes
            FROM attendance_records ar
            JOIN delegates d ON d.id = ar.delegate_id
            LEFT JOIN programme_delegates pd ON pd.delegate_id = d.id AND pd.programme_id = ar.programme_id
            LEFT JOIN routes r ON r.id = pd.route_id
            WHERE ar.programme_id = $1 AND ar.status = 'present'
            ORDER BY ar.checked_in_at DESC
        `, [id]);

        const missing = await pool.query(`
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
        `, [id]);

        const unidentified = await pool.query(`
            SELECT id AS scan_id, scanned_at
            FROM scan_events
            WHERE programme_id = $1 AND status = 'unverified'
            ORDER BY scanned_at DESC
        `, [id]);

        res.json({
            present: present.rows.map(r => ({
                delegateId: r.id, name: r.name, routeName: r.route_name,
                method: r.method, checkedInAt: r.checked_in_at, notes: r.notes,
            })),
            missing: missing.rows.map(r => ({
                delegateId: r.id, name: r.name, routeName: r.route_name, notes: r.notes || '',
            })),
            unidentified: unidentified.rows.map(r => ({
                scanId: r.scan_id, scannedAt: r.scanned_at,
            })),
        });
    }

    async function markAttendance(req, res) {
        const { id, delegateId } = req.params;
        const { status, method, notes } = req.body;

        if (!status || !['present', 'absent'].includes(status)) {
            return res.status(400).json({ error: 'status must be "present" or "absent"' });
        }

        if (status === 'present' && !method) {
            return res.status(400).json({ error: 'method is required when marking present' });
        }

        const membership = await pool.query(
            'SELECT 1 FROM programme_delegates WHERE programme_id = $1 AND delegate_id = $2',
            [id, delegateId]
        );
        if (membership.rowCount === 0) {
            return res.status(400).json({ error: 'Delegate is not in this programme' });
        }

        const result = await pool.query(`
            INSERT INTO attendance_records (programme_id, delegate_id, status, method, notes)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (programme_id, delegate_id)
            DO UPDATE SET status = $3, method = COALESCE($4, attendance_records.method),
                          checked_in_at = now(), notes = COALESCE($5, attendance_records.notes)
            RETURNING id, programme_id, delegate_id, status, method, checked_in_at
        `, [id, delegateId, status, method || 'manual', notes || '']);

        const r = result.rows[0];
        const nameResult = await pool.query('SELECT name FROM delegates WHERE id = $1', [delegateId]);
        const delegateName = nameResult.rows[0]?.name || '';

        io.to(`programme:${id}`).emit('attendance:updated', {
            programmeId: r.programme_id,
            delegateId: r.delegate_id,
            name: delegateName,
            status: r.status,
            method: r.method,
            checkedInAt: r.checked_in_at,
        });

        res.json({
            delegateId: r.delegate_id,
            programmeId: r.programme_id,
            status: r.status,
            method: r.method,
            checkedInAt: r.checked_in_at,
        });
    }

    async function getSummary(req, res) {
        const { id } = req.params;

        const total = await pool.query(
            'SELECT COUNT(*)::int AS count FROM programme_delegates WHERE programme_id = $1', [id]
        );
        const checkedIn = await pool.query(
            `SELECT COUNT(*)::int AS count FROM attendance_records
             WHERE programme_id = $1 AND status = 'present'`, [id]
        );
        const unidentified = await pool.query(
            `SELECT COUNT(*)::int AS count FROM scan_events
             WHERE programme_id = $1 AND status = 'unverified'`, [id]
        );

        const byRoute = await pool.query(`
            SELECT r.id AS route_id, r.name AS route_name,
                COUNT(pd.id)::int AS total,
                COUNT(ar.id) FILTER (WHERE ar.status = 'present')::int AS checked_in
            FROM routes r
            LEFT JOIN programme_delegates pd ON pd.route_id = r.id
            LEFT JOIN attendance_records ar ON ar.delegate_id = pd.delegate_id AND ar.programme_id = pd.programme_id
            WHERE r.programme_id = $1
            GROUP BY r.id, r.name
            ORDER BY r.name
        `, [id]);

        res.json({
            total: total.rows[0].count,
            checkedIn: checkedIn.rows[0].count,
            missing: total.rows[0].count - checkedIn.rows[0].count,
            unidentified: unidentified.rows[0].count,
            byRoute: byRoute.rows.map(r => ({
                routeId: r.route_id, routeName: r.route_name,
                total: r.total, checkedIn: r.checked_in,
                missing: r.total - r.checked_in,
            })),
        });
    }

    return { getAttendance, markAttendance, getSummary };
}

module.exports = makeAttendanceController;
