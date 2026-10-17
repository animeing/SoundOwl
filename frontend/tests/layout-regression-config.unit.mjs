// レイアウト比較設定とURL生成の契約を検証する。
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROUTES, buildRouteUrl } from './layout-regression-config.mjs';
import { assertSyntheticRoute } from './layout-page-actions.mjs';
import { buildSyntheticFrontendConfigScript } from './layout-synthetic-mocks.mjs';
import { normalizeListenHost } from './scripts/run-layout-regression.mjs';

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

test('custom local URL selects the Playwright base URL', async () => {
  const previousUrl = process.env.SOUNDOWL_LAYOUT_LOCAL_URL;
  try {
    process.env.SOUNDOWL_LAYOUT_LOCAL_URL = 'http://127.0.0.1:9000/#/';
    const configUrl = new URL(`../playwright.config.mjs?test=${Date.now()}`, import.meta.url);
    const { default: config } = await import(configUrl.href);
    assert.equal(config.use.baseURL, 'http://127.0.0.1:9000/#/');
    assert.equal(config.globalSetup.endsWith('layout-global-setup.mjs'), true);
  } finally {
    if (previousUrl === undefined) {
      delete process.env.SOUNDOWL_LAYOUT_LOCAL_URL;
    } else {
      process.env.SOUNDOWL_LAYOUT_LOCAL_URL = previousUrl;
    }
  }
});

test('synthetic frontend config passes the selected WebSocket mock port to the browser', () => {
  const script = buildSyntheticFrontendConfigScript('http://127.0.0.1:18081/', 'ws://127.0.0.1:19080');
  assert.match(script, /"backendServer":"http:\/\/127\.0\.0\.1:18081\/"/);
  assert.match(script, /"websocketServer":"ws:\/\/127\.0\.0\.1:19080"/);
});

test('layout runner normalizes configured IPv4 and IPv6 host names for port probing', () => {
  assert.equal(normalizeListenHost('192.168.0.125'), '192.168.0.125');
  assert.equal(normalizeListenHost('[::1]'), '::1');
  assert.equal(normalizeListenHost(), '127.0.0.1');
});
