import { BaseFrameWork } from '../../../base';
import { AudioComponent } from '../AudioComponent';
import { AudioEqualizerComponent } from '../equalizer/AudioEqualizerComponent';

export class SoundSculptEffectComponent extends AudioComponent {

  /**
   * 
   * @param {AudioEqualizerComponent} audioEqualizer 
   */
  constructor(audioEqualizer) {
    super();
    /**
     * @type {AudioEqualizerComponent}
     */
    this.audioEqualizer = audioEqualizer;
    /**
     * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, previousAvg: number, smoothing: number, normalizedAvg: number, multiplier: number}>}
     */
    this.previousFrequencyEffects = {};

    this.voiceMetrics = { 'sum': 0, 'count': 0, 'avg': 0, 'previousAvg': 0, 'normalizedAvg': 0, 'minHz': 300, 'maxHz': 3400 };
    this.animationFrame = new BaseFrameWork.AnimationFrame();

    /**
     * 前回のゲイン値を保存するオブジェクト
     */
    this.previousGains = {};

    /**
     * 周波数帯ごとの強調レベルを設定するオブジェクト
     */
    this.emphasisLevels = {
      '8': 1.9,
      '16': 1.9,
      '32': 1.9,
      '64': 1.9,
      '125': 2.5,
      '250': 1.5,
      '500': 1.5,
      '1000': 2.5,
      '2000': 2.5,
      '4000': 4.5,
      '8000': 4.5,
      '16000': 4.5,
      '24000': 4.5
    };

    /**
     * 周波数帯ごとの突発的な音とみなす変化量の閾値を設定するオブジェクト
     */
    this.suddenSoundThresholds = {
      '8': 1.0,
      '16': 1.0,
      '32': 1.0,
      '64': 1.0,
      '125': 1.2,
      '250': 1.5,
      '500': 2.0,
      '1000': 2.5,
      '2000': 3.0,
      '4000': 3.5,
      '8000': 4.5,
      '16000': 4.5,
      '24000': 0.5
    };

    /**
     * ゲインの1フレームあたりの最大変化量
     */
    this.maxGainChangePerFrame = 0.5;
  }

  _setUse(isUse) {
    super._setUse(isUse);
    this.isUse = isUse;
    if (this.audioContext == null) {
      return;
    }
    if (this.isUse) {
      this.startEffectLoop();
    } else {
      this.animationFrame.stopAnimation();
      this.resetDefaultGains();
    }
  }

  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.initializeNodes();
    if (this.isUse) {
      this.startEffectLoop();
    } else {
      this.animationFrame.stopAnimation();
      this.resetDefaultGains();
    }
  }

  initializeNodes() {
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 4096;
    this.frequencyDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.inputNode = this.analyserNode;
    this.outputNode = this.inputNode;
    return this.analyserNode;
  }

  startEffectLoop() {
    const loop = () => {
      if (!this.isUse) {
        this.animationFrame.stopAnimation();
        this.resetDefaultGains();
        return;
      }
      this.analyserNode.getByteFrequencyData(this.frequencyDataArray);
      let frequencyBands = this.calculateFrequencyBands();
      const MIN_GAIN = -10;
      const MAX_GAIN = 10;
      let updatedGains = {};
      this.audioEqualizer.gains.forEach(gain => {
        const hzKey = gain.hz+ '';
        if (!frequencyBands[hzKey]) {
          return;
        }
        let newGain = frequencyBands[hzKey].smoothing * frequencyBands[hzKey].multiplier;
        if (gain.hz >= this.voiceMetrics.minHz && gain.hz <= this.voiceMetrics.maxHz) {
          let alpha = 0.5;
          newGain = (1 - alpha) * this.voiceMetrics.normalizedAvg + alpha * newGain;
        }

        if (isNaN(newGain)) {
          return;
        }

        updatedGains[hzKey] = newGain;
      });

      let suddenAdjustments = this.calculateSuddenSoundAdjustments(updatedGains, frequencyBands);

      updatedGains = this.adjustEqualizerWaves(updatedGains);
      updatedGains = this.adjustAudioLevels(updatedGains);

      updatedGains = this.applySuddenSoundAdjustments(updatedGains, suddenAdjustments, MIN_GAIN, MAX_GAIN);

      this.audioEqualizer.gains.forEach(element => {
        const hzKey = element.hz+ '';
        if(this.audioEqualizer.filters[element.hz] == undefined) {
          return;
        }
        if (updatedGains == null || updatedGains[hzKey] == null || isNaN(updatedGains[hzKey])) {
          this.audioEqualizer.filters[element.hz].gain.value = 0;
          return;
        }
        const baseGain = Number(element.gain);
        this.audioEqualizer.filters[element.hz].gain.value = updatedGains[hzKey] + baseGain;
      });

    };
    this.animationFrame.startAnimation(loop);
  }
  

  /**
   * 突発音の検出と適用量の計算を行います。
   * @param {Object} updatedGains  
   * @param {Object.<string, {hz: number, count: number, sum: number, avg: number, previousAvg: number, smoothing: number, normalizedAvg: number, multiplier: number}>} frequencyBands 
   * @returns {Object} 突発音の適用量
   */
  calculateSuddenSoundAdjustments(updatedGains, frequencyBands) {
    let adjustments = {};
    const epsilon = 1e-8;
    const MIN_ENERGY_THRESHOLD = 0.1;
  
    for (const hzKey of Object.keys(updatedGains)) {
      let prevAvg = frequencyBands[hzKey].previousAvg;
      let currAvg = frequencyBands[hzKey].avg;

      // 入力の無い音域のデータはスキップ
      if(frequencyBands[hzKey].count == 0) {
        continue;
      }
  
      // エネルギーが低い場合はスキップ
      if (currAvg < MIN_ENERGY_THRESHOLD) {
        adjustments[hzKey] = 1.0;
        continue;
      }
  
      // previousAvg が小さい場合の対策
      let adjustedPrevAvg = Math.max(prevAvg, epsilon);
      let changeRate = (currAvg - adjustedPrevAvg) / adjustedPrevAvg;
  
      // 周波数帯ごとの強調レベルと突発的な音の閾値を取得
      const emphasisLevel = this.emphasisLevels[hzKey] || 1.0;
      const suddenThreshold = this.suddenSoundThresholds[hzKey] || 0.2;
  
      let adjustment = 1.0; // デフォルトでは変化なし
  
      if (changeRate > suddenThreshold && prevAvg != 0) {
        // 突発的な音と判断した場合、強調を適用
        adjustment = 1 + (changeRate - suddenThreshold) * emphasisLevel;
        console.log('top effect : [' + hzKey + ']');
      }
  
      adjustments[hzKey] = adjustment;
    }
    return adjustments;
  }
  

  /**
   * 突発音の適用量を実際に適用します。
   * @param {Object} updatedGains 
   * @param {Object} adjustments 
   * @param {number} MIN_GAIN
   * @param {number} MAX_GAIN
   * @returns {Object} 調整後のゲイン値
   */
  applySuddenSoundAdjustments(updatedGains, adjustments, MIN_GAIN, MAX_GAIN) {
    for (const hzKey of Object.keys(updatedGains)) {
      let newGain = updatedGains[hzKey];
      if(newGain == undefined) {
        continue;
      }

      // 突発音の適用量を適用
      newGain *= adjustments[hzKey] || 1.0;

      // 前回のゲイン値を取得し、ゲインの変化量を制限
      const previousGain = this.previousGains[hzKey] || 0;
      // 次のフレーム用にゲインを保存
      this.previousGains[hzKey] = newGain;
      const maxGainChange = this.maxGainChangePerFrame;
      let gainDifference = newGain - previousGain;

      if (gainDifference > maxGainChange) {
        newGain = previousGain + maxGainChange;
      } else if (gainDifference < -maxGainChange) {
        newGain = previousGain - maxGainChange;
      }

      updatedGains[hzKey] = this.getAdjustedValue(
        newGain,
        MAX_GAIN,
        MIN_GAIN,
        1.5
      );

    }
    return updatedGains;
  }

  /**
   * ゲイン値をログ出力します。
   * @param {Object} updatedGains 
   */
  logGains(updatedGains) {
    // 100フレームに1回だけログを出力して負荷を軽減
    if (!this.logCounter) {
      this.logCounter = 0;
    }
    this.logCounter++;
    if (this.logCounter % 10 === 0) {
      console.log('Current Gains:', updatedGains);
    }
  }

  /**
   * 周波数帯ごとの強調レベルを設定します。
   * @param {number} hzKey 
   * @param {number} level 
   */
  setEmphasisLevel(hzKey, level) {
    this.emphasisLevels[hzKey + ''] = level;
  }

  /**
   * 周波数帯ごとの突発的な音の閾値を設定します。
   * @param {number} hzKey 
   * @param {number} threshold 
   */
  setSuddenSoundThreshold(hzKey, threshold) {
    this.suddenSoundThresholds[hzKey + ''] = threshold;
  }

  /**
   * 
   * @param {Object.<string, {hz: number, count: number, sum: number, avg: number, previousAvg: number, smoothing: number, normalizedAvg: number, multiplier: number}>} frequencyBands 
   */
  applySmoothing(frequencyBands) {
    for (const key in frequencyBands) {
      if (!this.previousFrequencyEffects[key]) {
        frequencyBands[key].smoothing = frequencyBands[key].normalizedAvg;
      } else {
        const SMOOTHING_ALPHA = 0.05;
        frequencyBands[key].smoothing = (1 - SMOOTHING_ALPHA) * this.previousFrequencyEffects[key].smoothing + SMOOTHING_ALPHA * frequencyBands[key].normalizedAvg;
      }
      if(this.previousFrequencyEffects[key] == undefined) {
        this.previousFrequencyEffects[key] = JSON.parse(JSON.stringify(frequencyBands[key]));
      }
      this.previousFrequencyEffects[key].smoothing = frequencyBands[key].smoothing;
    }
  }

  /**
   * 
   * @param {Object} updatedGains
   */
  adjustEqualizerWaves(updatedGains) {
    if (updatedGains == null) {
      return;
    }
    if (Object.keys(updatedGains).length === 0) {
      return;
    }
    let baseGain = 0;
    let firstKey = Object.keys(updatedGains)[0];
    let maxDifference = 2.0;
    for (const key in updatedGains) {
      if (Object.hasOwnProperty.call(updatedGains, key)) {
        const currentGain = updatedGains[key];
        if (key === firstKey) {
          baseGain = currentGain;
          continue;
        }
        const difference = Math.abs(baseGain - currentGain);
        if (difference < maxDifference) {
          baseGain = currentGain;
          continue;
        }
        if (baseGain > currentGain) {
          updatedGains[key] = baseGain - maxDifference;
        } else {
          updatedGains[key] = baseGain + maxDifference;
        }
        baseGain = updatedGains[key];
      }
    }
    return updatedGains;
  }

  /**
   * 
   * @param {Object} updatedGains 
   * @returns 
   */
  adjustAudioLevels(updatedGains) {
    if (updatedGains == null) {
      return;
    }
    if (Object.keys(updatedGains).length === 0) {
      return;
    }
    let totalGain = 0;
    for (const key of Object.keys(updatedGains)) {
      if (isNaN(updatedGains[key])) {
        continue;
      }
      totalGain += updatedGains[key];
    }
    let averageGain = totalGain / Object.keys(updatedGains).length;
    for (const key of Object.keys(updatedGains)) {
      updatedGains[key] -= averageGain;
    }
    return updatedGains;
  }

  /**
   * @param {number} currentValue 
   * @param {number} maxValue 
   * @param {number} minValue 
   * @param {number} easeParameter 
   * @returns 
   */
  getAdjustedValue(currentValue, maxValue, minValue, easeParameter = 1.5) {
    const normalizedX = (currentValue - minValue) / (maxValue - minValue);
    if (normalizedX < 0) {
      return minValue;
    }
    if (normalizedX > 1) {
      return maxValue;
    }
    const easedX = Math.pow(normalizedX, easeParameter) / (Math.pow(normalizedX, easeParameter) + Math.pow(1 - normalizedX, easeParameter));
    return easedX * (maxValue - minValue) + minValue;
  }

  calculateFrequencyBands() {
    /**
     * 周波数データを格納するオブジェクト。
     * 各キーは特定の周波数（Hz）を表し、それに関連するデータを持つ。
     * 
     * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, previousAvg: number, smoothing: number, normalizedAvg: number, multiplier: number, order: number}>}
     */
    let frequencyBands = {
      '8': { 'hz': 8, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 0.01, "order": 0 },
      '16': { 'hz': 16, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 0.01, "order": 0 },
      '32': { 'hz': 32, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 0.01, "order": 0 },
      '64': { 'hz': 64, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 0.01, "order": 0 },
      '125': { 'hz': 125, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 1.3, "order": 0 },
      '250': { 'hz': 250, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 1.8, "order": 0 },
      '500': { 'hz': 500, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 2.0, "order": 0 },
      '1000': { 'hz': 1000, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 2.2, "order": 0 },
      '2000': { 'hz': 2000, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 2.5, "order": 0 },
      '4000': { 'hz': 4000, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 2.8, "order": 0 },
      '8000': { 'hz': 8000, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 3.0, "order": 0 },
      '16000': { 'hz': 16000, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 3.2, "order": 0 },
      '24000': { 'hz': 24000, 'count': 0, 'sum': 0, 'avg': 0, 'previousAvg': 0, 'smoothing': 0, 'normalizedAvg': 0, 'multiplier': 3.5, "order": 0 }
    };
    this.voiceMetrics = { 'hz': 'voiceRange', 'sum': 0, 'count': 0, 'avg': 0, 'previousAvg': 0, 'normalizedAvg': 0, 'minHz': 300, 'maxHz': 3400 };
    let total = { 'count': 0, 'sum': 0 };
    for (const key in frequencyBands) {
      if (!Object.hasOwnProperty.call(frequencyBands, key)) {
        continue;
      }
      const band = frequencyBands[key];
      const RANGE = this.getFrequencyRange(band.hz);

      for (let i = RANGE.min; i <= RANGE.max; i++) {
        if (this.frequencyDataArray[i] === 0 || isNaN(this.frequencyDataArray[i])) {
          continue;
        }
        const frequency = i * (this.audioContext.sampleRate / this.analyserNode.fftSize);
        if (frequency >= this.voiceMetrics.minHz && frequency <= this.voiceMetrics.maxHz) {
          this.voiceMetrics.sum += this.frequencyDataArray[i];
          this.voiceMetrics.count++;
        }
        band.sum += this.frequencyDataArray[i];
        band.count++;
        total.sum += this.frequencyDataArray[i];
        total.count++;
      }
      band.previousAvg = this.previousFrequencyEffects[key]?.avg || band.avg;
      band.avg = band.count !== 0 ? band.sum / band.count : 0;
    }
    this.voiceMetrics.previousAvg = this.previousFrequencyEffects['voice']?.avg || this.voiceMetrics.avg;
    this.voiceMetrics.avg = this.voiceMetrics.count !== 0 ? this.voiceMetrics.sum / this.voiceMetrics.count : 0;
    const overallAvg = total.count !== 0 ? total.sum / total.count : 1;
    const scaleFactor = 0.9;

    const sortedKeys = Object.keys(frequencyBands).sort((a, b) => frequencyBands[b].avg - frequencyBands[a].avg);
    sortedKeys.forEach((key, index) => {
      frequencyBands[key].order = index + 1;
    });
    for (const key in frequencyBands) {
      const band = frequencyBands[key];
      band.normalizedAvg = (band.avg / overallAvg - 1.0) * (scaleFactor + 1.0);
    }
    this.voiceMetrics.normalizedAvg = (this.voiceMetrics.avg / overallAvg - 1.0) * (scaleFactor + 1.0);
    this.applySmoothing(frequencyBands);
    return frequencyBands;
  }

  resetDefaultGains() {
    if (this.audioEqualizer == null || this.audioEqualizer.gains == null) {
      return;
    }
    this.audioEqualizer.gains.forEach(element => {
      if (this.audioEqualizer.filters[element.hz] == undefined || this.audioEqualizer.filters[element.hz].gain == undefined) {
        return;
      }
      this.audioEqualizer.filters[element.hz].gain.value = element.gain;
    });
  }

  /**
   * 
   * @param {number} hz 
   * @returns 
   */
  getFrequencyRange(hz) {
    const nyquist = this.audioContext.sampleRate / 2;
    const index = Math.round(hz / nyquist * this.analyserNode.frequencyBinCount);
    const bandwidthHz = hz * 0.2;
    const bandwidth = Math.round(bandwidthHz / nyquist * this.analyserNode.frequencyBinCount);
    return {
      min: Math.max(0, index - bandwidth),
      max: Math.min(this.analyserNode.frequencyBinCount - 1, index + bandwidth)
    };
  }

  reset() {
    this.previousFrequencyEffects = {};
    this.previousGains = {};
  }
}
