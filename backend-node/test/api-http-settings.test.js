const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Writable } = require('node:stream');
const { createSettingsStore, normalizeSettings, stripBom } = require('../src/api/settingsStore');
const { PulseStore, isSupportedPulse } = require('../src/api/pulseStore');
const { LockService } = require('../src/api/lockService');
const { createHttpServer, parseForm, parseMultipart, readBody, routeRequest, streamFileResponse, toApiRequest, writeResponse } = require('../src/api/httpServer');

test('settingsStore reads and writes JSON settings as API-compatible string values', async () => {
  assert.deepEqual(normalizeSettings({ a: 'b', num: 7, empty: null }), { a: 'b', num: '7', empty: '' });
  assert.deepEqual(normalizeSettings(null), {});
  const file = await tempPath('setting.json');
  const store = createSettingsStore(file);
  await store.write({ db_name: 'sound', websocket_retry_count: 7 });
  assert.deepEqual(await store.read(), { db_name: 'sound', websocket_retry_count: '7' });
  await fs.writeFile(file, `\uFEFF${JSON.stringify({ db_name: 'sound-bom' })}`);
  assert.deepEqual(await store.read(), { db_name: 'sound-bom' });
  assert.equal(stripBom('\uFEFF{"ok":true}'), '{"ok":true}');
});

test('PulseStore lists, uploads, rejects, and deletes supported pulse files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-pulse-'));
  await fs.writeFile(path.join(dir, 'a.wav'), 'a');
  await fs.writeFile(path.join(dir, 'note.txt'), 'x');
  const store = new PulseStore(dir);

  assert.deepEqual(await store.list(), ['a.wav']);
  assert.equal(isSupportedPulse('a.wav', 'audio/wav'), true);
  assert.equal(isSupportedPulse('a.txt', 'text/plain'), false);
  assert.equal(isSupportedPulse(null, null), false);
  assert.equal(isSupportedPulse('a.wav', null), false);
  assert.equal((await store.upload({ filename: 'b.mp3', mime: 'audio/mpeg', buffer: Buffer.from('b') })).status, 'success');
  assert.equal((await store.upload({ filename: 'bad.txt', mime: 'text/plain', buffer: Buffer.from('b') })).status, 'error');
  assert.equal((await store.delete('b.mp3')).status, 'success');
  assert.equal((await store.delete('missing.mp3')).status, 'error');
});

test('LockService reports in-memory registration and worker states', async () => {
  const service = new LockService();
  assert.deepEqual(await service.status(), { regist_status: false, regist_status_step1: false, regist_status_step2: false });
  const releaseStep1 = service.beginStep1();
  const releaseStep2 = service.beginStep2();
  assert.deepEqual(await service.status(), { regist_status: true, regist_status_step1: true, regist_status_step2: true });
  releaseStep1();
  assert.deepEqual(await service.status(), { regist_status: true, regist_status_step1: false, regist_status_step2: true });
  releaseStep2();
  releaseStep2();
  assert.deepEqual(await service.status(), { regist_status: false, regist_status_step1: false, regist_status_step2: false });
});

test('http helpers parse forms, multipart bodies, route requests, and write response types', async () => {
  assert.deepEqual(parseForm('a=1&a=2&sounds[]=x&sounds[]=y'), { a: ['1', '2'], sounds: ['x', 'y'] });
  assert.deepEqual(parseMultipart('body', 'multipart/form-data'), {});
  const noFileMultipart = [
    '--abc',
    'Content-Disposition: form-data; name="plain"',
    '',
    'value',
    '--abc--',
    '',
  ].join('\r\n');
  assert.deepEqual(parseMultipart(noFileMultipart, 'multipart/form-data; boundary=abc'), {});
  const multipart = [
    '--abc',
    'Content-Disposition: form-data; name="impulseResponse"; filename="a.wav"',
    '',
    'data',
    '--abc--',
    '',
  ].join('\r\n');
  assert.equal(parseMultipart(multipart, 'multipart/form-data; boundary=abc').impulseResponse.mime, 'application/octet-stream');

  const handlers = {
    getSetting: vi.fn(async () => ({ status: 200, headers: {}, body: { ok: true } })),
    soundEqualizerPreset: vi.fn(async () => ({ status: 200, headers: {}, body: { preset: true } })),
    placeholderImage: vi.fn(async () => ({ status: 200, headers: {}, body: Buffer.from('webp') })),
  };
  assert.deepEqual(await routeRequest(handlers, { path: '/missing' }), { status: 404, headers: { 'content-type': 'text/plain' }, body: 'not found' });
  assert.deepEqual(await routeRequest(handlers, { path: '/api/get_setting.php' }), { status: 200, headers: {}, body: { ok: true } });
  assert.deepEqual(await routeRequest(handlers, { path: '/api/sound_equalizer_preset.json' }), { status: 200, headers: {}, body: { preset: true } });
  assert.equal((await routeRequest(handlers, { path: '/img/placeholder-image.webp' })).body.toString(), 'webp');

  const jsonRes = fakeResponse();
  await writeResponse(jsonRes, { status: 200, headers: {}, body: { ok: true } });
  assert.equal(jsonRes.body, '{"ok":true}');
  const textRes = fakeResponse();
  await writeResponse(textRes, { status: 200, headers: {}, body: 'ok' });
  assert.equal(textRes.body, 'ok');
  const bufferRes = fakeResponse();
  await writeResponse(bufferRes, { status: 200, headers: {}, body: Buffer.from('b') });
  assert.equal(bufferRes.body.toString(), 'b');
  const emptyRes = fakeResponse();
  await writeResponse(emptyRes, { status: 204, headers: {}, body: null });
  assert.equal(emptyRes.body, undefined);

  const streamFile = await tempPath('stream.txt');
  await fs.writeFile(streamFile, 'abcdef');
  const streamRes = fakeWritableResponse();
  await writeResponse(streamRes, { status: 206, headers: {}, body: { streamPath: streamFile, range: { start: 1, end: 3 } } });
  assert.equal(streamRes.body.toString(), 'bcd');

  const errorRes = fakeWritableResponse();
  await assert.rejects(streamFileResponse(errorRes, path.join(path.dirname(streamFile), 'missing.txt')), /File not found/);
  assert.match(errorRes.body.toString(), /File not found/);

  const missingAfterHeadersRes = fakeWritableResponse();
  missingAfterHeadersRes.headersSent = true;
  await assert.rejects(streamFileResponse(missingAfterHeadersRes, path.join(path.dirname(streamFile), 'missing-again.txt')), /File not found/);
});

test('toApiRequest reads json urlencoded multipart and readBody error branches', async () => {
  assert.deepEqual((await toApiRequest(fakeRequest('/x?a=1', 'GET', '', ''))).query, { a: '1' });
  assert.deepEqual((await toApiRequest(fakeRequest('/x', 'POST', 'a=1', 'application/x-www-form-urlencoded'))).form, { a: '1' });
  assert.deepEqual((await toApiRequest(fakeRequest('/x', 'POST', '{"a":1}', 'application/json'))).body, { a: 1 });
  const multipart = [
    '--abc',
    'Content-Disposition: form-data; name="impulseResponse"; filename="a.wav"',
    'Content-Type: audio/wav',
    '',
    'data',
    '--abc--',
    '',
  ].join('\r\n');
  assert.equal((await toApiRequest(fakeRequest('/x', 'POST', multipart, 'multipart/form-data; boundary=abc'))).file.filename, 'a.wav');

  const failing = new EventEmitter();
  failing.setEncoding = () => {};
  const promise = readBody(failing);
  failing.emit('error', new Error('boom'));
  await assert.rejects(promise, /boom/);
});

test('createHttpServer writes handler result and converts thrown errors to JSON 500', async () => {
  const okServer = createHttpServer({ getSetting: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } }) });
  const okRes = fakeResponse();
  okServer.emit('request', fakeRequest('/api/get_setting.php', 'GET', '', ''), okRes);
  await waitForEnd(okRes);
  assert.equal(okRes.status, 200);

  const badServer = createHttpServer({ getSetting: async () => { throw new Error('bad'); } });
  const badRes = fakeResponse();
  badServer.emit('request', fakeRequest('/api/get_setting.php', 'GET', '', ''), badRes);
  await waitForEnd(badRes);
  assert.equal(badRes.status, 500);
  assert.match(badRes.body, /bad/);
});

function fakeRequest(url, method, body, contentType) {
  const req = new EventEmitter();
  req.url = url;
  req.method = method;
  req.headers = contentType ? { 'content-type': contentType } : {};
  req.setEncoding = () => {};
  process.nextTick(() => {
    if (body) {
      req.emit('data', body);
    }
    req.emit('end');
  });
  return req;
}

function fakeResponse() {
  const res = new EventEmitter();
  res.writeHead = (status, headers) => {
    res.status = status;
    res.headers = headers;
  };
  res.end = (body) => {
    res.body = body;
    res.emit('finish');
  };
  return res;
}

function fakeWritableResponse() {
  const chunks = [];
  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });
  res.headersSent = false;
  res.writeHead = (status, headers) => {
    res.status = status;
    res.headers = headers;
    res.headersSent = true;
  };
  const originalEnd = res.end.bind(res);
  res.end = (body) => {
    if (body) {
      chunks.push(Buffer.from(body));
    }
    res.body = Buffer.concat(chunks);
    originalEnd();
    res.emit('finish');
  };
  res.on('finish', () => {
    res.body = Buffer.concat(chunks);
  });
  return res;
}

function waitForEnd(res) {
  return new Promise((resolve) => res.once('finish', resolve));
}

async function tempPath(name) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-settings-'));
  return path.join(dir, name);
}
