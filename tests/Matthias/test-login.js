const { ctx, api } = require('./helpers');

async function testLoginSuccess() {
    console.log('--- POST /api/auth/login (valid credentials) ---');

    const res = await api('POST', '/api/auth/login', {
        email: 'matthiastest@test.com',
        password: 'matthiaspass123',
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200
        && !!res.data.token
        && !!res.data.id
        && res.data.role === 'participant';
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testLoginWrongPassword() {
    console.log('--- POST /api/auth/login (wrong password) ---');

    const res = await api('POST', '/api/auth/login', {
        email: 'matthiastest@test.com',
        password: 'wrongpass',
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 401 && res.data.error === 'Invalid credentials';
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testLoginUnknownEmail() {
    console.log('--- POST /api/auth/login (unknown email) ---');

    const res = await api('POST', '/api/auth/login', {
        email: 'doesnotexist@test.com',
        password: 'matthiaspass123',
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 401;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testLoginMissingFields() {
    console.log('--- POST /api/auth/login (missing fields) ---');

    const res = await api('POST', '/api/auth/login', {
        email: 'matthiastest@test.com',
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testLoginEmailCaseInsensitive() {
    console.log('--- POST /api/auth/login (uppercase email) ---');

    const res = await api('POST', '/api/auth/login', {
        email: 'MATTHIASTEST@TEST.COM',
        password: 'matthiaspass123',
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && !!res.data.token;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['login with valid credentials', testLoginSuccess],
    ['login with wrong password', testLoginWrongPassword],
    ['login with unknown email', testLoginUnknownEmail],
    ['login with missing fields', testLoginMissingFields],
    ['login with uppercase email (case-insensitive)', testLoginEmailCaseInsensitive],
];