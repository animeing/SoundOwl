import assert from 'node:assert/strict';
import { PlaylistRepository } from '../src/db/repositories/playlistRepository.js';

function createTransactionPool({ failQueryNumber = 0, beginError, commitError, rollbackError } = {}) {
  const operations = [];
  let queryNumber = 0;
  const connection = {
    async beginTransaction() {
      operations.push(['begin']);
      if (beginError) throw beginError;
    },
    async query(sql, params) {
      queryNumber += 1;
      operations.push(['query', sql, params]);
      if (queryNumber === failQueryNumber) throw new Error('insert failed');
      return [[], []];
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
    query: vi.fn(async () => assert.fail('playlist writes must use the acquired connection')),
  };
  return { pool, operations };
}

test('playlist creation writes the parent and ordered sounds on one connection before commit', async () => {
  const { pool, operations } = createTransactionPool();
  await new PlaylistRepository(pool).createPlaylist('ordered', ['hash-b', 'hash-a']);

  assert.equal(pool.getConnection.mock.calls.length, 1);
  assert.equal(pool.query.mock.calls.length, 0);
  assert.deepEqual(operations.map(([action]) => action), [
    'begin', 'query', 'query', 'query', 'commit', 'release',
  ]);
  assert.deepEqual(operations[1][2], ['ordered']);
  assert.deepEqual(operations[2][2], ['ordered', 0, 'hash-b']);
  assert.deepEqual(operations[3][2], ['ordered', 1, 'hash-a']);
});

test('playlist creation rolls back an insertion failure and releases the connection', async () => {
  const { pool, operations } = createTransactionPool({ failQueryNumber: 3 });
  await assert.rejects(
    new PlaylistRepository(pool).createPlaylist('incomplete', ['valid', 'missing']),
    /insert failed/,
  );

  assert.equal(pool.query.mock.calls.length, 0);
  assert.deepEqual(operations.map(([action]) => action), [
    'begin', 'query', 'query', 'query', 'rollback', 'release',
  ]);
});

test('playlist creation releases a connection when transaction start fails', async () => {
  const beginError = new Error('transaction unavailable');
  const { pool, operations } = createTransactionPool({ beginError });
  await assert.rejects(
    new PlaylistRepository(pool).createPlaylist('unavailable', ['valid']),
    (error) => error === beginError,
  );
  assert.deepEqual(operations.map(([action]) => action), ['begin', 'release']);
});

test('playlist creation reports both errors when rollback also fails', async () => {
  const rollbackError = new Error('rollback unavailable');
  const { pool, operations } = createTransactionPool({ failQueryNumber: 2, rollbackError });
  await assert.rejects(
    new PlaylistRepository(pool).createPlaylist('unavailable', ['missing']),
    (error) => error instanceof AggregateError
      && error.errors[0].message === 'insert failed'
      && error.errors[1] === rollbackError,
  );
  assert.deepEqual(operations.map(([action]) => action), [
    'begin', 'query', 'query', 'rollback', 'release',
  ]);
});

test('playlist creation rolls back a failed commit', async () => {
  const commitError = new Error('commit failed');
  const { pool, operations } = createTransactionPool({ commitError });
  await assert.rejects(
    new PlaylistRepository(pool).createPlaylist('uncommitted', ['valid']),
    (error) => error === commitError,
  );
  assert.deepEqual(operations.map(([action]) => action), [
    'begin', 'query', 'query', 'commit', 'rollback', 'release',
  ]);
});
