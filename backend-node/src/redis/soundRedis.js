import { createClient } from 'redis';

const AUDIO_QUEUE = 'queue:audio-processing';
const AUDIO_PROCESSING = 'queue:audio-processing:processing';

/**
 * @typedef {{hash:string,file_path:string}} AudioProcessingJob
 * 音量解析待ち Redis キューに積む 1 曲分のジョブです。
 */

/**
 * Redis client を SoundOwl の用途別 API に包む DAO です。
 */
class SoundRedis {
  /**
   * Redis client を受け取り、キュー操作とアルバムアート cache 操作に使います。
   * @param {{connect?:()=>Promise<void>,isOpen?:boolean,lPush?:(key:string,value:string)=>Promise<any>,lpush?:(key:string,values:string[])=>Promise<any>,sendCommand?:(args:string[])=>Promise<string|number|null>,setEx?:(key:string,ttl:number,value:string)=>Promise<any>,setex?:(key:string,ttl:number,value:string)=>Promise<any>,get:(key:string)=>Promise<string|null>,exists:(key:string)=>Promise<number>,configSet?:(key:string,value:string)=>Promise<any>,executeRaw?:(args:string[])=>Promise<any>}} client node-redis v4 または互換 client。
   */
  constructor(client) {
    this.client = client;
  }

  /** @returns {Promise<void>} 未接続の場合だけ Redis へ接続します。 */
  async connect() {
    if (this.client.connect && !this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * 音量解析待ちジョブを Redis list の先頭へ投入します。
   * @param {AudioProcessingJob} job 登録済み楽曲 hash と音声ファイルパス。
   * @returns {Promise<any>} Redis の push コマンド結果。
   */
  async enqueueAudioProcessing(job) {
    const payload = JSON.stringify(job);
    if (this.client.lPush) {
      return this.client.lPush(AUDIO_QUEUE, payload);
    }
    return this.client.lpush(AUDIO_QUEUE, [payload]);
  }

  /**
   * 音量解析待ちジョブを Redis list の末尾から 1 件取得します。
   * @param {number} [timeoutSeconds=5] BLMOVE の待機秒数。
   * @returns {Promise<AudioProcessingJob|null>} 取得したジョブ。タイムアウト時は null。
   */
  async popAudioProcessing(timeoutSeconds = 5) {
    const payload = await this.client.sendCommand([
      'BLMOVE', AUDIO_QUEUE, AUDIO_PROCESSING, 'RIGHT', 'LEFT', String(timeoutSeconds),
    ]);
    return payload ? JSON.parse(payload) : null;
  }

  /** Remove a job only after its DB update or durable failure record is complete. */
  async acknowledgeAudioProcessing(job) {
    const removed = await this.client.sendCommand([
      'LREM', AUDIO_PROCESSING, '1', JSON.stringify(job),
    ]);
    if (Number(removed) !== 1) {
      throw new Error('Could not acknowledge audio processing job.');
    }
  }

  /** Atomically return one failed claim to the waiting queue for retry. */
  async requeueAudioProcessing(job) {
    const script = "if redis.call('LREM', KEYS[1], 1, ARGV[1]) == 1 then " +
      "return redis.call('LPUSH', KEYS[2], ARGV[1]) end return 0";
    const moved = await this.client.sendCommand([
      'EVAL', script, '2', AUDIO_PROCESSING, AUDIO_QUEUE, JSON.stringify(job),
    ]);
    if (Number(moved) < 1) {
      throw new Error('Could not requeue audio processing job.');
    }
  }
  /** Return jobs claimed by a previous worker process to the pending list on startup. */
  async recoverAudioProcessing() {
    let recovered = 0;
    while (await this.client.sendCommand([
      'LMOVE', AUDIO_PROCESSING, AUDIO_QUEUE, 'RIGHT', 'LEFT',
    ]) !== null) {
      recovered += 1;
    }
    return recovered;
  }

  /**
   * アルバムアート付きの album 行を Redis に TTL 付きで保存します。
   * @param {string} key Redis cache key。
   * @param {Record<string, any>} value album_art Buffer を含む可能性がある album 行。
   * @param {number} [ttlSeconds=3600] cache の TTL 秒数。
   * @returns {Promise<any>} Redis の set コマンド結果。
   */
  async cacheAlbum(key, value, ttlSeconds = 3600) {
    const payload = JSON.stringify(serializeAlbumCache(value));
    if (this.client.setEx) {
      return this.client.setEx(key, ttlSeconds, payload);
    }
    return this.client.setex(key, ttlSeconds, payload);
  }

  /** @param {string} key Redis cache key。 @returns {Promise<Record<string, any>|null>} 復元済み album cache。未登録の場合は null。 */
  async getCachedAlbum(key) {
    const payload = await this.client.get(key);
    return payload ? deserializeAlbumCache(JSON.parse(payload)) : null;
  }

  /** @param {string} key Redis key。 @returns {Promise<boolean>} key が存在する場合は true。 */
  async exists(key) {
    return Boolean(await this.client.exists(key));
  }

  /** @returns {Promise<void>} 画像 cache 用の Redis maxmemory と eviction policy を設定します。 */
  async configureImageCache() {
    if (this.client.configSet) {
      await this.client.configSet('maxmemory', '256mb');
      await this.client.configSet('maxmemory-policy', 'volatile-ttl');
      return;
    }
    if (this.client.executeRaw) {
      await this.client.executeRaw(['CONFIG', 'SET', 'maxmemory', '256mb']);
      await this.client.executeRaw(['CONFIG', 'SET', 'maxmemory-policy', 'volatile-ttl']);
    }
  }
}

/**
 * JSON 化で失われる Buffer を base64 表現へ変換します。
 * @param {Record<string, any>|null} value album_art Buffer を含む可能性がある album cache 値。
 * @returns {Record<string, any>|null} JSON.stringify 可能な album cache 値。
 */
function serializeAlbumCache(value) {
  if (!value || !Buffer.isBuffer(value.album_art)) {
    return value;
  }
  return {
    ...value,
    album_art: {
      __soundowl_type: 'Buffer',
      encoding: 'base64',
      data: value.album_art.toString('base64'),
    },
  };
}

/**
 * Redis から読んだ album_art の JSON 表現を Buffer へ戻します。
 * @param {Record<string, any>|null} value JSON.parse 済みの album cache 値。
 * @returns {Record<string, any>|null} album_art を Buffer に復元した album cache 値。
 */
function deserializeAlbumCache(value) {
  if (!value?.album_art) {
    return value;
  }
  if (Buffer.isBuffer(value.album_art)) {
    return value;
  }
  if (value.album_art.__soundowl_type === 'Buffer' && value.album_art.encoding === 'base64') {
    return { ...value, album_art: Buffer.from(value.album_art.data, 'base64') };
  }
  if (value.album_art.type === 'Buffer' && Array.isArray(value.album_art.data)) {
    return { ...value, album_art: Buffer.from(value.album_art.data) };
  }
  return value;
}

/**
 * Redis client を作成して接続済み SoundRedis を返します。
 * @param {import('redis').RedisClientOptions} config node-redis の接続設定。
 * @returns {Promise<SoundRedis>} 接続済みの Redis DAO。
 */
async function createRedisClient(config) {
  const client = createClient(config);
  const soundRedis = new SoundRedis(client);
  await soundRedis.connect();
  return soundRedis;
}

export {
  SoundRedis,
  createRedisClient,
  deserializeAlbumCache,
  serializeAlbumCache,
};
