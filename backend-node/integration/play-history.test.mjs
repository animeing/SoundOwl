import assert from 'node:assert/strict';
import test from 'node:test';
import { createPool } from 'mysql2/promise';
import { SoundCatalogRepository } from '../src/db/repositories/soundCatalogRepository.js';

const fixtureSoundHash = '8e002bf5f50db0553d82bc67e9225ef2b7ab1611';
const absentSoundHash = 'f'.repeat(40);

/** Read the two persisted values that must change together for one sound. */
async function playState(pool, soundHash) {
  const [[sound]] = await pool.query(
    'SELECT play_count FROM sound_link WHERE sound_hash = ?',
    [soundHash],
  );
  const [[history]] = await pool.query(
    'SELECT COUNT(*) AS history_count FROM sound_play_history WHERE sound_hash = ?',
    [soundHash],
  );
  return {
    playCount: sound?.play_count ?? null,
    historyCount: Number(history.history_count),
  };
}

test('MariaDB commits paired play records and rolls back failed or missing records', async () => {
  assert.equal(process.env.SOUNDOWL_CONTRACT_MODE, 'fixture', 'run only against the disposable CI fixture');
  const pool = createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'sound',
    database: 'sound',
  });
  try {
    const repository = new SoundCatalogRepository(pool);
    assert.deepEqual(await playState(pool, fixtureSoundHash), { playCount: 2, historyCount: 1 });

    const playedAt = new Date(2026, 9, 28, 12, 34, 56);
    await repository.incrementPlayCount(fixtureSoundHash, playedAt);
    assert.deepEqual(await playState(pool, fixtureSoundHash), { playCount: 3, historyCount: 2 });

    // Year 9999 is outside the fixture's history partitions, so the INSERT fails after UPDATE.
    await assert.rejects(
      repository.incrementPlayCount(fixtureSoundHash, new Date(9999, 0, 1)),
      (error) => error.code === 'ER_NO_PARTITION_FOR_GIVEN_VALUE',
    );
    assert.deepEqual(await playState(pool, fixtureSoundHash), { playCount: 3, historyCount: 2 });

    await assert.rejects(
      repository.incrementPlayCount(absentSoundHash, playedAt),
      (error) => error.code === 'SOUND_NOT_FOUND',
    );
    assert.deepEqual(await playState(pool, absentSoundHash), { playCount: null, historyCount: 0 });

    // Without an event ID, an identical second notification intentionally counts as another play.
    await repository.incrementPlayCount(fixtureSoundHash, playedAt);
    assert.deepEqual(await playState(pool, fixtureSoundHash), { playCount: 4, historyCount: 3 });
  } finally {
    await pool.end();
  }
});
