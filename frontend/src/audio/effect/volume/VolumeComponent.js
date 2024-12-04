import { AudioComponent } from "../AudioComponent";

/**
 * @type {AudioComponent<GainNode>}
 */
export class VolumeComponent extends AudioComponent {
  /**
   * 初期音量を1に設定（0.0から1.0の範囲）
   */
  volume = 1;

  /**
   * AudioContext を設定し、ノードを初期化
   * @param {AudioContext} audioContext 
   */
  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.initializeNodes();
  }

  /**
   * @override
   * @return {GainNode}
   */
  initializeNodes() {
    this.outputNode = this.audioContext.createGain();
    this.inputNode = this.outputNode;
    this.outputNode.gain.value = this.volume;
    console.log(`VolumeComponent initialized with volume: ${this.volume}`);
    super.isUse = true;
    return this.outputNode;
  }

  /**
   * 音量を設定するメソッド
   * @param {number} volumeGain - 0.0から1.0の範囲
   */
  applyEffect(volumeGain) {
    if (volumeGain < 0.0) volumeGain = 0.0;
    if (volumeGain > 1.0) volumeGain = 1.0;

    this.volume = volumeGain;
    if (this.outputNode) {
      this.outputNode.gain.value = volumeGain;
    }
  }

  /**
   * エフェクトの使用・非使用を設定
   * @param {boolean} isUse 
   */
  _setUse(isUse) {
    super._setUse(isUse);
    if (this.inputNode == null) {
      return;
    }
    if (isUse) {
      this.applyEffect(this.volume);
    } else {
      this.applyEffect(1.0);
    }
  }
}
