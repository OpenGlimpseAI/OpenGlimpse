const { ReadyToDepart } = require('./models');

async function getStatus(req, res) {
    const { id, routeId } = req.params;
    try {
        const status = await ReadyToDepart.getStatus(routeId);
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function toggleStatus(req, res) {
    const { id, routeId } = req.params;
    const { ready } = req.body;
    if (typeof ready !== 'boolean') {
        return res.status(400).json({ error: 'ready must be a boolean' });
    }
    try {
        const status = await ReadyToDepart.setStatus(routeId, id, ready);
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getStatus, toggleStatus };
