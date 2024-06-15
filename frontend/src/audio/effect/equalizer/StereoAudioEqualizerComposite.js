import { AudioComponent } from '../AudioComponent';
import { AudioEqualizerComponent } from './AudioEqualizerComponent';

export class StereoAudioEqualizerComposite extends AudioComponent {

  constructor() {
    super();
    this.leftEqualizer = new AudioEqualizerComponent();
    this.rightEqualizer = new AudioEqualizerComponent();
  }

  _setUse(isUse) {
    this.leftEqualizer.isUse = isUse;
    this.rightEqualizer.isUse = isUse;
  }

  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.leftEqualizer.setAudioContext(audioContext);
    this.rightEqualizer.setAudioContext(audioContext);
    this.initializeNodes();
  }

  initializeNodes() {
    const splitter = this.audioContext.createChannelSplitter(2);
    this.leftEqualizer.initializeNodes();
    this.rightEqualizer.initializeNodes();
  
    splitter.connect(this.leftEqualizer.inputNode, 0);
    splitter.connect(this.rightEqualizer.inputNode, 1);
    const merger = this.audioContext.createChannelMerger(2);
  
    this.leftEqualizer.outputNode.connect(merger, 0, 0);
    this.rightEqualizer.outputNode.connect(merger, 0, 1);
  
    this.inputNode = splitter;
    this.outputNode = merger;
  }

  getGains() {
    return {left:this.leftEqualizer.gains,right:this.rightEqualizer.gains};
  }

  /**
     * 
     * @param {{left:Array<{hz: number, gain: number}>,right:Array<{hz: number, gain: number}>}} settings
     */
  applyEffect(settings) {
    this.leftEqualizer.applyEffect(settings.left);
    this.rightEqualizer.applyEffect(settings.right);
  }
  /**
   * 
   * @param {{left:{hz: number, gain: number},right:{hz:number, gain:number}}} settings 
   */
  applyHzGain(settings) {
    this.leftEqualizer.setGain(settings.left.hz, settings.left.gain);
    this.rightEqualizer.setGain(settings.right.hz, settings.right.gain);
  }
}
