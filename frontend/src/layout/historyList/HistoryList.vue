<template>
  <div class="history-list">
      <button
          v-for="(item, index) in historyClips"
          :key="index"
          :class="historyItemClass(item)"
          @click.right.prevent="historyContext(item)"
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
import { SoundOwlProperty } from '../../websocket';
import { UpdateSoundInfomationAction } from '../../page';
import SoundClipComponent from '../common/SoundClipComponent.vue';
import LoadingListComponent from '../common/LoadingListComponent.vue';
import { HistoryDataListAction } from '../../api/HistoryDataListAction';

export default {
  name: 'HistoryList',
  components: {
    SoundClipComponent,
    LoadingListComponent
  },
  beforeRouteLeave(_to, _from, next) {
    window.removeEventListener('bottom', this.bottomEvent);
    next();
  },
  data() {
    return {
      historyClips: [],
      currentPlaySoundClip: audio.currentAudioClip,
      start: 0,
      isMoreLoad: true,
      isLoading: false
    };
  },
  mounted() {
    window.addEventListener('bottom', this.bottomEvent);
    this.start = this.historyClips.length;
    if (this.historyClips.length == 0) {
      this.requestData();
    }
  },
  methods: {
    async requestData() {
      return await new Promise((resolve, reject) => {
        if (this.isMoreLoad) {
          this.isMoreLoad = false;
        } else {
          reject();
          return;
        }
        if (!this.isLoading) {
          this.isLoading = true;
        } else {
          reject();
          return;
        }
        let historyAction = new HistoryDataListAction();
        historyAction.execute({ start: this.start, end: 50 }).then(event => {
          if (Array.isArray(event.data)) {
            for (const response of event.data) {
              this.isMoreLoad = true;
              let audioClip = new AudioClip();
              audioClip.soundHash = response['sound_hash'];
              audioClip.title = response['title'];
              audioClip.artist = response['artist_name'];
              audioClip.album = response['album_title'];
              audioClip.albumKey = response['album_hash'];
              audioClip.artistKey = response['artist_id'];
              audioClip.no = this.start;
              this.start++;
              this.historyClips = [...this.historyClips, audioClip];
            }
          }
          resolve();
        }).catch(() => {
          this.isLoading = false;
          reject();
        });
      }).then(() => {
        this.isLoading = false;
      }).catch(() => {
        //ignore
      });
    },
    click(soundClip) {
      if (ContextMenu.isVisible) {
        return;
      }
      let audioBeforeClip = audio.currentAudioClip;
      if (!audio.playList.isSamePlaylist(this.historyClips)) {
        audio.playList.updatePlaylist(this.historyClips);
      }
      if (audioBeforeClip == null) {
        audio.play(soundClip);
        return;
      }
      if (audioBeforeClip.equals(soundClip)) {
        if (audio.currentPlayState === AudioPlayStateEnum.PAUSE || audio.currentPlayState === AudioPlayStateEnum.STOP) {
          audio.play();
        } else {
          if (audio.currentPlayState === AudioPlayStateEnum.PLAY || audio.currentPlayState !== AudioPlayStateEnum.STOP) {
            audio.pause();
          }
        }
        return;
      } else {
        audio.play(soundClip);
      }
    },
    historyContext(soundClip) {
      ContextMenu.contextMenu.destoryChildren();
      {
        let addNextSound = BaseFrameWork.createCustomElement('sw-libutton');
        addNextSound.menuItem.onclick = () => {
          if (audio.currentAudioClip == undefined) {
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
        updateSoundData.menuItem.onclick = () => {
          {
            let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
            wsSendMessage.message = {
              'soundHash': soundClip.soundHash
            };
            SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
          }
          let updateSoundinfoAction = new UpdateSoundInfomationAction;
          updateSoundinfoAction.formDataMap.append('soundhash', soundClip.soundHash);
          updateSoundinfoAction.httpRequestor.addEventListener('success', () => {
            let messageWindow = new MessageWindow;
            messageWindow.value = `Updated sound infomation ${soundClip.artist} - ${soundClip.title}`;
            messageWindow.open();
            messageWindow.close(1000);
          });
          updateSoundinfoAction.execute();
          {
            let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
            wsSendMessage.message = {
              'lock': soundClip.soundHash
            };
            SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
          }
        };
        updateSoundData.menuItem.value = 'Information update';
        ContextMenu.contextMenu.appendChild(updateSoundData);
      }
    },
    historyItemClass(soundClip) {
      if (this.currentPlaySoundClip == null) {
        return 'audio-item';
      }
      return 'audio-item' + (this.currentPlaySoundClip.equals(soundClip) ? ' audio-list-nowplaying' : '');
    },
    bottomEvent() {
      this.requestData();
    }
  }
};
</script>
