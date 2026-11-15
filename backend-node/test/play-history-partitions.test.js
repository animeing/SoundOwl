import assert from 'node:assert/strict';
import { ensurePlayHistoryPartitions } from '../src/db/playHistoryPartitions.js';

function stalePartitionPool() {
  let coverageEnd = '2026-07-04';
  const added = [];
  let released = 0;
  const connection = {
    async query(sql, params) {
      if (sql.includes('CURRENT_DATE()')) return [[{ today: '2026-11-15' }]];
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql === 'DROP EVENT IF EXISTS manage_partitions_event') return [[]];
      if (sql.includes('information_schema.PARTITIONS')) {
        return [[{ name: 'latest', boundary: 'numeric', coverageEnd }]];
      }
      if (sql.startsWith('ALTER TABLE sound_play_history ADD PARTITION')) {
        const [, name, nextDate] = /PARTITION (p\d+) VALUES LESS THAN \(TO_DAYS\('([^']+)'\)\)/.exec(sql) || [];
        assert.ok(name && nextDate, 'partition DDL must use bounded date and name');
        assert.ok(nextDate > coverageEnd);
        added.push(name);
        coverageEnd = nextDate;
        return [[]];
      }
      assert.fail('Unexpected query: ' + sql + ' ' + JSON.stringify(params));
    },
    release() { released += 1; },
  };
  return {
    pool: { getConnection: async () => connection },
    added,
    get released() { return released; },
  };
}

test('startup fills stale history partitions and a second startup does not rewrite history', async () => {
  const fixture = stalePartitionPool();
  await ensurePlayHistoryPartitions(fixture.pool);
  assert.deepEqual(fixture.added, [
    'p20261115', 'p20261116', 'p20261117', 'p20261118',
    'p20261119', 'p20261120', 'p20261121', 'p20261122',
  ]);
  await ensurePlayHistoryPartitions(fixture.pool);
  assert.equal(fixture.added.length, 8);
  assert.equal(fixture.released, 2);
});
