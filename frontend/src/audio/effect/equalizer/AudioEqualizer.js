
export class AudioEqualizer {
  /**
     * 
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
  constructor(audioSource, audioContext) {
    this._gainFlat = [{'hz':8,'gain':0},{'hz':16,'gain':0},{'hz':32,'gain':0},{'hz':64,'gain':0},{'hz':125,'gain':0},{'hz':250,'gain':0},{'hz':500,'gain':0},{'hz':1e3,'gain':0},{'hz':2e3,'gain':0},{'hz':4e3,'gain':0},{'hz':8e3,'gain':0},{'hz':16e3,'gain':0},{'hz':24e3,'gain':0}];
    const QUALITY_FACTOR = {8:{'q':0.7},16:{'q':0.7},32:{'q':0.7},64:{'q':1.0},125:{'q':1.1},250:{'q':1.1},500:{'q':1.1},1e3:{'q':1.2},2e3:{'q':1.3},4e3:{'q':1.4},8e3:{'q':1.5},16e3:{'q':1.7},24e3:{'q':1.8}};
    this._currentGains =  JSON.parse(JSON.stringify(this._gainFlat));
    /**
         * @type {BiquadFilterNode[]}
         */
    this.filters =[];
    this._gainFlat.forEach(element => {
      const filter = audioContext.createBiquadFilter();
      if(element == this._gainFlat[0]){
        filter.type = 'lowshelf';
      } else if(element == this._gainFlat[this.gains.length-1]){
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
      }
      filter.frequency.value = element.hz;
      filter.Q.value = QUALITY_FACTOR[element.hz].q;
      filter.gain.value = element.gain;
      this.filters[element.hz] = filter;
    });
    audioSource.connect(this.filters[this._gainFlat[0].hz]);
    for (let i = 0; i < this._gainFlat.length - 1; i++) {
      this.filters[this._gainFlat[i].hz].connect(this.filters[this._gainFlat[i + 1].hz]);
    }
    this._connect(audioContext.destination);
  }

  /**
     * @param {AudioNode} audioDestination
     */
  _connect(audioDestination) {
    this.filters[this._gainFlat[this._gainFlat.length - 1].hz].connect(audioDestination);
  }
    
  /**
     * 
     * @param {Array<{hz: number, gain: number}>} gains
     */
  set gains(gains){
    if(gains == undefined) {
      return;
    }
    this._currentGains = gains;
    this._currentGains.forEach(element => {
      this.filters[element.hz].gain.value = element.gain;
    });
  }
  get gains() {
    return this._currentGains;
  }

  /**
     * 
     * @param {Number} hz 
     * @param {Number} gain 
     */
  setGain(hz, gain) {
    if(this.filters[hz] == undefined) {
      return;
    }
    this.filters[hz].gain.value = gain;
    for (const gainParam of this.gains) {
      if(gainParam.hz == hz) {
        gainParam.gain = gain;
      }
    }
  }
}
