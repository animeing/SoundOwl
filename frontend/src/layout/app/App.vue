<template>
  <v-app>
    <Header></Header>
    <v-main id="base" class="layout-base" :style="{ marginTop: '5px', paddingBottom: `${controllerHeight}px` }">
      <!-- AudioControllerの高さを考慮してpadding-bottomを動的に設定 -->
      <router-view></router-view>
    </v-main>
    <div id="controller" class="audio-play-controller analyser" ref="controller">
      <AudioController></AudioController>
    </div>
  </v-app>
</template>
<script>
import AudioController from '../footer/AudioController.vue';
import Header from './header/Header.vue';
import colorThema from '../../thema';

export default {
  name: 'App',
  components: {
    AudioController,
    Header
  },
  data() {
    return {
      style: {
        '--background-color': '#eee'
      },
      controllerHeight: 0 // AudioControllerの高さを保持
    };
  },
  mounted() {
    this.style['--background-color'] = colorThema.backgrouund;
    this.updateControllerHeight();
    window.addEventListener('resize', this.updateControllerHeight);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateControllerHeight);
  },
  methods: {
    updateControllerHeight() {
      const controller = this.$refs.controller;
      if (controller) {
        this.controllerHeight = controller.offsetHeight;
      }
    }
  }
};
</script>
<style lang="scss">

</style>