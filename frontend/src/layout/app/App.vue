<template>
  <v-app>
    <Header />
    <v-main
      id="base"
      class="layout-base app-main"
      :style="mainStyle"
    >
      <router-view />
    </v-main>
    <div id="controller" class="audio-play-controller analyser" ref="controller">
      <AudioController />
    </div>
  </v-app>
</template>

<script>
import AudioController from '../footer/AudioController.vue';
import Header from './header/Header.vue';
import { colorThema } from '../../thema';

export default {
  name: 'App',
  components: {
    AudioController,
    Header
  },
  data() {
    return {
      controllerHeight: 0
    };
  },
  computed: {
    mainStyle() {
      return {
        '--background-color': colorThema.background,
        paddingBottom: `${this.controllerHeight}px`
      };
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateControllerHeight();
    });
    window.addEventListener('resize', this.updateControllerHeight);
  },
  beforeUnmount() {
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

<style scoped>
.app-main {
  margin-top: 5px;
}
</style>
