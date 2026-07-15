const programmes = require('./programmes.controller');
const routes = require('./routes.controller');
const delegates = require('./delegates.controller');
const ready = require('./ready.controller');
const routeMembers = require('./route-members.controller');

function registerProgrammeRoutes(app, io) {
    const attendance = require('./attendance.controller')(io);

    // Programmes
    app.get('/programmes', programmes.list);
    app.post('/programmes', programmes.create);
    app.put('/programmes/:id', programmes.update);
    app.delete('/programmes/:id', programmes.remove);

    // Routes
    app.get('/programmes/:id/routes', routes.listRoutes);
    app.get('/programmes/:id/routes/:routeId', routes.getRoute);
    app.post('/programmes/:id/routes', routes.addRoute);
    app.put('/programmes/:id/routes/:routeId', routes.updateRoute);
    app.put('/programmes/:id/routes/:routeId/archive', routes.archiveRoute);
    app.put('/programmes/:id/routes/:routeId/restore', routes.restoreRoute);
    app.delete('/programmes/:id/routes/:routeId', routes.removeRoute);

    // Delegates (within programme)
    app.get('/programmes/:id/delegates', delegates.listDelegates);
    app.post('/programmes/:id/delegates', delegates.addDelegates);
    app.delete('/programmes/:id/delegates/:delegateId', delegates.removeDelegate);

    // Attendance
    app.get('/programmes/:id/attendance', attendance.getAttendance);
    app.put('/programmes/:id/attendance/:delegateId', attendance.markAttendance);
    app.get('/programmes/:id/attendance/summary', attendance.getSummary);

    // Ready to depart (per-route)
    app.get('/programmes/:id/routes/:routeId/ready-to-depart', ready.getStatus);
    app.put('/programmes/:id/routes/:routeId/ready-to-depart', ready.toggleStatus);

    // Route members (multi-route assignment)
    app.put('/programmes/:id/delegates/:delegateId/routes', routeMembers.setRouteMembers);
    app.get('/programmes/:id/delegates/:delegateId/routes', routeMembers.getRouteMembers);
}

module.exports = registerProgrammeRoutes;
