const { ctx, api } = require('./helpers');

async function testListDelegates() {
    console.log('--- GET /programmes/:id/delegates ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/delegates`);
    const found = (res.data || []).find(d => d.id === ctx.delegateId);
    const success = res.status === 200 && Array.isArray(res.data) && !!found
        && found.name === ctx.delegateName && found.status === 'absent';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testDelegateIsOnRoute() {
    console.log('--- GET /programmes/:id/delegates (route assignment) ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/delegates`);
    const found = (res.data || []).find(d => d.id === ctx.delegateId);
    const success = res.status === 200 && !!found
        && found.routeId === ctx.routeId && Array.isArray(found.routeIds)
        && found.routeIds.includes(ctx.routeId);
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testAddDelegateValidation() {
    console.log('--- POST /programmes/:id/delegates (empty body) ---');
    const res = await api('POST', `/programmes/${ctx.programmeId}/delegates`, {});
    const success = res.status === 400
        && res.data.error === 'Provide delegates array, delegateIds, delegateId, or name';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testAddDelegateRequiresRoute() {
    console.log('--- POST /programmes/:id/delegates (userIds without routeId) ---');
    const res = await api('POST', `/programmes/${ctx.programmeId}/delegates`, {
        userIds: [ctx.participantUserId],
    });
    const success = res.status === 400 && /routeId/i.test(res.data?.error || '');
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testGetRouteMembers() {
    console.log('--- GET /programmes/:id/delegates/:delegateId/routes ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/delegates/${ctx.delegateId}/routes`);
    const success = res.status === 200 && res.data.delegateId === ctx.delegateId
        && Array.isArray(res.data.routeIds) && res.data.routeIds.includes(ctx.routeId);
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testSetRouteMembersRejectsMultiple() {
    console.log('--- PUT /programmes/:id/delegates/:delegateId/routes (2 routes) ---');
    const second = await api('POST', `/programmes/${ctx.programmeId}/routes`, { name: 'Coach B' });
    const secondRouteId = second.data?.id;
    const res = await api('PUT', `/programmes/${ctx.programmeId}/delegates/${ctx.delegateId}/routes`, {
        routeIds: [ctx.routeId, secondRouteId],
    });
    const success = res.status === 400
        && res.data.error === 'Each delegate can only be assigned to one route';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testSetRouteMembersInvalidRoute() {
    console.log('--- PUT /programmes/:id/delegates/:delegateId/routes (bad route) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/delegates/${ctx.delegateId}/routes`, {
        routeIds: ['00000000-0000-4000-8000-000000000000'],
    });
    const success = res.status === 400 && res.data.error.includes('Invalid routeId');
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testMoveDelegateToAnotherRoute() {
    console.log('--- PUT /programmes/:id/delegates/:delegateId/routes (move to Coach B) ---');
    const second = await api('POST', `/programmes/${ctx.programmeId}/routes`, { name: 'Coach B' });
    const secondRouteId = second.data?.id;
    if (!secondRouteId) return false;
    const res = await api('PUT', `/programmes/${ctx.programmeId}/delegates/${ctx.delegateId}/routes`, {
        routeIds: [secondRouteId],
    });
    const success = res.status === 200 && res.data.routeIds.length === 1
        && res.data.routeIds[0] === secondRouteId;
    // Delegate is now on Coach B — keep ctx.routeId pointing at their actual route
    if (success) ctx.routeId = secondRouteId;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRemoveDelegateNotFound() {
    console.log('--- DELETE /programmes/:id/delegates/:delegateId (unknown) ---');
    const res = await api('DELETE', `/programmes/${ctx.programmeId}/delegates/00000000-0000-4000-8000-000000000000`);
    const success = res.status === 404;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['list delegates includes added delegate', testListDelegates],
    ['delegate carries route assignment', testDelegateIsOnRoute],
    ['add delegate rejects empty body (400)', testAddDelegateValidation],
    ['add delegate rejects missing routeId (400)', testAddDelegateRequiresRoute],
    ['get delegate route memberships', testGetRouteMembers],
    ['set route members rejects multiple routes (single-route rule)', testSetRouteMembersRejectsMultiple],
    ['set route members rejects invalid route id', testSetRouteMembersInvalidRoute],
    ['move delegate to another route succeeds', testMoveDelegateToAnotherRoute],
    ['remove unknown delegate returns 404', testRemoveDelegateNotFound],
];
