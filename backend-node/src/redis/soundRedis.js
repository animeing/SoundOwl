/**
 * Redisに対するDAO相当クラス。
 *
 * 現行PHPが使う`queue:audio-processing`とアルバムアートキャッシュ設定を
 * Node側から同じ意味で扱う。
 */
class SoundRedis {
  /**
   * @param {Object} client node-redis互換、またはテスト用fake Redis client。
   */
  constructor(client) {
    this.client = client;
  }

  /**
   * node-redis v4 clientを未接続なら接続する。
   *
   * @returns {Promise<void>} 接続完了時にresolveする。
   */
  async connect() {
    if (this.client.connect && !this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * 音量解析worker用jobをRedisキューへ追加する。
   *
   * @param {{file_path:string, hash:string}} job 解析対象ファイルパスとsound_hash。
   * @returns {Promise<unknown>} RedisのLPUSH結果。
   */
  async enqueueAudioProcessing(job) {
    const payload = JSON.stringify(job);
    if (this.client.lPush) {
      return this.client.lPush('queue:audio-processing', payload);
    }
    return this.client.lpush('queue:audio-processing', [payload]);
  }

  /**
   * 音量解析worker用jobをRedisキューからblocking popする。
   *
   * @param {number} [timeoutSeconds=5] Redis BRPOPのタイムアウト秒数。
   * @returns {Promise<{file_path:string, hash:string}|null>} job。タイムアウト時はnull。
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
   * アルバムアート検索結果をJSONでTTL付き保存する。
   *
   * @param {string} key album_key。
   * @param {Object} value キャッシュするアルバムDTO相当の値。
   * @param {number} [ttlSeconds=3600] TTL秒数。
   * @returns {Promise<unknown>} Redis SETEX結果。
   */
  async cacheAlbum(key, value, ttlSeconds = 3600) {
    const payload = JSON.stringify(serializeAlbumCache(value));
    if (this.client.setEx) {
      return this.client.setEx(key, ttlSeconds, payload);
    }
    return this.client.setex(key, ttlSeconds, payload);
  }

  /**
   * アルバムアートキャッシュを取得する。
   *
   * @param {string} key album_key。
   * @returns {Promise<Object|null>} キャッシュ済み値。未存在ならnull。
   */
  async getCachedAlbum(key) {
    const payload = await this.client.get(key);
    return payload ? deserializeAlbumCache(JSON.parse(payload)) : null;
  }

  /**
   * Redis keyが存在するか確認する。
   *
   * @param {string} key 確認対象key。
   * @returns {Promise<boolean>} 存在すればtrue。
   */
  async exists(key) {
    return Boolean(await this.client.exists(key));
  }

  /**
   * PHPの画像APIと同じRedisメモリポリシーを設定する。
   *
   * @returns {Promise<void>} 設定完了時にresolveする。
   */
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
 * JSON化でBufferが壊れないよう、Redis保存用のalbum DTOへ変換する。
 *
 * @param {Object} value album cache DTO。
 * @returns {Object} RedisへJSON保存できるalbum cache DTO。
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
 * Redisから取得したalbum DTOのalbum_artをBufferへ戻す。
 * 既存キャッシュに残り得るNode標準の`{ type: 'Buffer', data: [...] }`形式も扱う。
 *
 * @param {Object|null} value Redisから復元したalbum cache DTO。
 * @returns {Object|null} album_artがBufferへ復元されたalbum cache DTO。
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
 * 実Redis clientを作成してSoundRedisで包む。
 *
 * @param {Object} config node-redisの`createClient`へ渡す設定。
 * @returns {Promise<SoundRedis>} 接続済みRedis DAO。
 */
async function createRedisClient(config) {
  const { createClient } = require('redis');
  const client = createClient(config);
  const soundRedis = new SoundRedis(client);
  await soundRedis.connect();
  return soundRedis;
}

module.exports = {
  SoundRedis,
  createRedisClient,
  deserializeAlbumCache,
  serializeAlbumCache,
};
