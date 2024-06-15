
export class AudioComponent {
  constructor() {
    /**
     * @type {AudioContext}
     */
    this.audioContext = null;
    this.inputNode = null;
    /**
     * @type {AudioNode}
     */
    this.outputNode = null;
    this._isUse = true;
  }

  /**
   * 
   * @param {AudioContext} audioContext 
   */
  setAudioContext(audioContext) {
    this.audioContext = audioContext;
    this.inputNode = null;
    this.outputNode = null;
  }

  set isUse(isUse) {
    if(this._isUse == isUse) {
      return;
    }
    this._setUse(isUse);
  }

  get isUse(){
    return this._isUse;
  }

  _setUse(isUse) {
    this._isUse = isUse;
  }


  /**
   * @template T
   * @return {T}
   */
  initializeNodes() {
    throw new Error('initializeNodes() must be implemented by subclasses');
  }

  /**
   * 
   * @param {AudioComponent} target 
   */
  connect(target) {
    if (this.outputNode) {
      this.outputNode.connect(target.inputNode || target);
    }
  }

  applyEffect(settings) {
    throw new Error('applyEffect() must be implemented by subclasses');
  }

  disconnect() {
    if (this.outputNode) {
      this.outputNode.disconnect();
    }
  }
}
