// Quick check that only real meeting types are accepted.
// Run from the repository root:  node --test netlify/tests/
// Needs no settings or network: with scheduling switched off, a request with a
// valid meeting type stops at "unavailable" (503), while an invalid one is
// rejected first with a meeting-type error (400). Nothing is ever booked.

import test from 'node:test';
import assert from 'node:assert/strict';
import { isMeetingType, meetingTypeLabel } from '../functions/_shared/meeting-types.mjs';
import bookMeeting from '../functions/book-meeting.mjs';

const VALID = ['video', 'phone', 'in_person'];
const INVALID = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', 'bogus', '', 'Video'];

test('allowlist accepts the three meeting types', () => {
  for (const t of VALID) assert.equal(isMeetingType(t), true, t);
  assert.deepEqual(VALID.map(meetingTypeLabel), ['Video', 'Phone', 'In person']);
});

test('allowlist rejects inherited object names and other values', () => {
  for (const t of INVALID) {
    assert.equal(isMeetingType(t), false, t);
    assert.equal(meetingTypeLabel(t), undefined, t);
  }
  for (const t of [undefined, null, 1, {}, ['video']]) assert.equal(isMeetingType(t), false, String(t));
});

async function book(meetingType) {
  const body = { meetingType, name: 'Test', email: 'test@example.com', phone: '555-123-4567', start: '2030-01-07T15:00:00Z', durationMinutes: 30, visitorTimeZone: 'UTC' };
  const res = await bookMeeting(new Request('http://localhost/api/book', { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, data: await res.json() };
}

test('booking endpoint rejects inherited names as a meeting type', async () => {
  for (const t of INVALID) {
    const { status, data } = await book(t);
    assert.equal(status, 400, t);
    assert.ok(data.fields?.meetingType, t);
  }
});

test('booking endpoint still accepts valid meeting types', async () => {
  for (const name of Object.keys(process.env)) if (/^(GOOGLE_|ZOOM_|POSTMARK_|SCHEDULING_)/.test(name)) delete process.env[name];
  const warn = console.warn; console.warn = () => {};
  try {
    for (const t of VALID) {
      const { status, data } = await book(t);
      assert.equal(data.fields, undefined, t);
      assert.equal(status, 503, t); // passed validation; scheduling is offline in the test
    }
  } finally { console.warn = warn; }
});
