#!/usr/bin/env node
const http = require('node:http');
const { WebSocketServer } = require('ws');
const { MOCK_HOST, MOCK_PORT } = require('./config.cjs');

async function startLayoutWebSocketMock(options = {}) {
  const host = options.host || MOCK_HOST;
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
    healthUrl: `http://${host}:${actualPort}/health`,
    websocketUrl: `ws://${host}:${actualPort}`,
    close: async () => {
      for (const client of websocketServer.clients) {
        client.terminate();
      }
      websocketServer.close();
      httpServer.closeAllConnections?.();
      await new Promise((resolve, reject) => {
        httpServer.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

async function main() {
  const mock = await startLayoutWebSocketMock();
  console.log(`[layout-websocket-mock] listening on ${mock.websocketUrl}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}

module.exports = { startLayoutWebSocketMock };
