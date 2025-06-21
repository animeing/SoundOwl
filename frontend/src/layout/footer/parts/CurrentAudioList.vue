<template>
    <sw-resize
        :class="audioFrameClass()"
        :style="{maxWidth: (currentAudioListWidth+'%')}"
        resize-direction="top-left">
      <ContextMenu
          :items="menuData"
          @select="contextMenuSelection">
        <span class="menu-icon-frame">
            <button class="menu-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="29" height="24" viewBox="0 0 29 24">
                    <path fill="currentColor" d="M1.334 2.666h26.665l.037.001a1.334 1.334 0 1 0 0-2.668L27.997 0h.002H1.334a1.334 1.334 0 0 0-.002 2.666h.002zm26.665 2.667H1.334a1.334 1.334 0 0 0-.002 2.666h26.667l.037.001a1.334 1.334 0 1 0 0-2.668l-.039.001zm0 5.334H1.334a1.334 1.334 0 0 0-.002 2.666h26.667a1.334 1.334 0 0 0 .002-2.666zm0 10.666H1.334a1.334 1.334 0 0 0-.002 2.666h26.667a1.334 1.334 0 0 0 .002-2.666zm0-5.333H1.334a1.334 1.334 0 0 0-.002 2.666h26.667A1.334 1.334 0 0 0 28.001 16z" />
                </svg>
            </button>
        </span>
      </ContextMenu>
        <button @click="savePlaylistData" class="play-list-title">Play List</button>
        <div id="current-audio-list" :class="audioListClass()" style="overflow-y: scroll;">
          <ContextMenu
              v-for="(item, index) in soundClips"
              :key="index"
              :items="soundMenuData"
              @select="(select) => soundContextMenuSelection(select, item)">
            <button
                drag-item
                :class="audioItemClass(item)"
                class="draggable-item"
                @click="click(item)"
                :ref="el => setItemRef(el, item)">
                  <SoundClipComponent :sound-clip="item" :album-height="albumHeight" :album-width="albumWidth" />
            </button>
          </ContextMenu>
        </div>
    </sw-resize>
</template>
<script>
import { reactive } from 'vue';
import { AudioClip } from '../../../audio/type/AudioClip';
import audio from '../../../audio/AudioPlayer';
import SoundClipComponent from '../../common/SoundClipComponent.vue';
import ContextMenu from '../../common/ContextMenu.vue';

export default {
  name: 'CurrentAudioList',
  components: { SoundClipComponent, ContextMenu },
  props: { isView: { type: Boolean } },
  data() {
    return {
      soundClips: [],
      currentPlaySoundClip: audio.currentAudioClip || new AudioClip(),
      itemRefs: reactive({}),
      menuData: [
        { label: 'Clear playlist', action: () => audio.playList.clearPlaylist() },
        { label: 'Save playlist', action: this.savePlaylistData }
      ],
      albumWidth: window.matchMedia('(max-width: 600px)').matches ? 54 : 108,
      albumHeight: window.matchMedia('(max-width: 600px)').matches ? 57.5 : 115,
      currentAudioListWidth: window.matchMedia('(max-width: 600px)').matches ? 100 : 50,
      soundMenuData: [
        { label: 'Remove', action: (item) => audio.playList.removeClip(item) }
      ],
      isAudioListVisible: false // プレイリストの表示状態を管理
    };
  },
  created() {
    audio.eventSupport.addEventListener('audioSet', this.playChange);
    audio.playList.addEventListener('change', this.playlistUpdate);
    this.playlistUpdate();
  },
  mounted() {
    this.scrollToCurrentPlaying();
  },
  beforeDestroy() {
    audio.eventSupport.removeEventListener('audioSet', this.playChange);
    audio.playList.removeEventListener('change', this.playlistUpdate);
  },
  methods: {
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
    click(soundClip) {
      if (!soundClip) return; // soundClip が未定義の場合は何もしない
      if (audio.currentAudioClip?.equals(soundClip)) {
        // 再生中なら一時停止、停止中なら再生
        audio.currentPlayState === 'PLAY' ? audio.pause() : audio.play();
      } else {
        audio.play(soundClip);
      }
    },
    audioItemClass(soundClip) {
      return `audio-item${this.currentPlaySoundClip?.equals(soundClip) ? ' audio-list-nowplaying highlighted' : ''}`;
    },
    audioFrameClass() {
      return `audio-controller-playlist${this.isView ? '' : ' height-hide'}`;
    },
    audioListClass() {
      return `audio-list audio-list-frame${this.isView ? '' : ' height-hide'}`;
    },
    playlistUpdate() {
      this.soundClips = [...audio.playList];
      this.scrollToCurrentPlaying();
    },
    playChange() {
      this.currentPlaySoundClip = audio.currentAudioClip || new AudioClip();
      this.scrollToCurrentPlaying();
    },
    setItemRef(el, item) {
      if (el) this.itemRefs[item.soundHash] = el;
      else delete this.itemRefs[item.soundHash];
    },
    scrollToCurrentPlaying() {
      if (!this.isView) return; // プレイリストが閉じている場合は何もしない
      this.$nextTick(() => {
        if (!this.currentPlaySoundClip?.soundHash) return; // currentPlaySoundClip が未定義の場合は何もしない
        const currentPlayingElement = this.itemRefs[this.currentPlaySoundClip.soundHash];
        currentPlayingElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }
};
</script>
<style scoped>
.audio-list-nowplaying {
  background-color: var(--highlight-color, #ffeb3b);
  transition: background-color 0.3s ease;
}
.highlighted {
  border: 2px solid var(--highlight-border-color, #ff9800);
  border-radius: 4px;
}
</style>