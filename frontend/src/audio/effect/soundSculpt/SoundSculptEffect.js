
export class SoundSculptEffect { 
  /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     * @param {AudioEqualizer} equalizer
     */
  constructor(audioSource, audioContext, equalizer) {
    this.audioContext = audioContext;
    this.equalizer = equalizer;
    /**
         * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>}
         */
    this.prevEffectHz = [];

    this.analyser = this.audioContext.createAnalyser();
    this.voice = {'sum': 0, 'count':0, 'avg': 0, 'normalizedAvg': 0, 'minHz': 64, 'maxHz': 8e3};

    this.analyser.fftSize = 32768;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    audioSource.connect(this.analyser);
    /**
         * @type {number}
         */
    this.frameId = null;
    this._isUseEffect = true;

    this.effectMain();
  }

  set isUseEffect(val) {
    if(this._isUseEffect == val) {
      return;
    }
    this._isUseEffect = val;
    if(this._isUseEffect) {
      this.effectMain();
    } else if(this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.updateDefaultGainsFilter();
    }
  }

  get isUseEffect() {
    return this._isUseEffect;
  }
  reset() {
    this.prevEffectHz = [];
  }
  /**
     * 
     * @param {AudioNode} audioNode 
     */
  connect(audioNode) {
    this.analyser.connect(audioNode);
  }
  effectMain(){
    const SELF = this;
    let animationFrame =()=>{
      SELF.analyser.getByteFrequencyData(SELF.dataArray);
      let effectHz = this.calcBandValue();
      const MIN_GAIN = -6;
      const MAX_GAIN = 6;
      let logs = '';
      let newGains = {};
      SELF.equalizer.gains.forEach(element=>{
        let newGain = effectHz[element.hz+''].smoothing * effectHz[element.hz+''].multiplier;
        if(isNaN(newGain)) {
          return;
        }
        if (element.hz >= this.voice.minHz && element.hz <= this.voice.maxHz) {
          let alpha = 0.5;
          newGain = (1-alpha)*this.voice.normalizedAvg + alpha * newGain;
        }
        newGains[element.hz+''] = SELF.getAdjustedValue(
          newGain,
          MAX_GAIN,
          MIN_GAIN,
          1.3);
                
        logs += 'hz ['+element.hz+'] newGain['+newGain+']\nhz ['+element.hz+']    Gain['+newGains[element.hz+'']+']\n';
      });
      newGains = this.equalizerWaveAdjustment(newGains);
      newGains = this.adjustmentAudioLevel(newGains);

      SELF.equalizer.gains.forEach(element => {
        if(newGains == null || newGains[element.hz+''] == null || isNaN(newGains[element.hz+''])) {
          SELF.equalizer.filters[element.hz].gain.value = 0;
          return;
        }
        const baseGain = (+element.gain);
        SELF.equalizer.filters[element.hz].gain.value = newGains[element.hz+''] + baseGain;
      });

      // console.log(logs);
      SELF.frameId = requestAnimationFrame(animationFrame);
    };
    animationFrame();
  }

  /**
     * 
     * @param {Array} newGains 
     * @returns 
     */
  adjustmentAudioLevel(newGains) {
    if(newGains == null){
      return;
    }
    if(Object.keys(newGains).length == 0){
      return;
    }
    let sumGain = 0;
    for (const key of Object.keys(newGains)) {
      if(isNaN(newGains[key])) {
        continue;
      }
      sumGain+=newGains[key];
    }
    let avgGain = (sumGain)/(Object.keys(newGains).length);
    for (const key of Object.keys(newGains)) {
      newGains[key] -= (avgGain);
    }
    return newGains;
  }

  /**
     * @param {number} currentValue 
     * @param {number} maxValue 
     * @param {number} minValue 
     * @returns 
     */
  getAdjustedValue(currentValue, maxValue, minValue, easeParameter = 2) {
    const normalizedX = (currentValue - minValue) / (maxValue - minValue);
    const easedX = Math.pow(normalizedX, easeParameter) / (Math.pow(normalizedX, easeParameter) + Math.pow(1 - normalizedX, easeParameter));
    return easedX * (maxValue - minValue) + minValue;
  }
        
  /**
     * 
     * @param {Array<{hz: number, gain: number}>} newGains
     */
  equalizerWaveAdjustment(newGains){
    if(newGains == null){
      return;
    }
    if(Object.keys(newGains).length == 0){
      return;
    }
    let lowHzGain = 0;
    let toLow = +Object.keys(newGains)[0];
    let maxDiff = 1.5;
    for (const key in newGains) {
      if (Object.hasOwnProperty.call(newGains, key)) {
        const element = newGains[key];
        if(key == toLow) {
          lowHzGain = element;
          continue;
        }
        const diff = Math.abs(lowHzGain - element);
        if(diff < maxDiff) {
          lowHzGain = element;
          continue;
        }
        if(lowHzGain > element) {
          newGains[key+''] = lowHzGain - maxDiff;
        } else {
          newGains[key+''] = lowHzGain + maxDiff;
        }
        lowHzGain = newGains[key+''];
      }
    }
    return newGains;
  }

  /**
     * 
     * @param {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>} effectHz 
     */
  smoothing(effectHz) {
    if (this.prevEffectHz === null) {
      this.prevEffectHz = JSON.parse(JSON.stringify(effectHz));
      return;
    }
    for(const key in effectHz) {
      if(this.prevEffectHz[key] == null) {
        continue;
      }
      let alpha = 0.5;
      effectHz[key].smoothing = (1 - alpha) * this.prevEffectHz[key].smoothing + alpha * effectHz[key].normalizedAvg;
    }
    this.prevEffectHz = JSON.parse(JSON.stringify(effectHz));
  }

  calcBandValue(){
    /**
         * 周波数データを格納するオブジェクト。
         * 各キーは特定の周波数（Hz）を表し、それに関連するデータを持つ。
         * 
         * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>}
         */
    let effectHzs = {
      '8':{'hz':8, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1},
      '16':{'hz':16, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.2},
      '32':{'hz':32, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.2},
      '64':{'hz':64, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.26},
      '125':{'hz':125, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.6},
      '250':{'hz':250, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2},
      '500':{'hz':500, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.5},
      '1000':{'hz':1e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.5},
      '2000':{'hz':2e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.6},
      '4000':{'hz':4e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.7},
      '8000':{'hz':8e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3},
      '16000':{'hz':16e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3.7},
      '24000':{'hz':24e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':4},
    };
    this.voice = {'hz':'voiceRange','sum': 0, 'count':0, 'avg': 0, 'normalizedAvg': 0, 'minHz': 64, 'maxHz': 8e3};
    let total = {'count':0, 'sum':0};
    for (const key in effectHzs) {
      if (!Object.hasOwnProperty.call(effectHzs, key)) {
        continue;
      }
      const effectHz = effectHzs[key];
      const RANGE = this.getRange(effectHz.hz);
            
      for (let i = RANGE.min; i < RANGE.max; i++) {
        if(this.dataArray[i] == 0 || isNaN(this.dataArray[i])) {
          continue;
        }
        if (effectHz.hz >= this.voice.minHz && effectHz.hz <= this.voice.maxHz) {
          this.voice.sum += this.dataArray[i];
          this. voice.count++;
        }
        effectHz.sum += this.dataArray[i];
        effectHz.count++;
        total.sum += this.dataArray[i];
        total.count++;
      }
      effectHz.avg = effectHz.count != 0 ? effectHz.sum / effectHz.count : 0;
    }
    this.voice.avg = this.voice.sum / this.voice.count;
    const overallAvg = total.sum / total.count;
    const scaleFactor = 0;
    for(const key in effectHzs) {
      const effectHz = effectHzs[key];
      effectHz.normalizedAvg = (effectHz.avg / overallAvg - 1.0) * (scaleFactor + 1.0);
    }
    this.voice.normalizedAvg = (this.voice.avg / overallAvg -1.0) * (scaleFactor + 1.0);
    this.smoothing(effectHzs);
    return effectHzs;
  }
  updateDefaultGainsFilter() {
    this.equalizer.gains.forEach(element=>{
      this.equalizer.filters[element.hz].gain.value = element.gain;
    });
  }

  /**
     * 
     * @param {number} hz 
     * @returns 
     */
  getRange(hz) {
    return {'min':(hz/2),'max':(hz*2)};
  }
}
