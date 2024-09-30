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
                <a
                    class="audio-infomation"
                    :data-hint="soundClip.artist"
                    @click.stop.prevent.capture="artistClipClick()">{{ soundClip.artist }}</a>
            </p>
            <a
                v-show="hasAlbumData"
                class="audio-infomation audio-discription"
                :data-hint="soundClip.album"
                @click.stop.prevent.capture="albumClipClick()">{{ soundClip.album }}</a>
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
    },

    albumClipClick() {
      if(ContextMenu.isVisible){
        return;
      }
      this.$router.push({name:'album', query: {AlbumHash: this.soundClip.albumKey}});
    },
    artistClipClick() {
      if(ContextMenu.isVisible) {
        return;
      }
      this.$router.push({name:'artist', query:{ArtistHash: this.soundClip.artistKey}})
    }
  }
};
</script>

