const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const configPath = process.env.FRONTEND_CONFIG_PATH || path.join(__dirname, 'config', 'frontend-settings.json');
const host = process.env.FRONTEND_HOST || process.env.HOST || '0.0.0.0';
const port = Number(process.env.FRONTEND_PORT || process.env.PORT || 8081);
const defaultBackendServer = process.env.FRONTEND_BACKEND_SERVER_DEFAULT || 'http://127.0.0.1:3000/';

/**
 * URL末尾に`/`を付け、プロトコル省略時は`http://`として扱う。
 *
 * @param {string|null|undefined} value 入力されたURL。
 * @param {string} fallback 不正または空のときに使うURL。
 * @returns {string} 正規化済みURL。
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
 * FrontServer設定をJSONから読む。
 *
 * @returns {Promise<{backendServer:string}>} FrontServer設定。
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
 * FrontServer設定をJSONへ保存する。
 *
 * @param {{backendServer:string}} config 保存する設定。
 * @returns {Promise<void>} 保存完了時にresolve。
 */
async function writeConfig(config) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Express FrontServerを作成する。
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
      const config = {
        backendServer: normalizeUrl(req.body?.backendServer, defaultBackendServer),
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
      const target = new URL(`${safePath}${search}`, config.backendServer);
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
  normalizeUrl,
  readConfig,
  writeConfig,
};
