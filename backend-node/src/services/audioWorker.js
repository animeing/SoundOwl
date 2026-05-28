/**
 * Redisキューから音量解析jobを処理するworker。
 *
 * PHPの`api/quescript/queueAction.php`相当。1 jobずつ処理する単位にしているため、
 * 実際に常駐させる場合は呼び出し側でループする。
 */
class AudioWorker {
  /**
   * @param {Object} dependencies 依存オブジェクト。
   * @param {{popAudioProcessing(timeoutSeconds?:number): Promise<Object|null>}} dependencies.redis Redis DAO。
   * @param {{findSoundByHash(hash:string): Promise<Object|null>, updateLoudness(hash:string,value:number): Promise<void>}} dependencies.repository SoundRepository互換DAO。
   * @param {(filePath:string) => Promise<{mean_volume:number|null}>} dependencies.analyzeLoudness ffmpeg解析関数。
   * @param {{beginStep2?:Function}} [dependencies.lockService] runtime内状態管理service。
   */
  constructor({ redis, repository, analyzeLoudness, lockService = null }) {
    this.redis = redis;
    this.repository = repository;
    this.analyzeLoudness = analyzeLoudness;
    this.lockService = lockService;
  }

  /**
   * Redisから1件jobを取り出し処理する。
   *
   * @param {number} [timeoutSeconds=5] queue待機秒数。
   * @returns {Promise<{status:'idle'|'invalid'|'not_found'|'updated'|'failed', mean_volume?:number}>} 処理結果。
   */
  async processOne(timeoutSeconds = 5) {
    const job = await this.redis.popAudioProcessing(timeoutSeconds);
    if (!job) {
      return { status: 'idle' };
    }
    if (!job.hash || !job.file_path) {
      return { status: 'invalid' };
    }

    const release = this.lockService?.beginStep2 ? this.lockService.beginStep2() : () => {};
    try {
      const sound = await this.repository.findSoundByHash(job.hash);
      if (!sound || sound.data_link !== job.file_path) {
        return { status: 'not_found' };
      }

      const loudness = await this.analyzeLoudness(job.file_path);
      if (loudness.mean_volume !== null) {
        await this.repository.updateLoudness(job.hash, loudness.mean_volume);
        return { status: 'updated', mean_volume: loudness.mean_volume };
      }
      return { status: 'failed' };
    } finally {
      release();
    }
  }
}

module.exports = { AudioWorker };
