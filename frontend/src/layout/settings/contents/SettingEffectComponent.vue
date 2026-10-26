<template>
  <v-container class="pa-4" fluid>
        <v-card outlined style="background: inherit;">
          <v-card-title class="text-h6 font-weight-medium">Effect Settings</v-card-title>
          <v-divider></v-divider>
          <v-expansion-panels multiple rounded="md" style="background: inherit;">
            <!-- SoundSculpt -->
            <v-expansion-panel style="background: inherit;">
              <v-expansion-panel-title style="background: inherit;">
                <div class="d-flex align-center justify-space-between w-100">
                  <span>SoundSculpt</span>
                  <v-switch
                    v-model="isUseSoundSculpt"
                    class="effect-toggle ms-4 flex-shrink-0"
                    color="primary"
                    hide-details
                    @update:modelValue="toggleEffect"
                  ></v-switch>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                SoundSculpt dynamically adjusts audio frequencies in real‑time, enhancing or attenuating different frequency bands to provide a richer audio experience.
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Loudness Normalization -->
            <v-expansion-panel style="background: inherit;">
              <v-expansion-panel-title style="background: inherit;">
                <div class="d-flex align-center justify-space-between w-100">
                  <span>Loudness Normalization</span>
                  <v-switch
                    v-model="isUseLoudnessNormalization"
                    class="effect-toggle ms-4 flex-shrink-0"
                    color="primary"
                    hide-details
                    @update:modelValue="toggleLoudnessNormalization"
                  ></v-switch>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                Loudness normalization adjusts the average loudness of a recording to a consistent level, ensuring that all tracks or programs sound at a similar volume.
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Impulse Response Effect -->
            <v-expansion-panel style="background: inherit;">
              <v-expansion-panel-title style="background: inherit;">Impulse Response Effect</v-expansion-panel-title>
              <v-expansion-panel-text>
                <p>
                  Impulse Response Effect uses impulse response data to simulate the acoustics of various spaces, altering audio quality by adding realistic reverberation, echo, and other spatial characteristics.
                </p>
                <v-divider class="my-2"></v-divider>

                <!-- Upload -->
                <div class="text-subtitle-1 font-weight-medium mb-2">Upload</div>
                <sw-input-file accept="wav,mp3" @files-changed="handleFileUpload" />
                <v-btn class="mt-2" color="primary" @click="uploadFile" :disabled="!file">
                  Upload
                </v-btn>

                <!-- Delete -->
                <v-divider class="my-4"></v-divider>
                <div class="text-subtitle-1 font-weight-medium mb-2">Delete</div>
                <v-select
                  v-model="selectDelete"
                  :items="presetNames"
                  label="Delete item"
                  clearable
                />
                <v-btn color="error" class="mt-2" @click="deletePreset" :disabled="!selectDelete">
                  Delete
                </v-btn>

                <!-- Apply -->
                <v-divider class="my-4"></v-divider>
                <div class="text-subtitle-1 font-weight-medium mb-2">Apply Data</div>
                <v-select
                  v-model="selectPreset"
                  :items="presetNames"
                  label="Preset"
                  clearable
                  @update:modelValue="changeReverbEffect"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
  </v-container>
</template>

<script>
import { PulseDataListAction } from '../../../api/PulseDataListAction';
import { PulseDataUploadAction } from '../../../api/PulseDataUploadAction';
import { PulseDataDeleteAction } from '../../../api/PulseDataDeleteAction';
import audio from '../../../audio/AudioPlayer';
import { MessageWindow } from '../../../base';
import { audioParamSave } from '../../../utilization/register';

const toBoolean = value => value === true || value === 1 || value === '1' || value === 'true';

const showMessage = value => {
  const message = new MessageWindow();
  message.value = value;
  message.open(3000);
};

export default {
  name: 'EffectSettings',
  data() {
    return {
      isUseSoundSculpt: toBoolean(audio.exAudioEffect.isUse),
      isUseLoudnessNormalization: toBoolean(audio.loudnessNormalize.isUse),
      presetNames: [],
      selectPreset: 'OFF',
      selectDelete: '',
      reverbSelectionGeneration: 0,
      file: null
    };
  },
  mounted() {
    this.updatePresetList();
  },
  methods: {
    handleFileUpload(event) {
      this.file = event.target.files[0];
    },
    uploadFile() {
      if (this.file) {
        const formData = new FormData();
        formData.append('impulseResponse', this.file);
        new PulseDataUploadAction()
          .execute(formData)
          .then(() => {
            showMessage('File has been uploaded.');
          })
          .catch(() => {
            showMessage('File upload failed.');
          })
          .finally(() => {
            setTimeout(this.updatePresetList, 500);
          });
      }
    },
    deletePreset() {
      new PulseDataDeleteAction()
        .execute(this.selectDelete)
        .then(() => {
          showMessage('The file has been deleted.');
        })
        .catch(() => {
          showMessage('Failed to delete file.');
        })
        .finally(() => {
          setTimeout(this.updatePresetList, 500);
        });
    },
    updatePresetList() {
      new PulseDataListAction()
        .execute()
        .then((data) => {
          this.presetNames = data.data;
        })
        .finally(() => {
          const selected = audio.inpulseResponseEffect.selectedFileName;
          this.selectPreset = this.presetNames.includes(selected) ? selected : 'OFF';
        });
    },
    toggleEffect(value) {
      const enabled = toBoolean(value);
      this.isUseSoundSculpt = enabled;
      audio.exAudioEffect.isUse = enabled;
      audioParamSave();
    },
    toggleLoudnessNormalization(value) {
      const enabled = toBoolean(value);
      this.isUseLoudnessNormalization = enabled;
      audio.loudnessNormalize.isUse = enabled;
      audioParamSave();
    },
    async changeReverbEffect() {
      if (this.selectPreset == null) this.selectPreset = '';
      const requestedPreset = this.selectPreset;
      const selectionGeneration = ++this.reverbSelectionGeneration;
      const isDeferredUntilPlayback = !!requestedPreset && !audio.inpulseResponseEffect.reverbNode;
      const applying = audio.inpulseResponseEffect.applyEffect(requestedPreset);
      if (isDeferredUntilPlayback) {
        audioParamSave();
        showMessage('Impulse response will load when playback starts.');
      }
      const applied = await applying;
      if (selectionGeneration !== this.reverbSelectionGeneration) return;
      if (!applied) {
        this.selectPreset = audio.inpulseResponseEffect.fileName || 'OFF';
        audioParamSave();
        showMessage('Failed to load impulse response.');
        return;
      }
      if (requestedPreset === '') this.selectPreset = 'OFF';
      audioParamSave();
    }
  }
};
</script>

<style scoped>
.effect-toggle :deep(.v-selection-control__input) {
  width: var(--v-selection-control-size);
  height: var(--v-selection-control-size);
}
</style>
