import { AudioComponent } from '../AudioComponent';

/**
 * @type {AudioComponent<GainNode>}
 */
export class LoudnessNormalizeComponent extends AudioComponent{

  constructor() {
    super();
    this.desiredMeanVolume = -16;
    /**
         * @type {AudioClip} 
         */
    this.soundClip = null;
    this._decibel = 0;
  }

  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.initializeNodes();
  }

  /**
   * @override
   * @return {GainNode}
   */
  initializeNodes(){
    this.outputNode = this.audioContext.createGain();
    this.inputNode = this.outputNode;
    return this.outputNode;
  }

  _setUse(isUse) {
    super._setUse(isUse);
    if(this.inputNode == null) {
      return;
    }
    if(isUse) {
      this.soundMeanVolume = this._decibel;
    } else {
      this.inputNode.gain.value = 1;
    }
  }

  
  set soundMeanVolume(meanVolume) {
    this._decibel = (+meanVolume);
    if(!this._isUse) {
      return;
    }
    const gainVolume = this.decibelToGain(meanVolume);
    this.outputNode.gain.value = gainVolume;
  }

  /**
   * 
   * @param {{decibel:Number}} settings 
   */
  applyEffect(settings) {
    this.inputNode.gain.value = this.decibelToGain(settings.decibel);
  }
  /**
     * 
     * @param {number} decibel 
     * @returns 
     */
  decibelToGain(decibel) {
    return Math.pow(10, (this.desiredMeanVolume - (decibel)) /20);
  }
}