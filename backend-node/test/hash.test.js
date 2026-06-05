import assert from 'node:assert/strict';
import { compressHash, decompressHash, sha1 } from '../src/utils/hash.js';
import { mapSoundRecord } from '../src/db/repositories/common.js';

test('compressHash and decompressHash preserve PHP-compatible hashes including zero chunks', () => {
  const raw = '0000000010000000100000001000000010000001';
  const compressed = compressHash(raw);
  assert.equal(compressed, '--------1_-------g_------3v_-----SK_---1');
  assert.equal(decompressHash(compressed), raw);
});

test('sha1 hashes the exact data link used by sound registration', () => {
  assert.equal(sha1('/fixture/library/contract-fixture/track-03.wav'), '05197a7477a3a520fe9d4aaa0e75655ee7a20b58');
});

test('mapSoundRecord normalizes lyrics line breaks for existing DB rows', () => {
  const mapped = mapSoundRecord({
    sound_hash: '0123456789012345678901234567890123456789',
    album_hash: null,
    artist_id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    lyrics: 'line1\rline2\r\nline3',
  });
  assert.equal(mapped.lyrics, 'line1\nline2\nline3');
  assert.equal(mapped.artist_id, compressHash('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'));
});
