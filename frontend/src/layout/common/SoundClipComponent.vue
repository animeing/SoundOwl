<template>
    <div>
        <div class="album">
            <img
                loading="lazy"
                :src="createImageSrc(soundClip.albumKey)">
        </div>
        <div class="layout-box">
            <p
                class="audio-title"
                :data-hint="soundClip.title">
                {{ soundClip.title }}
            </p>
            <p class="audio-uploader">
                <router-link
                    :to=" {name:'artist', query:{ArtistHash: soundClip.artistKey}}"
                    class="audio-infomation"
                    :data-hint="soundClip.artist"
                    @click.stop
                >{{ soundClip.artist }}</router-link>
            </p>
            <router-link
                :to="{name:'album', query: {AlbumHash: soundClip.albumKey}}"
                v-show="hasAlbumData"
                class="audio-infomation audio-discription"
                :data-hint="soundClip.album"
                @click.stop
            >{{ soundClip.album }}</router-link>
        </div>
    </div>
</template>
<script>
import { AudioClip } from '../../audio/type/AudioClip';
import { ContextMenu } from '../../base';
import {BASE} from '../../utilization/path';


export default {
  name:'SoundClipComponent',
  props:{
    'soundClip':{
      type:AudioClip,
      require: true,
      default(){
        return new AudioClip;
      }
    }
  },
  data() {
    return {
      hasAlbumData:true
    };
  },
  mounted() {
    this.hasAlbumData = this.soundClip.albumKey != undefined && this.soundClip.albumKey != '';
  },
  methods:{
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
    }
  }
};
</script>

