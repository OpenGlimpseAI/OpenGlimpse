const { Route } = require('./models');

async function addRoute(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    try {
        // Check programme exists
        const { Programme } = require('./models');
        const existing = await Programme.findByPk(id);
        if (!existing) return res.status(404).json({ error: 'Programme not found' });

        const route = await Route.createForProgramme(id, name);
        res.status(201).json(route);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateRoute(req, res) {
    const { id, routeId } = req.params;
    try {
        const route = await Route.updateForProgramme(routeId, id, req.body);
        if (!route) return res.status(404).json({ error: 'Route not found' });
        res.json(route);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function removeRoute(req, res) {
    const { id, routeId } = req.params;
    try {
        const deleted = await Route.removeById(routeId, id);
        if (!deleted) return res.status(404).json({ error: 'Route not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function listRoutes(req, res) {
    const { id } = req.params;
    try {
        const routes = await Route.listForProgramme(id);
        res.json(routes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { addRoute, updateRoute, removeRoute, listRoutes };
