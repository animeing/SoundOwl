import { AudioEqualizer } from './AudioEqualizer';

export class StereoAudioEqualizer {
  constructor() {
    let AudioEqualizerStereo = class extends AudioEqualizer{

      connect(audioSource, audioContext, merger) {
        super.connect(audioSource, audioContext, merger);
        this._connect();
      }
    };

    this.leftEqualizer = new class extends AudioEqualizerStereo{
      /**
             * @param {AudioDestinationNode} _audioDestination
             */
      _connect(_audioDestination = null) {
        if(this.merger == null) {
          return;
        }
        this.filters[this.gains[this.gains.length - 1].hz].connect(this.merger, 0, 0);
      }
    }();

    
    this.rightEqualizer = new class extends AudioEqualizerStereo{
      /**
             * @param {AudioDestinationNode} _audioDestination
             */
      _connect(_audioDestination = null) {
        if(this.merger == null) {
          return;
        }
        this.filters[this.gains[this.gains.length - 1].hz].connect(this.merger, 0, 1);
      }
    }();
  }

  /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
  connect(audioSource, audioContext) {
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.leftEqualizer.connect(audioSource, audioContext, this.merger);
    this.rightEqualizer.connect(audioSource, audioContext, this.merger);


    this.splitter.connect(this.leftEqualizer.filters[this.leftEqualizer.gains[0].hz], 0);
    this.splitter.connect(this.rightEqualizer.filters[this.rightEqualizer.gains[0].hz], 1);

    // this.merger.connect(audioContext.destination);
  }

  /**
     * 左右同時にgain変更を行う。
     * @param {Number} hz 
     * @param {Number} gain 
     */
  setMonoGain(hz, gain) {
    this.leftEqualizer.setGain(hz, gain);
    this.rightEqualizer.setGain(hz, gain);
  }

  /**
     * 左右同時にgain変更を行う。
     * @param {Array<{hz: number, gain: number}>} value
     */
  set monoGains(value) {
    this.leftEqualizer.gains = value;
    this.rightEqualizer.gains = value;
  }

  /**
     * 
     * @param {{left:Array<{hz: number, gain: number}>,right:Array<{hz: number, gain: number}>}} value
     */
  set gains(value) {
    this.leftEqualizer.gains = value['left'];
    this.rightEqualizer.gains = value['right'];
  }
  get gains() {
    let value = {
      'left':this.leftEqualizer.gains,
      'right':this.rightEqualizer.gains
    };
    return value;
  }
}