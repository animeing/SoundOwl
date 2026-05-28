const path = require('node:path');
const { loadConfig } = require('./config');
const { createMysqlPool } = require('./db/mysql');
const { createSchema } = require('./db/schema');
const { SoundRepository } = require('./db/soundRepository');
const { createRedisClient } = require('./redis/soundRedis');
const { analyzeLoudness } = require('./audio/ffmpeg');
const { readMetadata } = require('./audio/metadata');
const { SoundRegistrar } = require('./services/soundRegistrar');
const { AudioWorker } = require('./services/audioWorker');
const { MediaService } = require('./media/mediaService');
const { createSettingsStore } = require('./api/settingsStore');
const { PulseStore } = require('./api/pulseStore');
const { LockService } = require('./api/lockService');
const { createApiHandlers } = require('./api/handlers');
const { createHttpServer } = require('./api/httpServer');
const { createStatusWebSocket } = require('./realtime/statusWebSocket');
const { createWorkerLoop } = require('./runtime/workerLoop');

/**
 * production用依存を組み立ててHTTP serverを作る。
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] 環境変数。
 * @returns {Promise<import('node:http').Server>} HTTP server。
 */
async function buildServer(env = process.env) {
  return (await buildRuntime(env)).httpServer;
}

/**
 * HTTP API、WebSocket status broadcaster、Redis worker loopを同じNode runtimeへ組み立てる。
 *
 * PHPではWebSocketとworkerを常駐scriptとして分けていたが、Nodeでは同一process内の非同期処理として
 * 管理できるため、このruntimeをbackendの起動単位にする。
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] 環境変数。
 * @returns {Promise<{config:Object,httpServer:import('node:http').Server,websocket:Object|null,workerLoop:Object|null,start:(options?:{port?:number,host?:string})=>Promise<void>,stop:()=>Promise<void>}>} backend runtime。
 */
async function buildRuntime(env = process.env) {
  const config = loadConfig(env);
  const db = await createMysqlPool(config.db);
  const repository = new SoundRepository(db);
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
    fontPath: path.resolve(__dirname, '../../vendor/kenangundogan/fontisto/fonts/fontisto/fontisto.ttf'),
    placeholderImagePath: config.placeholderImagePath,
    equalizerPresetPath: path.resolve(__dirname, '../../api/sound_equalizer_preset.json'),
    soundDirectoryOverride: config.soundDirectory,
  });
  const httpServer = createHttpServer(handlers);
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

if (require.main === module) {
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

module.exports = { buildRuntime, buildServer };
