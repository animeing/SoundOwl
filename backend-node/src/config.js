import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} BackendConfig
 * バックエンド起動時に参照する接続先、ファイル配置、常駐処理の設定です。
 * @property {{host:string,database:string,user:string,password:string,retry:{attempts:number,delayMs:number}}} db MariaDB 接続情報と起動待ちリトライ設定。
 * @property {{socket:{host:string,port:number}}} redis Redis 接続情報。
 * @property {string} soundDirectory 登録対象の音楽ファイルを走査するディレクトリ。
 * @property {string} blankImagePath アルバムアートがない場合に返す PNG 画像のパス。
 * @property {string} placeholderImagePath フロントから直接取得する代替 WebP 画像のパス。
 * @property {string} settingsPath JSON 設定ファイルのパス。
 * @property {{allowOrigins:string[]}} cors API、画像、音声、WebSocket の CORS 許可 Origin 一覧。
 * @property {{enabled:boolean,host:string,port:number,intervalMs:number}} websocket WebSocket サーバの起動可否、待受、配信間隔。
 * @property {{enabled:boolean,timeoutSeconds:number,idleDelayMs:number,errorDelayMs:number}} worker 音量解析ワーカーの起動可否、ロック期限、待機時間。
 */

/**
 * 環境変数からバックエンド全体の設定を組み立てます。
 * @param {NodeJS.ProcessEnv} [env=process.env] process.env 互換の環境変数。テストでは任意の値を差し替えます。
 * @returns {BackendConfig} DB、Redis、静的ファイル、CORS、WebSocket、ワーカー設定をまとめた設定オブジェクト。
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
    cors: {
      allowOrigins: String(env.CORS_ALLOW_ORIGINS || '*').split(',').map((origin) => origin.trim()).filter(Boolean),
    },
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

export { loadConfig };
