import { AudioEqualizer } from './AudioEqualizer';

export class StereoAudioEqualizer {
  /**
     * 
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
  constructor(audioSource, audioContext) {
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    let AudioEqualizerStereo = class extends AudioEqualizer{
      /**
             * 
             * @param {AudioNode} audioSource 
             * @param {AudioContext} audioContext 
             * @param {ChannelMergerNode} merger
             */
      constructor(audioSource, audioContext, merger) {
        super(audioSource, audioContext);
        this.merger = merger;
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
    }(audioSource, audioContext, this.merger);
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
    }(audioSource, audioContext, this.merger);

    audioSource.connect(this.splitter);

    this.splitter.connect(this.leftEqualizer.filters[this.leftEqualizer.gains[0].hz], 0);
    this.splitter.connect(this.rightEqualizer.filters[this.rightEqualizer.gains[0].hz], 1);

  }

  /**
     * @param {AudioNode} audioNode 
     */
  connect(audioNode) {
    this.merger.connect(audioNode);
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