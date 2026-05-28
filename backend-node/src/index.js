/**
 * Node.js backend baseの公開エントリポイント。
 *
 * API adapter実装時はこのファイルからDB/Redis/登録/worker/media機能をimportする。
 */
const { loadConfig } = require('./config');
const { createMysqlPool } = require('./db/mysql');
const { createSchema } = require('./db/schema');
const { SoundRepository } = require('./db/soundRepository');
const { createRedisClient, SoundRedis } = require('./redis/soundRedis');
const { analyzeLoudness, probeMetadata } = require('./audio/ffmpeg');
const { normalizeMetadata, readMetadata } = require('./audio/metadata');
const { SoundRegistrar } = require('./services/soundRegistrar');
const { AudioWorker } = require('./services/audioWorker');
const { MediaService } = require('./media/mediaService');
const { createApiHandlers } = require('./api/handlers');
const { createHttpServer } = require('./api/httpServer');
const { LockService } = require('./api/lockService');
const { PulseStore } = require('./api/pulseStore');
const { createStatusWebSocket } = require('./realtime/statusWebSocket');
const { createWorkerLoop } = require('./runtime/workerLoop');
const { buildRuntime, buildServer } = require('./server');
const hash = require('./utils/hash');

module.exports = {
  AudioWorker,
  MediaService,
  SoundRedis,
  SoundRegistrar,
  SoundRepository,
  analyzeLoudness,
  createApiHandlers,
  createHttpServer,
  createMysqlPool,
  createRedisClient,
  createSchema,
  createStatusWebSocket,
  createWorkerLoop,
  buildRuntime,
  buildServer,
  hash,
  loadConfig,
  LockService,
  normalizeMetadata,
  readMetadata,
  PulseStore,
  probeMetadata,
};
