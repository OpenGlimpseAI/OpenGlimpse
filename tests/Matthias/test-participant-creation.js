const { ctx, api } = require('./helpers');

async function testCreateParticipant() {
    console.log('--- POST /api/auth (create participant) ---');

    const res = await api('POST', '/api/auth', {
        name: 'New Participant',
        email: 'new.participant@test.com',
        password: 'participant123',
        role: 'participant',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 201
        && !!res.data.id
        && res.data.name === 'New Participant'
        && res.data.role === 'participant'
        && !res.data.token;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateParticipantDefaultRole() {
    console.log('--- POST /api/auth (participant, no role) ---');

    const res = await api('POST', '/api/auth', {
        name: 'Default Role User',
        email: 'default.role@test.com',
        password: 'participant123',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 201 && res.data.role === 'participant';
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateNoAuth() {
    console.log('--- POST /api/auth (no token) ---');

    const res = await api('POST', '/api/auth', {
        name: 'Unauthorized',
        email: 'unauthorized@test.com',
        password: 'participant123',
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 401;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateAsParticipant() {
    console.log('--- POST /api/auth (as participant, not staff) ---');

    const res = await api('POST', '/api/auth', {
        name: 'Not Staff',
        email: 'notstaff@test.com',
        password: 'participant123',
        role: 'participant',
    }, ctx.participantToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 403;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateDuplicateEmail() {
    console.log('--- POST /api/auth (duplicate email) ---');

    const res = await api('POST', '/api/auth', {
        name: 'Duplicate Email',
        email: 'matthiastest@test.com',
        password: 'participant123',
        role: 'participant',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400 && res.data.error === 'Email already in use';
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateMissingFields() {
    console.log('--- POST /api/auth (missing fields) ---');

    const res = await api('POST', '/api/auth', {
        email: 'nofields@test.com',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateThenLogin() {
    console.log('--- POST /api/auth then login ---');

    const email = 'created.then.login@test.com';
    const createRes = await api('POST', '/api/auth', {
        name: 'Login Me',
        email,
        password: 'participant123',
        role: 'participant',
    }, ctx.staffToken);

    if (createRes.status !== 201) {
        console.log('Create failed:', createRes.status);
        console.log('FAIL\n');
        return false;
    }

    const loginRes = await api('POST', '/api/auth/login', {
        email,
        password: 'participant123',
    });
    console.log('Create status:', createRes.status);
    console.log('Login status:', loginRes.status);
    console.log('Response:', JSON.stringify(loginRes.data, null, 2));

    const success = loginRes.status === 200 && !!loginRes.data.token;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testCreateStaff() {
    console.log('--- POST /api/auth (create staff) ---');

    const res = await api('POST', '/api/auth', {
        name: 'Another Staff',
        email: 'another.staff@test.com',
        password: 'matthiaspass123',
        role: 'staff',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 201 && res.data.role === 'staff';
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testListAllUsers() {
    console.log('--- GET /api/auth/all (list users) ---');

    const res = await api('GET', '/api/auth/all', null, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response (first entry):', JSON.stringify(res.data?.[0], null, 2));

    const success = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testListAllUsersAsParticipant() {
    console.log('--- GET /api/auth/all (as participant) ---');

    const res = await api('GET', '/api/auth/all', null, ctx.participantToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 403;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['create participant', testCreateParticipant],
    ['create participant (default role)', testCreateParticipantDefaultRole],
    ['create account (no token)', testCreateNoAuth],
    ['create account (as participant)', testCreateAsParticipant],
    ['create account (duplicate email)', testCreateDuplicateEmail],
    ['create account (missing fields)', testCreateMissingFields],
    ['create account then login', testCreateThenLogin],
    ['create staff account', testCreateStaff],
    ['list all users (staff)', testListAllUsers],
    ['list all users (participant)', testListAllUsersAsParticipant],
];