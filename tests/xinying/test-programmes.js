const { ctx, api } = require('./helpers');

async function testListProgrammes() {
    console.log('--- GET /programmes ---');
    const res = await api('GET', '/programmes');
    const success = res.status === 200 && Array.isArray(res.data)
        && res.data.some(p => p.id === ctx.programmeId);
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testGetProgrammeHasCounts() {
    console.log('--- GET /programmes (created programme has aggregate counts) ---');
    const res = await api('GET', '/programmes');
    const p = (res.data || []).find(x => x.id === ctx.programmeId);
    const success = res.status === 200 && p
        && typeof p.totalDelegates === 'number'
        && typeof p.checkedIn === 'number'
        && p.totalDelegates >= 1
        && p.name === ctx.programmeName;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateProgrammeValidation() {
    console.log('--- POST /programmes (missing dates) ---');
    const res = await api('POST', '/programmes', { name: 'Missing Dates' });
    const success = res.status === 400 && res.data.error === 'name, startDate, endDate are required';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateProgrammeRequiresRoute() {
    console.log('--- POST /programmes (no routes) ---');
    const res = await api('POST', '/programmes', {
        name: 'No Route Programme',
        startDate: '2026-08-10',
        endDate: '2026-08-14',
    });
    const success = res.status === 400 && res.data.error === 'routes (at least one route) is required';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testUpdateProgramme() {
    console.log('--- PUT /programmes/:id ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}`, { name: `${ctx.programmeName} (edited)` });
    const success = res.status === 200 && res.data.id === ctx.programmeId
        && res.data.name === `${ctx.programmeName} (edited)`;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testUpdateProgrammeNotFound() {
    console.log('--- PUT /programmes/:id (unknown id) ---');
    const res = await api('PUT', '/programmes/00000000-0000-4000-8000-000000000000', { name: 'nope' });
    const success = res.status === 404;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testDeleteProgrammeNotFound() {
    console.log('--- DELETE /programmes/:id (unknown id) ---');
    const res = await api('DELETE', '/programmes/00000000-0000-4000-8000-000000000000');
    const success = res.status === 404;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['list programmes includes the created programme', testListProgrammes],
    ['created programme has totalDelegates/checkedIn counts', testGetProgrammeHasCounts],
    ['create programme rejects missing dates (400)', testCreateProgrammeValidation],
    ['create programme rejects missing routes (400)', testCreateProgrammeRequiresRoute],
    ['update programme name succeeds', testUpdateProgramme],
    ['update unknown programme returns 404', testUpdateProgrammeNotFound],
    ['delete unknown programme returns 404', testDeleteProgrammeNotFound],
];
