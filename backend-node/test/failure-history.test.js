import assert from 'node:assert/strict';
import { RegistrationFailureStore } from '../src/db/registrationFailureStore.js';
import { SoundRegistrar } from '../src/services/soundRegistrar.js';
import { AudioWorker } from '../src/services/audioWorker.js';
import { createApiHandlers } from '../src/api/handlers.js';
import { createHttpServer } from '../src/api/httpServer.js';

/** Minimal mysql2 fake that retains rows between store, service, and HTTP API instances. */
function fakeDatabase() {
  const records = new Map();
  return {
    records,
    async query(sql, params = []) {
      if (sql.startsWith('CREATE TABLE')) return [{ affectedRows: 0 }];
      if (sql.startsWith('INSERT INTO registration_failures')) {
        const [step, targetHash, target, reason] = params;
        records.set(`${step}:${targetHash}`, { step, target, reason, updatedAt: new Date('2026-10-31T00:00:00Z') });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('DELETE FROM registration_failures WHERE')) {
        records.delete(`${params[0]}:${params[1]}`);
        return [{ affectedRows: 1 }];
      }
      if (sql === 'DELETE FROM registration_failures') {
        records.clear();
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('COUNT(*) AS total')) {
        return [[1, 2].filter((step) => [...records.values()].some((row) => row.step === step))
          .map((step) => ({ step, total: [...records.values()].filter((row) => row.step === step).length }))];
      }
      if (sql.includes('SELECT step, target, reason')) {
        const filtered = [...records.values()].filter((row) => !sql.includes('WHERE step') || row.step === params[0]);
        const [limit, offset] = params.slice(-2);
        return [filtered.sort((a, b) => a.target.localeCompare(b.target)).slice(offset, offset + limit)];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test('Step1 and Step2 failures remain available over HTTP until their own successful retry', async () => {
  const db = fakeDatabase();
  const failureStore = new RegistrationFailureStore(db);
  const target = '/music/broken.wav';
  let metadataFails = true;
  const repository = {
    findSoundByHash: async () => ({ sound_hash: 'hash', data_link: target }),
    upsertSound: async (sound) => ({ action: 'updated', sound }),
    countSounds: async () => 1,
    updateLoudness: async () => {},
  };
  const registrar = new SoundRegistrar({
    repository,
    redis: { enqueueAudioProcessing: async () => {} },
    metadataReader: async () => {
      if (metadataFails) throw new Error('private parser detail');
      return { title: 'Recovered', artist: false, album: false, genre: false, lyrics: false, track: false, year: false, picture: null };
    },
    failureStore,
  });
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    assert.equal((await registrar.refreshByHash('hash')).error.reason, 'Could not read audio metadata.');
    let volume = null;
    const worker = new AudioWorker({
      redis: { popAudioProcessing: async () => ({ hash: 'hash', file_path: target }) },
      repository,
      analyzeLoudness: async () => ({ mean_volume: volume }),
      failureStore,
    });
    assert.deepEqual(await worker.processOne(), { status: 'failed' });

    const handlers = createApiHandlers({ failureStore: new RegistrationFailureStore(db) });
    const server = createHttpServer(handlers);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/registration_failures.php`;
    try {
      const response = await fetch(`${url}?step=all&limit=1&offset=0`);
      assert.equal(response.status, 200);
      const page = await response.json();
      assert.deepEqual(page.counts, { step1: 1, step2: 1 });
      assert.equal(page.total, 2);
      assert.equal(page.failures.length, 1);
      assert.equal(page.failures[0].target, target);
      assert.equal(page.failures[0].reason.includes('private'), false);
      assert.equal((await (await fetch(`${url}?step=step2`)).json()).failures[0].step, 2);
      assert.equal((await fetch(`${url}?limit=51`)).status, 400);
      assert.equal((await fetch(`${url}?offset=-1`)).status, 400);

      metadataFails = false;
      assert.deepEqual(await registrar.refreshByHash('hash'), { count: 1 });
      let current = await (await fetch(url)).json();
      assert.deepEqual(current.counts, { step1: 0, step2: 1 });
      volume = -11;
      assert.deepEqual(await worker.processOne(), { status: 'updated', mean_volume: -11 });
      current = await (await fetch(url)).json();
      assert.deepEqual(current.counts, { step1: 0, step2: 0 });
      assert.deepEqual(current.failures, []);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    errorLog.mockRestore();
  }
});

test('failure store updates one file and step rather than accumulating retries, and clears on database reset', async () => {
  const db = fakeDatabase();
  const store = new RegistrationFailureStore(db);
  await store.record(1, '/music/a.wav', 'first');
  await store.record(1, '/music/a.wav', 'second');
  await store.record(2, '/music/a.wav', 'volume');
  assert.equal(db.records.size, 2);
  assert.equal((await store.list({ step: 1 })).failures[0].reason, 'second');
  await store.clearAll();
  assert.deepEqual((await store.list()).counts, { step1: 0, step2: 0 });
});

test('Step2 exceptions are retained with a public reason and the worker lock is released', async () => {
  const store = new RegistrationFailureStore(fakeDatabase());
  let released = false;
  const worker = new AudioWorker({
    redis: { popAudioProcessing: async () => ({ hash: 'h', file_path: '/music/problem.wav' }) },
    repository: { findSoundByHash: async () => ({ data_link: '/music/problem.wav' }) },
    analyzeLoudness: async () => { throw new Error('private ffmpeg detail'); },
    lockService: { beginStep2: () => () => { released = true; } },
    failureStore: store,
  });
  await assert.rejects(worker.processOne(), /private ffmpeg detail/);
  assert.equal(released, true);
  assert.deepEqual((await store.list()).failures.map(({ step, target, reason }) => ({ step, target, reason })), [
    { step: 2, target: '/music/problem.wav', reason: 'Could not analyze or save audio loudness.' },
  ]);
});

test('failure API reports database read errors without exposing their details', async () => {
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const handlers = createApiHandlers({ failureStore: { list: async () => { throw new Error('private database detail'); } } });
    const response = await handlers.registrationFailures({ query: {} });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { status: 'error', detail: 'Could not load registration failures.' });
    assert.equal(JSON.stringify(response.body).includes('private'), false);
  } finally {
    errorLog.mockRestore();
  }
});

test('failure history database outage stops registration with a safe 503 instead of reporting a false file failure', async () => {
  const database = fakeDatabase();
  const originalQuery = database.query.bind(database);
  database.query = async (sql, params) => {
    if (sql.startsWith('DELETE FROM registration_failures WHERE')) throw new Error('private database detail');
    return originalQuery(sql, params);
  };
  const registrar = new SoundRegistrar({
    repository: {
      findSoundByHash: async () => ({ sound_hash: 'hash', data_link: '/music/good.wav' }),
      upsertSound: async (sound) => ({ action: 'updated', sound }),
      countSounds: async () => 1,
    },
    redis: { enqueueAudioProcessing: async () => {} },
    metadataReader: async () => ({ title: 'Good', artist: false, album: false, genre: false, lyrics: false, track: false, year: false, picture: null }),
    failureStore: new RegistrationFailureStore(database),
  });
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await assert.rejects(registrar.refreshByHash('hash'), (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, 'FAILURE_HISTORY_UNAVAILABLE');
      assert.equal(error.message.includes('private'), false);
      return true;
    });
    assert.equal(database.records.size, 0);
  } finally {
    errorLog.mockRestore();
  }
});
