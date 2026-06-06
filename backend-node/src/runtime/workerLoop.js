/**
 * @typedef {{status:string}} WorkerResult
 * AudioWorker.processOne が返す 1 回分の処理結果です。
 */

/**
 * AudioWorker を setTimeout ベースで継続実行するループを作成します。
 * idle の場合は短い待機、例外時は長めの待機を入れて CPU を空回りさせないようにします。
 * @param {{worker:{processOne:(timeoutSeconds:number)=>Promise<WorkerResult>},timeoutSeconds?:number,idleDelayMs?:number,errorDelayMs?:number,setTimeoutImpl?:(callback:()=>void,delayMs:number)=>any,clearTimeoutImpl?:(timer:any)=>void,logger?:{error:(error:any)=>void}}} options Worker と待機時間、テスト差し替え用 timer/logger。
 * @returns {{start:()=>void,stop:()=>void,processNext:()=>Promise<WorkerResult>,isRunning:()=>boolean}} Worker loop の操作 API。
 */
function createWorkerLoop(options) {
  const {
    worker,
    timeoutSeconds = 5,
    idleDelayMs = 50,
    errorDelayMs = 1000,
    setTimeoutImpl = setTimeout,
    clearTimeoutImpl = clearTimeout,
    logger = console,
  } = options;
  let running = false;
  let timer = null;

  const schedule = (delayMs) => {
    if (running) {
      timer = setTimeoutImpl(tick, delayMs);
    }
  };

  const processNext = async () => worker.processOne(timeoutSeconds);

  const tick = async () => {
    timer = null;
    try {
      const result = await processNext();
      schedule(result.status === 'idle' ? idleDelayMs : 0);
    } catch (error) {
      logger.error(error);
      schedule(errorDelayMs);
    }
  };

  return {
    /** @returns {void} ループが停止中の場合だけ実行を開始します。 */
    start() {
      if (!running) {
        running = true;
        schedule(0);
      }
    },
    /** @returns {void} 次回実行を止め、予約済み timer を解除します。 */
    stop() {
      running = false;
      if (timer) {
        clearTimeoutImpl(timer);
        timer = null;
      }
    },
    processNext,
    /** @returns {boolean} ループが実行状態の場合は true。 */
    isRunning() {
      return running;
    },
  };
}

export { createWorkerLoop };
