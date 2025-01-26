<template>
  <v-app>
    <Header></Header>
    <v-main id="base" class="layout-base">
      <router-view></router-view>
    </v-main>
    <div id="controller" class="audio-play-controller analyser">
      <AudioController ></AudioController>
    </div>
  </v-app>
</template>
<script>
import AudioController from '../footer/AudioController.vue';
import Header from './header/Header.vue';
import colorThema from '../../thema';
  
export default {
  name: 'App',
  components:{
    AudioController,
    Header
  },
  data () {
    return {
      style: {
        '--background-color': '#eee'
      }
    }
  },

  mounted() {
    this.style['--background-color'] = colorThema.backgrouund;
  },
}
</script>
<style lang="scss">

</style>