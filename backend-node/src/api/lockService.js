/**
 * @typedef {{regist_status:boolean,regist_status_step1:boolean,regist_status_step2:boolean}} LockStatus
 * 曲登録処理の Step1/Step2 が実行中かどうかを表す状態です。
 */

/**
 * Node.js プロセス内で曲登録処理の実行状態を保持するロックサービスです。
 * ファイルロックではなくカウンタで保持し、同時実行時も最後の release まで実行中として扱います。
 */
class LockService {
  /**
   * Step1/Step2 の実行中カウンタを 0 で初期化します。
   */
  constructor() {
    this.step1Count = 0;
    this.step2Count = 0;
  }

  /**
   * 現在の曲登録処理状態を返します。
   * @returns {Promise<LockStatus>} Step1 または Step2 が実行中かどうかを示す API 応答用オブジェクト。
   */
  async status() {
    const step1 = this.step1Count > 0;
    const step2 = this.step2Count > 0;
    return {
      regist_status: step1 || step2,
      regist_status_step1: step1,
      regist_status_step2: step2,
    };
  }

  /**
   * Step1 の実行中カウンタを増やし、処理終了時に呼ぶ release 関数を返します。
   * @returns {()=>void} Step1 の実行中カウンタを 1 減らす release 関数。
   */
  beginStep1() {
    this.step1Count += 1;
    return () => {
      this.step1Count = Math.max(0, this.step1Count - 1);
    };
  }

  /**
   * Step2 の実行中カウンタを増やし、処理終了時に呼ぶ release 関数を返します。
   * @returns {()=>void} Step2 の実行中カウンタを 1 減らす release 関数。
   */
  beginStep2() {
    this.step2Count += 1;
    return () => {
      this.step2Count = Math.max(0, this.step2Count - 1);
    };
  }
}

export {
  LockService,
};
