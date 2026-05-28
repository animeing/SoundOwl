/**
 * Node runtime内の登録/解析状態を保持する。
 *
 * PHP時代のlock fileではなく、同一process内で状態を直接管理する。
 */
class LockService {
  constructor() {
    this.step1Count = 0;
    this.step2Count = 0;
  }

  /**
   * 登録/音量解析状態を返す。
   *
   * @returns {Promise<{regist_status:boolean,regist_status_step1:boolean,regist_status_step2:boolean}>} 状態DTO。
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
   * 登録処理中フラグを設定する。
   *
   * @returns {() => void} フラグ解除関数。
   */
  beginStep1() {
    this.step1Count += 1;
    return () => {
      this.step1Count = Math.max(0, this.step1Count - 1);
    };
  }

  /**
   * 音量解析処理中フラグを設定する。
   *
   * @returns {() => void} フラグ解除関数。
   */
  beginStep2() {
    this.step2Count += 1;
    return () => {
      this.step2Count = Math.max(0, this.step2Count - 1);
    };
  }
}

module.exports = {
  LockService,
};
