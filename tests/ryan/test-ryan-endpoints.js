const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3001';
const TEST_IMAGES_DIR = path.join(__dirname, '..', '..', 'src', 'server', 'modules', 'facial_recog', 'test-images');

let staffToken = null;
let staffUserId = null;
let testProgrammeId = null;
let testDelegateId = null;
let testUserId = null;

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
        staffToken = loginRes.data.token;
        staffUserId = loginRes.data.id;
        console.log('Logged in as staff:', staffUserId);
    } else {
        console.log('Login failed, creating staff account...');
        const createRes = await api('POST', '/api/auth', {
            name: 'Test Staff',
            email: 'admin@openglimpse.com',
            password: 'admin123',
            role: 'staff',
        });
        if (createRes.status === 201) {
            staffUserId = createRes.data.id;
            const loginAgain = await api('POST', '/api/auth/login', {
                email: 'admin@openglimpse.com',
                password: 'admin123',
            });
            staffToken = loginAgain.data.token;
            console.log('Created and logged in as staff:', staffUserId);
        } else {
            console.error('Failed to create staff:', createRes);
            return false;
        }
    }

    const progRes = await api('POST', '/programmes', {
        name: 'Test Programme',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
    }, staffToken);

    if (progRes.status === 201) {
        testProgrammeId = progRes.data.id;
        console.log('Created programme:', testProgrammeId);
    } else {
        console.error('Failed to create programme:', progRes);
        return false;
    }

    const userRes = await api('POST', '/api/auth', {
        name: 'Test User',
        email: 'testuser@test.com',
        password: 'testpass123',
        role: 'participant',
    }, staffToken);

    if (userRes.status === 201) {
        testUserId = userRes.data.id;
        console.log('Created test user:', testUserId);
    } else {
        console.error('Failed to create user:', userRes);
        return false;
    }

    const delRes = await api('POST', `/programmes/${testProgrammeId}/delegates`, {
        name: 'Test Delegate',
        badge: 'TEST001',
        userId: testUserId,
    }, staffToken);

    if (delRes.status === 201) {
        testDelegateId = delRes.data.added[0].delegateId;
        console.log('Created delegate:', testDelegateId);
    } else {
        console.error('Failed to create delegate:', delRes);
        return false;
    }

    console.log('\n=== Setup Complete ===\n');
    return true;
}

async function testGetPrimaryFace() {
    console.log('--- GET /api/user/:id/face/default ---');

    const res = await api('GET', `/api/user/${testUserId}/face/default`, null, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 404 || res.status === 200;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testSetPrimaryFace() {
    console.log('--- PATCH /api/user/:id/face/default ---');

    const folders = fs.readdirSync(TEST_IMAGES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (folders.length === 0) {
        console.log('SKIP: No test images found\n');
        return true;
    }

    const defaultImage = getDefaultImage(path.join(TEST_IMAGES_DIR, folders[0]));
    if (!defaultImage) {
        console.log('SKIP: No default image found\n');
        return true;
    }

    const imageBase64 = imageToBase64(defaultImage);
    const res = await api('PATCH', `/api/user/${testUserId}/face/default`, {
        image: imageBase64,
    }, staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testGetPrimaryFaceAfterSet() {
    console.log('--- GET /api/user/:id/face/default (after set) ---');

    const res = await api('GET', `/api/user/${testUserId}/face/default`, null, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRegisterFaceCache() {
    console.log('--- POST /api/user/:id/face (cache) ---');

    const folders = fs.readdirSync(TEST_IMAGES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (folders.length === 0) {
        console.log('SKIP: No test images found\n');
        return true;
    }

    const subfolder = path.join(TEST_IMAGES_DIR, folders[0]);
    const files = fs.readdirSync(subfolder);
    const testImage = files.find(f => {
        const ext = path.extname(f).toLowerCase();
        const name = path.basename(f, ext).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.bmp', '.webp'].includes(ext) && name !== 'default';
    });

    if (!testImage) {
        console.log('SKIP: No non-default test image found\n');
        return true;
    }

    const imageBase64 = imageToBase64(path.join(subfolder, testImage));
    const res = await api('POST', `/api/user/${testUserId}/face`, {
        image: imageBase64,
    }, staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 201 && Array.isArray(res.data);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRecognizeNoImage() {
    console.log('--- POST /programmes/:id/recognize (no image) ---');

    const res = await api('POST', `/programmes/${testProgrammeId}/recognize`, {}, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRecognizeInvalidProgramme() {
    console.log('--- POST /programmes/:id/recognize (invalid uuid) ---');

    const res = await api('POST', '/programmes/not-a-uuid/recognize', {
        image: 'base64data',
    }, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRecognizeWithImage() {
    console.log('--- POST /programmes/:id/recognize (with image) ---');

    const folders = fs.readdirSync(TEST_IMAGES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (folders.length === 0) {
        console.log('SKIP: No test images found\n');
        return true;
    }

    const defaultImage = getDefaultImage(path.join(TEST_IMAGES_DIR, folders[0]));
    if (!defaultImage) {
        console.log('SKIP: No default image found\n');
        return true;
    }

    const imageBase64 = imageToBase64(defaultImage);
    const res = await api('POST', `/programmes/${testProgrammeId}/recognize`, {
        image: imageBase64,
    }, staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data.matches);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRNoBadge() {
    console.log('--- POST /programmes/:id/scan-qr (no badge) ---');

    const res = await api('POST', `/programmes/${testProgrammeId}/scan-qr`, {}, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRNotFound() {
    console.log('--- POST /programmes/:id/scan-qr (badge not found) ---');

    const res = await api('POST', `/programmes/${testProgrammeId}/scan-qr`, {
        badge: 'NOTEXIST',
    }, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && res.data.errors && res.data.errors.length > 0;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRSingle() {
    console.log('--- POST /programmes/:id/scan-qr (single badge) ---');

    const res = await api('POST', `/programmes/${testProgrammeId}/scan-qr`, {
        badge: 'TEST001',
    }, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && res.data.matches && res.data.matches.length > 0;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRBatch() {
    console.log('--- POST /programmes/:id/scan-qr (batch badges) ---');

    const res = await api('POST', `/programmes/${testProgrammeId}/scan-qr`, {
        badges: ['TEST001', 'NOTEXIST'],
    }, staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200
        && res.data.matches && res.data.matches.length === 1
        && res.data.errors && res.data.errors.length === 1;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRecognizeUserNotInProgramme() {
    console.log('--- POST /programmes/:id/recognize (user not in programme) ---');

    const userRes = await api('POST', '/api/auth', {
        name: 'Outsider',
        email: 'outsider@test.com',
        password: 'testpass',
        role: 'participant',
    }, staffToken);

    if (userRes.status !== 201) {
        console.log('SKIP: Could not create outsider user\n');
        return true;
    }

    const folders = fs.readdirSync(TEST_IMAGES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (folders.length === 0) {
        console.log('SKIP: No test images\n');
        return true;
    }

    const defaultImage = getDefaultImage(path.join(TEST_IMAGES_DIR, folders[0]));
    if (!defaultImage) {
        console.log('SKIP: No default image\n');
        return true;
    }

    const imageBase64 = imageToBase64(defaultImage);
    const res = await api('POST', `/programmes/${testProgrammeId}/recognize`, {
        image: imageBase64,
    }, staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data.matches);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function main() {
    console.log('Ryan Endpoint Tests\n');
    console.log('Make sure the server is running on port 3001\n');

    const setupOk = await setup();
    if (!setupOk) {
        console.error('Setup failed. Aborting tests.');
        process.exit(1);
    }

    const results = [];

    results.push(['GET /api/user/:id/face/default (not set)', await testGetPrimaryFace()]);
    results.push(['PATCH /api/user/:id/face/default', await testSetPrimaryFace()]);
    results.push(['GET /api/user/:id/face/default (after set)', await testGetPrimaryFaceAfterSet()]);
    results.push(['POST /api/user/:id/face (cache)', await testRegisterFaceCache()]);
    results.push(['POST /programmes/:id/recognize (no image)', await testRecognizeNoImage()]);
    results.push(['POST /programmes/:id/recognize (invalid uuid)', await testRecognizeInvalidProgramme()]);
    results.push(['POST /programmes/:id/recognize (with image)', await testRecognizeWithImage()]);
    results.push(['POST /programmes/:id/scan-qr (no badge)', await testScanQRNoBadge()]);
    results.push(['POST /programmes/:id/scan-qr (not found)', await testScanQRNotFound()]);
    results.push(['POST /programmes/:id/scan-qr (single)', await testScanQRSingle()]);
    results.push(['POST /programmes/:id/scan-qr (batch)', await testScanQRBatch()]);
    results.push(['POST /programmes/:id/recognize (outsider)', await testRecognizeUserNotInProgramme()]);

    console.log('=== Summary ===\n');
    const passed = results.filter(r => r[1]).length;
    const failed = results.filter(r => !r[1]).length;

    for (const [name, ok] of results) {
        console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
    }

    console.log(`\nTotal: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

main();
