<template>
    <div>
        <div class="album">
            <v-img
                loading="lazy"
                aspect-ratio="1"
                :width="199"
                :height="170"
                :src="createImageSrc(albumClip.album_key)">
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
                :data-hint="albumClip.title">
                {{ albumClip.title }}
            </p>
            <p class="audio-uploader">
                <span
                    class="audio-infomation"
                    :data-hint="albumClip.artist.artist_name">{{ albumClip.artist.artist_name }}</span>
            </p>
        </div>
    </div>    
</template>
<script>
import { BASE } from '../../../utilization/path';

export default {
  name : 'AlbumClipComponent',
  props:{
    'albumClip':{
      require: true,
    }
  },
  methods:{
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
    }
  },
};
</script>
<style scoped>
.album {
  border: 1px solid var(--itemfcbgcolor);
  display: inline;
  width: 199px;
}
</style>

