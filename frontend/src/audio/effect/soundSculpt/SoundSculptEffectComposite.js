import { AudioComponent } from '../AudioComponent';
import { StereoAudioEqualizerComposite } from '../equalizer/StereoAudioEqualizerComposite';
import { SoundSculptEffectComponent } from './SoundSculptEffectComponent';

export class SoundSculptEffectComposite extends AudioComponent {

  /**
   * 
   * @param {StereoAudioEqualizerComposite} audioEqualizer 
   */
  constructor(audioEqualizer) {
    super();
    this.leftSoundSculptEffect = new SoundSculptEffectComponent(audioEqualizer.leftEqualizer);
    this.rightSoundSculptEffect = new SoundSculptEffectComponent(audioEqualizer.rightEqualizer);
  }

  /**
   * 
   * @param {AudioContext} audioContext 
   */
  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.leftSoundSculptEffect.setAudioContext(audioContext);
    this.rightSoundSculptEffect.setAudioContext(audioContext);
    this.initializeNodes();
  }

  initializeNodes() {
    const splitter = this.audioContext.createChannelSplitter(2);
    const merger = this.audioContext.createChannelMerger(2);
  
    const leftNode = this.leftSoundSculptEffect.initializeNodes();
    const rightNode = this.rightSoundSculptEffect.initializeNodes();
  
    splitter.connect(leftNode, 0);
    splitter.connect(rightNode, 1);
  
    leftNode.connect(merger, 0, 0);
    rightNode.connect(merger, 0, 1);
  
    this.inputNode = splitter;
    this.outputNode = merger;
  }
  
  
  
  reset() {
    this.leftSoundSculptEffect.reset();
    this.rightSoundSculptEffect.reset();
  }

  _setUse(isUse) {
    super._setUse(isUse);
    
    this.leftSoundSculptEffect.isUse = isUse;
    this.rightSoundSculptEffect.isUse = isUse;
  }
}
