import assert from 'node:assert/strict';
import { waitForMysql } from '../src/db/mysql.js';

test('waitForMysql retries failed connections until a pool connection is available', async () => {
  let attempts = 0;
  const pool = {
    async getConnection() {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('not ready');
      }
      return { release: vi.fn() };
    },
  };

  await waitForMysql(pool, { attempts: 3, delayMs: 0 });
  assert.equal(attempts, 3);
});

test('waitForMysql throws the last connection error after retry exhaustion', async () => {
  const pool = {
    async getConnection() {
      throw new Error('still down');
    },
  };

  await assert.rejects(waitForMysql(pool, { attempts: 2, delayMs: 0 }), /still down/);
});
