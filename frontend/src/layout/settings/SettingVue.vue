<template>
    <div>
      <SettingTab />
      <div
        class="context">
        <component :is="component" />
      </div>
    </div>
</template>
<script>
import SettingServerComponent from './contents/SettingServerComponent.vue';
import SettingEqualizerComponent from './contents/SettingEqualizerComponent.vue';
import SettingEffectComponent from './contents/SettingEffectComponent.vue';
import SettingTab from './parts/SettingTab.vue';

export default {
  name:'SettingVue',
  components:{
    SettingTab,
    SettingEqualizerComponent,
    SettingEffectComponent,
    SettingServerComponent,
  },
  data(){
    return {
      isGeneral:true,
      isEqualizer:false,
      isEffect:false,
      component: "SettingServerComponent",
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
          this.component = "SettingServerComponent";
          break;
        case 'equalizer':
          this.component = "SettingEqualizerComponent";
          break;
        case 'effect':
          this.component = "SettingEffectComponent";
          break;
        default:
          this.component = "SettingServerComponent";
          break;
      }
    }
  }
};
</script>