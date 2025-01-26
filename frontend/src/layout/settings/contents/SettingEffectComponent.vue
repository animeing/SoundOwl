<template>
  <!-- コンテナ全体 -->
  <v-container class="py-4" fluid>
    <v-row>
      <v-col>
        <!-- 「Effect」の大枠カード -->
        <v-card outlined>
          <v-card-title>Effect</v-card-title>
          <v-card-text>
            <!-- SoundSculpt -->
            <v-card class="mb-4" outlined>
              <v-card-title>SoundSculpt</v-card-title>
              <v-card-text>
                SoundSculpt dynamically adjusts audio frequencies in real-time,
                enhancing or attenuating different frequency bands to provide a
                richer audio experience.
              </v-card-text>
              <v-card-actions>
                <v-checkbox
                  v-model="isUseSoundSculpt"
                  label="Enable SoundSculpt"
                  hide-details
                  @change="toggleEffect"
                />
              </v-card-actions>
            </v-card>

            <!-- Loudness Normalization -->
            <v-card class="mb-4" outlined>
              <v-card-title>Loudness normalization</v-card-title>
              <v-card-text>
                Loudness normalization is a process used in audio mastering
                where the average loudness of a recording is adjusted to a
                consistent level. This ensures that all tracks or programs sound
                at a similar volume level...
              </v-card-text>
              <v-card-actions>
                <v-checkbox
                  v-model="isUseLoudnessNormalization"
                  label="Enable Loudness Normalization"
                  hide-details
                  @change="toggleLoudnessNormalization"
                />
              </v-card-actions>
            </v-card>

            <!-- Impulse Response Effect -->
            <v-card class="mb-4" outlined>
              <v-card-title>Impulse Response Effect</v-card-title>
              <v-card-text>
                Impulse Response Effect uses impulse response data to simulate
                the acoustics of various spaces, altering audio quality by
                adding realistic reverberation, echo, and other spatial
                characteristics. Users can upload their own files...
              </v-card-text>

              <!-- アップロード -->
              <v-divider class="my-2"></v-divider>
              <v-card-subtitle>Upload</v-card-subtitle>
              <v-card-text>
                <sw-input-file
                  accept="wav,mp3"
                  @files-changed="handleFileUpload"
                />
              </v-card-text>
              <v-card-actions>
                <v-btn color="primary" @click="uploadFile">Upload</v-btn>
              </v-card-actions>

              <!-- 削除 -->
              <v-divider class="my-2"></v-divider>
              <v-card-subtitle>Delete</v-card-subtitle>
              <v-card-text>
                <v-select
                  v-model="selectDelete"
                  :items="presetNames"
                  label="Delete item"
                  clearable
                  @change="deletePreset"
                />
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="error"
                  @click="deletePreset"
                  :disabled="!selectDelete"
                >
                  Delete
                </v-btn>
              </v-card-actions>

              <!-- 適用(Apply Data) -->
              <v-divider class="my-2"></v-divider>
              <v-card-subtitle>Apply Data</v-card-subtitle>
              <v-card-text>
                <v-select
                  v-model="selectPreset"
                  :items="presetNames"
                  label="Preset"
                  clearable
                  @update:modelValue="changeReverbEffect"
                />
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
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
            let message = new MessageWindow();
            message.value = 'File has been uploaded.';
            message.open();
            message.close(3000);
          })
          .catch(() => {
            let message = new MessageWindow();
            message.value = 'File upload failed.';
            message.open();
            message.close(3000);
          })
          .finally(() => {
            setTimeout(() => {
              this.updatePresetList();
            }, 0.5);
          });
      }
    },
    deletePreset() {
      new PulseDataDeleteAction()
        .execute(this.selectDelete)
        .then(() => {
          let message = new MessageWindow();
          message.value = 'The file has been deleted.';
          message.open();
          message.close(3000);
        })
        .catch(() => {
          let message = new MessageWindow();
          message.value = 'Failed to delete file.';
          message.open();
          message.close(3000);
        })
        .finally(() => {
          setTimeout(() => {
            this.updatePresetList();
          }, 0.5);
        });
    },
    updatePresetList() {
      console.log(audio.inpulseResponseEffect.fileName);
      new Promise((resolve) => {
        new PulseDataListAction()
          .execute()
          .then((data) => {
            this.presetNames = data.data;
            resolve();
          });
      }).then(() => {
        this.selectPreset =
          this.presetNames.includes(audio.inpulseResponseEffect.fileName)
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
      console.log(this.selectPreset);
      if (this.selectPreset == null) {
        this.selectPreset = '';
      }
      audio.inpulseResponseEffect.applyEffect(this.selectPreset);
      if (this.selectPreset == '') {
        this.selectPreset = 'OFF';
      }
      audioParamSave();
    }
  }
};
</script>
