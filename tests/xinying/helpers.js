const BASE_URL = 'http://127.0.0.1:3001';

// Shared context populated by setup()
const ctx = {
    staffToken: null,
    staffUserId: null,
    participantToken: null,
    participantUserId: null,
    programmeId: null,
    programmeName: null,
    routeId: null,
    routeName: null,
    delegateId: null,
    delegateName: null,
};

async function api(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body !== null && body !== undefined) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null;
    return { status: response.status, data };
}

async function setup() {
    console.log('=== Setup ===\n');

    // 1. Staff login (seeded by the server on first boot: admin@openglimpse.com / admin123)
    const loginRes = await api('POST', '/api/auth/login', {
        email: 'admin@openglimpse.com',
        password: 'admin123',
    });

    if (loginRes.status === 200 && loginRes.data.token) {
        ctx.staffToken = loginRes.data.token;
        ctx.staffUserId = loginRes.data.id;
        console.log('Logged in as staff:', ctx.staffUserId);
    } else {
        console.error('Staff login failed — expected a running server with the seeded admin account.');
        return false;
    }

    // 2. Participant account for delegate tests (find-or-create)
    const partEmail = 'xinyingtest@test.com';
    const partPass = 'xinyingpass123';
    const partLogin = await api('POST', '/api/auth/login', { email: partEmail, password: partPass });
    if (partLogin.status === 200 && partLogin.data.token) {
        ctx.participantToken = partLogin.data.token;
        ctx.participantUserId = partLogin.data.id;
        console.log('Reused existing participant:', ctx.participantUserId);
    } else {
        const createRes = await api('POST', '/api/auth', {
            name: 'Xin Ying Test User',
            email: partEmail,
            password: partPass,
            role: 'participant',
        }, ctx.staffToken);
        if (createRes.status === 201) {
            ctx.participantUserId = createRes.data.id;
            const reLogin = await api('POST', '/api/auth/login', { email: partEmail, password: partPass });
            ctx.participantToken = reLogin.data.token;
            console.log('Created participant:', ctx.participantUserId);
        } else {
            console.error('Failed to create participant:', createRes);
            return false;
        }
    }

    // 3. Fresh programme for the run (unique name so repeated runs don't clash)
    // A programme must be created with at least one route; the server returns the created routes.
    ctx.programmeName = `XY Test ${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;
    const progRes = await api('POST', '/programmes', {
        name: ctx.programmeName,
        startDate: '2026-08-10',
        endDate: '2026-08-14',
        routes: [{ name: 'Coach A' }],
    });
    if (progRes.status !== 201 || !progRes.data.id) {
        console.error('Failed to create test programme:', progRes);
        return false;
    }
    ctx.programmeId = progRes.data.id;
    console.log('Created programme:', ctx.programmeId, '(', ctx.programmeName, ')');

    // 4. A route inside the programme (bundled with creation when the server returns it,
    //    otherwise added as a separate call for backwards compatibility)
    if (Array.isArray(progRes.data.routes) && progRes.data.routes.length > 0) {
        ctx.routeId = progRes.data.routes[0].id;
        ctx.routeName = progRes.data.routes[0].name;
        console.log('Created route:', ctx.routeId, '(', ctx.routeName, ')');
    } else {
        const routeRes = await api('POST', `/programmes/${ctx.programmeId}/routes`, { name: 'Coach A' });
        if (routeRes.status !== 201 || !routeRes.data.id) {
            console.error('Failed to create test route:', routeRes);
            return false;
        }
        ctx.routeId = routeRes.data.id;
        ctx.routeName = routeRes.data.name;
        console.log('Created route:', ctx.routeId, '(', ctx.routeName, ')');
    }

    // 5. Add the participant as a delegate, assigned to the route
    const addRes = await api('POST', `/programmes/${ctx.programmeId}/delegates`, {
        userIds: [ctx.participantUserId],
        routeId: ctx.routeId,
    });
    if (addRes.status !== 201 || !Array.isArray(addRes.data.added) || addRes.data.added.length === 0) {
        console.error('Failed to add delegate:', addRes);
        return false;
    }
    ctx.delegateId = addRes.data.added[0].delegateId;
    ctx.delegateName = addRes.data.added[0].name;
    console.log('Added delegate:', ctx.delegateId, '(', ctx.delegateName, ')');

    console.log('\n=== Setup Complete ===\n');
    return true;
}

module.exports = { BASE_URL, ctx, api, setup };
