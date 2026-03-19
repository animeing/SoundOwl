<template>
  <v-app class="soundowl-app">
    <Header />
    <v-main
      id="base"
      class="layout-base"
      :style="mainStyle"
    >
      <router-view />
    </v-main>
    <div
      id="controller"
      ref="controller"
      class="audio-play-controller analyser"
    >
      <AudioController />
    </div>
  </v-app>
</template>

<script>
import AudioController from '../footer/AudioController.vue';
import Header from './header/Header.vue';

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
        paddingBottom: `${this.controllerHeight}px`
      };
    }
  },
  mounted() {
    this.updateControllerHeight();
    window.addEventListener('resize', this.updateControllerHeight);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateControllerHeight);
  },
  methods: {
    updateControllerHeight() {
      const controller = this.$refs.controller;
      this.controllerHeight = controller ? controller.offsetHeight : 0;
    }
  }
};
</script>

<style scoped>
.soundowl-app {
  min-height: 100vh;
}

.layout-base {
  padding-inline: 0;
}

.audio-play-controller {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1005;
  padding: 8px;
  background: transparent;
}

@media screen and (max-width: 768px) {
  .audio-play-controller {
    padding: 0;
  }
}
</style>
