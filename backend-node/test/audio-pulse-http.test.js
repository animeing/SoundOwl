import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { buffer as consumeStream } from 'node:stream/consumers';
import { createApiHandlers } from '../src/api/handlers.js';
import { createHttpServer } from '../src/api/httpServer.js';
import { PulseStore, isSafePulseFilename } from '../src/api/pulseStore.js';

function makeImpulseWav() {
  const samples = 800;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  buffer.writeInt16LE(32767, 44);
  return buffer;
}

test('PulseStore reads only regular wav/mp3 files directly inside its directory', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-pulse-read-'));
  try {
    const store = new PulseStore(directory);
    const wav = makeImpulseWav();
    await fs.writeFile(path.join(directory, 'room #1.wav'), wav);
    await fs.writeFile(path.join(directory, 'music.MP3'), Buffer.from([1, 2, 3]));
    await fs.writeFile(path.join(directory, 'private.txt'), 'private');
    await fs.mkdir(path.join(directory, 'directory.wav'));

    const room = await store.read('room #1.wav');
    assert.equal(room.mime, 'audio/wav');
    assert.equal(room.size, wav.length);
    assert.deepEqual(await consumeStream(room.stream), wav);
    const music = await store.read('music.MP3');
    assert.equal(music.mime, 'audio/mpeg');
    assert.equal(music.size, 3);
    assert.deepEqual(await consumeStream(music.stream), Buffer.from([1, 2, 3]));
    assert.equal(await store.read('missing.wav'), null);
    assert.equal(await store.read('directory.wav'), null);
    assert.equal(await store.read('private.txt'), null);
    assert.equal(await store.read('../private.wav'), null);
    assert.equal(await store.read('..\\private.wav'), null);
    assert.equal(await store.read('bad\u0000.wav'), null);
    assert.equal(await store.read(null), null);
    assert.equal(isSafePulseFilename('room #1.wav'), true);
    assert.equal(isSafePulseFilename('private.txt'), false);
    assert.equal(isSafePulseFilename('stream:private.wav'), process.platform !== 'win32');
    assert.equal(isSafePulseFilename('old?room.wav'), process.platform !== 'win32');
    assert.equal((await store.upload({ filename: '../outside.wav', mime: 'audio/wav', buffer: wav })).status, 'error');
    assert.equal((await store.delete('../room #1.wav')).status, 'error');
    assert.deepEqual((await store.list()).sort(), ['room #1.wav', 'music.MP3'].sort());
    assert.deepEqual(await consumeStream((await store.read('room #1.wav')).stream), wav);

    if (process.platform !== 'win32') {
      await fs.writeFile(path.join(directory, 'old?room:1.wav'), wav);
      assert.deepEqual(await consumeStream((await store.read('old?room:1.wav')).stream), wav);
      assert.ok((await store.list()).includes('old?room:1.wav'));
      await fs.symlink('private.txt', path.join(directory, 'linked.wav'));
      assert.equal(await store.read('linked.wav'), null);
      assert.equal((await store.upload({ filename: 'linked.wav', mime: 'audio/wav', buffer: wav })).status, 'success');
      assert.equal(await fs.readFile(path.join(directory, 'private.txt'), 'utf8'), 'private');
      assert.deepEqual(await consumeStream((await store.read('linked.wav')).stream), wav);
    }

    const oldRead = process.platform === 'win32' ? null : await store.read('room #1.wav');
    const replacement = Buffer.from(wav);
    replacement.writeInt16LE(1234, 44);
    assert.equal((await store.upload({ filename: 'room #1.wav', mime: 'audio/wav', buffer: replacement })).status, 'success');
    if (oldRead) {
      assert.deepEqual(await consumeStream(oldRead.stream), wav);
    }
    assert.deepEqual(await consumeStream((await store.read('room #1.wav')).stream), replacement);
    assert.equal((await store.list()).filter((name) => name === 'room #1.wav').length, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('PulseStore closes an opened file when a race or metadata read fails', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-pulse-race-'));
  const target = path.join(directory, 'room.wav');
  await fs.writeFile(target, makeImpulseWav());
  const store = new PulseStore(directory);
  const closedNonFile = vi.fn(async () => {});
  const closedFailedStat = vi.fn(async () => {});
  const open = vi.spyOn(fs, 'open');
  try {
    open.mockResolvedValueOnce({
      stat: async () => ({ isFile: () => false }),
      close: closedNonFile,
    });
    assert.equal(await store.read('room.wav'), null);
    assert.equal(closedNonFile.mock.calls.length, 1);

    open.mockResolvedValueOnce({
      stat: async () => { throw new Error('stat failed'); },
      close: closedFailedStat,
    });
    await assert.rejects(store.read('room.wav'), /stat failed/);
    assert.equal(closedFailedStat.mock.calls.length, 1);
  } finally {
    open.mockRestore();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('a streaming failure closes only that response and leaves the HTTP server usable', async () => {
  const server = createHttpServer({
    audioPulseFile: async () => ({
      status: 200,
      headers: { 'content-type': 'audio/wav' },
      body: {
        stream: Readable.from((async function* () {
          yield Buffer.from('RIFF');
          throw new Error('stream failed');
        })()),
      },
    }),
    getSetting: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } }),
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const backendUrl = 'http://127.0.0.1:' + server.address().port;
    await assert.rejects(async () => {
      const response = await fetch(backendUrl + '/audio_pulse/fail.wav');
      await response.arrayBuffer();
    });
    const healthy = await fetch(backendUrl + '/api/get_setting.php');
    assert.equal(healthy.status, 200);
    assert.deepEqual(await healthy.json(), { ok: true });
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
});

test('uploaded IR can be listed and fetched across frontend/backend ports without exposing other files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-pulse-http-'));
  const server = createHttpServer(createApiHandlers({ pulseStore: new PulseStore(directory) }), {
    cors: { allowOrigins: ['http://127.0.0.1:8081', 'http://127.0.0.1:8082'] },
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const backendUrl = 'http://127.0.0.1:' + server.address().port;
    const frontendOrigin = server.address().port === 8081
      ? 'http://127.0.0.1:8082'
      : 'http://127.0.0.1:8081';
    const wav = makeImpulseWav();
    const fileName = '部屋 #1.wav';
    const form = new FormData();
    form.append('impulseResponse', new Blob([wav], { type: 'audio/wav' }), fileName);

    const upload = await fetch(backendUrl + '/api/audio_pulse_data_upload.php', {
      method: 'POST',
      body: form,
    });
    assert.equal(upload.status, 200);
    assert.equal((await upload.json()).status, 'success');

    const list = await fetch(backendUrl + '/api/audio_pulse_data_list.php');
    assert.deepEqual(await list.json(), [fileName]);

    const audio = await fetch(backendUrl + '/audio_pulse/' + encodeURIComponent(fileName), {
      headers: { origin: frontendOrigin },
    });
    assert.equal(audio.status, 200);
    assert.equal(audio.headers.get('content-type'), 'audio/wav');
    assert.equal(audio.headers.get('content-length'), String(wav.length));
    assert.equal(audio.headers.get('access-control-allow-origin'), frontendOrigin);
    assert.equal(audio.headers.get('cache-control'), 'no-store');
    assert.equal(audio.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await audio.arrayBuffer()), wav);

    for (const suffix of [
      'missing.wav',
      'private.txt',
      '%2E%2E%2Fprivate.wav',
      '..%5Cprivate.wav',
      '%ZZ.wav',
      'subdirectory/file.wav',
    ]) {
      const response = await fetch(backendUrl + '/audio_pulse/' + suffix, {
        headers: { origin: frontendOrigin },
      });
      assert.equal(response.status, 404, suffix);
    }
    const post = await fetch(backendUrl + '/audio_pulse/' + encodeURIComponent(fileName), {
      method: 'POST',
    });
    assert.equal(post.status, 404);
    const unapprovedOrigin = await fetch(backendUrl + '/audio_pulse/' + encodeURIComponent(fileName), {
      headers: { origin: 'http://unapproved.invalid' },
    });
    assert.equal(unapprovedOrigin.headers.get('access-control-allow-origin'), null);
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await fs.rm(directory, { recursive: true, force: true });
  }
});
