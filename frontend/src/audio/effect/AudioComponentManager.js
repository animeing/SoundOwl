import { AudioComponent } from './AudioComponent';

export class AudioEffectManager {
  constructor(audioElement) {
    this.audioElement = audioElement;
    this.effects = new Map();
    this.source = null;
  }

  initialize() {
    if (!this.source) {
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
    }
  }

  addEffect(name, effect) {
    if (this.effects.has(name)) {
      throw new Error(`Effect with name "${name}" already exists.`);
    }
    effect.setAudioContext(this.audioContext);
    if (this.effects.size > 0) {
      Array.from(this.effects.values()).slice(-1)[0].connect(effect);
    } else {
      this.source.connect(effect.inputNode);
    }
    effect.connect(this.audioContext.destination);
    this.effects.set(name, effect);
  }

  removeEffect(name) {
    if (!this.effects.has(name)) {
      throw new Error(`Effect with name "${name}" does not exist.`);
    }
    const effect = this.effects.get(name);
    effect.disconnect();
    this.effects.delete(name);
    this.reconnectEffects();
  }

  reconnectEffects() {
    let previousNode = this.source;
    for (const effect of this.effects.values()) {
      previousNode.connect(effect.inputNode);
      previousNode = effect.outputNode;
    }
    previousNode.connect(this.audioContext.destination);
  }
}
