#!/usr/bin/env node
// レイアウト比較専用のWebSocketモックサーバーを提供する。
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  MOCK_HOST,
  MOCK_PORT,
  buildServiceUrl,
  normalizeHost,
} from './config.mjs';

async function startLayoutWebSocketMock(options = {}) {
  const host = normalizeHost(options.host || MOCK_HOST);
  const port = options.port ?? MOCK_PORT;
  const httpServer = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(`${JSON.stringify({ service: 'soundowl-layout-websocket-mock', status: 'ok' })}\n`);
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const websocketServer = new WebSocketServer({ noServer: true });
  let closed = false;

  httpServer.on('upgrade', (request, socket, head) => {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit('connection', websocket, request);
    });
  });

  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, resolve);
  });

  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    healthUrl: buildServiceUrl('http', host, actualPort, '/health'),
    websocketUrl: buildServiceUrl('ws', host, actualPort),
    close: async () => {
      if (closed) {
        return;
      }
      closed = true;
      for (const client of websocketServer.clients) {
        client.terminate();
      }
      websocketServer.close();
      httpServer.closeAllConnections?.();
      if (!httpServer.listening) {
        return;
      }
      await new Promise((resolve, reject) => {
        httpServer.close((error) => error?.code === 'ERR_SERVER_NOT_RUNNING' || !error ? resolve() : reject(error));
      });
    },
  };
}

async function main() {
  const mock = await startLayoutWebSocketMock();
  console.log(`[layout-websocket-mock] listening on ${mock.websocketUrl}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}

export { startLayoutWebSocketMock };
