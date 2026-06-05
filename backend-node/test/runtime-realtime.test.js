import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createStatusWebSocket } from '../src/realtime/statusWebSocket.js';
import { createWorkerLoop } from '../src/runtime/workerLoop.js';

test('createStatusWebSocket sends initial status, broadcasts client messages, runs timer, and stops', async () => {
  const intervals = [];
  const clears = [];
  const websocket = createStatusWebSocket({
    port: 8080,
    statusProvider: async () => ({ regist_status: false }),
    clock: () => 123,
    WebSocketServerImpl: FakeWebSocketServer,
    setIntervalImpl: (fn, delay) => {
      intervals.push({ fn, delay });
      return 'timer-1';
    },
    clearIntervalImpl: (timer) => clears.push(timer),
  });

  websocket.start();
  assert.equal(intervals[0].delay, 5000);
  const connection = new FakeConnection();
  websocket.server.clients.add(connection);
  websocket.server.emit('connection', connection);
  await nextTick();
  assert.deepEqual(JSON.parse(connection.sent[0]), { time: 123, context: { regist_status: false } });

  connection.emit('message', Buffer.from('{"refresh":true}'));
  await nextTick();
  assert.deepEqual(JSON.parse(connection.sent[1]), {
    time: 123,
    context: { regist_status: false, message: { refresh: true } },
  });

  const payload = await websocket.broadcastStatus('plain');
  assert.deepEqual(JSON.parse(payload), { time: 123, context: { regist_status: false, message: 'plain' } });

  intervals[0].fn();
  await nextTick();
  await websocket.stop();
  assert.deepEqual(clears, ['timer-1']);
  assert.equal(websocket.server.closed, true);
});

test('createStatusWebSocket falls back to text messages and skips closed clients', async () => {
  const websocket = createStatusWebSocket({
    server: {},
    statusProvider: () => ({ ok: true }),
    WebSocketServerImpl: FakeWebSocketServer,
  });
  const open = new FakeConnection();
  const closed = new FakeConnection();
  closed.readyState = 3;
  websocket.server.clients.add(open);
  websocket.server.clients.add(closed);
  const connection = new FakeConnection();
  websocket.server.emit('connection', connection);
  await nextTick();
  connection.emit('message', 'hello');
  await nextTick();
  assert.match(open.sent[0], /hello/);
  assert.equal(closed.sent.length, 0);
  await websocket.stop();
});

test('createStatusWebSocket covers no-client, timer-error, and close-error branches', async () => {
  const intervals = [];
  const noClientWebSocket = createStatusWebSocket({
    port: 8081,
    statusProvider: () => ({ ok: true }),
    WebSocketServerImpl: FakeNoClientsWebSocketServer,
  });
  assert.match(await noClientWebSocket.broadcastStatus(), /ok/);
  await noClientWebSocket.stop();

  const rejectingWebSocket = createStatusWebSocket({
    port: 8082,
    statusProvider: async () => { throw new Error('status failed'); },
    WebSocketServerImpl: FakeWebSocketServer,
    setIntervalImpl: (fn, delay) => {
      intervals.push({ fn, delay });
      return 'timer-error';
    },
    clearIntervalImpl: () => {},
  });
  rejectingWebSocket.start();
  rejectingWebSocket.start();
  intervals[0].fn();
  await nextTick();
  await rejectingWebSocket.stop();

  const closeErrorWebSocket = createStatusWebSocket({
    port: 8083,
    statusProvider: () => ({ ok: true }),
    WebSocketServerImpl: FakeCloseErrorWebSocketServer,
  });
  await assert.rejects(closeErrorWebSocket.stop(), /close failed/);
});

test('createWorkerLoop schedules idle, success, error, start idempotency, and stop cleanup', async () => {
  const scheduled = [];
  const cleared = [];
  const logs = [];
  const results = [{ status: 'idle' }, { status: 'updated' }, new Error('boom')];
  const loop = createWorkerLoop({
    worker: {
      processOne: async () => {
        const result = results.shift();
        if (result instanceof Error) {
          throw result;
        }
        return result;
      },
    },
    timeoutSeconds: 9,
    idleDelayMs: 50,
    errorDelayMs: 1000,
    setTimeoutImpl: (fn, delay) => {
      scheduled.push({ fn, delay });
      return `timer-${scheduled.length}`;
    },
    clearTimeoutImpl: (timer) => cleared.push(timer),
    logger: { error: (error) => logs.push(error.message) },
  });

  loop.start();
  loop.start();
  assert.equal(loop.isRunning(), true);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 0);

  await scheduled[0].fn();
  assert.equal(scheduled[1].delay, 50);
  await scheduled[1].fn();
  assert.equal(scheduled[2].delay, 0);
  await scheduled[2].fn();
  assert.equal(scheduled[3].delay, 1000);
  assert.deepEqual(logs, ['boom']);

  loop.stop();
  assert.equal(loop.isRunning(), false);
  assert.deepEqual(cleared, ['timer-4']);
  assert.deepEqual(await loop.processNext(), undefined);
  loop.stop();
  await scheduled[3].fn();
  assert.equal(scheduled.length, 4);
});

class FakeWebSocketServer extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.clients = new Set();
    this.closed = false;
  }

  close(callback) {
    this.closed = true;
    callback();
  }
}

class FakeNoClientsWebSocketServer extends FakeWebSocketServer {
  constructor(options) {
    super(options);
    delete this.clients;
  }
}

class FakeCloseErrorWebSocketServer extends FakeWebSocketServer {
  close(callback) {
    callback(new Error('close failed'));
  }
}

class FakeConnection extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1;
    this.sent = [];
  }

  send(payload) {
    this.sent.push(payload);
  }
}

function nextTick() {
  return new Promise((resolve) => process.nextTick(resolve));
}
