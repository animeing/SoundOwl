const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApiHandlers, hasRange, json, text, binary, statusPayload } = require('../src/api/handlers');
const { compressHash } = require('../src/utils/hash');

test('response helpers and range predicate return explicit response DTOs', () => {
  assert.equal(hasRange({ start: '0', end: '2' }), true);
  assert.equal(hasRange({ start: 'x', end: '2' }), false);
  assert.deepEqual(json({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } });
  assert.deepEqual(text(''), { status: 200, headers: { 'content-type': 'text/plain' }, body: '' });
  assert.deepEqual(binary(Buffer.from('a'), 'image/png', 201, { x: 'y' }), {
    status: 201,
    headers: { 'content-type': 'image/png', x: 'y' },
    body: Buffer.from('a'),
  });
});

test('statusPayload includes counts only when requested', async () => {
  const repository = {
    countSounds: vi.fn(async () => 8),
    countArtists: vi.fn(async () => 4),
    countAlbums: vi.fn(async () => 3),
    countAnalysisSounds: vi.fn(async () => 6),
  };
  const lockService = { status: vi.fn(async () => ({ regist_status: true, regist_status_step1: true, regist_status_step2: false })) };
  const settingsStore = { read: vi.fn(async () => ({ websocket_retry_count: '7', websocket_retry_interval: '1234' })) };

  assert.deepEqual(await statusPayload(repository, lockService, true, settingsStore), {
    regist_status: true,
    regist_status_step1: true,
    regist_status_step2: false,
    regist_data_count: { sound: 8, artist: 4, album: 3, analysis_sound: 6 },
    websocket: { retry_count: '7', retry_interval: '1234' },
  });
  assert.deepEqual(await statusPayload(repository, lockService, false, { read: vi.fn(async () => ({})) }), {
    regist_status: true,
    regist_status_step1: true,
    regist_status_step2: false,
    websocket: { retry_count: 0, retry_interval: 10000 },
  });
  assert.deepEqual(await statusPayload(repository, lockService, false), {
    regist_status: true,
    regist_status_step1: true,
    regist_status_step2: false,
  });
});

test('handlers cover status settings setup sound list detail search play and registration paths', async () => {
  const h01 = '8e002bf5f50db0553d82bc67e9225ef2b7ab1611';
  const repository = fullRepositoryMock();
  const settingsStore = {
    read: vi.fn(async () => ({ sound_directory: '/music', exclusionPaths: 'skip|RECYCLE.BIN' })),
    write: vi.fn(async () => {}),
  };
  const schemaService = { create: vi.fn(async () => {}) };
  const registrar = {
    refreshByHash: vi.fn(async (hash) => ({ count: hash === h01 ? 8 : 0 })),
    registerDirectory: vi.fn(async () => ({ count: 8 })),
  };
  const handlers = createApiHandlers({
    repository,
    settingsStore,
    schemaService,
    registrar,
    mediaService: mediaMock(),
    pulseStore: pulseMock(),
    lockService: {
      status: vi.fn(async () => ({ regist_status: false, regist_status_step1: false, regist_status_step2: false })),
      beginStep1: vi.fn(() => vi.fn()),
    },
    fontPath: await tempFile('font'),
    placeholderImagePath: await tempFile('webp'),
    equalizerPresetPath: await tempJson({ Flat: [{ hz: 1000, gain: 0 }] }),
  });

  assert.equal((await handlers.siteStatus()).body.regist_data_count.sound, 8);
  assert.equal((await handlers.lockStatus()).body.regist_status, false);
  assert.deepEqual((await handlers.getSetting()).body, { sound_directory: '/music', exclusionPaths: 'skip|RECYCLE.BIN' });
  assert.equal((await handlers.updateSetting({ form: { a: 'b' } })).body, '');
  assert.equal(settingsStore.write.mock.calls[0][0].a, 'b');
  assert.deepEqual((await handlers.setupDatabaseTable()).body, { status: 'success' });
  assert.deepEqual((await handlers.soundAddtimeList()).body, ['add']);
  assert.deepEqual((await handlers.playCountList()).body, ['play']);
  assert.deepEqual((await handlers.soundData({ query: {} })).body, []);
  assert.deepEqual((await handlers.soundData({ query: { SoundHash: compressHash(h01) } })).body, { sound_hash: h01 });
  repository.findSoundDetail.mockResolvedValueOnce(null);
  assert.deepEqual((await handlers.soundData({ query: { SoundHash: compressHash(h01) } })).body, []);
  assert.deepEqual((await handlers.soundSearch({ form: {} })).body, []);
  assert.deepEqual((await handlers.soundSearch({ form: { SearchWord: '' } })).body, ['search']);
  assert.deepEqual((await handlers.soundPlayed({ query: {} })).body, []);
  assert.equal((await handlers.soundPlayed({ query: { SoundHash: compressHash(h01) } })).body, '');
  assert.deepEqual((await handlers.soundRegist({ query: { soundhash: compressHash(h01) } })).body, { count: 8 });
  assert.deepEqual((await handlers.soundRegist({ query: {} })).body, { count: 8 });
  assert.equal(registrar.registerDirectory.mock.calls[0][0], '/music');
  assert.deepEqual(registrar.registerDirectory.mock.calls[0][1], ['skip', 'RECYCLE.BIN']);
});

test('soundRegist still works when no runtime lock state service is injected', async () => {
  const handlers = createApiHandlers({
    repository: fullRepositoryMock(),
    settingsStore: { read: vi.fn(async () => ({ sound_directory: '/music', exclusionPaths: '' })), write: vi.fn() },
    schemaService: { create: vi.fn() },
    registrar: { refreshByHash: vi.fn(), registerDirectory: vi.fn(async () => ({ count: 1 })) },
    mediaService: mediaMock(),
    pulseStore: pulseMock(),
    lockService: { status: vi.fn() },
    fontPath: await tempFile('font'),
    placeholderImagePath: await tempFile('webp'),
    equalizerPresetPath: await tempJson({}),
  });

  assert.deepEqual((await handlers.soundRegist({ query: {} })).body, { count: 1 });
});

test('handlers cover artist album history playlist pulse media and binary paths', async () => {
  const h01 = '8e002bf5f50db0553d82bc67e9225ef2b7ab1611';
  const handlers = createApiHandlers({
    repository: fullRepositoryMock(),
    settingsStore: { read: vi.fn(), write: vi.fn() },
    schemaService: { create: vi.fn() },
    registrar: { refreshByHash: vi.fn(), registerDirectory: vi.fn() },
    mediaService: mediaMock(),
    pulseStore: pulseMock(),
    lockService: { status: vi.fn() },
    fontPath: await tempFile('fontdata'),
    placeholderImagePath: await tempFile('webpdata'),
    equalizerPresetPath: await tempJson({ Flat: [{ hz: 1000, gain: 0 }] }),
  });

  assert.deepEqual((await handlers.artistList({ form: {} })).body, []);
  assert.deepEqual((await handlers.artistList({ form: { start: '0', end: '1' } })).body, ['artist']);
  assert.deepEqual((await handlers.artistSounds({ form: {} })).body, []);
  assert.deepEqual((await handlers.artistSounds({ form: { ArtistHash: compressHash(h01) } })).body, ['artistSound']);
  assert.deepEqual((await handlers.albumList({ form: {} })).body, []);
  assert.deepEqual((await handlers.albumList({ form: { start: '0', end: '1' } })).body, ['album']);
  assert.deepEqual((await handlers.albumSounds({ query: {} })).body, []);
  assert.deepEqual((await handlers.albumSounds({ query: { AlbumHash: compressHash(h01) } })).body, ['albumSound']);
  assert.deepEqual((await handlers.albumCountList()).body, ['albumCount']);
  assert.deepEqual((await handlers.historyRangeList({ body: { start: 2, end: 0 } })).body, ['history']);

  assert.equal((await handlers.playlistAction({ form: {} })).status, 400);
  assert.deepEqual((await handlers.playlistAction({ form: { method: 'names' } })).body, ['names']);
  assert.equal((await handlers.playlistAction({ form: { method: 'sounds' } })).status, 400);
  assert.deepEqual((await handlers.playlistAction({ form: { method: 'sounds', name: 'p' } })).body, ['playlistSound']);
  assert.equal((await handlers.playlistAction({ form: { method: 'create', playlist_name: 'p' } })).status, 400);
  assert.deepEqual((await handlers.playlistAction({ form: { method: 'create', playlist_name: 'p', sounds: [compressHash(h01)] } })).body, { status: 'success', detail: 'playlist created.' });
  assert.equal((await handlers.playlistAction({ form: { method: 'delete' } })).status, 400);
  assert.equal((await handlers.playlistAction({ form: { method: 'delete', name: 'p' } })).body, '');

  assert.deepEqual((await handlers.audioPulseDataList()).body, ['pulse.wav']);
  assert.equal((await handlers.audioPulseDataUpload({})).body.status, 'error');
  assert.equal((await handlers.audioPulseDataUpload({ file: null })).body.status, 'error');
  assert.equal((await handlers.audioPulseDataUpload({ file: { filename: 'a.wav', mime: 'audio/wav', buffer: Buffer.from('a') } })).body.status, 'success');
  assert.equal((await handlers.audioPulseDataDelete({ form: {} })).body.status, 'error');
  assert.equal((await handlers.audioPulseDataDelete({ form: { preset: 'a.wav' } })).body.status, 'success');

  assert.deepEqual((await handlers.soundEqualizerPreset()).body, { Flat: [{ hz: 1000, gain: 0 }] });
  assert.equal((await handlers.albumArt({ query: {} })).headers['content-type'], 'image/png');
  assert.equal((await handlers.albumArt({ query: { media_hash: compressHash(h01) } })).headers['X-Cache-Load'], 'True');
  assert.equal((await handlers.playlistArt({ query: { playlist: 'p' } })).headers['content-type'], 'image/png');
  assert.equal((await handlers.fontisto()).body.toString(), 'fontdata');
  assert.equal((await handlers.placeholderImage()).headers['content-type'], 'image/webp');
  assert.equal((await handlers.placeholderImage()).body.toString(), 'webpdata');
  assert.equal((await handlers.soundStream({ query: {}, headers: {} })).status, 404);
  await assert.rejects(handlers.soundStream({ query: { media_hash: 'not-a-real-sound' }, headers: {} }), /Invalid media_hash/);
  assert.equal((await handlers.soundStream({ query: { media_hash: compressHash(h01) }, headers: { range: 'bytes=1-1' } })).status, 206);
  const notFoundMedia = mediaMock();
  notFoundMedia.prepareSoundStream.mockResolvedValueOnce({ status: 404 });
  const notFoundHandlers = createApiHandlers({
    repository: fullRepositoryMock(),
    settingsStore: { read: vi.fn(), write: vi.fn() },
    schemaService: { create: vi.fn() },
    registrar: { refreshByHash: vi.fn(), registerDirectory: vi.fn() },
    mediaService: notFoundMedia,
    pulseStore: pulseMock(),
    lockService: { status: vi.fn() },
    fontPath: await tempFile('fontdata'),
    placeholderImagePath: await tempFile('webpdata'),
    equalizerPresetPath: await tempJson({}),
  });
  assert.equal((await notFoundHandlers.soundStream({ query: { media_hash: compressHash(h01) }, headers: {} })).status, 404);
});

function fullRepositoryMock() {
  return {
    countSounds: vi.fn(async () => 8),
    countArtists: vi.fn(async () => 4),
    countAlbums: vi.fn(async () => 3),
    listSoundsByAddTime: vi.fn(async () => ['add']),
    listSoundsByPlayCount: vi.fn(async () => ['play']),
    findSoundDetail: vi.fn(async (hash) => ({ sound_hash: hash })),
    searchSounds: vi.fn(async () => ['search']),
    incrementPlayCount: vi.fn(async () => {}),
    listArtists: vi.fn(async () => ['artist']),
    listArtistSounds: vi.fn(async () => ['artistSound']),
    listAlbums: vi.fn(async () => ['album']),
    listAlbumSounds: vi.fn(async () => ['albumSound']),
    listAlbumsByPlayCount: vi.fn(async () => ['albumCount']),
    listHistory: vi.fn(async () => ['history']),
    listPlaylistNames: vi.fn(async () => ['names']),
    listPlaylistSounds: vi.fn(async () => ['playlistSound']),
    createPlaylist: vi.fn(async () => {}),
    deletePlaylist: vi.fn(async () => {}),
  };
}

function mediaMock() {
  return {
    getAlbumArt: vi.fn(async (hash) => ({ status: 200, mime: 'image/png', body: Buffer.from('png'), cacheLoad: Boolean(hash) })),
    getPlaylistArt: vi.fn(async () => ({ status: 200, mime: 'image/png', body: Buffer.from('png') })),
    prepareSoundStream: vi.fn(async () => ({ status: 206, headers: { 'content-type': 'audio/wav' }, path: '/music/a.wav', range: { start: 1, end: 1 } })),
  };
}

function pulseMock() {
  return {
    list: vi.fn(async () => ['pulse.wav']),
    upload: vi.fn(async () => ({ status: 'success', message: 'ok' })),
    delete: vi.fn(async () => ({ status: 'success', message: 'ok' })),
  };
}

async function tempFile(content) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-api-'));
  const file = path.join(dir, 'file');
  await fs.writeFile(file, content);
  return file;
}

async function tempJson(value) {
  const file = await tempFile(JSON.stringify(value));
  return file;
}
