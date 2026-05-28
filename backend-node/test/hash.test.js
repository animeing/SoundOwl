const assert = require('node:assert/strict');
const { compressHash, decompressHash, sha1 } = require('../src/utils/hash');

test('compressHash and decompressHash preserve PHP-compatible hashes including zero chunks', () => {
  const raw = '0000000010000000100000001000000010000001';
  const compressed = compressHash(raw);
  assert.equal(compressed, '--------1_-------g_------3v_-----SK_---1');
  assert.equal(decompressHash(compressed), raw);
});

test('sha1 hashes the exact data link used by sound registration', () => {
  assert.equal(sha1('/music/contract-fixture/track-03.wav'), '8ee9a84fa1a11e5dcf6598db5f013c492e3c0dd6');
});
