import { StereoAudioEqualizer } from "../equalizer/stereoAudioEqualizer";
import { SoundSculptEffect } from "./soundSculptEffect";

export class StereoExAudioEffect {
    /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     * @param {StereoAudioEqualizer} equalizer
     */
    constructor(audioSource, audioContext, equalizer) {
        this.audioSource = audioSource;
        this.audioContext = audioContext;
        this.leftExAudioEffect = new SoundSculptEffect(this.audioSource, this.audioContext, equalizer.leftEqualizer);
        this.rightExAudioEffect = new SoundSculptEffect(this.audioSource, this.audioContext, equalizer.rightEqualizer);
        this._isUseEffect = true;
        this.leftExAudioEffect.isUseEffect;
    }

    reset() {
        this.leftExAudioEffect.reset()
        this.rightExAudioEffect.reset();
    }

    /**
     * 
     * @param {AudioNode} audioNode 
     */
    connect(audioNode) {
        this.leftExAudioEffect.connect(audioNode);
        this.rightExAudioEffect.connect(audioNode);
    }

    set isUseEffect(val) {
        this._isUseEffect = val;
        this.leftExAudioEffect.isUseEffect = this._isUseEffect;
        this.rightExAudioEffect.isUseEffect = this._isUseEffect;
    }

    get isUseEffect() {
        return this._isUseEffect;
    }
}
