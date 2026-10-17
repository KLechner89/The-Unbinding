import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('index.html');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const tokenCode = section('async function getTokenFromCode', '// Reset audio UI');

function tokenContext(entries = [], fetch = async () => { throw new Error('Unexpected fetch'); }) {
  const storage = new Map(entries);
  const context = {
    URLSearchParams, fetch,
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    }
  };
  vm.createContext(context);
  vm.runInContext("const CLIENT_ID = 'test'; const REDIRECT_URI = 'https://example.test/'; let accessToken = sessionStorage.getItem('spotify_token');\n" + tokenCode, context);
  return {context, storage};
}

test('fresh Spotify sessions reuse the token without refreshing', async () => {
  const {context} = tokenContext([
    ['spotify_token', 'fresh'], ['spotify_expires_at', String(Date.now() + 3600000)]
  ]);
  assert.equal(await context.getValidToken(), 'fresh');
});

test('expiring Spotify sessions refresh and save expiry while retaining the refresh token', async () => {
  const calls = [];
  const {context, storage} = tokenContext([
    ['spotify_token', 'old'], ['spotify_expires_at', String(Date.now() + 30000)], ['spotify_refresh', 'refresh']
  ], async (url, options) => {
    calls.push([url, options]);
    return {ok: true, json: async () => ({access_token: 'new', expires_in: 3600})};
  });
  assert.equal(await context.getValidToken(), 'new');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].body.get('grant_type'), 'refresh_token');
  assert.equal(storage.get('spotify_token'), 'new');
  assert.equal(storage.get('spotify_refresh'), 'refresh');
  assert.ok(Number(storage.get('spotify_expires_at')) > Date.now() + 3500000);
});

test('failed Spotify refresh clears unusable credentials', async () => {
  const {context, storage} = tokenContext([
    ['spotify_token', 'old'], ['spotify_expires_at', '1'], ['spotify_refresh', 'refresh']
  ], async () => ({ok: false, status: 401}));
  assert.equal(await context.getValidToken(), null);
  for (const key of ['spotify_token', 'spotify_expires_at', 'spotify_refresh']) assert.equal(storage.has(key), false);
});

test('Spotify authorization rejects HTTP errors and missing tokens', async () => {
  for (const response of [{ok: false, status: 400}, {ok: true, json: async () => ({})}]) {
    const {context} = tokenContext([], async () => response);
    await assert.rejects(context.getTokenFromCode('code'), /Spotify/);
  }
});

test('audio reset releases the initialization guard so the merged player can initialize again', () => {
  let disconnected = 0;
  let scripts = 0;
  const context = {
    window: {},
    document: {createElement: () => ({}), head: {appendChild: () => scripts++}},
    disconnect: () => disconnected++,
    beginGate: {style: {}}, trackName: {},
    audioCtl: {classList: {add() {}}}, updatePlayerUI() {}
  };
  vm.createContext(context);
  vm.runInContext('let spotifyInitializing = true; let spotifyPlayer = {disconnect}; let audioUnlocked = true; let deviceId = "old";\n' +
    section('function resetAudio', '// Check for auth code') + '\n' +
    section('function initSpotify()', 'function updatePlayerUI') + '\n' +
    'resetAudio("Reconnect"); initSpotify(); initSpotify();', context);
  assert.equal(disconnected, 1);
  assert.equal(scripts, 1);
  assert.equal(context.beginGate.style.display, 'none');
  assert.equal(context.trackName.textContent, 'Reconnect');
});

test('chapter timing uses document coordinates and invalidates cache after layout changes', () => {
  let top = 120;
  let observerCallback;
  const events = {};
  const ResizeObserver = class {constructor(callback) {observerCallback = callback;} observe() {}};
  const context = {
    window: {scrollY: 500, innerHeight: 500, ResizeObserver, addEventListener: (name, callback) => {events[name] = callback;}},
    ResizeObserver, document: {body: {}},
    musicCues: [{offsetTop: 5, getBoundingClientRect: () => ({top}), dataset: {music: '2'}}]
  };
  vm.createContext(context);
  vm.runInContext(section('let chapterTops = null;', 'const parallaxEls'), context);
  assert.equal(context.getChapterTops()[0].top, 620);
  assert.equal(context.getActiveChapterIdx(), 2);
  for (const invalidate of [observerCallback, events.resize, events.load]) {
    top += 100;
    invalidate();
    assert.equal(context.getChapterTops()[0].top, top + 500);
  }
});

test('track transitions mute before playback and use a valid token', async () => {
  const events = [];
  const context = {
    audioUnlocked: true, deviceId: 'device', currentIdx: 0, isPaused: false, fadeTimer: null,
    pendingCue: null, userVolume: 0.4, accessToken: 'old', TRACK_IDS: ['one', 'two'], SONG_NAMES: ['One', 'Two'],
    trackName: {}, audioToggle: {},
    spotifyPlayer: {setVolume: async value => events.push(['volume', value])},
    getValidToken: async () => 'fresh',
    fetch: async (url, options) => {events.push(['play', options.headers.Authorization]); return {status: 204};},
    setInterval: () => 1, clearInterval() {}
  };
  vm.createContext(context);
  vm.runInContext(section('async function switchTo', '// === DOM REFS ==='), context);
  await context.switchTo(1);
  assert.deepEqual(events, [['volume', 0], ['play', 'Bearer fresh']]);
});

test('all six pages use the KL favicon assets and the root assets match the originals', () => {
  for (const prefix of ['', 'Flavicon/']) {
    for (const page of ['index.html', 'feedback.html', 'book.html']) {
      const html = read(prefix + page);
      for (const asset of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']) {
        assert.ok(html.includes('/' + asset + '?v=kl-20261016'), prefix + page + ': ' + asset);
      }
    }
  }
  for (const asset of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']) {
    assert.deepEqual(fs.readFileSync(new URL('../' + asset, import.meta.url)), fs.readFileSync(new URL('../Flavicon/' + asset, import.meta.url)));
  }
  assert.match(read('favicon.svg'), /fill="#c4453a"/);
  assert.match(read('favicon.svg'), /fill="#4f78a8"/);
});
