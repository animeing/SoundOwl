/**
 * URL末尾に`/`を付け、プロトコル省略時は`http://`として扱う。
 *
 * @param {string|null|undefined} value 入力されたBackendServer URL。
 * @param {string} fallback 不正または空のときに使うURL。
 * @returns {string} APIや静的assetの基準URL。
 */
export const normalizeBackendServer = (value, fallback = window.location.href.split('#')[0]) => {
  const raw = String(value || '').trim();
  const source = raw || fallback;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(source) ? source : `http://${source}`;
  try {
    const url = new URL(withProtocol);
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch (_error) {
    return fallback.endsWith('/') ? fallback : `${fallback}/`;
  }
};

/**
 * FrontServerから配布されたBackendServer URLを取得する。
 *
 * @returns {string} 現在利用するBackendServer URL。
 */
export const getBackendServer = () => normalizeBackendServer(window.SoundOwlFrontendConfig?.backendServer);

/**
 * WebSocket URLを正規化し、未指定時はBackendServerのホストと8080番ポートを使う。
 *
 * @param {string|null|undefined} value WebSocket server URL。
 * @param {string} backendServer フォールバック元のBackendServer URL。
 * @returns {string} 接続に使うWebSocket URL。
 */
export const normalizeWebSocketServer = (value, backendServer = getBackendServer()) => {
  const raw = String(value || '').trim();
  if (raw) {
    const withProtocol = /^wss?:\/\//i.test(raw) ? raw : `ws://${raw}`;
    try {
      const url = new URL(withProtocol);
      if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return url.href.replace(/\/$/, '');
      }
    } catch (_error) {
      // BackendServerから生成したURLへフォールバックする。
    }
  }

  const url = new URL(normalizeBackendServer(backendServer));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.port = '8080';
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.href.replace(/\/$/, '');
};

export const getWebSocketServer = () => normalizeWebSocketServer(
  window.SoundOwlFrontendConfig?.websocketServer,
  getBackendServer()
);

/**
 * BackendServer URLをFrontServerへ保存し、現在のBASEにも即時反映する。
 *
 * @param {string} value 保存するBackendServer URL。
 * @returns {Promise<string>} 正規化後のBackendServer URL。
 */
export const saveBackendServer = async (value) => {
  const normalized = normalizeBackendServer(value);
  const response = await fetch(`${BASE.FRONT_HOME}front-api/settings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ backendServer: normalized }),
  });
  if (!response.ok) {
    throw new Error(`BackendServer setting save failed: ${response.status}`);
  }
  const saved = await response.json();
  window.SoundOwlFrontendConfig = saved;
  applyBackendServer(normalized);
  return normalized;
};

/**
 * BASE定数の参照先BackendServerを更新する。
 *
 * @param {string} value 正規化前または正規化済みBackendServer URL。
 * @returns {void}
 */
export const applyBackendServer = (value) => {
  const home = normalizeBackendServer(value);
  const websocketServer = normalizeWebSocketServer(window.SoundOwlFrontendConfig?.websocketServer, home);
  BASE.HOME = home;
  BASE.API = `${home}api/`;
  BASE.WEBSOCKET = new URL(websocketServer).hostname;
  BASE.WEBSOCKET_URL = websocketServer;
};

export const BASE = {
  DOMAIN:'',
  SAVE_PATH:window.location.href.split('#')[0],
  FRONT_HOME:window.location.href.split('#')[0],
  HOME:getBackendServer(),
  VUE_HOME:window.location.href.split('#')[0]+'#/',
  API:`${getBackendServer()}api/`,
  WEBSOCKET:new URL(getWebSocketServer()).hostname,
  WEBSOCKET_URL:getWebSocketServer()
};
