/**
 * @typedef {Object} WorkerLoopOptions
 * @property {{processOne(timeoutSeconds?:number): Promise<Object>}} worker Redis jobを1件処理するworker。
 * @property {number} [timeoutSeconds=5] Redis BRPOP相当の待機秒数。
 * @property {number} [idleDelayMs=50] idle時に次の処理へ進むまでの待機ms。
 * @property {number} [errorDelayMs=1000] 例外発生時に次の処理へ進むまでの待機ms。
 * @property {Function} [setTimeoutImpl=setTimeout] timer関数。テストで差し替え可能。
 * @property {Function} [clearTimeoutImpl=clearTimeout] timer停止関数。テストで差し替え可能。
 * @property {{error:Function}} [logger=console] 例外ログ出力先。
 */

/**
 * PHPの常駐`queueAction.php`をNode runtime内で動かすためのworker loopを作成する。
 *
 * NodeではHTTP/WebSocketと同じprocess内で非同期loopとして常駐できるため、PHPのように
 * 別entrypointを常時起動する構成に固定しない。
 *
 * @param {WorkerLoopOptions} options worker loop設定。
 * @returns {{start:()=>void,stop:()=>void,processNext:()=>Promise<Object>,isRunning:()=>boolean}} worker loop controller。
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
    start() {
      if (!running) {
        running = true;
        schedule(0);
      }
    },
    stop() {
      running = false;
      if (timer) {
        clearTimeoutImpl(timer);
        timer = null;
      }
    },
    processNext,
    isRunning() {
      return running;
    },
  };
}

module.exports = { createWorkerLoop };
