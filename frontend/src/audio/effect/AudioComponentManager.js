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
    this.effects.set(name, effect);
  }

  removeEffect(name) {
    if (!this.effects.has(name)) {
      throw new Error(`Effect with name "${name}" does not exist.`);
    }
    const effect = this.effects.get(name);
    effect.disconnect();
    this.effects.delete(name);
  }

  apply() {
    this.reconnectEffects();
  }

  reconnectEffects() {
    // すべての接続を解除
    this.audioContext.destination.disconnect();
    this.source.disconnect();

    let previousNode = this.source;
    for (const effect of this.effects.values()) {
      previousNode.connect(effect.inputNode);
      console.log(`Reconnected ${previousNode.constructor.name} to ${effect.constructor.name}`);
      previousNode = effect.outputNode;
    }
    previousNode.connect(this.audioContext.destination);
    console.log(`Reconnected ${previousNode.constructor.name} to destination`);
  }
}
