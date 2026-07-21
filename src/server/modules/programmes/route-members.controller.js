const { RouteMember, Route } = require('./models');

async function setRouteMembers(req, res) {
    const { id, delegateId } = req.params;
    const { routeIds } = req.body;
    if (!Array.isArray(routeIds)) {
        return res.status(400).json({ error: 'routeIds must be an array' });
    }
    // One route per delegate: only the first routeId is used
    if (routeIds.length > 1) {
        return res.status(400).json({ error: 'Each delegate can only be assigned to one route' });
    }
    try {
        const targetRouteId = routeIds[0] || null;

        if (targetRouteId) {
            // Verify routeId belongs to this programme
            const route = await Route.findOne({ where: { id: targetRouteId, programmeId: id } });
            if (!route) {
                return res.status(400).json({ error: `Invalid routeId: ${targetRouteId}` });
            }
            // Move delegate to this route (remove from any other)
            await RouteMember.destroy({ where: { programmeId: id, delegateId } });
            await RouteMember.create({ routeId: targetRouteId, delegateId, programmeId: id });
        } else {
            // Remove from all routes
            await RouteMember.destroy({ where: { programmeId: id, delegateId } });
        }

        const routes = await RouteMember.findAll({
            where: { programmeId: id, delegateId },
            include: [{ model: Route, as: 'route', attributes: ['id', 'name'] }],
        });
        res.json({
            delegateId,
            routeIds: routes.map((rm) => rm.routeId),
            routeNames: routes.map((rm) => rm.route?.name).filter(Boolean),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getRouteMembers(req, res) {
    const { id, delegateId } = req.params;
    try {
        const routes = await RouteMember.findAll({
            where: { programmeId: id, delegateId },
            include: [{ model: Route, as: 'route', attributes: ['id', 'name'] }],
        });
        res.json({
            delegateId,
            routeIds: routes.map((rm) => rm.routeId),
            routeNames: routes.map((rm) => rm.route?.name).filter(Boolean),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { setRouteMembers, getRouteMembers };
