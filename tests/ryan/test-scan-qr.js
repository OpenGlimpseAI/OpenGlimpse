const { ctx, api } = require('./helpers');

async function testScanQRNoBadge() {
    console.log('--- POST /programmes/:id/scan-qr (no badge) ---');

    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/scan-qr`, {}, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 400;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRNotFound() {
    console.log('--- POST /programmes/:id/scan-qr (badge not found) ---');

    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/scan-qr`, {
        badge: 'NOTEXIST',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && res.data.errors && res.data.errors.length > 0;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRSingle() {
    console.log('--- POST /programmes/:id/scan-qr (single badge) ---');

    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/scan-qr`, {
        badge: 'TEST001',
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200 && res.data.matches && res.data.matches.length > 0;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testScanQRBatch() {
    console.log('--- POST /programmes/:id/scan-qr (batch badges) ---');

    const res = await api('POST', `/programmes/${ctx.testProgrammeId}/scan-qr`, {
        badges: ['TEST001', 'NOTEXIST'],
    }, ctx.staffToken);
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));

    const success = res.status === 200
        && res.data.matches && res.data.matches.length === 1
        && res.data.errors && res.data.errors.length === 1;
    console.log(success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['POST /programmes/:id/scan-qr (no badge)', testScanQRNoBadge],
    ['POST /programmes/:id/scan-qr (not found)', testScanQRNotFound],
    ['POST /programmes/:id/scan-qr (single)', testScanQRSingle],
    ['POST /programmes/:id/scan-qr (batch)', testScanQRBatch],
];
