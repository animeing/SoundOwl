import { BASE } from '../../../utilization/path';
import { AudioComponent } from '../AudioComponent';

export class ImpulseResponseEffect extends AudioComponent {
  constructor() {
    super();
    this.reverbNode = null;
    this.impulseResponseBuffer = null;
    this.fileName = null;
    this.loadId = 0;
  }

  setAudioContext(audioContext) {
    super.setAudioContext(audioContext);
    this.initializeNodes();
  }

  initializeNodes() {
    if (!this.audioContext) {
      throw new Error('AudioContext is not set.');
    }

    this.loadId++;

    this.preGainNode = this.audioContext.createGain();
    this.postGainNode = this.audioContext.createGain();

    this.preGainNode.gain.value = 1.0;
    this.postGainNode.gain.value = 1.0;

    this.reverbNode = this.audioContext.createConvolver();

    this.inputNode = this.audioContext.createGain();
    this.outputNode = this.audioContext.createGain();

    this.inputNode.connect(this.preGainNode);
    this.preGainNode.connect(this.reverbNode);
    this.reverbNode.connect(this.postGainNode);
    this.postGainNode.connect(this.outputNode);

    this.reverbNode.buffer = this.impulseResponseBuffer || this.generateImpulseResponse(this.audioContext);
    this.impulseResponseBuffer = this.reverbNode.buffer;
    if (this.fileName) {
      this.applyEffect(this.fileName);
    }
  }

  _setUse(isUse) {
    super._setUse(isUse);
    if (isUse) {
      this.reverbNode.buffer = null;
    } else {
      this.reverbNode.buffer = this.impulseResponseBuffer;
    }
  }

  /**
   * Load impulse response for the reverb effect.
   * @param {ArrayBuffer} impulseResponseData
   */
  loadImpulseResponse(impulseResponseData) {
    return this.audioContext.decodeAudioData(impulseResponseData);
  }

  adjustGainForImpulseResponse(buffer) {
    const channelData = buffer.getChannelData(0);
    const rms = Math.sqrt(channelData.reduce((sum, sample) => sum + sample * sample, 0) / channelData.length);

    const targetRMS = 0.1;
    const gainValue = targetRMS / rms;

    this.preGainNode.gain.value = gainValue;
    this.postGainNode.gain.value = 1.0 / gainValue;
  }

  generateImpulseResponse(audioContext, length = 1.0) {
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * length, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const output = buffer.getChannelData(channel);
      for (let i = 0; i < output.length; i++) {
        output[i] = i === 0 ? 1.0 : 0.0;
      }
    }
    
    return buffer;
  }

  /**
   * @override
   */
  applyEffect(fileName) {
    if(this.reverbNode == null) {
      this.fileName = fileName;
      return Promise.resolve(true);
    }
    if(fileName == "") {
      this.loadId++;
      this.fileName = fileName;
      this.impulseResponseBuffer = this.generateImpulseResponse(this.audioContext);
      this.reverbNode.buffer = this.impulseResponseBuffer;
      return Promise.resolve(true);
    }
    if (fileName) {
      return this.loadImpulseResponseFromUrl(fileName);
    }
    return Promise.resolve(true);
  }

  async loadImpulseResponseFromUrl(fileName) {
    const loadId = ++this.loadId;
    try {
      const response = await fetch(BASE.HOME+'audio_pulse/'+fileName);
      if (!response.ok) {
        throw new Error(`Failed to load impulse response: HTTP ${response.status}`);
      }
      const data = await response.arrayBuffer();
      const buffer = await this.loadImpulseResponse(data);
      if (loadId !== this.loadId) return false;

      this.adjustGainForImpulseResponse(buffer);
      this.impulseResponseBuffer = buffer;
      this.reverbNode.buffer = buffer;
      this.fileName = fileName;
      return true;
    } catch (error) {
      if (loadId !== this.loadId) return false;
      console.error('Error loading impulse response:', error);
      if (!this.reverbNode.buffer) {
        this.reverbNode.buffer = this.impulseResponseBuffer || this.generateImpulseResponse(this.audioContext);
      }
      return false;
    }
  }

  /**
   * @override
   */
  connect(target) {
    if (this.outputNode) {
      this.outputNode.connect(target.inputNode || target);
      console.log(`Connected ${this.constructor.name} to ${target.constructor.name}`);
    }
  }

  /**
   * @override
   */
  disconnect() {
    if (this.outputNode) {
      this.outputNode.disconnect();
    }
  }
}
