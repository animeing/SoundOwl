import assert from 'node:assert/strict';
import { SoundRedis } from '../src/redis/soundRedis.js';

function queueClient() {
  const pending = [];
  const processing = [];
  return {
    pending,
    processing,
    lPush: async (_key, value) => pending.unshift(value),
    sendCommand: async (args) => {
      const [command] = args;
      if (command === 'BLMOVE') {
        const item = pending.pop() ?? null;
        if (item) processing.unshift(item);
        return item;
      }
      if (command === 'LMOVE') {
        const item = processing.pop() ?? null;
        if (item) pending.unshift(item);
        return item;
      }
      if (command === 'EVAL') {
        const index = processing.indexOf(args[5]);
        if (index < 0) return 0;
        const [item] = processing.splice(index, 1);
        pending.unshift(item);
        return pending.length;
      }      if (command === 'LREM') {
        const index = processing.indexOf(args[3]);
        if (index < 0) return 0;
        processing.splice(index, 1);
        return 1;
      }
      throw new Error('Unexpected Redis command: ' + command);
    },
  };
}

test('SoundRedis acknowledges completed jobs and recovers claimed jobs after restart', async () => {
  const client = queueClient();
  const redis = new SoundRedis(client);
  const first = { file_path: '/fixture/library/a.wav', hash: 'a' };
  const second = { file_path: '/fixture/library/b.wav', hash: 'b' };
  await redis.enqueueAudioProcessing(first);
  await redis.enqueueAudioProcessing(second);
  assert.deepEqual(await redis.popAudioProcessing(), first);
  await redis.acknowledgeAudioProcessing(first);
  assert.deepEqual(await redis.popAudioProcessing(), second);
  assert.equal(client.pending.length, 0);
  assert.equal(client.processing.length, 1);
  assert.equal(await redis.recoverAudioProcessing(), 1);
  assert.deepEqual(await redis.popAudioProcessing(), second);
  await redis.requeueAudioProcessing(second);
  assert.equal(client.processing.length, 0);
  assert.deepEqual(await redis.popAudioProcessing(), second);
  await redis.acknowledgeAudioProcessing(second);
  assert.equal(client.processing.length, 0);
});

test('SoundRedis returns null when queue claim times out', async () => {
  const redis = new SoundRedis(queueClient());
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


