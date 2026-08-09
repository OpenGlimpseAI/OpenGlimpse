const { ProgrammeDelegate, Programme, Delegate, user, RouteMember, Route } = require('./models');

async function listDelegates(req, res) {
    const { id } = req.params;
    try {
        const delegates = await ProgrammeDelegate.listForProgramme(id);
        res.json(delegates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function addDelegates(req, res) {
    const { id } = req.params;

    try {
        const existing = await Programme.findByPk(id);
        if (!existing) return res.status(404).json({ error: 'Programme not found' });

        const added = await ProgrammeDelegate.addDelegates(id, req.body);
        res.status(201).json({ added });
    } catch (err) {
        if (err.message === 'Provide delegates array, delegateIds, delegateId, or name') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
}

async function removeDelegate(req, res) {
    const { id, delegateId } = req.params;
    try {
        const removed = await ProgrammeDelegate.removeFromProgramme(id, delegateId);
        if (!removed) return res.status(404).json({ error: 'Delegate not found in programme' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateDelegate(req, res) {
    const { delegateId } = req.params;
    const { userId } = req.body;
    try {
        const delegate = await Delegate.findByPk(delegateId);
        if (!delegate) return res.status(404).json({ error: 'Delegate not found' });
        if (userId !== undefined) {
            const userRecord = await user.findByPk(userId);
            if (!userRecord) return res.status(400).json({ error: 'User not found' });
        }
        await delegate.update({ userId: userId || null });
        res.json({ id: delegate.id, name: delegate.name, userId: delegate.userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Route membership (per-delegate route assignment)

async function setRouteMembers(req, res) {
    const { id, delegateId } = req.params;
    const { routeIds } = req.body;
    if (!Array.isArray(routeIds)) {
        return res.status(400).json({ error: 'routeIds must be an array' });
    }
    if (routeIds.length > 1) {
        return res.status(400).json({ error: 'Each delegate can only be assigned to one route' });
    }
    try {
        const targetRouteId = routeIds[0] || null;

        if (targetRouteId) {
            const route = await Route.findOne({ where: { id: targetRouteId, programmeId: id } });
            if (!route) {
                return res.status(400).json({ error: `Invalid routeId: ${targetRouteId}` });
            }
            await RouteMember.destroy({ where: { programmeId: id, delegateId } });
            await RouteMember.create({ routeId: targetRouteId, delegateId, programmeId: id });
        } else {
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

module.exports = { listDelegates, addDelegates, removeDelegate, updateDelegate, setRouteMembers, getRouteMembers };
