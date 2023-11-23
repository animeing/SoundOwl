<template>
    <div>
        <div class="album">
            <img
                loading="lazy"
                :src="createImageSrc(playlist.play_list)">
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