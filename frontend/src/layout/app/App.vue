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
      controllerHeight: 0,
      headerHeight: 0,
      resizeObserver: null
    };
  },
  computed: {
    mainStyle() {
      return {
        '--background-color': colorThema.background,
        paddingTop: `${this.headerHeight + 8}px`,
        paddingBottom: `${this.controllerHeight + 12}px`
      };
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.updateLayoutHeights();
      this.observeLayout();
    });
    window.addEventListener('resize', this.updateLayoutHeights);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateLayoutHeights);
    this.resizeObserver?.disconnect();
  },
  methods: {
    observeLayout() {
      if (!window.ResizeObserver) {
        return;
      }
      const header = document.querySelector('.v-app-bar');
      const controller = this.$refs.controller;
      this.resizeObserver = new ResizeObserver(() => {
        this.updateLayoutHeights();
      });
      if (header) {
        this.resizeObserver.observe(header);
      }
      if (controller) {
        this.resizeObserver.observe(controller);
      }
    },
    updateLayoutHeights() {
      const controller = this.$refs.controller;
      const header = document.querySelector('.v-app-bar');
      if (controller) {
        this.controllerHeight = controller.offsetHeight;
      }
      if (header) {
        this.headerHeight = header.offsetHeight;
      }
    }
  }
};
</script>

<style scoped>
.app-main {
  min-height: 100vh;
  box-sizing: border-box;
}
</style>
