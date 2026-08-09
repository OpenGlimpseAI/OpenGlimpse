const { test } = require('node:test');
const assert = require('node:assert/strict');

const { matchRoute } = require('../../src/server/modules/sync/syncController');

test('matchRoute returns the correct exec function for POST /programmes', () => {
    const route = matchRoute('POST', '/programmes');
    assert.ok(route, 'expected a matching route');
    assert.deepEqual(route.params, {});
    assert.equal(typeof route.exec, 'function');
});

test('matchRoute is case-insensitive on the method', () => {
    const route = matchRoute('put', '/programmes/23');
    assert.equal(route.params.id, '23');
});

test('matchRoute strips query strings before matching', () => {
    const route = matchRoute('GET', '/programmes/5/routes?archived=true');
    assert.equal(route, null, 'GET routes is not a sync handler');
    const post = matchRoute('POST', '/programmes/9/routes');
    assert.equal(post.params.id, '9');
});

test('matchRoute rejects paths that do not match any handler', () => {
    assert.equal(matchRoute('PATCH', '/programmes/9/magic/endpoint'), null);
    assert.equal(matchRoute('DELETE', '/delegates/not-there/extra'), null);
});

test('matchRoute extracts multiple route parameters', () => {
    const route = matchRoute('PUT', '/programmes/10/routes/7/archive');
    assert.ok(route);
    assert.equal(route.params.id, '10');
    assert.equal(route.params.routeId, '7');
});

test('matchRoute returns null for unknown HTTP verbs', () => {
    assert.equal(matchRoute('TRACE', '/programmes'), null);
});

test('matchRoute requires exact segment alignment', () => {
    assert.equal(matchRoute('PUT', '/programmes/1/routes'), null, 'too few segments');
    assert.equal(matchRoute('PUT', '/programmes/1/routes/2/archive/x'), null, 'too many segments');
});