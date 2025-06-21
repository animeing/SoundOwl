<template>
  <v-container class="py-4" fluid>
        <v-card outlined style="background: inherit;">
          <v-card-title>Effect Settings</v-card-title>
          <v-divider></v-divider>
          <v-expansion-panels multiple style="background: inherit;">
            <!-- SoundSculpt -->
            <v-expansion-panel style="background: inherit;">
              <v-expansion-panel-title style="background: inherit;">
                <div class="d-flex align-center justify-space-between w-100">
                  <span>SoundSculpt</span>
                  <v-switch
                    v-model="isUseSoundSculpt"
                    inset
                    hide-details
                    @change="toggleEffect"
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
                    inset
                    hide-details
                    @change="toggleLoudnessNormalization"
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

export default {
  name: 'EffectSettings',
  data() {
    return {
      isUseSoundSculpt: audio.exAudioEffect.isUse,
      isUseLoudnessNormalization: audio.loudnessNormalize.isUse,
      presetNames: [],
      selectPreset: 'OFF',
      selectDelete: '',
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
            new MessageWindow({ value: 'File has been uploaded.' }).open(3000);
          })
          .catch(() => {
            new MessageWindow({ value: 'File upload failed.' }).open(3000);
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
          new MessageWindow({ value: 'The file has been deleted.' }).open(3000);
        })
        .catch(() => {
          new MessageWindow({ value: 'Failed to delete file.' }).open(3000);
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
          this.selectPreset = this.presetNames.includes(audio.inpulseResponseEffect.fileName)
            ? audio.inpulseResponseEffect.fileName
            : 'OFF';
        });
    },
    toggleEffect() {
      audio.exAudioEffect.isUse = !audio.exAudioEffect.isUse;
      audioParamSave();
    },
    toggleLoudnessNormalization() {
      audio.loudnessNormalize.isUse = !audio.loudnessNormalize.isUse;
      audioParamSave();
    },
    changeReverbEffect() {
      if (this.selectPreset == null) this.selectPreset = '';
      audio.inpulseResponseEffect.applyEffect(this.selectPreset);
      if (this.selectPreset === '') this.selectPreset = 'OFF';
      audioParamSave();
    }
  }
};
</script>
