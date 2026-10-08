import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { createSettingsStore, normalizeSettings, normalizeStringArray, repairLatin1Mojibake, stripBom } from '../src/api/settingsStore.js';
import { PulseStore, isSupportedPulse } from '../src/api/pulseStore.js';
import { LockService } from '../src/api/lockService.js';
import { createHttpServer, corsHeaders, decodeMultipartText, errorResponse, parseForm, parseMultipart, readBody, streamFileResponse, toApiRequest, writeResponse, withCors } from '../src/api/httpServer.js';

test('settingsStore reads and writes JSON settings while preserving Japanese arrays', async () => {
  const mojibakeSample = Buffer.from('譁・ｭ怜喧縺大ｾｩ蜈ア', 'utf8').toString('latin1');
  assert.deepEqual(normalizeSettings({ a: 'b', num: 7, empty: null, exclusionPaths: ['髯､螟悶ヱ繧ｹA', '髯､螟悶ヱ繧ｹB'] }), {
    a: 'b',
    num: '7',
    empty: '',
    exclusionPaths: ['髯､螟悶ヱ繧ｹA', '髯､螟悶ヱ繧ｹB'],
  });
  assert.deepEqual(normalizeSettings({ customList: ['a', 'b', null, ''] }), { customList: ['a', 'b'] });
  assert.equal(repairLatin1Mojibake(mojibakeSample), '譁・ｭ怜喧縺大ｾｩ蜈ア');
  assert.equal(repairLatin1Mojibake('plain ascii'), 'plain ascii');
  assert.equal(repairLatin1Mojibake('ﾃｿ'), 'ﾃｿ');
  assert.deepEqual(normalizeStringArray(`ignored-dir-a|${mojibakeSample}`), ['ignored-dir-a', '譁・ｭ怜喧縺大ｾｩ蜈ア']);
  assert.deepEqual(normalizeStringArray(null), []);
  assert.deepEqual(normalizeSettings(null), {});
  const file = await tempPath('setting.json');
  const store = createSettingsStore(file);
  await store.write({ db_name: 'sound', websocket_retry_count: 7, exclusionPaths: ['髯､螟悶ヱ繧ｹC', '髯､螟悶ヱ繧ｹB'] });
  assert.deepEqual(await store.read(), { db_name: 'sound', websocket_retry_count: '7', exclusionPaths: ['髯､螟悶ヱ繧ｹC', '髯､螟悶ヱ繧ｹB'] });
  await fs.writeFile(file, JSON.stringify({ exclusionPaths: [mojibakeSample] }));
  assert.deepEqual(await store.read(), { exclusionPaths: ['譁・ｭ怜喧縺大ｾｩ蜈ア'] });
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
  assert.deepEqual(parseForm('a=1&a=2&sounds[]=x&sounds[]=y&SearchWord=%E6%A4%9C%E7%B4%A2%E8%AA%9EA'), { a: ['1', '2'], sounds: ['x', 'y'], SearchWord: '\u691c\u7d22\u8a9eA' });
  assert.deepEqual(parseForm(''), {});
  assert.deepEqual(parseForm('flag&encoded=a%2Bb+c'), { flag: '', encoded: 'a+b c' });
  assert.equal(decodeMultipartText(Buffer.from('繝・せ繝磯浹貅・wav', 'utf8').toString('binary')), '繝・せ繝磯浹貅・wav');
  assert.deepEqual(parseMultipart('body', 'multipart/form-data'), {});
  const noFileMultipart = [
    '--abc',
    'Content-Disposition: form-data; name="plain"',
    '',
    'value',
    '--abc--',
    '',
  ].join('\r\n');
  assert.deepEqual(parseMultipart(noFileMultipart, 'multipart/form-data; boundary=abc'), { fields: { plain: 'value' } });
  const unnamedMultipart = [
    '--abc',
    'Content-Disposition: form-data',
    '',
    'value',
    '--abc--',
    '',
  ].join('\r\n');
  assert.deepEqual(parseMultipart(unnamedMultipart, 'multipart/form-data; boundary=abc'), {});
  const multipart = [
    '--abc',
    'Content-Disposition: form-data; name="method"',
    '',
    'create',
    '--abc',
    'Content-Disposition: form-data; name="sounds[]"',
    '',
    's1',
    '--abc',
    'Content-Disposition: form-data; name="sounds[]"',
    '',
    's2',
    '--abc',
    `Content-Disposition: form-data; name="impulseResponse"; filename="${Buffer.from('繝・せ繝磯浹貅・wav', 'utf8').toString('binary')}"`,
    '',
    'data',
    '--abc--',
    '',
  ].join('\r\n');
  const parsedMultipart = parseMultipart(multipart, 'multipart/form-data; boundary=abc');
  assert.deepEqual(parsedMultipart.fields, { method: 'create', sounds: ['s1', 's2'] });
  assert.equal(parsedMultipart.impulseResponse.filename, '繝・せ繝磯浹貅・wav');
  assert.equal(parsedMultipart.impulseResponse.mime, 'application/octet-stream');

  const handlers = {
    getSetting: vi.fn(async () => ({ status: 200, headers: {}, body: { ok: true } })),
    soundEqualizerPreset: vi.fn(async () => ({ status: 200, headers: {}, body: { preset: true } })),
    fontisto: vi.fn(async () => ({ status: 200, headers: {}, body: Buffer.from('font') })),
    placeholderImage: vi.fn(async () => ({ status: 200, headers: {}, body: Buffer.from('webp') })),
  };
  assert.equal(corsHeaders({ headers: { origin: 'http://127.0.0.1:8081' } })['access-control-allow-origin'], 'http://127.0.0.1:8081');
  assert.deepEqual(corsHeaders({ headers: { origin: 'http://evil.local' } }, { allowOrigins: ['http://127.0.0.1:8081'] }), {});
  assert.equal(withCors({ status: 200, headers: {}, body: '' }, { headers: { origin: 'http://127.0.0.1:8081' } }).headers.vary, 'Origin');
  assert.equal(errorResponse(new Error('plain'), { headers: {} }, {}).status, 500);
  const tooLarge = new Error('too large');
  tooLarge.status = 413;
  assert.equal(errorResponse(tooLarge, { headers: {} }, {}).status, 413);

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
  const fullStreamRes = fakeWritableResponse();
  await streamFileResponse(fullStreamRes, streamFile);
  assert.equal(fullStreamRes.body.toString(), 'abcdef');

  const errorRes = fakeWritableResponse();
  await assert.rejects(streamFileResponse(errorRes, path.join(path.dirname(streamFile), 'missing.txt')), /File not found/);
  assert.match(errorRes.body.toString(), /File not found/);

  const missingAfterHeadersRes = fakeWritableResponse();
  missingAfterHeadersRes.headersSent = true;
  await assert.rejects(streamFileResponse(missingAfterHeadersRes, path.join(path.dirname(streamFile), 'missing-again.txt')), /File not found/);
});

test('toApiRequest reads json urlencoded multipart and readBody error branches', async () => {
  assert.deepEqual((await toApiRequest(fakeRequest('/x?a=1', 'GET', '', ''))).query, { a: '1' });
  assert.deepEqual((await toApiRequest(fakeRequest('/x', 'POST', 'a=1&SearchWord=%E6%A4%9C%E7%B4%A2%E8%AA%9EB', 'application/x-www-form-urlencoded'))).form, { a: '1', SearchWord: '\u691c\u7d22\u8a9eB' });
  assert.deepEqual((await toApiRequest(fakeRequest('/x', 'POST', '{"a":1}', 'application/json'))).body, { a: 1 });
  assert.equal(await readBody({ body: 'raw-text', headers: {} }), 'raw-text');
  assert.equal(await readBody({ body: Buffer.from('raw-buffer'), headers: {} }), 'raw-buffer');
  const multipart = [
    '--abc',
    'Content-Disposition: form-data; name="method"',
    '',
    'names',
    '--abc',
    'Content-Disposition: form-data; name="impulseResponse"; filename="a.wav"',
    'Content-Type: audio/wav',
    '',
    'data',
    '--abc--',
    '',
  ].join('\r\n');
  const multipartRequest = await toApiRequest(fakeRequest('/x', 'POST', multipart, 'multipart/form-data; boundary=abc'));
  assert.equal(multipartRequest.form.method, 'names');
  assert.equal(multipartRequest.file.filename, 'a.wav');
  const bufferedMultipartRequest = await toApiRequest({
    url: '/x',
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=abc' },
    body: Buffer.from(multipart, 'binary'),
  });
  assert.equal(bufferedMultipartRequest.form.method, 'names');

  const failing = new EventEmitter();
  failing.setEncoding = () => {};
  const promise = readBody(failing);
  failing.emit('error', new Error('boom'));
  await assert.rejects(promise, /boom/);
});

test('createHttpServer writes handler result and converts thrown errors to JSON 500', async () => {
  const okServer = createHttpServer({ getSetting: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } }) }, { cors: { allowOrigins: ['http://127.0.0.1:8081'] } });
  const okBaseUrl = await listenServer(okServer);
  const okRes = await fetch(`${okBaseUrl}/api/get_setting`, { headers: { origin: 'http://127.0.0.1:8081' } });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8081');
  assert.deepEqual(await okRes.json(), { ok: true });

  const optionsRes = await fetch(`${okBaseUrl}/api/get_setting`, {
    method: 'OPTIONS',
    headers: { origin: 'http://127.0.0.1:8081', 'access-control-request-headers': 'content-type' },
  });
  assert.equal(optionsRes.status, 204);
  assert.equal(optionsRes.headers.get('access-control-allow-headers'), 'content-type');
  const missingPathRes = await fetch(`${okBaseUrl}/missing`);
  assert.equal(missingPathRes.status, 404);
  assert.equal(await missingPathRes.text(), 'not found');
  await closeServer(okServer);

  const missingHandlerServer = createHttpServer({});
  const missingHandlerBaseUrl = await listenServer(missingHandlerServer);
  const missingHandlerRes = await fetch(`${missingHandlerBaseUrl}/api/get_setting`);
  assert.equal(missingHandlerRes.status, 404);
  assert.equal(await missingHandlerRes.text(), 'not found');
  await closeServer(missingHandlerServer);

  const badServer = createHttpServer({ getSetting: async () => { throw new Error('bad'); } });
  const badBaseUrl = await listenServer(badServer);
  const badRes = await fetch(`${badBaseUrl}/api/get_setting`);
  assert.equal(badRes.status, 500);
  assert.match(await badRes.text(), /bad/);
  await closeServer(badServer);

  const limitedServer = createHttpServer({ getSetting: async () => ({ status: 200, headers: {}, body: {} }) }, { bodyLimit: '1b' });
  const limitedBaseUrl = await listenServer(limitedServer);
  const limitedRes = await fetch(`${limitedBaseUrl}/api/get_setting`, { method: 'POST', body: 'too-large' });
  assert.equal(limitedRes.status, 413);
  assert.match(await limitedRes.text(), /too large/i);
  await closeServer(limitedServer);
});

function fakeRequest(url, method, body, contentType, headers = {}) {
  const req = new EventEmitter();
  req.url = url;
  req.method = method;
  req.headers = { ...headers, ...(contentType ? { 'content-type': contentType } : {}) };
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

function listenServer(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function tempPath(name) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-settings-'));
  return path.join(dir, name);
}
