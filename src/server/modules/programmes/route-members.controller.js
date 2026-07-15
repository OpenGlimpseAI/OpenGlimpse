const { RouteMember, Route } = require('./models');

async function setRouteMembers(req, res) {
    const { id, delegateId } = req.params;
    const { routeIds } = req.body;
    if (!Array.isArray(routeIds)) {
        return res.status(400).json({ error: 'routeIds must be an array' });
    }
    try {
        // Verify routeIds belong to this programme
        const validIds = new Set(
            (await Route.findAll({ where: { programmeId: id }, attributes: ['id'] })).map((r) => r.id)
        );
        const toAdd = routeIds.filter((rid) => validIds.has(rid));
        const toRemove = routeIds.filter((rid) => !validIds.has(rid));
        if (toRemove.length > 0) {
            return res.status(400).json({ error: `Invalid routeIds: ${toRemove.join(', ')}` });
        }

        // Replace all route memberships for this delegate
        await RouteMember.destroy({ where: { programmeId: id, delegateId } });
        if (toAdd.length > 0) {
            await RouteMember.bulkCreate(
                toAdd.map((routeId) => ({ routeId, delegateId, programmeId: id })),
                { ignoreDuplicates: true }
            );
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
