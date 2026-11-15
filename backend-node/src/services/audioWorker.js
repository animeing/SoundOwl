/** Process claimed audio jobs and keep unfinished work recoverable. */
class AudioWorker {
  /**
   * @param {{redis:{popAudioProcessing:Function,acknowledgeAudioProcessing:Function,requeueAudioProcessing:Function},
   * repository:{findSoundByHash:Function,updateLoudness:Function},
   * analyzeLoudness:Function,failureStore?:{record:Function,resolve:Function}|null,
   * lockService?:{beginStep2:()=>()=>void}|null}} dependencies
   */
  constructor({ redis, repository, analyzeLoudness, failureStore = null, lockService = null }) {
    this.redis = redis;
    this.repository = repository;
    this.analyzeLoudness = analyzeLoudness;
    this.failureStore = failureStore;
    this.lockService = lockService;
  }

  /** Claim one job. A crash leaves it in the processing list for startup recovery. */
  async processOne(timeoutSeconds = 5) {
    const job = await this.redis.popAudioProcessing(timeoutSeconds);
    if (!job) return { status: 'idle' };

    let acknowledged = false;
    const acknowledge = async () => {
      await this.redis.acknowledgeAudioProcessing(job);
      acknowledged = true;
    };
    const release = job.hash && job.file_path && this.lockService?.beginStep2
      ? this.lockService.beginStep2() : () => {};
    try {
      if (!job.hash || !job.file_path) {
        await acknowledge();
        return { status: 'invalid' };
      }
      const sound = await this.repository.findSoundByHash(job.hash);
      if (!sound || sound.data_link !== job.file_path) {
        await acknowledge();
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
        await acknowledge();
        throw error;
      }
      if (loudness.mean_volume === null) {
        await this.failureStore?.record(2, job.file_path, 'Could not analyze audio loudness.');
        await acknowledge();
        return { status: 'failed' };
      }
      await this.failureStore?.resolve(2, job.file_path);
      await acknowledge();
      return { status: 'updated', mean_volume: loudness.mean_volume };
    } catch (error) {
      if (!acknowledged) {
        try {
          await this.redis.requeueAudioProcessing(job);
        } catch (requeueError) {
          // The processing list still holds the claim for the next startup recovery.
          console.error('Could not requeue audio processing job:', requeueError);
        }
      }
      throw error;
    } finally {
      release();
    }
  }
}

export { AudioWorker };