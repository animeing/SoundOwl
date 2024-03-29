<template>
    <div class="audio-list">
        <button
            v-for="(item, index) in requestData()"
            :key="index"
            :class="audioItemClass(item)"
            @click.right.prevent="soundContext(item)"
            @click="click(item)">
            <SoundClipComponent :sound-clip="item" />
        </button>
        <LoadingListComponent v-show="isLoading" />
    </div>
</template>
<script>
import audio from '../../audio/AudioPlayer';
import { AudioPlayStateEnum } from '../../audio/enum/AudioPlayStateEnum';
import { AudioClip } from '../../audio/type/AudioClip';
import { BaseFrameWork, ContextMenu, MessageWindow } from '../../base';
import { SoundOwlProperty } from '../../layout';
import { AlbumSoundListAction, UpdateSoundInfomationAction } from '../../page';
import LoadingListComponent from '../common/LoadingListComponent.vue';
import SoundClipComponent from '../common/SoundClipComponent.vue';


export default {
  name:'AlbumSoundList',
  components:{
    SoundClipComponent,
    LoadingListComponent
  },
  data() {
    return {
      soundClips:[],
      currentPlaySoundClip:audio.currentAudioClip,
      albumHash:null,
      isLoading:false,
      isLoad:false
    };
  },
  watch: {
    $route(to, from) {
      if(to.query.AlbumHash != from.query.AlbumHash){
        this.soundClips.splice(0);
        this.isLoad = false;
      }
    }
  },
  created(){
    audio.eventSupport.addEventListener('audioSet',()=>{
      this.currentPlaySoundClip = audio.currentAudioClip;
    });
  },
  methods:{
    soundContext:(soundClip)=>{
      ContextMenu.contextMenu.destoryChildren();
      {
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
      }
      {
        let updateSoundData = BaseFrameWork.createCustomElement('sw-libutton');
        updateSoundData.menuItem.onclick=()=>{
          {
            let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
            wsSendMessage.message = {
              'soundHash':soundClip.soundHash
            };
            SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
          }
          let updateSoundinfoAction = new UpdateSoundInfomationAction;
          updateSoundinfoAction.formDataMap.append('soundhash', soundClip.soundHash);
          updateSoundinfoAction.httpRequestor.addEventListener('success', ()=>{
            let messageWindow = new MessageWindow;
            messageWindow.value = `Updated sound infomation ${soundClip.artist} - ${soundClip.title}`;
            messageWindow.open();
            messageWindow.close(1000);
          });
          updateSoundinfoAction.execute();
          {
            let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
            wsSendMessage.message = {
              'lock':soundClip.soundHash
            };
            SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
          }
        };
        updateSoundData.menuItem.value = 'Information update';
        ContextMenu.contextMenu.appendChild(updateSoundData);
      }
    },
    requestData(){
      if(!this.isLoad) {
        this.isLoading = true;
        this.isLoad = true;
        let soundSearch = new AlbumSoundListAction();

        soundSearch.formDataMap.append('AlbumHash', this.$route.query.AlbumHash);
        let listNo = 0;
        soundSearch.httpRequestor.addEventListener('success', event=>{
          for (const response of event.detail.response) {
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
          this.isLoading = false;
        });
        soundSearch.execute();
        return this.soundClips;
      } else {
        return this.soundClips;
      }
    },
    click(soundClip){
      if(ContextMenu.isVisible){
        return;
      }
      let audioBeforeClip = audio.currentAudioClip;
      if(!audio.playList.isSamePlaylist(this.soundClips)){
        audio.playList.updatePlaylist(this.soundClips);
      }
      if(audio.currentAudioClip == null){
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
    audioItemClass(soundClip) {
      if(this.currentPlaySoundClip == null){
        return 'audio-item';
      }
      return 'audio-item'+(this.currentPlaySoundClip.equals(soundClip)?' audio-list-nowplaying':'');
    }
  }
};
</script>