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
            <div class="block">
                <p class="title">
                    Impulse Response Effect
                </p>
                <p>Impulse Response Effect uses impulse response data to simulate the acoustics of various spaces, altering audio quality by adding realistic reverberation, echo, and other spatial characteristics. Users can upload their own files to customize the effect, achieving desired acoustic settings and enhancing the overall sound experience.</p>
                <div class="block">
                    <p class="title">
                        Upload
                    </p>
                    <div>
                        <sw-input-file
                            accept="wav,mp3"
                            @files-changed="handleFileUpload" />
                    </div>
                    <div>
                        <input
                            type="button"
                            class="button"
                            value="Upload"
                            @click="uploadFile">
                    </div>
                </div>
                <div class="block">
                    <p class="title">
                        Delete
                    </p>
                    <v-select
                        v-model="selectDelete"
                        :items="presetNames"
                        label="Delete item"
                        clearable
                        @change="deletePreset"></v-select>
                    <div>
                      <v-btn
                            @click="deletePreset"
                            :disabled="!selectDelete">
                            Delete</v-btn>
                    </div>
                </div>
                <div class="block">
                    <p class="title">
                        Apply Data
                    </p>
                    <v-select
                        v-model="selectPreset"
                        :items="presetNames"
                        label="Preset"
                        clearable
                        @update:modelValue="changeReverbEffect"></v-select>
                </div>
            </div>
        </div>
    </div>
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
      isUseSoundSculpt:audio.exAudioEffect.isUse,
      isUseLoudnessNormalization:audio.loudnessNormalize.isUse,
      presetNames:[],
      selectPreset:'OFF',
      selectDelete: '',
      file:null
    };
  },
  
  mounted() {
    this.updatePresetList();
  },
  methods: {

    handleFileUpload(event) {
      this.file = event.target.files[0];
    },
    uploadFile(){
      if(this.file){
        const formData = new FormData();
        formData.append('impulseResponse', this.file);
        new PulseDataUploadAction()
          .execute(formData)
          .then(()=>{
            let message = new MessageWindow();
            message.value = 'File has been uploaded.';
            message.open();
            message.close(3000);
          })
          .catch(()=>{
            let message = new MessageWindow();
            message.value = 'File upload failed.';
            message.open();
            message.close(3000);
          })
          .finally(()=>{
            setTimeout(()=>{
              this.updatePresetList();
            },0.5);
          });
      }
    },
    deletePreset() {
      new PulseDataDeleteAction()
        .execute(this.selectDelete)
        .then(()=>{
          let message = new MessageWindow;
          message.value = 'The file has been deleted.';
          message.open();
          message.close(3000);
        })
        .catch(()=>{
          let message = new MessageWindow;
          message.value = 'Failed to delete file.';
          message.open();
          message.close(3000);
        })
        .finally(()=>{
          setTimeout(()=>{
            this.updatePresetList();
          },0.5);
        });
    },
    updatePresetList() {
      console.log(audio.inpulseResponseEffect.fileName);
      new Promise((resolve)=>{
        new PulseDataListAction()
          .execute()
          .then(data=>{
            this.presetNames = data.data;
            resolve();
          });
      }).then(()=>{
        this.selectPreset = this.presetNames.includes(audio.inpulseResponseEffect.fileName)?audio.inpulseResponseEffect.fileName:'OFF';
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
      if(this.selectPreset == null) {
        this.selectPreset = '';
      }
      audio.inpulseResponseEffect.applyEffect(this.selectPreset);
      if(this.selectPreset == '') {
        this.selectPreset = 'OFF';
      }
      audioParamSave();
    }
  }
};
</script>