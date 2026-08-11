const { ctx, api } = require('./helpers');

async function testReadyDefault() {
    console.log('--- GET /programmes/:id/routes/:routeId/ready-to-depart (default) ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/ready-to-depart`);
    const success = res.status === 200 && res.data.ready === false;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testReadyToggleOn() {
    console.log('--- PUT /programmes/:id/routes/:routeId/ready-to-depart (on) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/ready-to-depart`, {
        ready: true,
    });
    const success = res.status === 200 && res.data.ready === true;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testReadyToggleOff() {
    console.log('--- PUT /programmes/:id/routes/:routeId/ready-to-depart (off) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/ready-to-depart`, {
        ready: false,
    });
    const success = res.status === 200 && res.data.ready === false;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testReadyRejectsNonBoolean() {
    console.log('--- PUT /programmes/:id/routes/:routeId/ready-to-depart (non-boolean) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/ready-to-depart`, {
        ready: 'yes',
    });
    const success = res.status === 400 && res.data.error === 'ready must be a boolean';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testReadyToggleTwoRoutes() {
    console.log('--- PUT ready-to-depart on two different routes (same programme) ---');
    // A second route in the same programme must be toggleable independently (RTD is per-route)
    const second = await api('POST', `/programmes/${ctx.programmeId}/routes`, { name: 'Coach B (RTD test)' });
    if (second.status !== 201 || !second.data?.id) {
        console.log('Status:', second.status, 'FAIL\n');
        return false;
    }
    const res = await api('PUT', `/programmes/${ctx.programmeId}/routes/${second.data.id}/ready-to-depart`, {
        ready: true,
    });
    const success = res.status === 200 && res.data.ready === true && res.data.routeId === second.data.id;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testReadyBlockedWithUnassignedDelegate() {
    console.log('--- PUT ready-to-depart blocked when a delegate has no route ---');
    // Unassign the delegate so no route can be marked ready
    const unassign = await api('PUT', `/programmes/${ctx.programmeId}/delegates/${ctx.delegateId}/routes`, { routeIds: [] });
    if (unassign.status !== 200) {
        console.log('Status:', unassign.status, 'FAIL\n');
        return false;
    }
    const res = await api('PUT', `/programmes/${ctx.programmeId}/routes/${ctx.routeId}/ready-to-depart`, { ready: true });
    const success = res.status === 400 && /assign every delegate to a route/.test(res.data?.error || '');
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    // Restore the delegate onto the route so later toggles still work
    await api('PUT', `/programmes/${ctx.programmeId}/delegates/${ctx.delegateId}/routes`, { routeIds: [ctx.routeId] });
    return success;
}

module.exports = [
    ['ready-to-depart defaults to false', testReadyDefault],
    ['toggle ready-to-depart on', testReadyToggleOn],
    ['toggle ready-to-depart off', testReadyToggleOff],
    ['ready-to-depart rejects non-boolean (400)', testReadyRejectsNonBoolean],
    ['ready-to-depart works independently per route', testReadyToggleTwoRoutes],
    ['ready-to-depart blocked when a delegate is unassigned (400)', testReadyBlockedWithUnassignedDelegate],
];
