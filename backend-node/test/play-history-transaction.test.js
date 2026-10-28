import assert from 'node:assert/strict';
import { SoundCatalogRepository } from '../src/db/repositories/soundCatalogRepository.js';

/** Record connection calls while simulating a mysql2 Pool with controlled failures. */
function transactionPool({ affectedRows = 1, queryErrorAt, beginError, commitError, rollbackError } = {}) {
  const operations = [];
  const queryError = new Error('query failed');
  const connection = {
    async beginTransaction() {
      operations.push(['begin']);
      if (beginError) throw beginError;
    },
    async query(sql, params) {
      const operation = sql.startsWith('UPDATE') ? 'update' : 'insert';
      operations.push([operation, params]);
      if (queryErrorAt === operation) throw queryError;
      return [{ affectedRows }, []];
    },
    async commit() {
      operations.push(['commit']);
      if (commitError) throw commitError;
    },
    async rollback() {
      operations.push(['rollback']);
      if (rollbackError) throw rollbackError;
    },
    release() {
      operations.push(['release']);
    },
  };
  const pool = {
    getConnection: vi.fn(async () => connection),
    query: vi.fn(async () => assert.fail('both writes must use the acquired connection')),
  };
  return { pool, operations, queryError };
}

test('play count and history commit on the same connection in order', async () => {
  const { pool, operations } = transactionPool();
  const playedAt = new Date(2026, 9, 28, 12, 34, 56);
  await new SoundCatalogRepository(pool).incrementPlayCount('sound-a', playedAt);

  assert.equal(pool.getConnection.mock.calls.length, 1);
  assert.equal(pool.query.mock.calls.length, 0);
  assert.deepEqual(operations, [
    ['begin'],
    ['update', ['sound-a']],
    ['insert', ['sound-a', '2026-10-28 12:34:56']],
    ['commit'],
    ['release'],
  ]);
});

test('missing sound rolls back without inserting an orphaned history row', async () => {
  const { pool, operations } = transactionPool({ affectedRows: 0 });
  await assert.rejects(
    new SoundCatalogRepository(pool).incrementPlayCount('missing', new Date()),
    (error) => error.code === 'SOUND_NOT_FOUND',
  );
  assert.deepEqual(operations.map(([operation]) => operation), ['begin', 'update', 'rollback', 'release']);
});

test('history insertion failure rolls back the count update and preserves the original error', async () => {
  const { pool, operations, queryError } = transactionPool({ queryErrorAt: 'insert' });
  await assert.rejects(
    new SoundCatalogRepository(pool).incrementPlayCount('sound-a', new Date()),
    (error) => error === queryError,
  );
  assert.deepEqual(operations.map(([operation]) => operation), ['begin', 'update', 'insert', 'rollback', 'release']);
  assert.equal(pool.query.mock.calls.length, 0);
});

test('update failure rolls back without adding history', async () => {
  const { pool, operations, queryError } = transactionPool({ queryErrorAt: 'update' });
  await assert.rejects(
    new SoundCatalogRepository(pool).incrementPlayCount('sound-a', new Date()),
    (error) => error === queryError,
  );
  assert.deepEqual(operations.map(([operation]) => operation), ['begin', 'update', 'rollback', 'release']);
});

test('transaction start failure releases the connection', async () => {
  const beginError = new Error('transaction unavailable');
  const { pool, operations } = transactionPool({ beginError });
  await assert.rejects(
    new SoundCatalogRepository(pool).incrementPlayCount('sound-a', new Date()),
    (error) => error === beginError,
  );
  assert.deepEqual(operations.map(([operation]) => operation), ['begin', 'release']);
});

test('commit failure attempts rollback and releases the connection', async () => {
  const commitError = new Error('commit failed');
  const { pool, operations } = transactionPool({ commitError });
  await assert.rejects(
    new SoundCatalogRepository(pool).incrementPlayCount('sound-a', new Date()),
    (error) => error === commitError,
  );
  assert.deepEqual(operations.map(([operation]) => operation), ['begin', 'update', 'insert', 'commit', 'rollback', 'release']);
});

test('rollback failure reports both the write and rollback errors', async () => {
  const rollbackError = new Error('rollback failed');
  const { pool, operations, queryError } = transactionPool({ queryErrorAt: 'insert', rollbackError });
  await assert.rejects(
    new SoundCatalogRepository(pool).incrementPlayCount('sound-a', new Date()),
    (error) => error instanceof AggregateError
      && error.errors[0] === queryError
      && error.errors[1] === rollbackError,
  );
  assert.deepEqual(operations.map(([operation]) => operation), ['begin', 'update', 'insert', 'rollback', 'release']);
});
