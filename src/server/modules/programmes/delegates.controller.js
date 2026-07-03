const pool = require('../../database/pool');

async function listDelegates(req, res) {
    const { id } = req.params;
    const result = await pool.query(`
        SELECT d.id, d.name, d.badge, pd.route_id, r.name AS route_name,
               pd.notes,
               ar.status AS attendance_status, ar.method, ar.checked_in_at
        FROM programme_delegates pd
        JOIN delegates d ON d.id = pd.delegate_id
        LEFT JOIN routes r ON r.id = pd.route_id
        LEFT JOIN attendance_records ar ON ar.delegate_id = pd.delegate_id AND ar.programme_id = pd.programme_id
        WHERE pd.programme_id = $1
        ORDER BY ar.checked_in_at NULLS LAST, d.name
    `, [id]);

    res.json(result.rows.map(r => ({
        id: r.id, name: r.name, badge: r.badge,
        routeId: r.route_id, routeName: r.route_name,
        status: r.attendance_status || 'absent',
        method: r.method, checkedInAt: r.checked_in_at,
        notes: r.notes || '',
    })));
}

async function addDelegates(req, res) {
    const { id } = req.params;
    const { delegates, delegateId, name, badge, routeId } = req.body;

    const programmeExists = await pool.query('SELECT id FROM programmes WHERE id = $1', [id]);
    if (programmeExists.rowCount === 0) return res.status(404).json({ error: 'Programme not found' });

    if (delegates && Array.isArray(delegates)) {
        const added = [];
        for (const d of delegates) {
            const delResult = await pool.query(
                'INSERT INTO delegates (name, badge) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
                [d.name, d.badge || null]
            );
            if (delResult.rowCount > 0) {
                const delegateId = delResult.rows[0].id;
                await pool.query(
                    'INSERT INTO programme_delegates (programme_id, delegate_id, route_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                    [id, delegateId, d.routeId || routeId || null]
                );
                added.push({ delegateId, name: d.name });
            }
        }
        return res.status(201).json({ added });
    }

    if (delegateId) {
        await pool.query(
            `INSERT INTO programme_delegates (programme_id, delegate_id, route_id)
             VALUES ($1, $2, $3) ON CONFLICT (programme_id, delegate_id) DO NOTHING`,
            [id, delegateId, routeId || null]
        );
        return res.status(201).json({ delegateId });
    }

    if (name) {
        const delResult = await pool.query(
            'INSERT INTO delegates (name, badge) VALUES ($1, $2) RETURNING id',
            [name, badge || null]
        );
        const newId = delResult.rows[0].id;
        await pool.query(
            'INSERT INTO programme_delegates (programme_id, delegate_id, route_id) VALUES ($1, $2, $3)',
            [id, newId, routeId || null]
        );
        return res.status(201).json({ delegateId: newId, name });
    }

    res.status(400).json({ error: 'Provide delegates array, delegateId, or name' });
}

async function removeDelegate(req, res) {
    const { id, delegateId } = req.params;
    await pool.query(
        'DELETE FROM attendance_records WHERE programme_id = $1 AND delegate_id = $2',
        [id, delegateId]
    );
    const result = await pool.query(
        'DELETE FROM programme_delegates WHERE programme_id = $1 AND delegate_id = $2',
        [id, delegateId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Delegate not found in programme' });
    res.status(204).send();
}

module.exports = { listDelegates, addDelegates, removeDelegate };
