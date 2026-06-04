/**
 * Node.js backend baseの公開エントリポイント。
 *
 * API adapter実装時はこのファイルからDB/Redis/登録/worker/media機能をimportする。
 */
import { loadConfig } from './config.js';
import { createMysqlPool } from './db/mysql.js';
import { createSchema } from './db/schema.js';
import { SoundRepository } from './db/soundRepository.js';
import { createRedisClient, SoundRedis } from './redis/soundRedis.js';
import { analyzeLoudness, probeMetadata } from './audio/ffmpeg.js';
import { normalizeMetadata, readMetadata } from './audio/metadata.js';
import { SoundRegistrar } from './services/soundRegistrar.js';
import { AudioWorker } from './services/audioWorker.js';
import { MediaService } from './media/mediaService.js';
import { createApiHandlers } from './api/handlers.js';
import { createHttpServer } from './api/httpServer.js';
import { LockService } from './api/lockService.js';
import { PulseStore } from './api/pulseStore.js';
import { createStatusWebSocket } from './realtime/statusWebSocket.js';
import { createWorkerLoop } from './runtime/workerLoop.js';
import { buildRuntime, buildServer } from './server.js';
import * as hash from './utils/hash.js';

export {
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
