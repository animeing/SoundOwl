const MOCK_HOST = normalizeHost(process.env.SOUNDOWL_LAYOUT_WEBSOCKET_MOCK_HOST || '127.0.0.1');
const MOCK_PORT = readPort(process.env.SOUNDOWL_LAYOUT_WEBSOCKET_MOCK_PORT, 8080);
const SYNTHETIC_HTTP_PORT = 18081;
const SYNTHETIC_BACKEND_URL = buildServiceUrl('http', MOCK_HOST, SYNTHETIC_HTTP_PORT, '/');
const WEBSOCKET_MOCK_HEALTH_URL = buildServiceUrl('http', MOCK_HOST, MOCK_PORT, '/health');
const WEBSOCKET_MOCK_URL = buildServiceUrl('ws', MOCK_HOST, MOCK_PORT);

function normalizeHost(value) {
  return String(value).trim().replace(/^\[|\]$/g, '');
}

function buildServiceUrl(protocol, host, port, pathname = '') {
  const normalizedHost = normalizeHost(host);
  const urlHost = normalizedHost.includes(':') ? `[${normalizedHost}]` : normalizedHost;
  return `${protocol}://${urlHost}:${port}${pathname}`;
}

function readPort(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid WebSocket mock port: ${value}`);
  }
  return port;
}

export {
  MOCK_HOST,
  MOCK_PORT,
  SYNTHETIC_BACKEND_URL,
  WEBSOCKET_MOCK_HEALTH_URL,
  WEBSOCKET_MOCK_URL,
  buildServiceUrl,
  normalizeHost,
};
// WebSocketモックと合成バックエンドの接続先を一元化する。
