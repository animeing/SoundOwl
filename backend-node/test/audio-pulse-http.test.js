import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

    assert.deepEqual(await store.read('room #1.wav'), { buffer: wav, mime: 'audio/wav' });
    assert.deepEqual(await store.read('music.MP3'), { buffer: Buffer.from([1, 2, 3]), mime: 'audio/mpeg' });
    assert.equal(await store.read('missing.wav'), null);
    assert.equal(await store.read('directory.wav'), null);
    assert.equal(await store.read('private.txt'), null);
    assert.equal(await store.read('../private.wav'), null);
    assert.equal(await store.read('..\\private.wav'), null);
    assert.equal(await store.read('bad\u0000.wav'), null);
    assert.equal(await store.read(null), null);
    assert.equal(isSafePulseFilename('room #1.wav'), true);
    assert.equal(isSafePulseFilename('private.txt'), false);
    assert.equal(isSafePulseFilename('stream:private.wav'), false);
    assert.equal((await store.upload({ filename: '../outside.wav', mime: 'audio/wav', buffer: wav })).status, 'error');
    assert.equal((await store.upload({ filename: 'stream:private.wav', mime: 'audio/wav', buffer: wav })).status, 'error');
    assert.equal((await store.delete('../room #1.wav')).status, 'error');
    assert.deepEqual((await store.list()).sort(), ['room #1.wav', 'music.MP3'].sort());
    assert.deepEqual((await store.read('room #1.wav')).buffer, wav);

    if (process.platform !== 'win32') {
      await fs.symlink('private.txt', path.join(directory, 'linked.wav'));
      assert.equal(await store.read('linked.wav'), null);
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
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
