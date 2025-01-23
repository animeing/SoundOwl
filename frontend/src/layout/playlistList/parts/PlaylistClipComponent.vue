<template>
    <div>
        <div class="album">
            <v-img
                loading="lazy"
                aspect-ratio="1"
                width=199
                height=170
                :src="createImageSrc(playlist.play_list)">
                <template v-slot:placeholder>
                  <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular
                      color="grey-lighten-4"
                      indeterminate
                    ></v-progress-circular>
                  </div>
                </template>
            </v-img>
        </div>
        <div class="layout-box">
            <p
                class="audio-title"
                :data-hint="playlist.play_list">
                {{ playlist.play_list }}
            </p>
            <p class="audio-uploader">
                <span
                    class="audio-infomation"
                    :data-hint="playlist.sound_point">{{ playlist.sound_point }} sounds</span>
            </p>
        </div>
    </div>
</template>
<script>
import {BASE} from '../../../utilization/path';

export default {
  name:'PlaylistClipComponent',
  props:{
    playlist:{
      type: Object,
      require: true
    }
  },
  methods:{
    createImageSrc(playlistName) {
      return `${BASE.HOME}img/playlist_art.php?playlist=${playlistName}`;
    }
  }
};
</script>
<style scoped>
.album {
  border: 1px solid var(--itemfcbgcolor);
  display: inline;
  width: 199px;
}
</style>
