<template>
    <div class="audio-list">
        <button
            v-for="(item,index) in soundClips"
            :key="index"
            :class="audioItemClass(item)"
            @click.right.prevent="soundContext(item)"
            @click="click(item)">
            <SoundClipComponent :sound-clip="item" />
        </button>
    </div>
</template>
<script>
import audio from '../../audio/AudioPlayer';
import { AudioPlayStateEnum } from '../../audio/enum/AudioPlayStateEnum';
import { AudioClip } from '../../audio/type/AudioClip';
import { BaseFrameWork, ContextMenu, MessageWindow } from '../../base';
import { SoundOwlProperty } from '../../layout';
import { UpdateSoundInfomationAction } from '../../page';
import { BASE } from '../../utilization/path';
import SoundClipComponent from '../common/SoundClipComponent.vue';

export default {
  name:'PlaylistSoundList',
  components:{
    SoundClipComponent
  },
  
  data() {
    return {soundClips:[], currentPlaySoundClip:audio.currentAudioClip};
  },
  mounted(){
    let action = new class extends BaseFrameWork.Network.RequestServerBase {
      constructor() {
        super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
      }
    };
    action.formDataMap.append('method', 'sounds');
    action.formDataMap.append('name', this.$route.query.list);
    action.httpRequestor.addEventListener('success', event=>{
      this.soundClips.splice(0);
      let listNo = 0;
      for (const response of event.detail.response) {
        let audioClip = new AudioClip();
        audioClip.soundHash = response['sound_hash'];
        audioClip.title = response['title'];
        audioClip.artist = response['artist_name'];
        audioClip.album = response['album_title'];
        audioClip.albumKey = response['album_hash'];
        audioClip.no = listNo;
        listNo++;
        this.soundClips.push(audioClip);
      }
    });
    action.execute();
  },
  methods:{
    soundContext:(soundClip)=>{
      ContextMenu.contextMenu.destoryChildren();
      {
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
    click(soundClip){
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
    audioItemClass(soundClip) {
      if(this.currentPlaySoundClip == null){
        return 'audio-item';
      }
      return 'audio-item'+(this.currentPlaySoundClip.equals(soundClip)?' audio-list-nowplaying':'');
    }
  }
};
</script>