<template>
    <div>
      <SettingTab />
      <component :is="component" />
    </div>
</template>
<script>
import { markRaw } from 'vue';
import SettingServerComponent from './contents/SettingServerComponent.vue';
import SettingEqualizerComponent from './contents/SettingEqualizerComponent.vue';
import SettingEffectComponent from './contents/SettingEffectComponent.vue';
import SettingTab from './parts/SettingTab.vue';
import SoundSculptDebug from './contents/SoundSculptDebug.vue';

export default {
  name:'SettingVue',
  components:{
    SettingTab,
    SettingEqualizerComponent,
    SettingEffectComponent,
    SettingServerComponent,
    SoundSculptDebug,
  },
  data(){
    return {
      isGeneral:true,
      isEqualizer:false,
      isEffect:false,
      component: markRaw(SettingServerComponent),
    };
  },
  watch: {
    '$route'(_to, _from) {
      this.updateComponent();
    }
  },
  mounted() {
    this.updateComponent();
  },
  methods:{
    updateComponent(){ 
      switch (this.$route.name) {
        case 'setting':
          this.component = markRaw(SettingServerComponent);
          break;
        case 'equalizer':
          this.component = markRaw(SettingEqualizerComponent);
          break;
        case 'effect':
          this.component = markRaw(SettingEffectComponent);
          break;
        case 'soundSculptDebug':
          this.component = markRaw(SoundSculptDebug);
          break;
        default:
          this.component = markRaw(SettingServerComponent);
          break;
      }
    }
  }
};
</script>