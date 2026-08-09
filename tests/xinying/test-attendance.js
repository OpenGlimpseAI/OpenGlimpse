const { ctx, api } = require('./helpers');

async function testMarkPresent() {
    console.log('--- PUT /programmes/:id/attendance/:delegateId (present, manual) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/attendance/${ctx.delegateId}`, {
        status: 'present', method: 'manual', notes: 'verified by staff',
    });
    const success = res.status === 200 && res.data.status === 'present'
        && res.data.method === 'manual' && res.data.delegateId === ctx.delegateId;
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRejectInvalidStatus() {
    console.log('--- PUT /programmes/:id/attendance/:delegateId (invalid status) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/attendance/${ctx.delegateId}`, {
        status: 'maybe',
    });
    const success = res.status === 400 && res.data.error === 'status must be "present" or "absent"';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRejectPresentWithoutMethod() {
    console.log('--- PUT /programmes/:id/attendance/:delegateId (present, no method) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/attendance/${ctx.delegateId}`, {
        status: 'present',
    });
    const success = res.status === 400 && res.data.error === 'method is required when marking present';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testRejectDelegateNotInProgramme() {
    console.log('--- PUT /programmes/:id/attendance/:delegateId (not in programme) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/attendance/00000000-0000-4000-8000-000000000000`, {
        status: 'present', method: 'manual',
    });
    const success = res.status === 400 && res.data.error === 'Delegate is not in this programme';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testAttendanceSnapshot() {
    console.log('--- GET /programmes/:id/attendance (present/missing split) ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/attendance`);
    const success = res.status === 200 && Array.isArray(res.data.present)
        && Array.isArray(res.data.missing) && Array.isArray(res.data.unidentified)
        && res.data.present.some(d => d.delegateId === ctx.delegateId && d.method === 'manual');
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testSummaryCounts() {
    console.log('--- GET /programmes/:id/attendance/summary ---');
    const res = await api('GET', `/programmes/${ctx.programmeId}/attendance/summary`);
    const success = res.status === 200 && typeof res.data.total === 'number'
        && typeof res.data.checkedIn === 'number'
        && typeof res.data.missing === 'number'
        && res.data.total === 1 && res.data.checkedIn === 1 && res.data.missing === 0
        && Array.isArray(res.data.byRoute)
        && res.data.byRoute.some(r => r.routeId === ctx.routeId && r.checkedIn === 1);
    console.log('Status:', res.status, JSON.stringify(res.data && { total: res.data.total, checkedIn: res.data.checkedIn, missing: res.data.missing }), success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testUndoToAbsent() {
    console.log('--- PUT /programmes/:id/attendance/:delegateId (absent) ---');
    const res = await api('PUT', `/programmes/${ctx.programmeId}/attendance/${ctx.delegateId}`, {
        status: 'absent',
    });
    const success = res.status === 200 && res.data.status === 'absent';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testBatchAttendance() {
    console.log('--- POST /programmes/:id/attendance (batch) ---');
    const res = await api('POST', `/programmes/${ctx.programmeId}/attendance`, {
        records: [{ delegateId: ctx.delegateId, status: 'present', method: 'manual' }],
    });
    const success = (res.status === 201 || res.status === 200)
        && Array.isArray(res.data.success) && res.data.success.length === 1
        && res.data.success[0].status === 'present';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

async function testBatchValidation() {
    console.log('--- POST /programmes/:id/attendance (empty records) ---');
    const res = await api('POST', `/programmes/${ctx.programmeId}/attendance`, { records: [] });
    const success = res.status === 400 && res.data.error === 'records must be a non-empty array';
    console.log('Status:', res.status, success ? 'PASS\n' : 'FAIL\n');
    return success;
}

module.exports = [
    ['mark delegate present (manual)', testMarkPresent],
    ['reject invalid attendance status (400)', testRejectInvalidStatus],
    ['reject present without method (400)', testRejectPresentWithoutMethod],
    ['reject delegate not in programme (400)', testRejectDelegateNotInProgramme],
    ['attendance snapshot splits present/missing', testAttendanceSnapshot],
    ['attendance summary has correct counts', testSummaryCounts],
    ['undo check-in marks absent', testUndoToAbsent],
    ['batch mark attendance succeeds', testBatchAttendance],
    ['batch attendance rejects empty records (400)', testBatchValidation],
];
