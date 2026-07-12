const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/sequelize');

const Programme = sequelize.define('Programme', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date',
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'end_date',
    },
    status: {
        type: DataTypes.TEXT,
        defaultValue: 'draft',
        validate: { isIn: [['draft', 'active', 'completed']] },
    },
}, {
    tableName: 'programmes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// ── Class methods ──────────────────────────────────────────

Programme.listAll = async function () {
    const rows = await sequelize.query(`
        SELECT p.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE programme_id = p.id)::int AS total_delegates,
            (SELECT COUNT(*) FROM attendance_records WHERE programme_id = p.id AND status = 'present')::int AS checked_in
        FROM programmes p
        ORDER BY p.created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    return rows.map(r => ({
        id: r.id,
        name: r.name,
        startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : r.start_date,
        endDate: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : r.end_date,
        status: r.status,
        totalDelegates: Number(r.total_delegates),
        checkedIn: Number(r.checked_in),
    }));
};

Programme.createWithDetails = async function ({ name, startDate, endDate }) {
    const [row] = await sequelize.query(
        `INSERT INTO programmes (name, start_date, end_date)
         VALUES ($1, $2, $3)
         RETURNING id, name, start_date, end_date, status`,
        { bind: [name, startDate, endDate], type: sequelize.QueryTypes.SELECT }
    );
    return {
        id: row.id, name: row.name,
        startDate: row.start_date, endDate: row.end_date,
        status: row.status,
    };
};

Programme.updateWithDetails = async function (id, body) {
    const { name, startDate, endDate, addDelegateIds, removeDelegateIds } = body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(startDate); }
    if (endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(endDate); }

    if (fields.length > 0) {
        values.push(id);
        await sequelize.query(
            `UPDATE programmes SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx}`,
            { bind: values }
        );
    }

    if (addDelegateIds?.length > 0) {
        for (const delegateId of addDelegateIds) {
            await sequelize.query(
                `INSERT INTO programme_delegates (programme_id, delegate_id)
                 VALUES ($1, $2) ON CONFLICT (programme_id, delegate_id) DO NOTHING`,
                { bind: [id, delegateId] }
            );
        }
    }

    if (removeDelegateIds?.length > 0) {
        await sequelize.query(
            `DELETE FROM programme_delegates WHERE programme_id = $1 AND delegate_id = ANY($2)`,
            { bind: [id, removeDelegateIds] }
        );
    }

    const [row] = await sequelize.query(`
        SELECT p.*,
            (SELECT COUNT(*) FROM programme_delegates WHERE programme_id = p.id)::int AS total_delegates,
            (SELECT COUNT(*) FROM attendance_records WHERE programme_id = p.id AND status = 'present')::int AS checked_in
        FROM programmes p WHERE p.id = $1
    `, { bind: [id], type: sequelize.QueryTypes.SELECT });

    if (!row) return null;
    return {
        id: row.id, name: row.name,
        startDate: row.start_date, endDate: row.end_date,
        status: row.status,
        totalDelegates: Number(row.total_delegates),
        checkedIn: Number(row.checked_in),
    };
};

Programme.removeById = async function (id) {
    const result = await sequelize.query(
        'DELETE FROM programmes WHERE id = $1',
        { bind: [id] }
    );
    return result[1]?.rowCount > 0;
};

module.exports = Programme;
