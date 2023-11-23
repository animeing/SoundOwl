<template>
    <div class="audio-list">
        <button
            v-for="(item,index) in artistClips"
            :key="index"
            class="audio-item"
            @click="click(item)">
            <ArtistClipComponent :artist-clip="item" />
        </button>
        <LoadingListComponent v-show="isLoading" />
    </div>
</template>
<script>
import audio from '../../audio/AudioPlayer';
import { BaseFrameWork, ContextMenu } from '../../base';
import { ArtistListAction } from '../../page';
import router from '../../router';
import LoadingListComponent from '../common/LoadingListComponent.vue';
import ArtistClipComponent from './parts/ArtistClipComponent.vue';

export default {
  name:'ArtistList',
  components:{
    ArtistClipComponent,
    LoadingListComponent
  },
  beforeRouteLeave(_to, _from, next) {
    window.removeEventListener('bottom', this.bottomEvent);
    next();
  },
  
  props:{
  },
  data() {
    return {
      currentPlaySoundClip:audio.currentAudioClip,
      start: this.artistClips.length,
      isMoreLoad: true,
      isLoading:false,
      artistClips:[]
    };
  },
  cpmputed: {
    getArtistClips() {
      return this.artistClips;
    }
  },
  mounted() {
    window.addEventListener('bottom', this.bottomEvent);
    if(this.artistClips.length == 0) {
      this.requestData();
    }
    this.artistClips = (()=>{
      let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
      let artistClipsCache = cache.get('artistList');
      if(artistClipsCache == null) {
        return [];
      }
      return JSON.parse(artistClipsCache);
    })();
  },
  methods:{
    async requestData(){
      return await new Promise((resolve, reject)=>{
        if(this.isMoreLoad){
          this.isMoreLoad = false;
        } else {
          reject();
          return;
        }
        if(!this.isLoading){
          this.isLoading = true;
        } else {
          reject();
          return;
        }
        let artistAction = new ArtistListAction;
        artistAction.httpRequestor.addEventListener('success', event=>{
          for (const response of event.detail.response) {
            this.isMoreLoad = true;
            this.artistClips.push(response);
            this.start++;
          }
          resolve();
        });
        artistAction.httpRequestor.addEventListener('error', ()=>{
          this.isLoading = false;
          reject();
          return;
        });
        artistAction.formDataMap.set('start', this.start);
        artistAction.formDataMap.set('end', 50);
        artistAction.execute();
      }).then(()=>{
        let artistClipsCache = JSON.stringify(this.artistClips);
        let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
        cache.set('artistList', artistClipsCache);
        this.isLoading = false;
      }).catch(()=>{
        //ignore
      });
    },
    click(artistClip) {
      if(ContextMenu.isVisible){ 
        return;
      }
      router.push({name:'artist', query: {ArtistHash: artistClip.artist_id}});
    },
    bottomEvent() {
      this.requestData();
    }
  }

};
</script>