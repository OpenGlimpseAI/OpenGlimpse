const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3001';
const TEST_IMAGES_DIR = path.join(__dirname, '..', '..', 'src', 'server', 'modules', 'facial_recog', 'test-images');

const ctx = {
    staffToken: null,
    staffUserId: null,
    testProgrammeId: null,
    testDelegateId: null,
    testUserId: null,
};

function getDefaultImage(subfolderPath) {
    const files = fs.readdirSync(subfolderPath);
    const extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'];
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (extensions.includes(ext) && path.basename(file, ext).toLowerCase() === 'default') {
            return path.join(subfolderPath, file);
        }
    }
    return null;
}

function imageToBase64(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    return buffer.toString('base64');
}

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

    const progRes = await api('POST', '/programmes', {
        name: 'Test Programme',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        routes: [{ name: 'Coach A' }],
    }, ctx.staffToken);

    if (progRes.status === 201) {
        ctx.testProgrammeId = progRes.data.id;
        console.log('Created programme:', ctx.testProgrammeId);
    } else {
        console.error('Failed to create programme:', progRes);
        return false;
    }

    const userRes = await api('POST', '/api/auth', {
        name: 'Test User',
        email: 'testuser@test.com',
        password: 'testpass123',
        role: 'participant',
    }, ctx.staffToken);

    if (userRes.status === 201) {
        ctx.testUserId = userRes.data.id;
        console.log('Created test user:', ctx.testUserId);
    } else {
        const userLogin = await api('POST', '/api/auth/login', {
            email: 'testuser@test.com',
            password: 'testpass123',
        });
        if (userLogin.status === 200 && userLogin.data.id) {
            ctx.testUserId = userLogin.data.id;
            console.log('Reused existing test user:', ctx.testUserId);
        } else {
            console.error('Failed to create or login test user:', userRes, userLogin);
            return false;
        }
    }

    const delRes = await api('POST', `/programmes/${ctx.testProgrammeId}/delegates`, {
        name: 'Test Delegate',
        badge: 'TEST001',
        userId: ctx.testUserId,
    }, ctx.staffToken);

    if (delRes.status === 201) {
        ctx.testDelegateId = delRes.data.added[0].delegateId;
        console.log('Created delegate:', ctx.testDelegateId);
    } else {
        console.error('Failed to create delegate:', delRes);
        return false;
    }

    console.log('\n=== Setup Complete ===\n');
    return true;
}

module.exports = { BASE_URL, TEST_IMAGES_DIR, ctx, getDefaultImage, imageToBase64, api, setup };
