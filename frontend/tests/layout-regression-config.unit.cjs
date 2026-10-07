const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ROUTES, buildRouteUrl } = require('./layout-regression-config.cjs');

test('history-mode routes preserve paths and query parameters', () => {
  for (const route of ROUTES) {
    const actual = new URL(buildRouteUrl('http://example.test/app/', route.path));
    const expected = new URL(route.path, 'http://example.test');
    assert.equal(actual.pathname, `/app${expected.pathname}`, route.name);
    assert.equal(actual.search, expected.search, route.name);
  }
});

test('hash-mode routes preserve query parameters', () => {
  assert.equal(
    buildRouteUrl('http://example.test/#/', '/album?AlbumHash=synthetic-album-01'),
    'http://example.test/#/album?AlbumHash=synthetic-album-01',
  );
  assert.equal(
    buildRouteUrl('http://example.test/#/', '/playlists/sounds?list=Layout%20Review%20Queue'),
    'http://example.test/#/playlists/sounds?list=Layout%20Review%20Queue',
  );
});
