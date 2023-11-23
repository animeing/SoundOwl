<template>
    <div class="audio-list">
        <button
            v-for="(item,index) in albumClips"
            :key="index"
            class="audio-item"
            @click="click(item)">
            <AlbumClipComponent :album-clip="item" />
        </button>
        <LoadingListComponent v-show="isLoading" />
    </div>
</template>
<script>
import AlbumClipComponent from './parts/AlbumClipComponent.vue';
import LoadingListComponent from '../common/LoadingListComponent.vue';
import { BaseFrameWork, ContextMenu } from '../../base';
import { AlbumListAction } from '../../page';
import audio from '../../audio/AudioPlayer';

export default {
  name:'AlbumList',
  components:{
    AlbumClipComponent,
    LoadingListComponent
  },
  beforeRouteLeave(to, from, next)  {
    window.removeEventListener('bottom', this.bottomEvent);
    next();
  },
  data() {
    return {
      albumClips: [],
      currentPlaySoundClip:audio.currentAudioClip,
      start:0,
      isMoreLoad:true,
      isLoading:false
    };
  },
  cpmputed: {
    getAlbumClips(){
      return this.albumClips;
    }
  },
  mounted() {
    this.albumClips=(()=>{
      let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
      let albumClipsCache = cache.get('albumList');
      if(albumClipsCache == null) {
        return [];
      }
      return JSON.parse(albumClipsCache);
    })();
    this.start = this.albumClips.length;
    window.addEventListener('bottom', this.bottomEvent);
    if(this.albumClips.length == 0){
      this.requestData();
    }
  },
  methods:{
    async requestData(){
      return await new Promise((resolve, reject)=>{
        if(this.isMoreLoad){
          if(!this.isLoading){
            this.isLoading = true;
          } else {
            reject();
            return;
          }
          this.isMoreLoad = false;
          let albumAction = new AlbumListAction;
          albumAction.httpRequestor.addEventListener('success', event=>{
            for (const response of event.detail.response) {
              this.isMoreLoad = true;
              this.albumClips.push(response);
              this.start++;
            }
            resolve();
          });
          albumAction.httpRequestor.addEventListener('error', ()=>{
            this.isLoading = false;
            reject();
            return;
          });
          albumAction.formDataMap.set('start', this.start);
          albumAction.formDataMap.set('end', 50);
          albumAction.execute();
        } else {
          reject();
          return;
        }
      }).then(()=>{
        let albumClipsCache = JSON.stringify(this.albumClips);
        let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
        cache.set('albumList', albumClipsCache);
        this.isLoading = false;
      }).catch(()=>{
        //ignore
      });
    },
    click(albumClip) {
      if(ContextMenu.isVisible){
        return;
      }
      this.$router.push({name:'album', query: {AlbumHash: albumClip.album_key}});
    },
    bottomEvent() {
      this.requestData();
    }
  }
};
</script>


