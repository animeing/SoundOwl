<template>
    <div>
        <SlideComponet
            :slide-title="'New Sounds 40'"
            :data-request="newSoundRequest"
            :context-menu="soundContext"
            :item-click="newSoundClipClick" />
        <SlideComponet
            :slide-title="'Sound Top 20'"
            :data-request="soundCountRequest"
            :context-menu="soundContext"
            :item-click="soundClipClick" />
        <SlideComponet
            :slide-title="'Album Top 20'"
            :data-request="albumCountRequest"
            :item-click="albumClipClick" />
    </div>
</template>
<script>
import { BaseFrameWork, ContextMenu } from '../../base';
import audio from '../../audio/AudioPlayer';
import { AudioPlayStateEnum } from '../../audio/enum/AudioPlayStateEnum';
import { AudioClip } from '../../audio/type/AudioClip';
import { AlbumCountAction, SoundAddTimeListAction } from '../../page';
import SlideComponet from './parts/SlideComponet.vue';
import { PlayCountAction } from '../../api/PlayCountAction';

export default {
  name:'HomeVue',
  components:{
    SlideComponet
  },
  data() {
    return {
      soundClips:[],
      albumData:[],
      newSoundClips:[],
      isLoad:false
    };
  },
  methods:{
    newSoundRequest() {
      if(this.newSoundClips.length == 0) {
        let newSoundAction = new SoundAddTimeListAction();
        let listNo = 0;
        newSoundAction.httpRequestor.addEventListener('success', event=>{
          for (const response of event.detail.response) {
            let audioClip = new AudioClip();
            audioClip.soundHash = response['sound_hash'];
            audioClip.title = response['title'];
            audioClip.artist = response['artist_name'];
            audioClip.album = response['album']['album_title'];
            audioClip.albumKey = response['album']['album_hash'];
            audioClip.no = listNo;
            listNo++;
            this.newSoundClips.push(audioClip);
          }
        });
        newSoundAction.execute();
        return this.newSoundClips;
      } else {
        return this.newSoundClips;
      }
    },
    soundCountRequest(){
      if(!this.isLoad) {
        let playCountAction = new PlayCountAction();
        this.isLoad = true;
        let listNo = 0;
        playCountAction.execute().then(data=>{
          for (const response of data.data) {
            let audioClip = new AudioClip();
            audioClip.soundHash = response['sound_hash'];
            audioClip.title = response['title'];
            audioClip.artist = response['artist_name'];
            audioClip.album = response['album']['album_title'];
            audioClip.albumKey = response['album']['album_hash'];
            audioClip.no = listNo;
            listNo++;
            this.soundClips.push(audioClip);
          }
        });
        return this.soundClips;
      } else {
        return this.soundClips;
      }
    },
    albumCountRequest(){
      if(this.albumData.length == 0) {
        let albumCountAction = new AlbumCountAction;
        albumCountAction.httpRequestor.addEventListener('success', event=>{
          for (const response of event.detail.response) {
            this.albumData.push(response);
          }
        });
        albumCountAction.execute();
        return this.albumData;
      } else {
        return this.albumData;
      }
    },
    newSoundClipClick(soundClip) {
      if(ContextMenu.isVisible){
        return;
      }
      audio.playList.removeAll();
      for(const audioclip of this.newSoundClips) {
        audio.playList.add(audioclip);
      }
      if(audio.currentAudioClip == null){
        audio.play(soundClip);
        return;
      }            
      if(soundClip.equals(audio.currentAudioClip)){
        if(audio.currentPlayState === AudioPlayStateEnum.PAUSE || audio.currentPlayState === AudioPlayStateEnum.STOP ){
          audio.play();
        } else {
          if(audio.currentPlayState === AudioPlayStateEnum.PLAY || audio.currentPlayState !== AudioPlayStateEnum.STOP ){
            audio.pause();
          }
        }
        return;
      } else {
        audio.play(soundClip);
      }
    },
    soundClipClick(soundClip){
      if(ContextMenu.isVisible){
        return;
      }
      audio.playList.removeAll();
      for(const audioclip of this.soundClips) {
        audio.playList.add(audioclip);
      }
      if(audio.currentAudioClip == null){
        audio.play(soundClip);
        return;
      }            
      if(soundClip.equals(audio.currentAudioClip)){
        if(audio.currentPlayState === AudioPlayStateEnum.PAUSE || audio.currentPlayState === AudioPlayStateEnum.STOP ){
          audio.play();
        } else {
          if(audio.currentPlayState === AudioPlayStateEnum.PLAY || audio.currentPlayState !== AudioPlayStateEnum.STOP ){
            audio.pause();
          }
        }
        return;
      } else {
        audio.play(soundClip);
      }
    },
    soundContext:(soundClip)=>{
      let addNextSound = BaseFrameWork.createCustomElement('sw-libutton');
      addNextSound.menuItem.onclick=()=>{
        if(audio.currentAudioClip == undefined) {
          audio.playList.add(soundClip, 0);
          return;
        }
        let appendPosition = audio.playList.equalFindIndex(audio.currentAudioClip);
        audio.playList.add(soundClip, appendPosition+1);
      };
      addNextSound.menuItem.value = 'Add to playlist';
      ContextMenu.contextMenu.appendChild(addNextSound);
    },
    albumClipClick(albumClip) {
      if(ContextMenu.isVisible){
        return;
      }
      this.$router.push({name:'album', query: {AlbumHash: albumClip.albumKey}});
    }
  },
};
</script>