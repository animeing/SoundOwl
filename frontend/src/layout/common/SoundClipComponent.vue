<template>
    <div>
        <div class="album">
            <img loading='lazy' :src="createImageSrc(soundClip.albumKey)">
        </div>
        <div class='layout-box'>
            <p class='audio-title' :data-hint='soundClip.title'>{{soundClip.title}}</p>
            <p class='audio-uploader'>
                <span class='audio-infomation' :data-hint='soundClip.artist'>{{soundClip.artist}}</span>
            </p>
            <a v-show='hasAlbumData' class='audio-infomation audio-discription' v-on:click.stop.prevent.capture='albumClipClick()' :data-hint='soundClip.album'>{{soundClip.album}}</a>
        </div>
    </div>
</template>
<script>
import { AudioClip } from '../../audio/type/audioClip'
import {BASE} from "../../utilization/path"


export default {
    name:'SoundClipComponent',
    props:{
        'soundClip':{
            type:AudioClip
        }
    },
    data() {
        return {
            hasAlbumData:true
        }
    },
    methods:{
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        },

        albumClipClick() {
            if(ContextMenu.isVisible){
                return;
            }
            router.push({name:'album', query: {AlbumHash: this.soundClip.albumKey}});
        }
    },
    mounted() {
        this.hasAlbumData = this.soundClip.albumKey != undefined && this.soundClip.albumKey != '';
    }
}
</script>

