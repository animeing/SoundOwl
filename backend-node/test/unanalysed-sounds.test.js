import assert from 'node:assert/strict';
import { MetricsRepository } from '../src/db/repositories/metricsRepository.js';
import { createApiHandlers } from '../src/api/handlers.js';

test('analysis gap list returns the same zero-value sounds excluded from Analysis Count', async () => {
  const queries = [];
  const db = {
    query: async (sql, parameters) => {
      queries.push({ sql, parameters });
      if (sql.includes('COUNT(*)')) return [[{ count: 2 }], []];
      return [[
        { sound_hash: 'hash-new', title: 'New sound', data_link: '/music/new.mp3' },
        { sound_hash: 'hash-old', title: 'Old sound', data_link: '/music/old.mp3' },
      ], []];
    },
  };
  const metrics = new MetricsRepository(db);
  assert.deepEqual(await metrics.listSoundsWithoutAnalysis({ limit: 25, offset: 0 }), {
    total: 2,
    sounds: [
      { hash: 'hash-new', title: 'New sound', path: '/music/new.mp3' },
      { hash: 'hash-old', title: 'Old sound', path: '/music/old.mp3' },
    ],
    limit: 25,
    offset: 0,
  });
  assert.equal(queries[0].sql.includes('loudness_target = 0 OR loudness_target IS NULL'), true);
  assert.equal(queries[1].sql.includes('ORDER BY add_time DESC, sound_hash ASC LIMIT ? OFFSET ?'), true);
  assert.deepEqual(queries[1].parameters, [25, 0]);
  queries.length = 0;
  await metrics.listSoundsWithoutAnalysis({ limit: 1, offset: 2, searchTerm: '100%_song' });
  assert.match(queries[0].sql, /LOCATE\(\?, title\) > 0 OR LOCATE\(\?, data_link\) > 0/);
  assert.deepEqual(queries[0].parameters, ['100%_song', '100%_song']);
  assert.deepEqual(queries[1].parameters, ['100%_song', '100%_song', 1, 2]);
  queries.length = 0;
  assert.deepEqual((await metrics.listSoundsWithoutAnalysis({ limit: 0, offset: 0 })).sounds, []);
  assert.equal(queries.length, 1);
});

test('analysis gap API validates bounds and hides database error details', async () => {
  const repository = {
    listSoundsWithoutAnalysis: vi.fn(async ({ limit, offset }) => ({ total: 1, sounds: [{ hash: 'hash', title: 'Song', path: '/music/song.mp3' }], limit, offset })),
  };
  const handlers = createApiHandlers({ repository });
  assert.deepEqual((await handlers.unanalysedSounds({ query: { limit: '1', offset: '0' } })).body, {
    total: 1,
    sounds: [{ hash: 'hash', title: 'Song', path: '/music/song.mp3' }],
    limit: 1,
    offset: 0,
  });
  assert.deepEqual(repository.listSoundsWithoutAnalysis.mock.calls[0][0], { limit: 1, offset: 0, searchTerm: '' });
  await handlers.unanalysedSounds({ query: { search: '  Track  ' } });
  assert.deepEqual(repository.listSoundsWithoutAnalysis.mock.calls[1][0], { limit: 25, offset: 0, searchTerm: 'Track' });
  for (const query of [{ limit: '51' }, { limit: '-1' }, { offset: '-1' }, { offset: '1.5' }, { search: 'x'.repeat(201) }, { search: 123 }]) {
    assert.equal((await handlers.unanalysedSounds({ query })).status, 400);
  }
  repository.listSoundsWithoutAnalysis.mockRejectedValueOnce(new Error('private database detail'));
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = await handlers.unanalysedSounds({ query: {} });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { status: 'error', detail: 'Could not load sounds without analysis.' });
  } finally {
    errorLog.mockRestore();
  }
});
