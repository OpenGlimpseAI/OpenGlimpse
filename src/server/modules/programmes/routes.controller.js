const pool = require('../../database/pool');

async function addRoute(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const exists = await pool.query('SELECT id FROM programmes WHERE id = $1', [id]);
    if (exists.rowCount === 0) return res.status(404).json({ error: 'Programme not found' });

    const result = await pool.query(
        `INSERT INTO routes (programme_id, name) VALUES ($1, $2)
         RETURNING id, programme_id, name`,
        [id, name]
    );
    const r = result.rows[0];
    res.status(201).json({ id: r.id, programmeId: r.programme_id, name: r.name, delegateCount: 0, checkedIn: 0 });
}

async function updateRoute(req, res) {
    const { id, routeId } = req.params;
    const { name, addDelegateIds, removeDelegateIds } = req.body;

    const routeExists = await pool.query('SELECT id FROM routes WHERE id = $1 AND programme_id = $2', [routeId, id]);
    if (routeExists.rowCount === 0) return res.status(404).json({ error: 'Route not found' });

    if (name !== undefined) {
        await pool.query('UPDATE routes SET name = $1 WHERE id = $2', [name, routeId]);
    }

    if (addDelegateIds?.length > 0) {
        for (const delegateId of addDelegateIds) {
            await pool.query(
                `UPDATE programme_delegates SET route_id = $1
                 WHERE programme_id = $2 AND delegate_id = $3`,
                [routeId, id, delegateId]
            );
        }
    }

    if (removeDelegateIds?.length > 0) {
        await pool.query(
            `UPDATE programme_delegates SET route_id = NULL
             WHERE programme_id = $1 AND delegate_id = ANY($2) AND route_id = $3`,
            [id, removeDelegateIds, routeId]
        );
    }

    const result = await pool.query(`
        SELECT r.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE route_id = r.id)::int AS delegate_count,
            (SELECT COUNT(*) FROM attendance_records ar
             JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id
             WHERE pd.route_id = r.id AND ar.status = 'present')::int AS checked_in
        FROM routes r WHERE r.id = $1
    `, [routeId]);
    const r = result.rows[0];
    res.json({ id: r.id, programmeId: r.programme_id, name: r.name, delegateCount: r.delegate_count, checkedIn: r.checked_in });
}

async function removeRoute(req, res) {
    const { id, routeId } = req.params;
    const result = await pool.query('DELETE FROM routes WHERE id = $1 AND programme_id = $2', [routeId, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Route not found' });
    res.status(204).send();
}

async function listRoutes(req, res) {
    const { id } = req.params;
    const result = await pool.query(`
        SELECT r.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE route_id = r.id)::int AS delegate_count,
            (SELECT COUNT(*) FROM attendance_records ar
             JOIN programme_delegates pd ON pd.delegate_id = ar.delegate_id AND pd.programme_id = ar.programme_id
             WHERE pd.route_id = r.id AND ar.status = 'present')::int AS checked_in
        FROM routes r WHERE r.programme_id = $1 ORDER BY r.created_at
    `, [id]);
    res.json(result.rows.map(r => ({
        id: r.id, programmeId: r.programme_id, name: r.name,
        delegateCount: r.delegate_count, checkedIn: r.checked_in,
    })));
}

module.exports = { addRoute, updateRoute, removeRoute, listRoutes };
