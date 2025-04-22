<template>
    <sw-resize
        :class="audioFrameClass()"
        resize-direction="top-left">
      <ContextMenu
          :items="menuData"
          @select="contextMenuSelection">
        <span class="menu-icon-frame">
            <button
                class="menu-icon">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="29"
                    height="24"
                    viewBox="0 0 29 24"><path
                        fill="currentColor"
                        d="M1.334 2.666h26.665l.037.001a1.334 1.334 0 1 0 0-2.668L27.997 0h.002H1.334a1.334 1.334 0 0 0-.002 2.666h.002zm26.665 2.667H1.334a1.334 1.334 0 0 0-.002 2.666h26.667l.037.001a1.334 1.334 0 1 0 0-2.668l-.039.001zm0 5.334H1.334a1.334 1.334 0 0 0-.002 2.666h26.667a1.334 1.334 0 0 0 .002-2.666zm0 10.666H1.334a1.334 1.334 0 0 0-.002 2.666h26.667a1.334 1.334 0 0 0 .002-2.666zm0-5.333H1.334a1.334 1.334 0 0 0-.002 2.666h26.667A1.334 1.334 0 0 0 28.001 16z" /></svg>
            </button>
        </span>
      </ContextMenu>
        <button
          @click="savePlaylistData"
            class="play-list-title">
            Play List
        </button>
        <div
            id="current-audio-list"
            :class="audioListClass()"
            style="overflow-y: scroll;">
          <ContextMenu
              v-for="(item, index) in soundClips"
              :items="soundMenuData"
              @select="(select)=>{soundContextMenuSelection(select, item)}">
            <button
                :key="index"
                drag-item
                :class="audioItemClass(item)"
                class="draggable-item"
                @click="click(item)">
                  <SoundClipComponent :sound-clip="item" :album-height="albumHeight" :album-width="albumWidth" />
                
            </button>
          </ContextMenu>
        </div>
    </sw-resize>
</template>
<script>
import {BaseFrameWork} from '../../../base';
import {AudioPlayStateEnum} from '../../../audio/enum/AudioPlayStateEnum';
import audio from '../../../audio/AudioPlayer';
import { AudioClip } from '../../../audio/type/AudioClip';
import SoundClipComponent from '../../common/SoundClipComponent.vue';
import { BASE } from '../../../utilization/path';
import ContextMenu from '../../common/ContextMenu.vue';

const isMobile = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 600px)').matches;

export default {
  name:'CurrentAudioList',
  components:{
    SoundClipComponent,
    ContextMenu
  },
    
  beforeRouteLeave(_to, _from, next)  {
    audio.eventSupport.removeEventListener('audioSet', this.playChange);
    audio.playList.removeEventListener('change', this.playlistUpdate);
    next();
  },
  props:{
    'isView':{
      type:Boolean
    }
  },
  data() {
    return {
      soundClips:[],
      currentPlaySoundClip:new AudioClip,
      menuData:[
        {label:'Clear playlist', action:()=>{audio.playList.clearPlaylist();}},
        {label:'Save playlist', action:()=>{this.savePlaylistData();}},
      ],
      albumWidth: (isMobile() ? 54 : 108),
      albumHeight: (isMobile() ? 57.5 : 115),
      soundMenuData:[
        {label:'Remove', action:(item)=>{audio.playList.removeClip(item);}}
      ]
    };
  },
  created(){
    audio.eventSupport.addEventListener('audioSet', this.playChange);
    audio.playList.addEventListener('change', this.playlistUpdate);
    this.playlistUpdate();
  },
  mounted() {
    let observer = new MutationObserver(()=>{
      let audioElement = document.querySelector('.audio-controller-playlist .audio-list-nowplaying');
      if(audioElement){
        // document.getElementById('current-audio-list').scroll({top: audioElement.offsetTop-42});
      }
    });
    observer.observe(this.$el, {childList:true,attributes:true,subtree: true});
  },
  methods:{
    contextMenuSelection(select) {
      select.action();
    },
    soundContextMenuSelection(select, item) {
      select.action(item);
    },
    savePlaylistData() {
      let messageWindow = document.createElement('sw-save-message');
      messageWindow.value = 'Do you want to save the playlist?\nPlease enter the playlist name.';

      messageWindow.addItem('OK',()=>{
        messageWindow.close();
        let playlistName = messageWindow.inputText.value;
        let action = new class extends BaseFrameWork.Network.RequestServerBase {
          constructor() {
            super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
          }
        };
        action.formDataMap.append('method', 'create');
        action.formDataMap.append('playlist_name', playlistName);
        for (const soundClip of this.soundClips) {
          action.formDataMap.append('sounds[]', soundClip.soundHash);
        }
        action.httpRequestor.addEventListener('success', event=>{
          let message = document.createElement('sw-message-button');
          message.addItem('OK', ()=>{
            message.close();
          });
          message.value = event.detail.response.detail;
          if(event.detail.response.status == 'success'){
            message.close(6000);
          }
        });
        action.httpRequestor.addEventListener('error', ()=>{
          let message = document.createElement('sw-message-button');
          message.addItem('OK', ()=>{
            message.close();
          });
          message.value = `Action error ${action.httpRequestor.status}`;
          message.open();
        });
        action.execute();
      });
      messageWindow.addItem('CANCEL',()=>{
        messageWindow.close();
      });
      messageWindow.open();
    },
    contextmenu(event = undefined){
      ContextMenu.contextMenu.destoryChildren();
      if(event !== undefined && ContextMenu.isVisible) {
        ContextMenu.remove();
        return;
      }
      {
        let clearPlaylist = BaseFrameWork.createCustomElement('sw-libutton');
        clearPlaylist.menuItem.onclick=()=>{
          audio.playList.clearPlaylist();
        };
        clearPlaylist.menuItem.value = 'Clear playlist';
        ContextMenu.contextMenu.appendChild(clearPlaylist);
      }
      {
        let savePlaylist = BaseFrameWork.createCustomElement('sw-libutton');
        savePlaylist.menuItem.onclick=()=>{
          let messageWindow = document.createElement('sw-save-message');
          messageWindow.value = 'Do you want to save the playlist?\nPlease enter the playlist name.';

          messageWindow.addItem('OK',()=>{
            messageWindow.close();
            let playlistName = messageWindow.inputText.value;
            let action = new class extends BaseFrameWork.Network.RequestServerBase {
              constructor() {
                super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
              }
            };
            action.formDataMap.append('method', 'create');
            action.formDataMap.append('playlist_name', playlistName);
            for (const soundClip of this.soundClips) {
              action.formDataMap.append('sounds[]', soundClip.soundHash);
            }
            action.httpRequestor.addEventListener('success', event=>{
              let message = document.createElement('sw-message-button');
              message.addItem('OK', ()=>{
                message.close();
              });
              message.value = event.detail.response.detail;
              if(event.detail.response.status == 'success'){
                message.close(6000);
              }
            });
            action.httpRequestor.addEventListener('error', ()=>{
              let message = document.createElement('sw-message-button');
              message.addItem('OK', ()=>{
                message.close();
              });
              message.value = `Action error ${action.httpRequestor.status}`;
              message.open();
            });
            action.execute();

          });
          messageWindow.addItem('CANCEL',()=>{
            messageWindow.close();
          });
          messageWindow.open();
        };
        savePlaylist.menuItem.value = 'Save playlist';
        ContextMenu.contextMenu.appendChild(savePlaylist);
      }
      if(event !== undefined) {
        ContextMenu.visible(event);
      }
    },
    click(soundClip){
      if(ContextMenu.isVisible){
        return;
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
    contextMenu(soundClip) {
      ContextMenu.contextMenu.destoryChildren();
      let remove = BaseFrameWork.createCustomElement('sw-libutton');
      remove.menuItem.onclick=()=>{
        for (const playListSoundClip of audio.playList) {
          if(!playListSoundClip.equals(soundClip)) {
            continue;
          }
          audio.playList.removeClip(playListSoundClip);
          break;
        }
      };
      remove.menuItem.value = 'remove';
      ContextMenu.contextMenu.appendChild(remove);
    },
    audioItemClass(soundClip) {
      if(this.currentPlaySoundClip == null){
        return 'audio-item';
      }
      return 'audio-item'+(this.currentPlaySoundClip.equals(soundClip)?' audio-list-nowplaying':'');
    },
    audioFrameClass() {
      return 'audio-controller-playlist'+(this.isView?'':' height-hide');
    },
    audioListClass() {
      return 'audio-list audio-list-frame'+(this.isView?'':' height-hide');
    },
    playlistUpdate() {
      this.soundClips.splice(0);
      for (const soundClip of audio.playList) {
        this.soundClips.push(soundClip);
      }
    },
    playChange() {
      this.currentPlaySoundClip = audio.currentAudioClip;
    }
  }
};
</script>