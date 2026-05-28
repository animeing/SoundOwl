const assert = require('node:assert/strict');
const { SoundRedis } = require('../src/redis/soundRedis');

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

  await redis.enqueueAudioProcessing({ file_path: '/music/a.wav', hash: 'h' });
  assert.deepEqual(await redis.popAudioProcessing(), { file_path: '/music/a.wav', hash: 'h' });
});

test('SoundRedis returns null when queue pop times out', async () => {
  const redis = new SoundRedis({
    brPop: async () => null,
  });

  assert.equal(await redis.popAudioProcessing(), null);
});

test('SoundRedis stores album cache and configures current PHP image-cache Redis settings', async () => {
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
