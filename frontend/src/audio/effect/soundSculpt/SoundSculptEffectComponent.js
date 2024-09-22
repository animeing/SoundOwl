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
     * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>}
     */
    this.prevEffectHz = [];

    this.voice = {'sum': 0, 'count':0, 'avg': 0, 'normalizedAvg': 0, 'minHz': 64, 'maxHz': 8e3};

    /**
     * @type {number}
     */
    this.frameId = null;
  }


  _setUse(val) {
    super._setUse(val);
    this.isUse = val;
    if(this.audioContext == null) {
      return;
    }
    if(this.isUse) {
      this.effectMain();
    } else if(this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.updateDefaultGainsFilter();
    }
  }

  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.initializeNodes();
    if(this.isUse) {
      this.effectMain();
    } else if(this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.updateDefaultGainsFilter();
    }
  }

  initializeNodes() {
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 32768;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.inputNode = this.analyser;
    this.outputNode = this.inputNode;
    return this.analyser;
  }

  effectMain() {
    let animationFrame = () => {
      this.analyser.getByteFrequencyData(this.dataArray);
      let effectHz = this.calcBandValue();
      const MIN_GAIN = -7;
      const MAX_GAIN = 7;
      let newGains = {};
      this.audioEqualizer.gains.forEach(gain=>{
        let newGain = effectHz[gain.hz+''].smoothing * effectHz[gain.hz+''].multiplier;
        if(isNaN(newGain)) {
          return;
        }
        if (gain.hz >= this.voice.minHz && gain.hz <= this.voice.maxHz) {
          let alpha = 0.5;
          newGain = (1-alpha)*this.voice.normalizedAvg + alpha * newGain;
        }
        newGains[gain.hz+''] = this.getAdjustedValue(
          newGain,
          MAX_GAIN,
          MIN_GAIN,
          1.5);
        {
          let keylength = Object.keys(effectHz).length;
          let al = 2.5/keylength;
          newGains[gain.hz+''] *= (al * (keylength - effectHz[gain.hz].order));
        }
      });
      newGains = this.equalizerWaveAdjustment(newGains);
      newGains = this.adjustmentAudioLevel(newGains);
      this.audioEqualizer.gains.forEach(element => {
        if(newGains == null || newGains[element.hz+''] == null || isNaN(newGains[element.hz+''])) {
          this.audioEqualizer.filters[element.hz].gain.value = 0;
          return;
        }
        const baseGain = (+element.gain);
        this.audioEqualizer.filters[element.hz].gain.value = newGains[element.hz+''] + baseGain;
      });
      this.frameId = requestAnimationFrame(animationFrame);
    };
    animationFrame();
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
      let alpha = 0.05;
      effectHz[key].smoothing = (1 - alpha) * this.prevEffectHz[key].smoothing + alpha * effectHz[key].normalizedAvg;
    }
    this.prevEffectHz = JSON.parse(JSON.stringify(effectHz));
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
    let maxDiff = 1.7;
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
     * @param {number} currentValue 
     * @param {number} maxValue 
     * @param {number} minValue 
     * @returns 
     */
  getAdjustedValue(currentValue, maxValue, minValue, easeParameter = 2) {
    const normalizedX = (currentValue - minValue) / (maxValue - minValue);
    if(normalizedX < 0) {
      return minValue;
    }
    if(normalizedX > 1) {
      return maxValue;
    }
    const easedX = Math.pow(normalizedX, easeParameter) / (Math.pow(normalizedX, easeParameter) + Math.pow(1 - normalizedX, easeParameter));
    return easedX * (maxValue - minValue) + minValue;
  }

  calcBandValue(){
    /**
         * 周波数データを格納するオブジェクト。
         * 各キーは特定の周波数（Hz）を表し、それに関連するデータを持つ。
         * 
         * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number,order: number}>}
         */
    let effectHzs = {
      '8':{'hz':8, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.2,"order":0},
      '16':{'hz':16, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1,"order":0},
      '32':{'hz':32, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':0.5,"order":0},
      '64':{'hz':64, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':0.7,"order":0},
      '125':{'hz':125, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.6,"order":0},
      '250':{'hz':250, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3,"order":0},
      '500':{'hz':500, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3.5,"order":0},
      '1000':{'hz':1e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3.5,"order":0},
      '2000':{'hz':2e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3.6,"order":0},
      '4000':{'hz':4e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3.7,"order":0},
      '8000':{'hz':8e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':4,"order":0},
      '16000':{'hz':16e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':4.7,"order":0},
      '24000':{'hz':24e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':4,"order":0},
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
    const scaleFactor = 0.9;

    const sortedKeys = Object.keys(effectHzs).sort((a, b) => effectHzs[b].avg - effectHzs[a].avg);
    sortedKeys.forEach((key, index) => {
      effectHzs[key].order = index + 1;
    });
    for(const key in effectHzs) {
      const effectHz = effectHzs[key];
      effectHz.normalizedAvg = (effectHz.avg / overallAvg - 1.0) * (scaleFactor + 1.0);
    }
    this.voice.normalizedAvg = (this.voice.avg / overallAvg -1.0) * (scaleFactor + 1.0);
    this.smoothing(effectHzs);
    return effectHzs;
  }
  updateDefaultGainsFilter() {
    this.audioEqualizer.gains.forEach(element=>{
      this.audioEqualizer.filters[element.hz].gain.value = element.gain;
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
  
  reset() {
    this.prevEffectHz = [];
  }
}

