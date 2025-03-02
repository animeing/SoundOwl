<template>
  <v-container class="py-4" fluid>
    <v-card style="background: inherit;">
      <v-card-title>Equalizer</v-card-title>
        <v-card-actions>
          <v-select
            v-model="selectPreset"
            :items="presetNames"
            @update:modelValue="changedPreset"
            label="Preset"
            outlined
            dense
            hide-details
            class="equalizer-preset-select"></v-select>
        </v-card-actions>
        <v-card-text>
          <v-card class="mb-4" outlined style="background: inherit;">
            <v-card-title>Setting</v-card-title>
            <v-card-text>
                <div class="equalizer-setting-container">
                  <p
                    v-for="(item, index) in hzArray"
                    :key="index"
                    class="equalizer-setting-item">
                    <span>{{ toViewName(item.hz) }}</span>
                    <sw-h-progress
                      class="setting-equalizer"
                      max="15"
                      min="-15"
                      :slider-value="item.gain"
                      @valueSet="valueChange($event, item)" />
                  </p>
                </div>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
import audio from '../../../audio/AudioPlayer';
import { BaseFrameWork } from '../../../base';
import { BASE } from '../../../utilization/path';
import { audioParamSave } from '../../../utilization/register';


export default {
  name:'SettingEqualizerComponent',
  data(){
    return {
      hzArray:[],
      presets:[],
      presetNames:[],
      selectPreset:'Manual'
    };
  },
  mounted() {
    this.hzArray = JSON.parse(JSON.stringify(audio.equalizer.leftEqualizer.gains));
    let equalizerPreset = new class extends BaseFrameWork.Network.RequestServerBase{
      constructor(){
        super(
          null,
          `${BASE.API}/sound_equalizer_preset.json`,
          BaseFrameWork.Network.HttpResponseType.JSON,
          BaseFrameWork.Network.HttpRequestType.GET);
      }
    };
    equalizerPreset.httpRequestor.addEventListener('success',e=>{
      this.presets = e.detail.response;
      this.presets['Manual'] = this.hzArray;
      this.presetNames = Object.keys(this.presets);
    });
    equalizerPreset.execute();
  },
  methods:{
    valueChange(event, value){
      value.gain = (event.target.sliderValue);
      audio.equalizer.applyHzGain({left:{hz:value.hz,gain:value.gain},right:{hz:value.hz,gain:value.gain}});
      audioParamSave();
    },
    changedPreset(){
      if(this.presets[this.selectPreset] == undefined) {
        this.selectPreset = 'Manual';
      }
      this.hzArray = JSON.parse(JSON.stringify(this.presets[this.selectPreset]));
    },
    gainsUpdate(){
      audio.equalizer.monoGains = this.hzArray.slice();
      audioParamSave();
    },
    toViewName(val) {
      let hzInt = ~~val;
      let isKiloParam = (hzInt%1000) == 0;
      let kiloParam = hzInt/1000;
      if(isKiloParam){
        return `${kiloParam}kHz`;
      }
      return `${hzInt}Hz`;
    },
  }
};
</script>
