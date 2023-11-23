<template>  
    <div>
        <div class="album">
            <img
                loading="lazy"
                :src="createImageSrc(artistClip.album.album_key)">
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
import {BASE} from '../../../utilization/path';
export default {
  name: 'ArtistClipComponent',
  props:{
    'artistClip':{
    }
  },
  methods:{
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
    }
  }
};
</script>