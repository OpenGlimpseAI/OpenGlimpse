const crypto = require('crypto');
const db = require('../../database/db.cjs');
const { parseToken } = require('../auth/authRoutes');

const {
  Programme, Route, Delegate, AttendanceRecord,
  ReadyToDepart, ProgrammeDelegate, RouteMember,
  faceEmbeddings, user
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
  { pattern: 'POST /api/auth', exec: async (p, body, token) => {
    const caller = await validateToken(token, true);
    const { name, email, password, role, faceImage } = body;
    if (!name || !email || !password) throw new Error('Name, email and password required');
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await user.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new Error('Email already in use');
    const created = await user.create({
      enName: name.trim(),
      email: normalizedEmail,
      passwordHash: crypto.createHash('sha256').update(password).digest('hex'),
      role: role === 'staff' ? 'staff' : 'participant',
    });
    //upload faceimage if it exists in payload
    if (faceImage) {
      try {
        const { FaceEmbeddings } = require('../../database/dbcrudmethods');
        await FaceEmbeddings.createFromImage(
          created.id,
          Buffer.from(faceImage, 'base64'),
          'primary'
        );
      } catch (faceErr) {
        console.error('Sync face upload for user', created.id, 'failed:', faceErr.message);
      }
    }
  }},
  //patch auth endpoint
  { pattern: 'PATCH /api/auth', exec: async (p, body, token) => {
    const caller = await validateToken(token);
    const { targetId, name, email, password, role } = body;
    const isStaff = caller.role === 'staff';
    const target = targetId ? await user.findByPk(targetId) : caller;
    if (!target) throw new Error('Account not found');
    if (targetId && !isStaff && targetId !== caller.id) throw new Error('Cannot update other accounts');
    if (role && !isStaff) throw new Error('Cannot change role');
    if (name !== undefined) target.enName = name.trim() || target.enName;
    if (email !== undefined) target.email = email.trim().toLowerCase() || target.email;
    if (password) target.passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (role !== undefined && isStaff) target.role = role === 'staff' ? 'staff' : 'participant';
    await target.save();
  }
  },
  //delete auth endpoint
  { pattern: 'DELETE /api/auth', exec: async (p, body, token) => {
    const caller = await validateToken(token);
    const { targetId } = body || {};
    const isStaff = caller.role === 'staff';
    const deleteId = targetId && isStaff ? targetId : caller.id;
    const target = await user.findByPk(deleteId);
    if (!target) throw new Error('Account not found');
    await faceEmbeddings.destroy({ where: { userId: deleteId } });
    await target.destroy();
  }},
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

//validate token if incoming request has token
async function validateToken(token, requireStaff = false) {
  if (!token) throw new Error('Auth required');
  const payload = parseToken(token);
  if (!payload?.id) throw new Error('Invalid token');
  const record = await user.findByPk(payload.id);
  if (!record) throw new Error('Invalid user token');
  if (requireStaff && record.role !== 'staff') throw new Error('Staff access required');
  return record;
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
async function applyOp(method, path, body, token) {
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
  await route.exec(route.params, body, token);
}

exports.handleSync = async (req, res) => {
  try {
    const { ops } = req.body;
    if (Array.isArray(ops)) {
      for (const op of ops) {
        try {
          await applyOp(op.method, op.path, op.body, op.token);
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
