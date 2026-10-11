const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const WebSocket = require('ws');
const { startLayoutWebSocketMock } = require('./server.cjs');

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
