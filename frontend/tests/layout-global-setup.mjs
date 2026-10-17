// Playwright実行前にフロントエンドとWebSocketモックを起動する。
import path from 'node:path';
import { DEFAULT_ACTUAL_BACKEND_URL } from './layout-regression-config.mjs';
import { WEBSOCKET_MOCK_URL } from './mocks/layout-websocket/config.mjs';
import { startLayoutWebSocketMock } from './mocks/layout-websocket/server.mjs';

export default async function startLayoutTestServers(config) {
  const localUrl = config.projects[0]?.use?.baseURL;
  if (!localUrl) {
    throw new Error('Layout test baseURL is not configured.');
  }
  const localAddress = new URL(localUrl);
  const host = localAddress.hostname.replace(/^\[|\]$/g, '');
  const port = Number(localAddress.port || 80);
  const frontendConfigPath = process.env.SOUNDOWL_LAYOUT_FRONTEND_CONFIG_PATH
    || path.join(process.cwd(), 'test-results', 'layout-frontend-settings.json');

  process.env.FRONTEND_HOST = host;
  process.env.FRONTEND_PORT = String(port);
  process.env.FRONTEND_CONFIG_PATH = frontendConfigPath;
  process.env.FRONTEND_BACKEND_SERVER_DEFAULT = process.env.SOUNDOWL_LAYOUT_BACKEND_URL
    || DEFAULT_ACTUAL_BACKEND_URL;
  process.env.FRONTEND_WEBSOCKET_SERVER_DEFAULT = WEBSOCKET_MOCK_URL;

  const { default: serverModule } = await import('../server.js');
  const { createApp } = serverModule;
  const frontendServer = await listen(createApp(), port, host);
  let websocketMock;
  try {
    websocketMock = await startLayoutWebSocketMock();
  } catch (error) {
    await closeHttpServer(frontendServer);
    throw error;
  }

  console.log(`[layout-test-servers] frontend listening on ${localUrl}`);
  console.log(`[layout-websocket-mock] listening on ${websocketMock.websocketUrl}`);
  return async () => {
    await websocketMock.close();
    await closeHttpServer(frontendServer);
    console.log('[layout-test-servers] stopped');
  };
};

function listen(app, port, host) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.once('error', reject);
  });
}

function closeHttpServer(server) {
  server.closeAllConnections?.();
  if (!server.listening) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    server.close((error) => error?.code === 'ERR_SERVER_NOT_RUNNING' || !error ? resolve() : reject(error));
  });
}
