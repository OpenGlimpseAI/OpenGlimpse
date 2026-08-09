const { setup } = require('./helpers');
const programmeTests = require('./test-programmes');
const routeTests = require('./test-routes');
const delegateTests = require('./test-delegates');
const attendanceTests = require('./test-attendance');
const readyTests = require('./test-ready');

const suites = [
    ['programmes', programmeTests],
    ['routes', routeTests],
    ['delegates', delegateTests],
    ['attendance', attendanceTests],
    ['ready', readyTests],
];

async function main() {
    console.log('Xin Ying Endpoint Tests\n');
    console.log('Make sure the server is running on port 3001\n');

    const nameFilter = (process.argv[2] || '').toLowerCase();

    const setupOk = await setup();
    if (!setupOk) {
        console.error('Setup failed. Aborting tests.');
        process.exit(1);
    }

    const results = [];

    for (const [label, tests] of suites) {
        if (nameFilter && !label.includes(nameFilter)) {
            console.log(`SKIP ${label} (filter: ${nameFilter})\n`);
            continue;
        }
        console.log(`=== ${label} ===\n`);
        for (const [name, test] of tests) {
            results.push([name, await test()]);
        }
    }

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
