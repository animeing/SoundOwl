import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createMysqlPool } from './db/mysql.js';
import { createSchema } from './db/schema.js';
import { SoundOwlRepository } from './db/soundRepository.js';
import { createRedisClient } from './redis/soundRedis.js';
import { analyzeLoudness } from './audio/ffmpeg.js';
import { readMetadata } from './audio/metadata.js';
import { SoundRegistrar } from './services/soundRegistrar.js';
import { AudioWorker } from './services/audioWorker.js';
import { MediaService } from './media/mediaService.js';
import { createSettingsStore } from './api/settingsStore.js';
import { PulseStore } from './api/pulseStore.js';
import { LockService } from './api/lockService.js';
import { createApiHandlers } from './api/handlers.js';
import { createHttpServer } from './api/httpServer.js';
import { createStatusWebSocket } from './realtime/statusWebSocket.js';
import { createWorkerLoop } from './runtime/workerLoop.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 環境変数から runtime を構築し、HTTP server だけを返します。
 * テストや外部起動コードが WebSocket/Worker を直接扱わず API server だけ必要な場合に使います。
 * @param {NodeJS.ProcessEnv} [env=process.env] process.env 互換の環境変数。
 * @returns {Promise<import('node:http').Server>} API を処理する HTTP server。
 */
async function buildServer(env = process.env) {
  return (await buildRuntime(env)).httpServer;
}
/**
 * HTTP API、WebSocket status broadcaster、Redis worker loop を同じ Node runtime に組み立てる。
 * PHP では常駐 script を分けていた処理も、Node.js 側では同一 process 内の非同期処理として管理する。
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] 環境変数。
 * @returns {Promise<{config:Object,httpServer:import('node:http').Server,websocket:Object|null,workerLoop:Object|null,start:(options?:{port?:number,host?:string})=>Promise<void>,stop:()=>Promise<void>}>} backend runtime。
 */
async function buildRuntime(env = process.env) {
  const config = loadConfig(env);
  const db = await createMysqlPool(config.db);
  const repository = new SoundOwlRepository(db);
  const redis = await createRedisClient(config.redis);
  const settingsStore = createSettingsStore(config.settingsPath);
  const lockService = new LockService();
  const registrar = new SoundRegistrar({
    repository,
    redis,
    metadataReader: readMetadata,
  });
  const mediaService = new MediaService({ repository, redis, blankImagePath: config.blankImagePath });
  const handlers = createApiHandlers({
    repository,
    settingsStore,
    schemaService: {
      create: () => createSchema(db, {
        schemaPath: path.resolve(__dirname, '../../parts/setup/db/soundowl_table_mysql.sql'),
        databaseName: config.db.database,
      }),
    },
    registrar,
    mediaService,
    pulseStore: new PulseStore(path.resolve(__dirname, '../../audio_pulse')),
    lockService,
    fontPath: path.resolve(__dirname, '../assets/fontisto.ttf'),
    placeholderImagePath: config.placeholderImagePath,
    equalizerPresetPath: path.resolve(__dirname, '../assets/sound_equalizer_preset.json'),
    soundDirectoryOverride: config.soundDirectory,
  });
  const httpServer = createHttpServer(handlers, { cors: config.cors });
  const websocket = config.websocket.enabled ? createStatusWebSocket({
    port: config.websocket.port,
    host: config.websocket.host,
    intervalMs: config.websocket.intervalMs,
    statusProvider: () => handlers.siteStatus().then((response) => response.body),
  }) : null;
  const worker = new AudioWorker({
    redis,
    repository,
    analyzeLoudness,
    lockService,
  });
  const workerLoop = config.worker.enabled ? createWorkerLoop({
    worker,
    timeoutSeconds: config.worker.timeoutSeconds,
    idleDelayMs: config.worker.idleDelayMs,
    errorDelayMs: config.worker.errorDelayMs,
  }) : null;

  return {
    config,
    httpServer,
    websocket,
    workerLoop,
    start(options = {}) {
      const port = Number(options.port || env.PORT || 3000);
      const host = options.host || env.HOST || '0.0.0.0';
      return new Promise((resolve) => {
        httpServer.listen(port, host, () => {
          if (websocket) {
            websocket.start();
          }
          if (workerLoop) {
            workerLoop.start();
          }
          resolve();
        });
      });
    },
    stop() {
      if (workerLoop) {
        workerLoop.stop();
      }
      const closeHttp = new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
      return Promise.all([closeHttp, websocket ? websocket.stop() : Promise.resolve()]).then(() => {});
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildRuntime().then((runtime) => {
    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || '0.0.0.0';
    runtime.start({ port, host }).then(() => {
      console.log(`SoundOwl backend-node listening on http://${host}:${port}`);
      if (runtime.websocket) {
        console.log(`SoundOwl backend-node websocket listening on ws://${runtime.config.websocket.host}:${runtime.config.websocket.port}`);
      }
      if (runtime.workerLoop) {
        console.log('SoundOwl backend-node audio worker loop started');
      }
    });
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { buildRuntime, buildServer };
