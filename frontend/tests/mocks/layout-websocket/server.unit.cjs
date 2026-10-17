const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');
const { normalizeWebSocketUrl, withRuntimeConfig } = require('../../../server.js');
const { buildServiceUrl, normalizeHost } = require('./config.cjs');
const { startLayoutWebSocketMock } = require('./server.cjs');

test('layout WebSocket mock formats IPv6 hosts for URLs without changing the listen host', () => {
  assert.equal(normalizeHost('[::1]'), '::1');
  assert.equal(buildServiceUrl('http', '::1', 18081, '/'), 'http://[::1]:18081/');
  assert.equal(buildServiceUrl('ws', '::1', 19080), 'ws://[::1]:19080');
});

test('frontend runtime config exposes the selected WebSocket mock URL', () => {
  assert.equal(normalizeWebSocketUrl('ws://[::1]:19080/'), 'ws://[::1]:19080');
  assert.deepEqual(
    withRuntimeConfig({ backendServer: 'http://127.0.0.1:18081/' }, 'ws://127.0.0.1:19080'),
    {
      backendServer: 'http://127.0.0.1:18081/',
      websocketServer: 'ws://127.0.0.1:19080',
    },
  );
});

test('layout WebSocket mock accepts a connection and exposes health status', async (context) => {
  const mock = await startLayoutWebSocketMock({ host: '127.0.0.1', port: 0 });
  context.after(() => mock.close());

  const healthResponse = await fetch(mock.healthUrl);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), {
    service: 'soundowl-layout-websocket-mock',
    status: 'ok',
  });

  const websocket = new WebSocket(mock.websocketUrl);
  context.after(() => websocket.terminate());
  await once(websocket, 'open');
  assert.equal(websocket.readyState, WebSocket.OPEN);
});
