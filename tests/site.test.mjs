import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
for (const prefix of ['', 'Flavicon/']) {
 test(prefix + 'feedback handles HTTP failure and success', async () => {
  const script = [...read(prefix + 'feedback.html').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('async function submitForm'))[1];
  for (const ok of [false, true]) {
   const changes = [];
   const context = {URLSearchParams, FormData: class { *[Symbol.iterator]() {} }, fetch: async () => ({ok, status: ok ? 200 : 500}), document: {getElementById: id => ({classList: {add: () => changes.push(id), remove: () => changes.push(id)}})}, alert: () => changes.push('error')};
   vm.createContext(context); vm.runInContext(script, context);
   await context.submitForm({preventDefault() {}, target: {}});
   assert.deepEqual(changes, ok ? ['formView', 'successView'] : ['error']);
  }
 });
 test(prefix + 'Spotify initialization is idempotent', () => {
  const s = read(prefix + 'index.html');
  const init = s.slice(s.indexOf('function initSpotify()'), s.indexOf('function updatePlayerUI'));
  let scripts = 0;
  const context = {window: {}, document: {createElement: () => ({}), head: {appendChild: () => scripts++}}};
  vm.createContext(context);
  vm.runInContext('let spotifyInitializing = false; let spotifyPlayer = null;\n' + init + '\ninitSpotify(); initSpotify();', context);
  assert.equal(scripts, 1);
 });
 test(prefix + 'inline JavaScript parses', () => {
  for (const p of ['index.html', 'feedback.html', 'book.html']) {
   for (const m of read(prefix + p).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
  }
 });
}
test('meeting types reject inherited properties and accept supported types', () => {
 const s = read('netlify/functions/book-meeting.mjs');
 const code = s.slice(s.indexOf('const TYPES'), s.indexOf('function buildEvent'));
 const context = {RULES: {allowedDurations: [30, 60]}, isValidTimeZone: () => true};
 vm.createContext(context); vm.runInContext(code, context);
 for (const type of ['__proto__', 'constructor', 'toString', 'unknown', 'video', 'phone', 'in_person']) {
  const {errors} = context.validate({meetingType: type, name: 'Test', email: 'test@example.com', phone: '5551234567', start: '2026-10-19T18:00:00Z', durationMinutes: 30});
  assert.equal(Boolean(errors.meetingType), !['video', 'phone', 'in_person'].includes(type));
 }
});
