<template>  
    <div>
        <div class="album">
            <v-img
                loading="lazy"
                aspect-ratio="1"
                :width="albumWidth"
                :height="albumHeight"
                :src="createImageSrc(artistClip.album.album_key)">
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
                :data-hint="artistClip.artist_name">
                {{ artistClip.artist_name }}
            </p>
        </div>
    </div>
</template>
<script>
import { BASE } from '../../../utilization/path';

const isMobile = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 600px)').matches;

export default {
  name: 'ArtistClipComponent',
  props:{
    'artistClip': {},
    albumHeight: {
      type: Number,
      default: () => (isMobile() ? 85 : 170),
    },
    albumWidth: {
      type: Number,
      default: () => (isMobile() ? 99 : 199),
    },
  },
  methods:{
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
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
@media (max-width: 600px) {
  .album {
    width: 99px;
  }
}
</style>
