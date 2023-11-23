<template>
    <div>
        <div class="block">
            <p class="title">
                Effect
            </p>
            <div class="block">
                <p class="title">
                    SoundSculpt
                </p>
                <p>SoundSculpt dynamically adjusts audio frequencies in real-time, enhancing or attenuating different frequency bands to provide a richer audio experience.</p>
                <input
                    v-model="isUseSoundSculpt"
                    type="checkbox"
                    @change="toggleEffect">
            </div>
            <div class="block">
                <p class="title">
                    Loudness normalization
                </p>
                <p>Loudness normalization is a process used in audio mastering where the average loudness of a recording is adjusted to a consistent level. This ensures that all tracks or programs sound at a similar volume level to the listener, reducing the need to adjust volume between tracks or when switching between different media sources.</p>
                <input
                    v-model="isUseLoudnessNormalization"
                    type="checkbox"
                    @change="toggleLoudnessNormalization">
            </div>
        </div>
    </div>
</template>
<script>
import audio from '../../../audio/AudioPlayer';
import { audioParamSave } from '../../../utilization/register';


export default {
  
  data() {
    return {
      isUseSoundSculpt:audio.exAudioEffect.isUseEffect,
      isUseLoudnessNormalization:audio.loudnessNormalize.isUse
    };
  },
  methods: {
    toggleEffect() {
      audio.exAudioEffect.isUseEffect = !audio.exAudioEffect.isUseEffect;
      audioParamSave();
    },
    toggleLoudnessNormalization() {
      audio.loudnessNormalize.isUse = !audio.loudnessNormalize.isUse;
      audioParamSave();
    }
  }
};
</script>