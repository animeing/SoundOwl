import assert from 'node:assert/strict';
import { SoundRedis } from '../src/redis/soundRedis.js';

test('SoundRedis enqueues and pops audio processing jobs using node-redis style API', async () => {
  const queue = [];
  const client = {
    lPush: async (name, value) => queue.push({ name, value }),
    brPop: async () => ({ element: queue.shift().value }),
    setEx: async () => {},
    get: async () => null,
    exists: async () => 0,
    configSet: async () => {},
  };
  const redis = new SoundRedis(client);

  await redis.enqueueAudioProcessing({ file_path: '/fixture/library/a.wav', hash: 'h' });
  assert.deepEqual(await redis.popAudioProcessing(), { file_path: '/fixture/library/a.wav', hash: 'h' });
});

test('SoundRedis returns null when queue pop times out', async () => {
  const redis = new SoundRedis({
    brPop: async () => null,
  });

  assert.equal(await redis.popAudioProcessing(), null);
});

test('SoundRedis stores album cache and configures current API image-cache Redis settings', async () => {
  const calls = [];
  const store = new Map();
  const redis = new SoundRedis({
    setEx: async (key, ttl, value) => store.set(key, { ttl, value }),
    get: async (key) => store.get(key)?.value,
    exists: async () => 1,
    configSet: async (key, value) => calls.push([key, value]),
  });

  await redis.cacheAlbum('album', { title: 'Fixture' }, 123);
  assert.deepEqual(await redis.getCachedAlbum('album'), { title: 'Fixture' });
  assert.equal(await redis.exists('album'), true);

  await redis.configureImageCache();
  assert.deepEqual(calls, [
    ['maxmemory', '256mb'],
    ['maxmemory-policy', 'volatile-ttl'],
  ]);
});

test('SoundRedis preserves album art as Buffer through JSON cache storage', async () => {
  const store = new Map();
  const redis = new SoundRedis({
    setEx: async (key, ttl, value) => store.set(key, { ttl, value }),
    get: async (key) => store.get(key)?.value,
  });
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  await redis.cacheAlbum('album-art', { title: 'Art', album_art: image, art_mime: 'image/png' });
  const cached = await redis.getCachedAlbum('album-art');

  assert.equal(Buffer.isBuffer(cached.album_art), true);
  assert.deepEqual(cached.album_art, image);
  assert.equal(cached.art_mime, 'image/png');
});

test('SoundRedis restores legacy JSON-stringified Buffer album art cache', async () => {
  const image = Buffer.from([0xff, 0xd8, 0xff]);
  const redis = new SoundRedis({
    get: async () => JSON.stringify({ album_art: image, art_mime: 'image/jpeg' }),
  });

  const cached = await redis.getCachedAlbum('legacy-art');

  assert.equal(Buffer.isBuffer(cached.album_art), true);
  assert.deepEqual(cached.album_art, image);
  assert.equal(cached.art_mime, 'image/jpeg');
});


