const fs = require('fs');
const path = require('path');
const { ctx, TEST_IMAGES_DIR, getDefaultImage, imageToBase64, api } = require('./helpers');

async function testGetPrimaryFace() {
    console.log('--- GET /api/user/:id/face/default ---');

    const res = await api('GET', `/api/user/${ctx.testUserId}/face/default`, null, ctx.staffToken);
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
    const res = await api('PATCH', `/api/user/${ctx.testUserId}/face/default`, {
        image: imageBase64,
    }, ctx.staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testGetPrimaryFaceAfterSet() {
    console.log('--- GET /api/user/:id/face/default (after set) ---');

    const res = await api('GET', `/api/user/${ctx.testUserId}/face/default`, null, ctx.staffToken);
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
    const res = await api('POST', `/api/user/${ctx.testUserId}/face`, {
        image: imageBase64,
    }, ctx.staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 201 && Array.isArray(res.data);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRecognizeNoImage() {
    console.log('--- POST /programmes/:id/recognize (no image) ---');

    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/recognize`, {}, ctx.staffToken);
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
    }, ctx.staffToken);
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
    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/recognize`, {
        image: imageBase64,
    }, ctx.staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data.matches);
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
    }, ctx.staffToken);

    if (userRes.status !== 201) {
        const userLogin = await api('POST', '/api/auth/login', {
            email: 'outsider@test.com',
            password: 'testpass',
        });
        if (userLogin.status !== 200) {
            console.log('SKIP: Could not create or login outsider user\n');
            return true;
        }
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
    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/recognize`, {
        image: imageBase64,
    }, ctx.staffToken);

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && Array.isArray(res.data.matches);
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['GET /api/user/:id/face/default (not set)', testGetPrimaryFace],
    ['PATCH /api/user/:id/face/default', testSetPrimaryFace],
    ['GET /api/user/:id/face/default (after set)', testGetPrimaryFaceAfterSet],
    ['POST /api/user/:id/face (cache)', testRegisterFaceCache],
    ['POST /programmes/:id/recognize (no image)', testRecognizeNoImage],
    ['POST /programmes/:id/recognize (invalid uuid)', testRecognizeInvalidProgramme],
    ['POST /programmes/:id/recognize (with image)', testRecognizeWithImage],
    ['POST /programmes/:id/recognize (outsider)', testRecognizeUserNotInProgramme],
];
