import { AudioComponent } from '../AudioComponent';

export class AudioEqualizerComponent extends AudioComponent {

  constructor() {
    super();
    this._gainFlat = [{'hz': 8, 'gain': 0}, {'hz': 16, 'gain': 0}, {'hz': 32, 'gain': 0}, {'hz': 64, 'gain': 0}, {'hz': 125, 'gain': 0}, {'hz': 250, 'gain': 0}, {'hz': 500, 'gain': 0}, {'hz': 1e3, 'gain': 0}, {'hz': 2e3, 'gain': 0}, {'hz': 4e3, 'gain': 0}, {'hz': 8e3, 'gain': 0}, {'hz': 16e3, 'gain': 0}, {'hz': 24e3, 'gain': 0}];
    /**
     * @type {[{hz:number,gain:number}]}
     */
    this._currentGains = JSON.parse(JSON.stringify(this._gainFlat));
    /**
     * @type {[BiquadFilterNode]}
     */
    this.filters = {};
  }

  _setUse(isUse) {
    super._setUse(isUse);
    if(isUse) {
      for (const filter of this.filters) {
        filter.gain = 0;
      }
    } else {
      for (const currentGain of this._currentGains) {
        this.setGain(currentGain.hz, currentGain.gain);
      }
    }
  }

  initializeNodes() {
    const QUALITY_FACTOR = {8: {'q': 0.7}, 16: {'q': 0.7}, 32: {'q': 0.7}, 64: {'q': 1.0}, 125: {'q': 1.1}, 250: {'q': 1.1}, 500: {'q': 1.1}, 1e3: {'q': 1.2}, 2e3: {'q': 1.3}, 4e3: {'q': 1.4}, 8e3: {'q': 1.5}, 16e3: {'q': 1.7}, 24e3: {'q': 1.8}};
    this._currentGains.forEach(element => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = element === this._currentGains[0] ? 'lowshelf' : element === this._currentGains[this._currentGains.length - 1] ? 'highshelf' : 'peaking';
      filter.frequency.value = element.hz;
      filter.Q.value = QUALITY_FACTOR[element.hz].q;
      filter.gain.value = element.gain;
      this.filters[element.hz] = filter;
    });
    this.connectFilters();
    return this.filters[this._currentGains[0].hz]; // return the first node as input node
  }

  connectFilters() {
    let previousFilter = null;
    this._currentGains.forEach((element, index) => {
      if (index === 0) {
        this.inputNode = this.filters[element.hz];
      }
      if (previousFilter) {
        previousFilter.connect(this.filters[element.hz]);
      }
      previousFilter = this.filters[element.hz];
    });
    this.outputNode = previousFilter;
  }

  applyEffect(settings) {
    settings.forEach(setting => {
      this.setGain(setting.hz, setting.gain);
    });
  }

  setGain(hz, gain) {
    const gainParam = this._currentGains.find(g => g.hz === hz);
    if (gainParam) {
      gainParam.gain = gain;
      if (this.filters[hz]) {
        this.filters[hz].gain.value = gain;
      }
    }
  }

  /**
   * @type {Array<{hz: number, gain: number}>}
   */
  get gains() {
    return this._currentGains;
  }
}
