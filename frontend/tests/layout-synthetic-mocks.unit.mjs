// 合成モックのURL判定とAPI契約を検証する。
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  playlistResponseForParameters,
  syntheticPathForUrl,
} from './layout-synthetic-mocks.mjs';

test('synthetic network matching preserves the configured backend base path', () => {
  const backendUrl = 'http://127.0.0.1:18081/soundowl/';

  assert.equal(
    syntheticPathForUrl('http://127.0.0.1:18081/soundowl/api/album_list.php', backendUrl),
    '/api/album_list.php',
  );
  assert.equal(
    syntheticPathForUrl('http://127.0.0.1:18081/api/album_list.php', backendUrl),
    null,
  );
  assert.equal(
    syntheticPathForUrl('http://127.0.0.1:18082/soundowl/api/album_list.php', backendUrl),
    null,
  );
});

test('frontend-origin matching excludes API traffic but keeps media proxy paths', () => {
  const frontendUrl = 'http://127.0.0.1:8081/';
  const options = { includeApi: false };

  assert.equal(
    syntheticPathForUrl('http://127.0.0.1:8081/api/album_list.php', frontendUrl, options),
    null,
  );
  assert.equal(
    syntheticPathForUrl('http://127.0.0.1:8081/img/album_art.php', frontendUrl, options),
    '/img/album_art.php',
  );
});

test('playlist fixtures reject absent or unknown methods', () => {
  const names = playlistResponseForParameters(new URLSearchParams({ method: 'names' }));
  assert.equal(names.status, 200);
  assert.equal(names.data.length, 4);

  const sounds = playlistResponseForParameters(new URLSearchParams({
    method: 'sounds',
    name: 'Layout Review Queue',
  }));
  assert.equal(sounds.status, 200);
  assert.equal(sounds.data.length, 8);

  for (const params of [new URLSearchParams(), new URLSearchParams({ method: 'name' })]) {
    const response = playlistResponseForParameters(params);
    assert.equal(response.status, 400);
    assert.deepEqual(response.data, { error: 'Unsupported playlist method' });
  }
});
