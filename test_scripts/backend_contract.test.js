const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('../frontend/node_modules/ws');

const BASE_URL = process.env.SOUNDOWL_BASE_URL || 'http://127.0.0.1';
const WS_URL = process.env.SOUNDOWL_WS_URL || 'ws://127.0.0.1:8080/';
const CONTRACT_MODE = process.env.SOUNDOWL_CONTRACT_MODE || 'live';
const IS_FIXTURE = CONTRACT_MODE === 'fixture';
const COMPRESS_TABLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@,.<>[]:;!$()';

const FIXTURE = {
  settings: {
    db_ip_address: 'soundowl-db',
    db_name: 'sound',
    db_user: 'root',
    db_pass: 'sound',
    redis_ip_address: 'soundowl-redis',
    sound_directory: '/music/contract-fixture',
    exclusionPaths: 'RECYCLE.BIN|JRiver Conversion Cache',
    websocket_retry_count: '7',
    websocket_retry_interval: '1234',
  },
  hashes: {
    h01: '8e002bf5f50db0553d82bc67e9225ef2b7ab1611',
    h02: '206f8970206ca2be1c578654d323c4783e58b5bb',
    h03: '8ee9a84fa1a11e5dcf6598db5f013c492e3c0dd6',
    h04: '6f73891510e6784d079b2d85a65fdd0853c17ce8',
    h05: '3bc9837935760d7094815b18a6fd929a7a133ff8',
    h06: 'fd72d48dc615f30ace4105d753fc261dadd2d029',
    h07: '08fac533681b60e6edc3035652833f49096529c4',
    h08: '9ce0b98bbf081981bf7b7c990723e7c582c7a44e',
    album1: '1111111111111111111111111111111111111111',
    album2: '2222222222222222222222222222222222222222',
    album3: '3333333333333333333333333333333333333333',
    artistAlpha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
  addTimeTitles: [
    'Orphan Artist Song',
    'No Album Song',
    'Needle Song Two',
    'Needle Song One',
    'Beta Exact Match',
    'Alpha Track Ten',
    'Alpha Track Two',
    'Alpha Track One',
  ],
  playCountTitles: [
    'Beta Exact Match',
    'Orphan Artist Song',
    'Alpha Track Two',
    'Needle Song One',
    'Alpha Track Ten',
    'Alpha Track One',
    'Needle Song Two',
    'No Album Song',
  ],
  historyTitles: ['Orphan Artist Song', 'Beta Exact Match'],
};

let fixturePromise;

async function getFixture() {
  if (!fixturePromise) {
    fixturePromise = loadFixture();
  }
  return fixturePromise;
}

async function loadFixture() {
  const addTime = await fetchJson('/api/sound_addtime_list.php');
  assert.ok(Array.isArray(addTime.json), 'sound_addtime_list should return an array');
  assert.ok(addTime.json.length > 0, 'test deployment should have at least one sound');

  const playableSound = addTime.json.find((record) => (
    record
    && typeof record.sound_hash === 'string'
    && record.sound_hash.length > 0
    && typeof record.title === 'string'
    && record.title.length > 0
  ));
  assert.ok(playableSound, 'fixture needs a playable sound with hash and title');

  const albumSound = addTime.json.find((record) => (
    record
    && typeof record.album_hash === 'string'
    && record.album_hash.length > 0
    && record.album
    && record.album.album_hash === record.album_hash
  ));
  assert.ok(albumSound, 'fixture needs a sound linked to an album');

  return {
    addTimeList: addTime.json,
    playableSound,
    albumSound,
  };
}

async function fetchText(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  return { response, text };
}

async function fetchJson(path, options = {}) {
  const { response, text } = await fetchText(path, options);
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  assert.doesNotThrow(() => JSON.parse(text), `${path} should return JSON. Body head: ${text.slice(0, 120)}`);
  return { response, json: JSON.parse(text), text };
}

function formRequest(data) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data),
  };
}

function assertJsonContentType(response) {
  assert.match(response.headers.get('content-type') || '', /json/i);
}

function assertSoundRecord(record) {
  assert.equal(typeof record.sound_hash, 'string');
  assert.ok(record.sound_hash.length > 0);
  assertDateTimeString(record.add_time, 'add_time');
  assertNullableString(record.title, 'title');
  assertNullableString(record.lyrics, 'lyrics');
  assertNullableString(record.genre, 'genre');
  assertNullableString(record.album_hash, 'album_hash');
  assertNullableString(record.album_title, 'album_title');
  assertNullableString(record.artist_id, 'artist_id');
  assertNullableString(record.artist_name, 'artist_name');
  assertNullableString(record.track_no, 'track_no');
  assert.ok(numberValue(record.play_count, 'play_count') >= 0);
  assert.ok(numberValue(record.loudness_target, 'loudness_target') <= 0);
  assert.ok(Object.hasOwn(record, 'album'));
  assert.equal(typeof record.album, 'object');
  assertNullableString(record.album.album_hash, 'album.album_hash');
  assertNullableString(record.album.album_title, 'album.album_title');
  assert.equal(record.album.album_hash, record.album_hash);
  assert.equal(record.album.album_title, record.album_title);
}

function assertSoundDetailRecord(record) {
  assert.equal(typeof record.sound_hash, 'string');
  assert.ok(record.sound_hash.length > 0);
  assertDateTimeString(record.add_time, 'add_time');
  assertNullableString(record.title, 'title');
  assertNullableString(record.lyrics, 'lyrics');
  assertNullableString(record.genre, 'genre');
  assertNullableString(record.album_hash, 'album_hash');
  assertNullableString(record.album_title, 'album_title');
  assertNullableString(record.artist_id, 'artist_id');
  assertNullableString(record.artist_name, 'artist_name');
  assertNullableString(record.track_no, 'track_no');
  assert.ok(numberValue(record.play_count, 'play_count') >= 0);
  assert.ok(numberValue(record.loudness_target, 'loudness_target') <= 0);
  assert.equal(typeof record.mime, 'string');
  assert.match(record.mime, /^audio\//);
}

function assertArtistListItem(record) {
  assert.equal(typeof record.artist_id, 'string');
  assert.ok(record.artist_id.length > 0);
  assert.equal(typeof record.artist_name, 'string');
  assert.ok(Object.hasOwn(record, 'album'));
  assert.equal(typeof record.album, 'object');
  assert.equal(typeof record.album.album_key, 'string');
  assert.equal(typeof record.album.title, 'string');
}

function assertAlbumListItem(record) {
  assert.equal(typeof record.album_key, 'string');
  assert.ok(record.album_key.length > 0);
  assert.equal(typeof record.title, 'string');
  assert.ok(record.title.length > 0);
  assert.equal(typeof record.artist, 'object');
  assertNullableString(record.artist.artist_id, 'artist.artist_id');
  assert.equal(typeof record.artist.artist_name, 'string');
}

function assertHistoryRecord(record) {
  assert.equal(typeof record.id, 'number');
  assert.equal(typeof record.sound_hash, 'string');
  assert.ok(record.sound_hash.length > 0);
  assertDateTimeString(record.play_date, 'play_date');
  assertNullableString(record.title, 'title');
  assertNullableString(record.genre, 'genre');
  assertNullableString(record.lyrics, 'lyrics');
  assertNullableString(record.album_hash, 'album_hash');
  assertNullableString(record.album_title, 'album_title');
  assertNullableString(record.artist_id, 'artist_id');
  assertNullableString(record.artist_name, 'artist_name');
  assertNullableString(record.track_no, 'track_no');
  assert.ok(numberValue(record.play_count, 'play_count') >= 0);
  assert.ok(numberValue(record.loudness_target, 'loudness_target') <= 0);
}

function assertStatusPayload(json, includeCounts = false) {
  assert.equal(typeof json.regist_status, 'boolean');
  assert.equal(typeof json.regist_status_step1, 'boolean');
  assert.equal(typeof json.regist_status_step2, 'boolean');
  if (includeCounts) {
    assert.equal(typeof json.regist_data_count, 'object');
    assert.ok(numberValue(json.regist_data_count.sound, 'regist_data_count.sound') >= 0);
    assert.ok(numberValue(json.regist_data_count.artist, 'regist_data_count.artist') >= 0);
    assert.ok(numberValue(json.regist_data_count.album, 'regist_data_count.album') >= 0);
    if (IS_FIXTURE) {
      assert.equal(json.regist_data_count.sound, 8);
      assert.equal(json.regist_data_count.artist, 4);
      assert.equal(json.regist_data_count.album, 3);
    }
  }
}

function assertNullableString(value, label) {
  assert.ok(value === null || typeof value === 'string', `${label} should be string or null`);
}

function assertDateTimeString(value, label) {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.match(value, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, `${label} should use YYYY-MM-DD HH:mm:ss`);
  timestampValue(value);
}

function assertPngResponse(response, buffer) {
  assert.match(response.headers.get('content-type') || '', /image\/png/i);
  assert.ok(buffer.length > 8);
  assert.deepEqual([...buffer.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function parseJsonSuffix(text) {
  const start = text.lastIndexOf('{');
  assert.ok(start >= 0, `JSON object not found in response: ${text.slice(0, 120)}`);
  return JSON.parse(text.slice(start));
}

function timestampValue(value) {
  const time = Date.parse(String(value).replace(' ', 'T'));
  assert.ok(Number.isFinite(time), `invalid timestamp: ${value}`);
  return time;
}

function encodeHash(hash) {
  return encodeURIComponent(hash);
}

function compressedHash(rawHash) {
  return rawHash.match(/.{1,9}/g).map((chunk) => {
    const trimmed = chunk.replace(/^0+/, '');
    const prefix = '-'.repeat(chunk.length - trimmed.length);
    return `${prefix}${toCustomBase(trimmed === '' ? 0n : BigInt(`0x${trimmed}`))}`;
  }).join('_');
}

function toCustomBase(value) {
  if (value === 0n) {
    return '';
  }

  const base = BigInt(COMPRESS_TABLE.length);
  let current = value;
  let result = '';
  while (current > 0n) {
    const mod = current % base;
    result = `${COMPRESS_TABLE[Number(mod)]}${result}`;
    current = (current - mod) / base;
  }
  return result;
}

function fixtureHash(name) {
  return compressedHash(FIXTURE.hashes[name]);
}

function assertFixtureTitles(records, expectedTitles, label) {
  assert.equal(records.length, expectedTitles.length, `${label} should have fixture row count`);
  assert.deepEqual(records.map((record) => record.title), expectedTitles);
}

function numberValue(value, label) {
  const numeric = Number(value);
  assert.ok(Number.isFinite(numeric), `${label} should be numeric: ${value}`);
  return numeric;
}

function searchTokenFrom(record) {
  if (IS_FIXTURE) {
    return 'Needle';
  }

  const haystack = [
    record.title,
    record.album_title,
    record.artist_name,
  ].filter(Boolean).join(' ');
  const token = haystack
    .split(/[^A-Za-z0-9\u3040-\u30ff\u3400-\u9fff]+/)
    .find((part) => part.length >= 2);
  assert.ok(token, `could not derive search token from: ${haystack}`);
  return token;
}

test('sound_addtime_list returns sound records ordered by add_time descending', async () => {
  const { addTimeList } = await getFixture();

  assert.ok(addTimeList.length > 0);
  assertSoundRecord(addTimeList[0]);
  if (IS_FIXTURE) {
    assertFixtureTitles(addTimeList, FIXTURE.addTimeTitles, 'sound_addtime_list');
    assert.equal(addTimeList[0].sound_hash, fixtureHash('h08'));
    assert.equal(addTimeList[3].sound_hash, fixtureHash('h05'));
    assert.equal(addTimeList[3].album_hash, fixtureHash('album3'));
    assert.equal(addTimeList[6].album.album_title, 'Fixture Album One');
  }

  for (let index = 1; index < addTimeList.length; index += 1) {
    assert.ok(
      timestampValue(addTimeList[index - 1].add_time) >= timestampValue(addTimeList[index].add_time),
      `add_time should be descending at index ${index}`,
    );
  }
});

test('play_count_list returns sound records ordered by play_count descending', async () => {
  const { response, json } = await fetchJson('/api/play_count_list.php');
  assertJsonContentType(response);
  assert.ok(Array.isArray(json));
  assert.ok(json.length > 0);
  assertSoundRecord(json[0]);
  if (IS_FIXTURE) {
    assertFixtureTitles(json, FIXTURE.playCountTitles, 'play_count_list');
    assert.deepEqual(json.map((record) => Number(record.play_count)), [11, 9, 7, 5, 3, 2, 1, 0]);
  }

  for (let index = 1; index < json.length; index += 1) {
    assert.ok(
      numberValue(json[index - 1].play_count, 'previous play_count') >= numberValue(json[index].play_count, 'play_count'),
      `play_count should be descending at index ${index}`,
    );
  }
});

test('sound_data returns detail for a sound discovered from the current list', async () => {
  const { playableSound } = await getFixture();
  const { response, json } = await fetchJson(`/api/sound_data.php?SoundHash=${encodeHash(playableSound.sound_hash)}`);

  assertJsonContentType(response);
  assertSoundDetailRecord(json);
  assert.equal(json.sound_hash, playableSound.sound_hash);
  assert.equal(json.title, playableSound.title);
  assert.equal(json.album_hash, playableSound.album_hash);
  if (IS_FIXTURE) {
    assert.equal(json.sound_hash, fixtureHash('h08'));
    assert.equal(json.title, 'Orphan Artist Song');
    assert.equal(json.track_no, 'A1');
    assert.equal(json.play_count, 9);
  }
});

test('sound_data missing SoundHash returns an empty array', async () => {
  const missing = await fetchJson('/api/sound_data.php');
  assert.deepEqual(missing.json, []);
});

test('sound_data malformed SoundHash preserves the current PHP fatal-error response', async () => {
  const { response, text } = await fetchText('/api/sound_data.php?SoundHash=not-a-real-sound');
  assert.ok([200, 500].includes(response.status));
});

test('sound_search finds a current sound by a token derived from live data', async () => {
  const { playableSound } = await getFixture();
  const token = searchTokenFrom(playableSound);
  const { response, json } = await fetchJson('/api/sound_search.php', formRequest({ SearchWord: token }));

  assertJsonContentType(response);
  assert.ok(Array.isArray(json));
  assert.ok(json.length > 0, `search should return results for token: ${token}`);
  if (IS_FIXTURE) {
    assert.deepEqual(new Set(json.map((record) => record.title)), new Set(['Needle Song One', 'Needle Song Two']));
    assert.ok(json.every((record) => record.album_title === 'Shared Search Album'));
  } else {
    assert.ok(
      json.some((record) => record.sound_hash === playableSound.sound_hash),
      `search results should include selected sound ${playableSound.sound_hash}`,
    );
  }
  for (const record of json) {
    assertSoundRecord(record);
  }
});

test('sound_search handles missing and empty SearchWord according to current PHP behavior', async () => {
  const missing = await fetchJson('/api/sound_search.php', { method: 'POST' });
  assert.deepEqual(missing.json, []);

  const empty = await fetchJson('/api/sound_search.php', formRequest({ SearchWord: '' }));
  assert.ok(Array.isArray(empty.json));
  assert.ok(empty.json.length > 0);
  assertSoundRecord(empty.json[0]);
  if (IS_FIXTURE) {
    assert.equal(empty.json.length, 8);
  }
});

test('sound_played increments play_count for a discovered sound', async () => {
  const { playableSound } = await getFixture();
  const before = await fetchJson(`/api/sound_data.php?SoundHash=${encodeHash(playableSound.sound_hash)}`);
  const beforeCount = numberValue(before.json.play_count, 'play_count before sound_played');

  const { response, text } = await fetchText(`/api/action/sound_played.php?SoundHash=${encodeHash(playableSound.sound_hash)}`);
  assert.equal(response.status, 200);
  assert.equal(text, '');

  const after = await fetchJson(`/api/sound_data.php?SoundHash=${encodeHash(playableSound.sound_hash)}`);
  const afterCount = numberValue(after.json.play_count, 'play_count after sound_played');
  assert.ok(afterCount >= beforeCount + 1, `play_count should increment from ${beforeCount} to at least ${beforeCount + 1}`);
  if (IS_FIXTURE) {
    assert.equal(afterCount, beforeCount + 1);
  }
});

test('sound_played missing SoundHash returns an empty array without failing', async () => {
  const { response, json } = await fetchJson('/api/action/sound_played.php');
  assertJsonContentType(response);
  assert.deepEqual(json, []);
});

test('album_sounds returns sounds for an album discovered from the current list', async () => {
  const { albumSound } = await getFixture();
  const { json } = await fetchJson(`/api/album_sounds.php?AlbumHash=${encodeHash(albumSound.album_hash)}`);

  assert.ok(Array.isArray(json));
  assert.ok(json.length > 0);
  if (IS_FIXTURE) {
    assert.deepEqual(json.map((record) => record.title), ['Needle Song One', 'Needle Song Two']);
    assert.deepEqual(json.map((record) => record.track_no), ['1', '2']);
  }
  for (const record of json) {
    assertSoundRecord(record);
    assert.equal(record.album.album_hash, albumSound.album_hash);
  }
});

test('album_sounds handles missing and empty AlbumHash as empty results', async () => {
  const missing = await fetchJson('/api/album_sounds.php');
  assert.deepEqual(missing.json, []);

  const empty = await fetchJson('/api/album_sounds.php?AlbumHash=');
  assert.deepEqual(empty.json, []);
});

test('album_sounds malformed AlbumHash preserves the current PHP fatal-error response', async () => {
  const { response, text } = await fetchText('/api/album_sounds.php?AlbumHash=not-a-real-album');
  assert.ok([200, 500].includes(response.status));
});

test('album_list returns fixture albums with artist data and range boundaries', async () => {
  const normal = await fetchJson('/api/album_list.php', formRequest({ start: '0', end: '3' }));
  assert.ok(Array.isArray(normal.json));
  for (const album of normal.json) {
    assertAlbumListItem(album);
  }
  if (IS_FIXTURE) {
    assert.equal(normal.json.length, 3);
    assert.deepEqual(new Set(normal.json.map((album) => album.title)), new Set([
      'Fixture Album One',
      'Fixture Album Two',
      'Shared Search Album',
    ]));
    assert.ok(normal.json.some((album) => album.album_key === fixtureHash('album1') && album.artist.artist_name === 'Alpha Artist'));
    assert.ok(normal.json.some((album) => album.album_key === fixtureHash('album2') && album.artist.artist_name === 'Beta Artist'));
    assert.ok(normal.json.some((album) => album.album_key === fixtureHash('album3') && album.artist.artist_name === 'Gamma Artist'));
  }

  const zero = await fetchJson('/api/album_list.php', formRequest({ start: '0', end: '0' }));
  assert.deepEqual(zero.json, []);
});

test('album_count_list returns albums ordered by aggregate play count and skips empty album hashes', async () => {
  const { response, json } = await fetchJson('/api/album_count_list.php');
  assertJsonContentType(response);
  assert.ok(Array.isArray(json));
  assert.ok(json.length > 0);
  for (const item of json) {
    assert.equal(typeof item.title, 'string');
    assert.ok(item.title.length > 0);
    assert.equal(typeof item.albumKey, 'string');
    assert.ok(item.albumKey.length > 0);
  }
  if (IS_FIXTURE) {
    assert.deepEqual(json, [
      { title: 'Fixture Album One', albumKey: fixtureHash('album1') },
      { title: 'Fixture Album Two', albumKey: fixtureHash('album2') },
      { title: 'Shared Search Album', albumKey: fixtureHash('album3') },
    ]);
  }
});

test('artist_sounds returns artist tracks in track order and handles missing inputs', async () => {
  const alpha = await fetchJson('/api/artist_sounds.php', formRequest({ ArtistHash: fixtureHash('artistAlpha') }));
  assert.ok(Array.isArray(alpha.json));
  if (IS_FIXTURE) {
    assert.deepEqual(alpha.json.map((record) => record.title), ['Alpha Track One', 'Alpha Track Two', 'Alpha Track Ten']);
    assert.deepEqual(alpha.json.map((record) => record.track_no), ['1', '2', '10']);
  }
  for (const record of alpha.json) {
    assertSoundRecord(record);
  }

  const missing = await fetchJson('/api/artist_sounds.php', { method: 'POST' });
  assert.deepEqual(missing.json, []);
});

test('artist_sounds malformed ArtistHash preserves the current PHP fatal-error response', async () => {
  const { response, text } = await fetchText('/api/artist_sounds.php', formRequest({ ArtistHash: 'not-a-real-artist' }));
  assert.ok([200, 500].includes(response.status));
});

test('artist_list range boundaries return current PHP range behavior', async () => {
  const normal = await fetchJson('/api/artist_list.php', formRequest({ start: '0', end: '1' }));
  assert.ok(Array.isArray(normal.json));
  assert.equal(normal.json.length, 1);
  assertArtistListItem(normal.json[0]);
  if (IS_FIXTURE) {
    assert.equal(normal.json[0].artist_name, 'Alpha Artist');
    assert.equal(normal.json[0].album.title, 'Fixture Album One');
  }

  const upperBoundary = await fetchJson('/api/artist_list.php', formRequest({ start: '0', end: '0' }));
  assert.deepEqual(upperBoundary.json, []);

  const lowerBoundary = await fetchJson('/api/artist_list.php', formRequest({ start: '-1', end: '1' }));
  assert.deepEqual(lowerBoundary.json, []);

  const missingRange = await fetchJson('/api/artist_list.php', { method: 'POST' });
  assert.deepEqual(missingRange.json, []);
});

test('history_range_list returns fixture history in descending play_date order', async () => {
  const { response, json } = await fetchJson('/api/history_range_list.php', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ start: 2, end: 0 }),
  });
  assertJsonContentType(response);
  assert.ok(Array.isArray(json));
  for (const record of json) {
    assertHistoryRecord(record);
  }
  if (IS_FIXTURE) {
    assert.equal(json.length, 2);
    assert.deepEqual(json.map((record) => record.title), FIXTURE.historyTitles);
    assert.ok(timestampValue(json[0].play_date) >= timestampValue(json[1].play_date));
  }
});

test('playlist_action covers names, sounds, create, validation, and delete', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const missingMethod = await fetch(`${BASE_URL}/api/playlist_action.php`, { method: 'POST' });
  assert.equal(missingMethod.status, 400);

  const names = await fetchJson('/api/playlist_action.php', formRequest({ method: 'names' }));
  assert.ok(Array.isArray(names.json));
  assert.ok(names.json.some((item) => item.play_list === 'fixture-list'));

  const sounds = await fetchJson('/api/playlist_action.php', formRequest({ method: 'sounds', name: 'fixture-list' }));
  assert.deepEqual(sounds.json.map((record) => record.title), ['Alpha Track Two', 'Needle Song One']);
  assert.deepEqual(sounds.json.map((record) => record.sound_hash), [fixtureHash('h02'), fixtureHash('h05')]);

  const missingName = await fetch(`${BASE_URL}/api/playlist_action.php`, formRequest({ method: 'sounds' }));
  assert.equal(missingName.status, 400);

  const createMissingSounds = await fetch(`${BASE_URL}/api/playlist_action.php`, formRequest({
    method: 'create',
    playlist_name: 'contract-created',
  }));
  assert.equal(createMissingSounds.status, 400);

  const createBody = new URLSearchParams();
  createBody.set('method', 'create');
  createBody.set('playlist_name', 'contract-created');
  createBody.append('sounds[]', fixtureHash('h01'));
  createBody.append('sounds[]', fixtureHash('h05'));
  const created = await fetchJson('/api/playlist_action.php', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: createBody,
  });
  assert.deepEqual(created.json, { status: 'success', detail: 'playlist created.' });

  const createdSounds = await fetchJson('/api/playlist_action.php', formRequest({ method: 'sounds', name: 'contract-created' }));
  assert.deepEqual(createdSounds.json.map((record) => record.sound_hash), [fixtureHash('h01'), fixtureHash('h05')]);

  const deleteResponse = await fetchText('/api/playlist_action.php', formRequest({ method: 'delete', name: 'contract-created' }));
  assert.equal(deleteResponse.response.status, 200);
  assert.equal(deleteResponse.text, '');
});

test('site_status and lock_status return registration state and fixture counts', async () => {
  const site = await fetchJson('/api/site_status.php');
  assertStatusPayload(site.json, true);

  const lock = await fetchJson('/api/lock_status.php');
  assertStatusPayload(lock.json, false);
  assert.equal(lock.json.regist_status, site.json.regist_status);
  assert.equal(lock.json.regist_status_step1, site.json.regist_status_step1);
  assert.equal(lock.json.regist_status_step2, site.json.regist_status_step2);
});

test('get_setting returns required runtime configuration keys', async () => {
  const { response, json } = await fetchJson('/api/get_setting.php');
  assertJsonContentType(response);
  for (const key of ['db_ip_address', 'db_name', 'db_user', 'db_pass', 'redis_ip_address', 'sound_directory']) {
    assert.ok(Object.hasOwn(json, key), `missing setting: ${key}`);
    assert.equal(typeof json[key], 'string', `${key} should be a string`);
  }
  assert.ok(json.db_ip_address.length > 0);
  assert.ok(json.db_name.length > 0);
  assert.ok(json.db_user.length > 0);
  assert.ok(json.redis_ip_address.length > 0);
  if (IS_FIXTURE) {
    for (const [key, value] of Object.entries(FIXTURE.settings)) {
      assert.equal(json[key], value, `setting ${key} should match CI fixture`);
    }
  }
});

test('audio_pulse_data_list returns an array of supported uploaded pulse filenames', async () => {
  const { response, json } = await fetchJson('/api/audio_pulse_data_list.php');
  assertJsonContentType(response);
  assert.ok(Array.isArray(json));
  for (const fileName of json) {
    assert.equal(typeof fileName, 'string');
    assert.match(fileName, /\.(wav|mp3)$/i);
    assert.equal(fileName.includes('/'), false);
    assert.equal(fileName.includes('\\'), false);
  }
});

test('audio_pulse upload, list, and delete cover success and error branches', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const missingUpload = await fetchJson('/api/audio_pulse_data_upload.php', { method: 'POST' });
  assert.equal(missingUpload.json.status, 'error');
  assert.equal(typeof missingUpload.json.message, 'string');
  assert.ok(missingUpload.json.message.length > 0);

  const badForm = new FormData();
  badForm.append('impulseResponse', new Blob(['not audio'], { type: 'text/plain' }), 'bad.txt');
  const badUpload = await fetchJson('/api/audio_pulse_data_upload.php', { method: 'POST', body: badForm });
  assert.equal(badUpload.json.status, 'error');

  const wavResponse = await fetch(`${BASE_URL}/sound_create/sound.php?media_hash=${encodeHash(fixtureHash('h01'))}`);
  const wavBytes = Buffer.from(await wavResponse.arrayBuffer());
  const goodForm = new FormData();
  goodForm.append('impulseResponse', new Blob([wavBytes], { type: 'audio/wav' }), 'contract-pulse.wav');
  const goodUpload = await fetchJson('/api/audio_pulse_data_upload.php', { method: 'POST', body: goodForm });
  assert.equal(goodUpload.json.status, 'success');

  const listAfterUpload = await fetchJson('/api/audio_pulse_data_list.php');
  assert.ok(Array.isArray(listAfterUpload.json));

  const missingDelete = await fetchJson('/api/audio_pulse_data_delete.php', { method: 'POST' });
  assert.equal(missingDelete.json.status, 'error');

  const notFoundDeleteRaw = await fetchText('/api/audio_pulse_data_delete.php', formRequest({ preset: 'missing-contract-pulse.wav' }));
  const notFoundDelete = parseJsonSuffix(notFoundDeleteRaw.text);
  assert.equal(notFoundDelete.status, 'error');

  const deleteRaw = await fetchText('/api/audio_pulse_data_delete.php', formRequest({ preset: 'contract-pulse.wav' }));
  const deleteJson = parseJsonSuffix(deleteRaw.text);
  assert.equal(deleteJson.status, 'success');
});

test('sound_equalizer_preset.json returns named presets with numeric band values', async () => {
  const { response, json } = await fetchJson('/api//sound_equalizer_preset.json');
  assertJsonContentType(response);
  assert.ok(Object.hasOwn(json, 'Flat'));
  for (const [presetName, bands] of Object.entries(json)) {
    assert.equal(typeof presetName, 'string');
    assert.ok(presetName.length > 0);
    assert.ok(Array.isArray(bands), `${presetName} should be an array`);
    assert.ok(bands.length > 0, `${presetName} should have at least one band`);
    for (const band of bands) {
      assert.equal(typeof band.hz, 'number');
      assert.ok(band.hz > 0);
      assert.ok(band.hz <= 24000);
      assert.equal(typeof band.gain, 'number');
      assert.ok(band.gain >= -100);
      assert.ok(band.gain <= 100);
    }
  }
});

test('album_art returns album art and blank fallback as PNG', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const found = await fetch(`${BASE_URL}/img/album_art.php?media_hash=${encodeHash(fixtureHash('album1'))}`);
  const foundBuffer = Buffer.from(await found.arrayBuffer());
  assert.equal(found.status, 200);
  assertPngResponse(found, foundBuffer);

  const noParam = await fetch(`${BASE_URL}/img/album_art.php`);
  const noParamBuffer = Buffer.from(await noParam.arrayBuffer());
  assert.equal(noParam.status, 200);
  assertPngResponse(noParam, noParamBuffer);

  const noArt = await fetch(`${BASE_URL}/img/album_art.php?media_hash=${encodeHash(fixtureHash('album2'))}`);
  const noArtBuffer = Buffer.from(await noArt.arrayBuffer());
  assert.equal(noArt.status, 200);
  assertPngResponse(noArt, noArtBuffer);
});

test('playlist_art returns playlist art and blank fallback as PNG', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const found = await fetch(`${BASE_URL}/img/playlist_art.php?playlist=fixture-list`);
  const foundBuffer = Buffer.from(await found.arrayBuffer());
  assert.equal(found.status, 200);
  assertPngResponse(found, foundBuffer);

  const missing = await fetch(`${BASE_URL}/img/playlist_art.php?playlist=missing-list`);
  const missingBuffer = Buffer.from(await missing.arrayBuffer());
  assert.equal(missing.status, 200);
  assertPngResponse(missing, missingBuffer);
});

test('fontisto endpoint returns font bytes', async () => {
  const response = await fetch(`${BASE_URL}/img/fontisto.php`);
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /font\/ttf|application\/octet-stream/i);
  assert.ok(buffer.length > 1000);
});

test('sound stream supports byte-range boundary requests for a discovered sound', async () => {
  const { playableSound } = await getFixture();
  const path = `${BASE_URL}/sound_create/sound.php?media_hash=${encodeHash(playableSound.sound_hash)}`;

  const firstByte = await fetch(path, { headers: { Range: 'bytes=0-0' } });
  const firstBuffer = Buffer.from(await firstByte.arrayBuffer());
  assert.equal(firstByte.status, 200);
  assert.match(firstByte.headers.get('content-type') || '', /^audio\//);
  assert.equal(firstByte.headers.get('accept-ranges'), 'bytes');
  assert.equal(firstByte.headers.get('content-length'), '1');
  assert.equal(firstBuffer.length, 1);

  const secondByte = await fetch(path, { headers: { Range: 'bytes=1-1' } });
  const secondBuffer = Buffer.from(await secondByte.arrayBuffer());
  assert.equal(secondByte.status, 206);
  assert.match(secondByte.headers.get('content-range') || '', /^bytes 1-1\/\d+$/);
  assert.equal(secondByte.headers.get('content-length'), '1');
  assert.equal(secondBuffer.length, 1);
});

test('sound stream returns 404 when media_hash is omitted', async () => {
  const response = await fetch(`${BASE_URL}/sound_create/sound.php`);
  assert.equal(response.status, 404);
});

test('sound stream malformed media_hash preserves the current PHP fatal-error response', async () => {
  const response = await fetch(`${BASE_URL}/sound_create/sound.php?media_hash=not-a-real-sound`);
  const text = await response.text();
  assert.ok([200, 500].includes(response.status));
});

test('sound_regist returns current count for full scan and single-sound refresh', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const fullScan = await fetchJson('/api/sound_regist.php');
  assert.deepEqual(fullScan.json, { count: 8 });

  const single = await fetchJson(`/api/sound_regist.php?soundhash=${encodeHash(fixtureHash('h01'))}`);
  assert.deepEqual(single.json, { count: 8 });
});

test('websocket sends status on open and broadcasts client messages', { timeout: 10000 }, async () => {
  const first = new WebSocket(WS_URL);
  const second = new WebSocket(WS_URL);
  const firstMessages = [];
  const secondMessages = [];

  try {
    first.on('message', (data) => firstMessages.push(JSON.parse(data.toString())));
    second.on('message', (data) => secondMessages.push(JSON.parse(data.toString())));

    await Promise.all([waitForOpen(first), waitForOpen(second)]);
    await waitFor(() => firstMessages.length > 0 && secondMessages.length > 0);

    assertStatusEnvelope(firstMessages[0]);
    assertStatusEnvelope(secondMessages[0]);

    const message = { contractTest: true, boundary: 'broadcast', time: Date.now() };
    first.send(JSON.stringify(message));
    await waitFor(() => secondMessages.some((item) => item.context && item.context.message));

    const broadcast = secondMessages.find((item) => item.context && item.context.message);
    assert.deepEqual(broadcast.context.message, message);
    assertStatusContext(broadcast.context);
  } finally {
    first.close();
    second.close();
  }
});

test('websocket sends periodic status with expected fixture counts', { timeout: 12000 }, async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const socket = new WebSocket(WS_URL);
  const messages = [];

  try {
    socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
    await waitForOpen(socket);
    await waitFor(() => messages.length > 0);
    assertStatusEnvelope(messages[0]);

    const firstTime = messages[0].time;
    await waitFor(() => messages.some((message) => message.time >= firstTime + 4500), 8000);
    const periodic = messages.find((message) => message.time >= firstTime + 4500);
    assertStatusEnvelope(periodic);
    assert.ok(periodic.time >= firstTime + 4500);
    assert.equal(Object.hasOwn(periodic.context, 'message'), false);
  } finally {
    socket.close();
  }
});

test('setup_database_table recreates schema successfully in fixture environment', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const { response, json } = await fetchJson('/api/setup_database_table.php', { method: 'POST' });
  assertJsonContentType(response);
  assert.deepEqual(json, { status: 'success' });
});

test('update_setting rewrites setting.ini with posted values', async () => {
  if (!IS_FIXTURE) {
    return;
  }

  const update = await fetchText('/api/update_setting.php', formRequest({
    db_ip_address: 'soundowl-db',
    db_name: 'sound',
    db_user: 'root',
    db_pass: 'sound',
    redis_ip_address: 'soundowl-redis',
    sound_directory: '/music',
    exclusionPaths: 'NONE',
    websocket_retry_count: '9',
    websocket_retry_interval: '4321',
  }));
  assert.equal(update.response.status, 200);
  assert.equal(update.text, '');

  const setting = await fetchJson('/api/get_setting.php');
  assert.equal(setting.json.websocket_retry_count, '9');
  assert.equal(setting.json.websocket_retry_interval, '4321');
  assert.equal(setting.json.exclusionPaths, 'NONE');
});

function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
}

function waitFor(predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for condition'));
      }
    }, 50);
  });
}

function assertStatusEnvelope(message) {
  assert.equal(typeof message.time, 'number');
  assertStatusContext(message.context);
}

function assertStatusContext(context) {
  assert.equal(typeof context.regist_status, 'boolean');
  assert.equal(typeof context.regist_status_step1, 'boolean');
  assert.equal(typeof context.regist_status_step2, 'boolean');
  assert.equal(typeof context.regist_data_count, 'object');
  assert.equal(typeof context.regist_data_count.sound, 'number');
  assert.equal(typeof context.regist_data_count.artist, 'number');
  assert.equal(typeof context.regist_data_count.album, 'number');
  assert.equal(typeof context.regist_data_count.analysis_sound, 'number');
  assert.ok(context.regist_data_count.sound >= 0);
  assert.ok(context.regist_data_count.artist >= 0);
  assert.ok(context.regist_data_count.album >= 0);
  assert.ok(context.regist_data_count.analysis_sound >= 0);
  assert.equal(typeof context.websocket, 'object');
  assert.ok(Object.hasOwn(context.websocket, 'retry_count'));
  assert.ok(Object.hasOwn(context.websocket, 'retry_interval'));
  assert.ok(numberValue(context.websocket.retry_count, 'websocket.retry_count') >= 0);
  assert.ok(numberValue(context.websocket.retry_interval, 'websocket.retry_interval') >= 0);
  if (IS_FIXTURE) {
    assert.equal(context.regist_data_count.sound, 8);
    assert.equal(context.regist_data_count.artist, 4);
    assert.equal(context.regist_data_count.album, 3);
    assert.equal(context.regist_data_count.analysis_sound, 6);
  }
}
