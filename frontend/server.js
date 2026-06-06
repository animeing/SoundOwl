const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const configPath = process.env.FRONTEND_CONFIG_PATH || path.join(__dirname, 'config', 'frontend-settings.json');
const host = process.env.FRONTEND_HOST || process.env.HOST || '0.0.0.0';
const port = Number(process.env.FRONTEND_PORT || process.env.PORT || 8081);
const defaultBackendServer = process.env.FRONTEND_BACKEND_SERVER_DEFAULT || 'http://127.0.0.1:3000/';

/**
 * URL 末尾に `/` を付け、プロトコル省略時は `http://` として扱います。
 *
 * @param {string|null|undefined} value 入力された URL。
 * @param {string} fallback 不正または空の場合に使う URL。
 * @returns {string} 正規化済み URL。
 */
function normalizeUrl(value, fallback) {
  const raw = String(value || '').trim();
  const source = raw || fallback;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(source) ? source : `http://${source}`;
  try {
    const url = new URL(withProtocol);
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch (_error) {
    return fallback.endsWith('/') ? fallback : `${fallback}/`;
  }
}

/**
 * Backend proxy に使える URL を検証済み URL として返します。
 * ユーザー入力由来 URL で外部任意ホストへアクセスしないよう、localhost とプライベート IPv4 だけを許可します。
 *
 * @param {string} value 検証する Backend server URL。
 * @returns {URL|null} proxy 先として許可する URL。許可しない場合は null。
 */
function parseAllowedBackendUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch (_error) {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return url;
  }
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  const allowed = parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
  return allowed ? url : null;
}

/**
 * Backend proxy に使える URL か検証します。
 *
 * @param {string} value 検証する Backend server URL。
 * @returns {boolean} proxy 先として許可する URL の場合は true。
 */
function isAllowedBackendUrl(value) {
  return parseAllowedBackendUrl(value) !== null;
}

/**
 * 検証済み Backend base URL と許可済み path から proxy 先 URL を作成します。
 *
 * @param {string} backendServer FrontServer 設定に保存された Backend server URL。
 * @param {string} safePath `/img` または `/sound_create` で始まる検証済み path。
 * @param {string} search request query string。
 * @returns {URL|null} fetch に渡す proxy 先 URL。Backend URL が許可されない場合は null。
 */
function buildBackendProxyUrl(backendServer, safePath, search) {
  const backendUrl = parseAllowedBackendUrl(backendServer);
  if (!backendUrl) {
    return null;
  }
  return new URL(`${safePath}${search}`, backendUrl);
}

/**
 * FrontServer 設定を JSON から読み込みます。
 *
 * @returns {Promise<{backendServer:string}>} FrontServer 設定。
 */
async function readConfig() {
  try {
    const parsed = JSON.parse(await fs.readFile(configPath, 'utf8'));
    return {
      backendServer: normalizeUrl(parsed.backendServer, defaultBackendServer),
    };
  } catch (_error) {
    return { backendServer: normalizeUrl(defaultBackendServer, 'http://127.0.0.1:3000/') };
  }
}

/**
 * FrontServer 設定を JSON へ保存します。
 *
 * @param {{backendServer:string}} config 保存する設定。
 * @returns {Promise<void>} 保存完了時に resolve します。
 */
async function writeConfig(config) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Express FrontServer を作成します。
 *
 * @returns {import('express').Express} Express app。
 */
function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/front-api/settings', async (_req, res, next) => {
    try {
      res.json(await readConfig());
    } catch (error) {
      next(error);
    }
  });

  app.post('/front-api/settings', async (req, res, next) => {
    try {
      const backendServer = normalizeUrl(req.body?.backendServer, defaultBackendServer);
      if (!isAllowedBackendUrl(backendServer)) {
        res.status(400).json({ error: 'Invalid backend server' });
        return;
      }
      const config = {
        backendServer,
      };
      await writeConfig(config);
      res.json(config);
    } catch (error) {
      next(error);
    }
  });

  app.get('/front-config.js', async (_req, res, next) => {
    try {
      const config = await readConfig();
      res.type('application/javascript').send(`window.SoundOwlFrontendConfig = ${JSON.stringify(config)};\n`);
    } catch (error) {
      next(error);
    }
  });

  app.use(['/img', '/sound_create'], async (req, res, next) => {
    try {
      const config = await readConfig();
      const safePath = req.path;
      if (!safePath.startsWith('/img') && !safePath.startsWith('/sound_create')) {
        res.status(400).json({ error: 'Invalid proxy path' });
        return;
      }
      const search = new URL(req.url, 'http://localhost').search;
      const target = buildBackendProxyUrl(config.backendServer, safePath, search);
      if (!target) {
        res.status(400).json({ error: 'Invalid backend server' });
        return;
      }
      const headers = {};
      for (const name of ['range', 'accept', 'user-agent']) {
        if (req.headers[name]) {
          headers[name] = req.headers[name];
        }
      }
      const response = await fetch(target, { method: req.method, headers });
      res.status(response.status);
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'x-cache-load']) {
        const value = response.headers.get(name);
        if (value) {
          res.setHeader(name, value);
        }
      }
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(projectRoot, {
    extensions: ['html'],
    index: 'index.html',
  }));

  return app;
}

if (require.main === module) {
  createApp().listen(port, host, () => {
    console.log(`SoundOwl frontend listening on http://${host}:${port}`);
    console.log(`FrontServer settings: ${configPath}`);
  });
}

module.exports = {
  createApp,
  buildBackendProxyUrl,
  isAllowedBackendUrl,
  normalizeUrl,
  parseAllowedBackendUrl,
  readConfig,
  writeConfig,
};
