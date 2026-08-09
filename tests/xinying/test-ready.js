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

module.exports = [
    ['ready-to-depart defaults to false', testReadyDefault],
    ['toggle ready-to-depart on', testReadyToggleOn],
    ['toggle ready-to-depart off', testReadyToggleOff],
    ['ready-to-depart rejects non-boolean (400)', testReadyRejectsNonBoolean],
];
