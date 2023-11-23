<template>
    <div>
        <div class="album">
            <img
                loading="lazy"
                :src="createImageSrc(albumClip.album_key)">
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
