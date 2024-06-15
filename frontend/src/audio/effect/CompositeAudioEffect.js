import { AudioComponent } from './AudioComponent';

export class CompositeAudioEffect extends AudioComponent {
  constructor() {
    super();
    /**
     * @type {Array<AudioComponent>}
     */
    this.components = [];
  }

  initializeNodes() {
    throw new Error('initializeNodes() must be implemented by subclasses');
  }

  addComponent(component) {
    if (this.components.length > 0) {
      const lastComponent = this.components[this.components.length - 1];
      lastComponent.connect(component);
    } else {
      this.inputNode.connect(component.inputNode);
    }
    this.components.push(component);
    component.setAudioContext(this.audioContext);
    component.connect(this.outputNode);
  }

  removeComponent(component) {
    const index = this.components.indexOf(component);
    if (index > -1) {
      if (index > 0) {
        this.components[index - 1].disconnect();
        if (index < this.components.length - 1) {
          this.components[index - 1].connect(this.components[index + 1]);
        } else {
          this.components[index - 1].connect(this.outputNode);
        }
      } else {
        this.inputNode.disconnect();
        if (this.components.length > 1) {
          this.inputNode.connect(this.components[1].inputNode);
        }
      }
      this.components.splice(index, 1);
      component.disconnect();
    }
  }

  applyEffect(settings) {
    this.components.forEach(component=>component.applyEffect(settings));
  }
}
