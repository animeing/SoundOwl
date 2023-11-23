
export class LoudnessNormalize {
  /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
  constructor(audioSource, audioContext) {
    this.gainNode = audioContext.createGain();
    audioSource.connect(this.gainNode);
    this._isUseEffect = true;
    this.desiredMeanVolume = -16;
    /**
         * @type {AudioClip} 
         */
    this.soundClip = null;
    this._isUse = true;
    this._decibel = 0;
  }

  /**
     * @param {AudioNode} audioSource 
     */
  connect(audioSource){
    this.gainNode.connect(audioSource);
  }

  set isUse(isUse) {
    this._isUse = isUse;
    if(isUse) {
      this.soundMeanVolume = this._decibel;
    } else {
      this.gainNode.gain.value = 1;
    }
  }

  get isUse(){
    return this._isUse;
  }

  set soundMeanVolume(meanVolume) {
    this._decibel = (+meanVolume);
    if(!this._isUse) {
      return;
    }
    const gainVolume = this.decibelToGain(meanVolume);
    this.gainNode.gain.value = gainVolume;
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