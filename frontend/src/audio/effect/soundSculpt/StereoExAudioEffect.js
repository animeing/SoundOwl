import { SoundSculptEffect } from './SoundSculptEffect';

export class StereoExAudioEffect {

  constructor() {
    this.leftExAudioEffect = new SoundSculptEffect();
    this.rightExAudioEffect = new SoundSculptEffect();
    this._isUseEffect = true;
  }
  /**
     * 
     * @param {AudioNode} audioNode 
     * @param {AudioContext} audioContext 
     * @param {StereoAudioEqualizer} equalizer
     * @param {AudioNode} destination 
     */
  connect(audioNode, audioContext, equalizer, destination) {
    this.audioSource = audioNode;
    this.audioContext = audioContext;
    this.leftExAudioEffect.connect(this.audioSource, this.audioContext, equalizer.leftEqualizer, destination);
    this.rightExAudioEffect.connect(this.audioSource, this.audioContext, equalizer.leftEqualizer, destination);
    this.leftExAudioEffect.isUseEffect;
  }

  reset() {
    this.leftExAudioEffect.reset();
    this.rightExAudioEffect.reset();
  }

  set isUseEffect(val) {
    this._isUseEffect = val;
    this.leftExAudioEffect.isUseEffect = this._isUseEffect;
    this.rightExAudioEffect.isUseEffect = this._isUseEffect;
  }

  get isUseEffect() {
    return this._isUseEffect;
  }
}
