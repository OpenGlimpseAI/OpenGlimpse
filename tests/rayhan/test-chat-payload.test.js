const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatpayload } = require('../../src/server/modules/chat/chatserver.cjs');

test('formatpayload maps a message row to the wire format', () => {
    const row = { id: 'm1', content: 'hello', timestamp: '2026-01-01T00:00:00Z', senderId: 'u1' };
    const out = formatpayload(row, 'staff', [], 'Alice');
    assert.equal(out.id, 'm1');
    assert.equal(out.text, 'hello');
    assert.equal(out.timestamp, '2026-01-01T00:00:00Z');
    assert.equal(out.senderId, 'u1');
    assert.equal(out.senderRole, 'staff');
    assert.equal(out.senderName, 'Alice');
    assert.deepEqual(out.reactions, []);
});

test('formatpayload falls back to row.text when content is absent', () => {
    const row = { id: 'm2', text: 'legacy', timestamp: null, senderId: 'u2' };
    const out = formatpayload(row, null);
    assert.equal(out.text, 'legacy');
    assert.equal(out.senderRole, null);
    assert.equal(out.senderName, null);
    assert.deepEqual(out.reactions, []);
});

test('formatpayload carries through provided reactions', () => {
    const reactions = [{ emoji: '🎉', userIds: ['u1'] }];
    const out = formatpayload({ id: 'm3', content: 'party', timestamp: 0, senderId: 'u1' }, 'participant', reactions, 'Bob');
    assert.deepEqual(out.reactions, reactions);
});