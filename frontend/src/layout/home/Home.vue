<template>
    <div>
        <SlideComponet
            :slide-title="'New Sounds 100'"
            :data-request="newSoundRequest"
            :context-menu="soundContext"
            :item-click="newSoundClipClick" />
        <SlideComponet
            :slide-title="'Sound Top 100'"
            :data-request="soundCountRequest"
            :context-menu="soundContext"
            :item-click="soundClipClick" />
        <SlideComponet
            :slide-title="'Album Top 100'"
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
            audioClip.artistKey = response['artist_id'];
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
            audioClip.artistKey = response['artist_id'];
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
      let audioBeforeClip = audio.currentAudioClip;
      if(!audio.playList.isSamePlaylist(this.newSoundClips)) {
        audio.playList.updatePlaylist(this.newSoundClips);
      }
      if(audioBeforeClip == null) {
        audio.play(soundClip);
        return;
      }
      if(audioBeforeClip.equals(soundClip)){
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
      let audioBeforeClip = audio.currentAudioClip;
      if(!audio.playList.isSamePlaylist(this.soundClips)) {
        audio.playList.updatePlaylist(this.soundClips);
      }
      if(audioBeforeClip == null) {
        audio.play(soundClip);
        return;
      }
      if(audioBeforeClip.equals(soundClip)){
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
          audio.playList.insertAudioClip(soundClip, 0);
          return;
        }
        audio.playList.appendAudioClipNext(soundClip);
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