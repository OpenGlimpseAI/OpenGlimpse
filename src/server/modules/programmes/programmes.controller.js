const { Programme } = require('./models');

async function list(req, res) {
    try {
        const programmes = await Programme.listAll();
        res.json(programmes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function create(req, res) {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: 'name, startDate, endDate are required' });
    }
    try {
        const programme = await Programme.createWithDetails({ name, startDate, endDate });
        res.status(201).json(programme);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function update(req, res) {
    const { id } = req.params;
    try {
        const programme = await Programme.updateWithDetails(id, req.body);
        if (!programme) return res.status(404).json({ error: 'Programme not found' });
        res.json(programme);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function remove(req, res) {
    const { id } = req.params;
    try {
        const deleted = await Programme.removeById(id);
        if (!deleted) return res.status(404).json({ error: 'Programme not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { list, create, update, remove };
