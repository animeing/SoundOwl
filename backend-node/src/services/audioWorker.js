/**
 * Redis キューから音量解析ジョブを取り出し、ffmpeg 解析結果を DB へ反映する Worker です。
 */
class AudioWorker {
  /**
   * Worker の依存関係を受け取って初期化します。
   * @param {{redis:{popAudioProcessing:(timeoutSeconds:number)=>Promise<{hash?:string,file_path?:string}|null>},repository:{findSoundByHash:(soundHash:string)=>Promise<{data_link?:string}|null>,updateLoudness:(soundHash:string,loudnessTarget:number|string|null)=>Promise<void>},analyzeLoudness:(filePath:string)=>Promise<{mean_volume:number|null}>,failureStore?:{record:Function,resolve:Function}|null,lockService?:{beginStep2:()=>()=>void}|null}} dependencies Redis、Repository、音量解析関数、失敗ストア、任意の登録状態ロック。
   */
  constructor({ redis, repository, analyzeLoudness, failureStore = null, lockService = null }) {
    this.redis = redis;
    this.repository = repository;
    this.analyzeLoudness = analyzeLoudness;
    this.failureStore = failureStore;
    this.lockService = lockService;
  }

  /**
   * Redis キューから 1 件だけジョブを取得し、音量解析と DB 更新を行います。
   * @param {number} [timeoutSeconds=5] Redis の brPop 待機秒数。
   * @returns {Promise<{status:'idle'|'invalid'|'not_found'|'updated'|'failed',mean_volume?:number}>} 1 件分の処理結果。
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

      let loudness;
      try {
        loudness = await this.analyzeLoudness(job.file_path);
        if (loudness.mean_volume !== null) {
          await this.repository.updateLoudness(job.hash, loudness.mean_volume);
        }
      } catch (error) {
        await this.failureStore?.record(2, job.file_path, 'Could not analyze or save audio loudness.');
        throw error;
      }
      if (loudness.mean_volume === null) {
        await this.failureStore?.record(2, job.file_path, 'Could not analyze audio loudness.');
        return { status: 'failed' };
      }
      await this.failureStore?.resolve(2, job.file_path);
      return { status: 'updated', mean_volume: loudness.mean_volume };
    } finally {
      release();
    }
  }
}

export { AudioWorker };
