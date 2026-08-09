const BASE_URL = 'http://127.0.0.1:3001';

const ctx = {
    staffToken: null,
    staffUserId: null,
    participantToken: null,
    participantUserId: null,
};

async function api(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null;
    return { status: response.status, data };
}

async function setup() {
    console.log('=== Setup ===\n');

    const loginRes = await api('POST', '/api/auth/login', {
        email: 'admin@openglimpse.com',
        password: 'admin123',
    });

    if (loginRes.status === 200 && loginRes.data.token) {
        ctx.staffToken = loginRes.data.token;
        ctx.staffUserId = loginRes.data.id;
        console.log('Logged in as staff:', ctx.staffUserId);
    } else {
        console.log('Login failed, creating staff account...');
        const createRes = await api('POST', '/api/auth', {
            name: 'Test Staff',
            email: 'admin@openglimpse.com',
            password: 'admin123',
            role: 'staff',
        });
        if (createRes.status === 201) {
            ctx.staffUserId = createRes.data.id;
            const loginAgain = await api('POST', '/api/auth/login', {
                email: 'admin@openglimpse.com',
                password: 'admin123',
            });
            ctx.staffToken = loginAgain.data.token;
            console.log('Created and logged in as staff:', ctx.staffUserId);
        } else {
            console.error('Failed to create staff:', createRes);
            return false;
        }
    }

    const participantLogin = await api('POST', '/api/auth/login', {
        email: 'matthiastest@test.com',
        password: 'matthiaspass123',
    });

    if (participantLogin.status === 200 && participantLogin.data.token) {
        ctx.participantToken = participantLogin.data.token;
        ctx.participantUserId = participantLogin.data.id;
        console.log('Reused existing participant:', ctx.participantUserId);
    } else {
        console.log('Participant not found, creating participant...');
        const partRes = await api('POST', '/api/auth', {
            name: 'Matthias Test User',
            email: 'matthiastest@test.com',
            password: 'matthiaspass123',
            role: 'participant',
        }, ctx.staffToken);

        if (partRes.status === 201) {
            ctx.participantUserId = partRes.data.id;
            const partLogin = await api('POST', '/api/auth/login', {
                email: 'matthiastest@test.com',
                password: 'matthiaspass123',
            });
            ctx.participantToken = partLogin.data.token;
            console.log('Created participant:', ctx.participantUserId);
        } else {
            console.error('Failed to create participant:', partRes);
            return false;
        }
    }

    console.log('\n=== Setup Complete ===\n');
    return true;
}

module.exports = { BASE_URL, ctx, api, setup };