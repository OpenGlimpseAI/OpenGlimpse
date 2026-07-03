const pool = require('../../database/pool');

function fmtDate(d) {
    return d instanceof Date ? d.toISOString().split('T')[0] : d;
}

async function list(req, res) {
    const result = await pool.query(`
        SELECT p.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE programme_id = p.id)::int AS total_delegates,
            (SELECT COUNT(*) FROM attendance_records WHERE programme_id = p.id AND status = 'present')::int AS checked_in
        FROM programmes p
        ORDER BY p.created_at DESC
    `);
    res.json(result.rows.map(r => ({
        id: r.id,
        name: r.name,
        startDate: fmtDate(r.start_date),
        endDate: fmtDate(r.end_date),
        status: r.status,
        totalDelegates: r.total_delegates,
        checkedIn: r.checked_in,
    })));
}

async function create(req, res) {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: 'name, startDate, endDate are required' });
    }
    const result = await pool.query(
        `INSERT INTO programmes (name, start_date, end_date) VALUES ($1, $2, $3)
         RETURNING id, name, start_date, end_date, status`,
        [name, startDate, endDate]
    );
    const r = result.rows[0];
    res.status(201).json({
        id: r.id, name: r.name, startDate: r.start_date,
        endDate: r.end_date, status: r.status,
    });
}

async function update(req, res) {
    const { id } = req.params;
    const { name, startDate, endDate, addDelegateIds, removeDelegateIds } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(startDate); }
    if (endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(endDate); }

    if (fields.length > 0) {
        values.push(id);
        await pool.query(
            `UPDATE programmes SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx}`,
            values
        );
    }

    if (addDelegateIds?.length > 0) {
        for (const delegateId of addDelegateIds) {
            await pool.query(
                `INSERT INTO programme_delegates (programme_id, delegate_id)
                 VALUES ($1, $2) ON CONFLICT (programme_id, delegate_id) DO NOTHING`,
                [id, delegateId]
            );
        }
    }

    if (removeDelegateIds?.length > 0) {
        await pool.query(
            `DELETE FROM programme_delegates WHERE programme_id = $1 AND delegate_id = ANY($2)`,
            [id, removeDelegateIds]
        );
    }

    const result = await pool.query(`
        SELECT p.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE programme_id = p.id)::int AS total_delegates,
            (SELECT COUNT(*) FROM attendance_records WHERE programme_id = p.id AND status = 'present')::int AS checked_in
        FROM programmes p WHERE p.id = $1
    `, [id]);
    const r = result.rows[0];
    if (!r) return res.status(404).json({ error: 'Programme not found' });
    res.json({
        id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date,
        status: r.status, totalDelegates: r.total_delegates, checkedIn: r.checked_in,
    });
}

async function remove(req, res) {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM programmes WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Programme not found' });
    res.status(204).send();
}

module.exports = { list, create, update, remove };
