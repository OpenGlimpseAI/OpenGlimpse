const db = require('../../database/db.cjs');
//get table definitions
const {
  Programme, Route, Delegate, AttendanceRecord,
  ReadyToDepart, ProgrammeDelegate, RouteMember
} = db;
//list with pattern and execution functions for each route
const HANDLERS = [
  { pattern: 'POST /programmes', exec: (p, body) => Programme.createWithDetails(body) },
  { pattern: 'PUT /programmes/:id', exec: (p, body) => Programme.updateWithDetails(p.id, body) },
  { pattern: 'DELETE /programmes/:id', exec: (p) => Programme.removeById(p.id) },
  { pattern: 'POST /programmes/:id/routes', exec: (p, body) => Route.createForProgramme(p.id, body.name) },
  { pattern: 'PUT /programmes/:id/routes/:routeId', exec: (p, body) => Route.updateForProgramme(p.routeId, p.id, body) },
  { pattern: 'DELETE /programmes/:id/routes/:routeId', exec: (p) => Route.removeById(p.routeId, p.id) },
  { pattern: 'PUT /programmes/:id/routes/:routeId/archive', exec: (p) => Route.archiveById(p.routeId, p.id) },
  { pattern: 'PUT /programmes/:id/routes/:routeId/restore', exec: (p) => Route.restoreById(p.routeId, p.id) },
  { pattern: 'POST /programmes/:id/delegates', exec: (p, body) => ProgrammeDelegate.addDelegates(p.id, body) },
  { pattern: 'DELETE /programmes/:id/delegates/:delegateId', exec: (p) => ProgrammeDelegate.removeFromProgramme(p.id, p.delegateId) },
  { pattern: 'PATCH /delegates/:delegateId', exec: (p, body) => Delegate.update(body, { where: { id: p.delegateId } }) },
  { pattern: 'PUT /programmes/:id/delegates/:delegateId/routes', exec: setDelegateRoutes },
  { pattern: 'PUT /programmes/:id/attendance/:delegateId', exec: (p, body) => AttendanceRecord.markAttendance(p.id, p.delegateId, body, null) },
  { pattern: 'PUT /programmes/:id/routes/:routeId/ready-to-depart', exec: (p, body) => ReadyToDepart.setStatus(p.routeId, p.id, body.ready) },
];
//need this method as the route it handles does not map directly to a single sequelize method
async function setDelegateRoutes(params, body) {
  const { id, delegateId } = params;
  const { routeIds } = body;
  if (!Array.isArray(routeIds)) return;
  const targetRouteId = routeIds[0] || null;
  await RouteMember.destroy({ where: { programmeId: id, delegateId } });
  if (targetRouteId) {
    await RouteMember.create({ routeId: targetRouteId, delegateId, programmeId: id });
  }
}
//extracts url params based on HANDLERS
function matchRoute(method, path) {
  const clean = path.split('?')[0];
  const key = `${method.toUpperCase()} ${clean}`;
  for (const h of HANDLERS) {
    const [m, pattern] = h.pattern.split(' ');
    if (m !== method.toUpperCase()) continue;
    const parts = pattern.split('/');
    const segs = clean.split('/');
    if (parts.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) {
        params[parts[i].slice(1)] = segs[i];
      } else if (parts[i] !== segs[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { exec: h.exec, params };
  }
  return null;
}
//applies matchroute to the request and handles batch attendance
async function applyOp(method, path, body) {
  if (method === 'POST' && path.endsWith('/attendance')) {
    const records = body?.records;
    if (Array.isArray(records)) {
      for (const rec of records) {
        await AttendanceRecord.markAttendance(body.programmeId || null, rec.delegateId, rec, null);
      }
    }
    return;
  }

  const route = matchRoute(method, path);
  if (!route) return;
  await route.exec(route.params, body);
}

exports.handleSync = async (req, res) => {
  try {
    const { ops } = req.body;
    if (Array.isArray(ops)) {
      for (const op of ops) {
        try {
          await applyOp(op.method, op.path, op.body);
        } catch (err) {
          console.error(`Sync op failed: ${op.method} ${op.path}`, err.message);
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
