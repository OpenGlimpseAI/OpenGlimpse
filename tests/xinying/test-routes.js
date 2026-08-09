const { ctx, api } = require('./helpers');

async function testListRoutes() {
    console.log('--- GET /programmes/:id/routes ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/routes`);
    const found = (res.data || []).find(r => r.id === ctx.routeId);
    const success = res.status === 200 && Array.isArray(res.data) && !!found
        && found.delegateCount === 1 && typeof found.checkedIn === 'number';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testGetRoute() {
    console.log('--- GET /programmes/:id/routes/:routeId ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}`);
    const success = res.status === 200 && res.data.id === ctx.routeId
        && res.data.programmeId === ctx.programmeId && res.data.name === ctx.routeName;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testAddRouteValidation() {
    console.log('--- POST /programmes/:id/routes (missing name) ---');
    const res = await api('POST', `/programmes/${ctx.programmeId}/routes`, {});
    const success = res.status === 400 && res.data.error === 'name is required';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testAddRouteToUnknownProgramme() {
    console.log('--- POST /programmes/:id/routes (unknown programme) ---');
    const res = await api('POST', '/programmes/00000000-0000-4000-8000-000000000000/routes', { name: 'X' });
    const success = res.status === 404;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testUpdateRoute() {
    console.log('--- PUT /programmes/:id/routes/:routeId (rename) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}`, { name: 'Coach A (Renamed)' });
    const success = res.status === 200 && res.data.name === 'Coach A (Renamed)';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testArchiveRestoreRoute() {
    console.log('--- PUT archive then restore ---');
    const arch = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/archive`);
    const archived = arch.status === 200 && arch.data.archived === true;
    const rest = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/restore`);
    const restored = rest.status === 200 && rest.data.archived === false;
    const success = archived && restored;
    console.log('Status:', arch.status, rest.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testDeleteRouteNotFound() {
    console.log('--- DELETE /programmes/:id/routes/:routeId (unknown) ---');
    const res = await api('DELETE', `/programmes/${ctx.programmeId}/routes/00000000-0000-4000-8000-000000000000`);
    const success = res.status === 404;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['list routes includes created route with delegate count', testListRoutes],
    ['get single route returns route details', testGetRoute],
    ['add route rejects missing name (400)', testAddRouteValidation],
    ['add route to unknown programme returns 404', testAddRouteToUnknownProgramme],
    ['update route name succeeds', testUpdateRoute],
    ['archive then restore route succeeds', testArchiveRestoreRoute],
    ['delete unknown route returns 404', testDeleteRouteNotFound],
];
