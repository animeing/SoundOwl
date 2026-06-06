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
  const url = new URL(home);
  BASE.HOME = home;
  BASE.API = `${home}api/`;
  BASE.WEBSOCKET = url.hostname;
  BASE.WEBSOCKET_URL = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.hostname}:8080`;
};

export const BASE = {
  DOMAIN:'',
  SAVE_PATH:window.location.href.split('#')[0],
  FRONT_HOME:window.location.href.split('#')[0],
  HOME:getBackendServer(),
  VUE_HOME:window.location.href.split('#')[0]+'#/',
  API:`${getBackendServer()}api/`,
  WEBSOCKET:new URL(getBackendServer()).hostname,
  WEBSOCKET_URL:`${new URL(getBackendServer()).protocol === 'https:' ? 'wss' : 'ws'}://${new URL(getBackendServer()).hostname}:8080`
};
