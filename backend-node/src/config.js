/**
 * @typedef {Object} BackendConfig
 * @property {{host:string,database:string,user:string,password:string,retry:{attempts:number,delayMs:number}}} db MariaDB接続設定。
 * @property {{socket:{host:string,port:number}}} redis node-redis用接続設定。
 * @property {string} soundDirectory 音楽ファイルを走査するディレクトリ。PHPの`SOUND_DIRECTORY`相当。
 * @property {string} blankImagePath アートが無い場合に返すblank PNGのパス。
 * @property {string} settingsPath JSON設定ファイルパス。
 * @property {{enabled:boolean,host:string,port:number,intervalMs:number}} websocket WebSocket status broadcaster設定。
 * @property {{enabled:boolean,timeoutSeconds:number,idleDelayMs:number,errorDelayMs:number}} worker Redis音量解析worker loop設定。
 */

/**
 * 環境変数からNode backendの実行設定を作成する。
 *
 * @param {NodeJS.ProcessEnv|Object.<string, string|undefined>} [env=process.env] 読み込み元の環境変数。
 * @returns {BackendConfig} DB、Redis、音楽ディレクトリ、ロック、blank画像の設定。
 */
function loadConfig(env = process.env) {
  return {
    db: {
      host: env.DB_SERVER || env.DB_HOST || 'localhost',
      database: env.DB_NAME || 'sound',
      user: env.DB_USER || 'sound',
      password: env.DB_PASSWORD || env.DB_PASS || 'sound',
      retry: {
        attempts: Number(env.DB_CONNECT_RETRY_ATTEMPTS || 30),
        delayMs: Number(env.DB_CONNECT_RETRY_DELAY_MS || 1000),
      },
    },
    redis: {
      socket: {
        host: env.REDIS_SERVER || env.REDIS_HOST || 'localhost',
        port: Number(env.REDIS_PORT || 6379),
      },
    },
    soundDirectory: env.SOUND_PATH || env.SOUND_DIRECTORY || '/',
    blankImagePath: env.BLANK_IMAGE_PATH || path.resolve(__dirname, '../assets/blank-image.png'),
    placeholderImagePath: env.PLACEHOLDER_IMAGE_PATH || path.resolve(__dirname, '../assets/placeholder-image.webp'),
    settingsPath: env.SETTINGS_PATH || path.resolve(__dirname, '../config/settings.json'),
    websocket: {
      enabled: env.WEBSOCKET_ENABLED !== 'false',
      host: env.WEBSOCKET_HOST || env.HOST || '0.0.0.0',
      port: Number(env.WEBSOCKET_PORT || 8080),
      intervalMs: Number(env.WEBSOCKET_INTERVAL_MS || 5000),
    },
    worker: {
      enabled: env.WORKER_ENABLED !== 'false',
      timeoutSeconds: Number(env.WORKER_TIMEOUT_SECONDS || 5),
      idleDelayMs: Number(env.WORKER_IDLE_DELAY_MS || 50),
      errorDelayMs: Number(env.WORKER_ERROR_DELAY_MS || 1000),
    },
  };
}

module.exports = { loadConfig };
const path = require('node:path');
