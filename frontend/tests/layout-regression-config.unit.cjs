const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ROUTES, buildRouteUrl } = require('./layout-regression-config.cjs');
const { assertSyntheticRoute } = require('./layout-page-actions.cjs');

test('hash-mode routes preserve paths and query parameters', () => {
  for (const route of ROUTES) {
    assert.equal(buildRouteUrl('http://example.test/#/', route.path), `http://example.test/#${route.path}`, route.name);
  }
});

test('history-mode roots fail before capturing the wrong screen', () => {
  for (const route of ROUTES) {
    assert.throws(() => buildRouteUrl('http://example.test/', route.path), /hash route/, route.name);
  }
});

test('every configured route rejects a NotFound baseline', async () => {
  const notFoundPage = { title: async () => 'Not Found - SoundOwl' };
  for (const route of ROUTES) {
    await assert.rejects(assertSyntheticRoute(notFoundPage, route.name), /unexpected page title/, route.name);
  }
});
