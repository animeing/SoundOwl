import { createClient } from 'redis';

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
   * @param {{connect?:()=>Promise<void>,isOpen?:boolean,lPush?:(key:string,value:string)=>Promise<any>,lpush?:(key:string,values:string[])=>Promise<any>,brPop?:(key:string,timeout:number)=>Promise<{element:string}|null>,brpop?:(key:string,timeout:number)=>Promise<[string,string]|null>,setEx?:(key:string,ttl:number,value:string)=>Promise<any>,setex?:(key:string,ttl:number,value:string)=>Promise<any>,get:(key:string)=>Promise<string|null>,exists:(key:string)=>Promise<number>,configSet?:(key:string,value:string)=>Promise<any>,executeRaw?:(args:string[])=>Promise<any>}} client node-redis v4 または互換 client。
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
      return this.client.lPush('queue:audio-processing', payload);
    }
    return this.client.lpush('queue:audio-processing', [payload]);
  }

  /**
   * 音量解析待ちジョブを Redis list の末尾から 1 件取得します。
   * @param {number} [timeoutSeconds=5] brPop の待機秒数。
   * @returns {Promise<AudioProcessingJob|null>} 取得したジョブ。タイムアウト時は null。
   */
  async popAudioProcessing(timeoutSeconds = 5) {
    if (this.client.brPop) {
      const item = await this.client.brPop('queue:audio-processing', timeoutSeconds);
      return item ? JSON.parse(item.element) : null;
    }
    const item = await this.client.brpop('queue:audio-processing', timeoutSeconds);
    return item ? JSON.parse(item[1]) : null;
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
