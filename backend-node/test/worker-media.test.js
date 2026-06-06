import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AudioWorker } from '../src/services/audioWorker.js';
import { MediaService, parseRange, mimeFromPath } from '../src/media/mediaService.js';

test('AudioWorker updates loudness for valid jobs, rejects invalid jobs, and clears idle lock', async () => {
  const status = { active: false };
  const repo = {
    loudness: 0,
    async findSoundByHash(hash) {
      return hash === 'h' ? { sound_hash: 'h', data_link: '/fixture/library/a.wav' } : null;
    },
    async updateLoudness(hash, value) {
      this.loudness = value;
    },
  };
  const jobs = [{ hash: 'h', file_path: '/fixture/library/a.wav' }, { hash: 'h' }, null];
  const worker = new AudioWorker({
    redis: { popAudioProcessing: async () => jobs.shift() },
    repository: repo,
    analyzeLoudness: async () => ({ mean_volume: -12.5 }),
    lockService: {
      beginStep2() {
        status.active = true;
        return () => {
          status.active = false;
        };
      },
    },
  });

  assert.deepEqual(await worker.processOne(), { status: 'updated', mean_volume: -12.5 });
  assert.equal(status.active, false);
  assert.equal(repo.loudness, -12.5);
  assert.deepEqual(await worker.processOne(), { status: 'invalid' });
  assert.deepEqual(await worker.processOne(), { status: 'idle' });
});

test('AudioWorker reports not_found and failed analysis branches', async () => {
  const workerNotFound = new AudioWorker({
    redis: { popAudioProcessing: async () => ({ hash: 'missing', file_path: '/fixture/library/a.wav' }) },
    repository: { findSoundByHash: async () => null },
    analyzeLoudness: async () => assert.fail('missing sound must not be analyzed'),
  });
  assert.deepEqual(await workerNotFound.processOne(), { status: 'not_found' });

  const workerFailed = new AudioWorker({
    redis: { popAudioProcessing: async () => ({ hash: 'h', file_path: '/fixture/library/a.wav' }) },
    repository: { findSoundByHash: async () => ({ data_link: '/fixture/library/a.wav' }) },
    analyzeLoudness: async () => ({ mean_volume: null }),
  });
  assert.deepEqual(await workerFailed.processOne(), { status: 'failed' });
});

test('MediaService prepares existing-compatible range metadata and blank/art fallbacks', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-media-'));
  const audio = path.join(dir, 'a.wav');
  const blank = path.join(dir, 'blank.png');
  await fs.writeFile(audio, Buffer.alloc(10));
  await fs.writeFile(blank, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const repository = {
    async findSoundByHash() {
      return { sound_hash: 'h', data_link: audio };
    },
    async findAlbumByHash(hash) {
      return hash === 'album' ? { album_art: Buffer.from('png'), art_mime: 'image/png' } : null;
    },
    async findPlaylistData(name) {
      return name === 'playlist' ? { art: Buffer.from('png') } : null;
    },
  };
  const redis = {
    configureImageCache: async () => {},
    getCachedAlbum: async () => null,
    cacheAlbum: async () => {},
  };
  const media = new MediaService({ repository, redis, blankImagePath: blank });

  assert.deepEqual(parseRange('bytes=1-3', 10), { start: 1, end: 3 });
  assert.equal(mimeFromPath('/x/a.flac'), 'audio/flac');
  const fullStream = await media.prepareSoundStream('h');
  assert.equal(fullStream.status, 200);
  assert.equal(fullStream.headers['Content-Length'], 10);
  assert.equal(fullStream.headers['Content-Range'], 'bytes 0-9/10');
  assert.deepEqual(fullStream.range, { start: 0, end: 9 });

  const zeroStartStream = await media.prepareSoundStream('h', 'bytes=0-1');
  assert.equal(zeroStartStream.status, 206);
  assert.equal(zeroStartStream.headers['Content-Length'], 2);
  assert.equal(zeroStartStream.headers['Content-Range'], 'bytes 0-1/10');
  assert.deepEqual(zeroStartStream.range, { start: 0, end: 1 });

  const stream = await media.prepareSoundStream('h', 'bytes=1-1');
  assert.equal(stream.status, 206);
  assert.equal(stream.headers['Content-Length'], 1);
  assert.equal(stream.headers['Content-Range'], 'bytes 1-1/10');
  assert.deepEqual(stream.range, { start: 1, end: 1 });

  assert.equal((await media.getAlbumArt('album')).mime, 'image/png');
  assert.equal((await media.getAlbumArt(null)).mime, 'image/png');
  assert.equal((await media.getPlaylistArt('playlist')).mime, 'image/png');
});

test('MediaService returns 404 for missing sound and defaults invalid range and unknown mime safely', async () => {
  const media = new MediaService({
    repository: {
      findSoundByHash: async () => null,
      findAlbumByHash: async () => null,
      findPlaylistData: async () => null,
    },
    redis: {
      configureImageCache: async () => {},
      getCachedAlbum: async () => null,
      cacheAlbum: async () => {},
    },
    blankImagePath: path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-media-blank-')), 'blank.png'),
  });
  await fs.writeFile(media.blankImagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  assert.deepEqual(parseRange('bad', 10), { start: 0, end: 9 });
  assert.equal(mimeFromPath('/x/file.unknown'), 'application/octet-stream');
  assert.deepEqual(await media.prepareSoundStream('missing'), { status: 404, headers: {}, path: null });

  const missingFileMedia = new MediaService({
    repository: {
      findSoundByHash: async () => ({ sound_hash: 'dangling', data_link: path.join(media.blankImagePath, 'not-a-file.wav') }),
      findAlbumByHash: async () => null,
      findPlaylistData: async () => null,
    },
    redis: {
      configureImageCache: async () => {},
      getCachedAlbum: async () => null,
      cacheAlbum: async () => {},
    },
    blankImagePath: media.blankImagePath,
  });
  assert.deepEqual(await missingFileMedia.prepareSoundStream('dangling'), { status: 404, headers: {}, path: null });
  assert.equal((await media.getAlbumArt('missing')).mime, 'image/png');
  assert.equal((await media.getPlaylistArt('missing')).mime, 'image/png');
});


