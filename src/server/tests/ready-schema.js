// Schema-level test: ready_to_depart is per-route. On a fresh sync the real models must
// create a UNIQUE index on route_id (one RTD row per route) and NO unique index on
// programme_id (many routes per programme share the same programme_id).
// Run with:  node tests/ready-schema.js   (from src/server)
const { Client } = require('pg');

const MAINT = { user: 'postgres', password: 'postgres', host: 'localhost', port: 5432, database: 'postgres' };
const PROBE_DB = 'og_rtd_probe';

async function main() {
  const admin = new Client(MAINT);
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${PROBE_DB}`);
  await admin.query(`CREATE DATABASE ${PROBE_DB}`);
  await admin.end();

  // Non-SSL branch: set DB_* vars, do NOT set DATABASE_URL (which forces SSL).
  process.env.DB_NAME = PROBE_DB;
  process.env.DB_USER = 'postgres';
  process.env.DB_PASSWORD = 'postgres';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  const { sequelize } = require('../database/db.cjs');
  await sequelize.sync();

  const failures = [];
  const ok = (name, pass, detail = '') => {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
    if (!pass) failures.push(name);
  };

  const [indexes] = await sequelize.query(
    "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='ready_to_depart' ORDER BY indexname"
  );
  const uniqueOn = (col) => indexes.find((i) => /UNIQUE/.test(i.indexdef) && i.indexdef.includes(col));
  ok('unique index on ready_to_depart.route_id', !!uniqueOn('route_id'),
    indexes.map((i) => i.indexdef).join(' | ') || '(no indexes)');
  ok('no unique index on ready_to_depart.programme_id', !uniqueOn('programme_id'),
    (indexes.find((i) => i.indexdef.includes('programme_id')) || {}).indexdef || 'programme_id not indexed');

  const { Programme, Route, ReadyToDepart } = sequelize.models;
  const p = await Programme.create({ name: 'RTD Test', startDate: '2026-08-10', endDate: '2026-08-14' });
  const a = await Route.create({ programmeId: p.id, name: 'Coach A' });
  const b = await Route.create({ programmeId: p.id, name: 'Coach B' });

  const aOn = await ReadyToDepart.setStatus(a.id, p.id, true);
  const bOn = await ReadyToDepart.setStatus(b.id, p.id, true);
  ok('two routes in one programme can both be marked ready', aOn.ready === true && bOn.ready === true);

  const aOff = await ReadyToDepart.setStatus(a.id, p.id, false);
  const aRows = await ReadyToDepart.count({ where: { routeId: a.id } });
  ok('toggling the same route again keeps a single row', aOff.ready === false && aRows === 1, `rows=${aRows}`);

  await sequelize.close();

  const cleanup = new Client(MAINT);
  await cleanup.connect();
  await cleanup.query(`DROP DATABASE IF EXISTS ${PROBE_DB}`);
  await cleanup.end();

  console.log(`\nTotal: 4, Passed: ${4 - failures.length}, Failed: ${failures.length}`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error('test error:', e.message); process.exit(1); });
