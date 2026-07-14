const programmes = require('./programmes.controller');
const routes = require('./routes.controller');
const delegates = require('./delegates.controller');
const ready = require('./ready.controller');
const { recognize } = require('./recognize.controller');

function registerProgrammeRoutes(app, io) {
    const attendance = require('./attendance.controller')(io);

    // Programmes
    app.get('/programmes', programmes.list);
    app.post('/programmes', programmes.create);
    app.put('/programmes/:id', programmes.update);
    app.delete('/programmes/:id', programmes.remove);

    // Routes
    app.get('/programmes/:id/routes', routes.listRoutes);
    app.post('/programmes/:id/routes', routes.addRoute);
    app.put('/programmes/:id/routes/:routeId', routes.updateRoute);
    app.delete('/programmes/:id/routes/:routeId', routes.removeRoute);

    // Delegates (within programme)
    app.get('/programmes/:id/delegates', delegates.listDelegates);
    app.post('/programmes/:id/delegates', delegates.addDelegates);
    app.patch('/delegates/:delegateId', delegates.updateDelegate);
    app.delete('/programmes/:id/delegates/:delegateId', delegates.removeDelegate);

    // Attendance
    app.get('/programmes/:id/attendance', attendance.getAttendance);
    app.post('/programmes/:id/attendance', attendance.markAttendanceBatch);
    app.put('/programmes/:id/attendance/:delegateId', attendance.markAttendance);
    app.get('/programmes/:id/attendance/summary', attendance.getSummary);

    // Face recognition
    app.post('/programmes/:id/recognize', recognize);

    // Ready to depart
    app.get('/programmes/:id/ready-to-depart', ready.getStatus);
    app.put('/programmes/:id/ready-to-depart', ready.toggleStatus);
}

module.exports = registerProgrammeRoutes;
