const path = require('node:path');
const { DEFAULT_ACTUAL_BACKEND_URL } = require('./layout-regression-config.cjs');
const { WEBSOCKET_MOCK_URL } = require('./mocks/layout-websocket/config.cjs');
const { startLayoutWebSocketMock } = require('./mocks/layout-websocket/server.cjs');

module.exports = async function startLayoutTestServers(config) {
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

  const { createApp } = require('../server.js');
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
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
