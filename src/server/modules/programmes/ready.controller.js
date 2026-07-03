const pool = require('../../database/pool');

async function getStatus(req, res) {
    const { id } = req.params;
    const result = await pool.query('SELECT ready, toggled_by, toggled_at FROM ready_to_depart WHERE programme_id = $1', [id]);
    if (result.rowCount === 0) {
        return res.json({ ready: false, toggledBy: null, toggledAt: null });
    }
    const r = result.rows[0];
    res.json({ ready: r.ready, toggledBy: r.toggled_by, toggledAt: r.toggled_at });
}

async function toggleStatus(req, res) {
    const { id } = req.params;
    const { ready } = req.body;
    if (typeof ready !== 'boolean') {
        return res.status(400).json({ error: 'ready must be a boolean' });
    }

    const result = await pool.query(`
        INSERT INTO ready_to_depart (programme_id, ready, toggled_at)
        VALUES ($1, $2, now())
        ON CONFLICT (programme_id)
        DO UPDATE SET ready = $2, toggled_at = now()
        RETURNING ready, toggled_by, toggled_at
    `, [id, ready]);

    const r = result.rows[0];
    res.json({ ready: r.ready, toggledBy: r.toggled_by, toggledAt: r.toggled_at });
}

module.exports = { getStatus, toggleStatus };
