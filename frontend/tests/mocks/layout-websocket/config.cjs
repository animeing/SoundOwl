const MOCK_HOST = process.env.SOUNDOWL_LAYOUT_WEBSOCKET_MOCK_HOST || '127.0.0.1';
const MOCK_PORT = readPort(process.env.SOUNDOWL_LAYOUT_WEBSOCKET_MOCK_PORT, 8080);
const SYNTHETIC_HTTP_PORT = 18081;
const SYNTHETIC_BACKEND_URL = `http://${MOCK_HOST}:${SYNTHETIC_HTTP_PORT}/`;
const WEBSOCKET_MOCK_HEALTH_URL = `http://${MOCK_HOST}:${MOCK_PORT}/health`;

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

module.exports = {
  MOCK_HOST,
  MOCK_PORT,
  SYNTHETIC_BACKEND_URL,
};
