<template>
  <v-container
    style="background-color: black; color: white; padding: 16px; border-radius: 8px;"
    fluid
    justify="center"
    class="align-center"
    ref="parentContainer"
  >
    <v-row>
      <v-col cols="4" style="display: flex; align-items: center" class="footer-media">
        <!-- 左側の情報（タイトル、アーティスト、アルバム） -->
        <v-row fill-height style="min-width: calc(100% + 24px);">
          <v-col style="flex-grow: 0; padding: 2px;">
            <v-img
              :src="createImageSrc(currentPlaySoundClip.albumKey)"
              aspect-raito="1"
              width="70"
              height="66"
              class="album-image"
              lazy-src="img/placeholder-image.webp"
              >
              <template #placeholder>
                <v-skeleton-loader type="image" class="fill-height"></v-skeleton-loader>
              </template>
            </v-img>
          </v-col>
          <v-col width="100" style="overflow: hidden;">
            <v-row>
              <v-tooltip bottom>
                <template #activator="{ props }">
                  <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.title">
                    <PingPongMarquee>
                      <span>{{ currentPlaySoundClip.title }}</span>
                    </PingPongMarquee>
                  </div>
                </template>
                {{ currentPlaySoundClip.title }}
              </v-tooltip>
            </v-row>
            <v-row>
              <v-tooltip bottom>
                <template #activator="{ props }">
                  <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.artist">
                    <router-link
                      v-bind="props"
                      :to="{ name: 'artist', query: { ArtistHash: currentPlaySoundClip.artistKey } }"
                    >
                      <MarqueeText style="max-width: 100%;">
                        <span class="text-medium-emphasis sub">{{ currentPlaySoundClip.artist }}</span>
                      </MarqueeText>
                    </router-link>
                  </div>
                </template>
                {{ currentPlaySoundClip.artist }}
              </v-tooltip>
            </v-row>
            <v-row>
              <v-tooltip bottom>
                <template #activator="{ props }">
                  <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.album">
                    <router-link
                      v-bind="props"
                      :to="{ name: 'album', query: { AlbumHash: currentPlaySoundClip.albumKey } }"
                    >
                      <MarqueeText style="max-width: 100%;">
                        <span class="text-medium-emphasis sub">{{ currentPlaySoundClip.album }}</span>
                      </MarqueeText>
                    </router-link>
                  </div>
                </template>
                {{ currentPlaySoundClip.album }}
              </v-tooltip>
            </v-row>
          </v-col>
        </v-row>
      </v-col>
      <v-divider vertical class="space"></v-divider>
      <v-col cols="8" class="footer-media">
        <v-row>
          <v-col class="d-flex justify-center pa-0">
            <v-btn icon @click="beforeIconClick" data-hint="Previous">
              <v-icon>mdi-skip-previous</v-icon>
            </v-btn>
            <v-btn icon v-if="!isPlaying" @click="playPauseIconClick" data-hint="Play">
              <v-icon>mdi-play</v-icon>
            </v-btn>
            <v-btn icon v-if="isPlaying" @click="playPauseIconClick" data-hint="Pause">
              <v-icon>mdi-pause</v-icon>
            </v-btn>
            <v-btn icon @click="nextIconClick" data-hint="Next">
              <v-icon>mdi-skip-next</v-icon>
            </v-btn>
          </v-col>
          <v-col class="d-flex justify-end pa-0">
            <v-btn icon @click="toggleAudioList">
              <v-icon>mdi-playlist-music</v-icon>
            </v-btn>
            <v-menu v-model="volumeMenu" offset-y :close-on-content-click="false">
              <template #activator="{ props }">
                <v-btn icon v-bind="props">
                  <v-icon>mdi-volume-high</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-text>
                  <v-slider
                    direction="vertical"
                    height="150"
                    v-model="volume"
                    :max="1"
                    :min="0"
                    :step="0.01"
                    @update:model-value="onVolumeChanged"
                  />
                </v-card-text>
              </v-card>
            </v-menu>
            <!-- 全画面オーバーレイを表示するボタン -->
            <v-btn icon @click="toggleFullScreenOverlay">
              <v-icon>
                {{ isFullScreenOverlay ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}
              </v-icon>
            </v-btn>
          </v-col>
        </v-row>
        <v-row :height="35">
          <v-col class="pr-5 py-0">
            <sw-audio-progress
              class="progress-times"
              :data-hint="playTimeString"
              :slider-value="playTime"
              :max="durationTime"
              min="0"
              @changingValue="changeingPlayPoint"
              @changed="changedPlayPoint"
              @mousemove="hint"
            />
          </v-col>
          <!-- 再生時間表示 -->
          <v-col class="d-flex justify-end pa-0" cols="1">
            <span style="color: back">{{ progressText() }}</span>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>

  <teleport to="body">
    <keep-alive>
      <CurrentAudioList
        :isView="true"
        v-if="isAudioListVisible"
        class="audio-list-overlay"
        :style="currentPlayListStyle"
      />
    </keep-alive>
  </teleport>
  <!-- 全画面オーバーレイ -->
  <teleport to="body">
    <div v-if="isFullScreenOverlay" class="fullscreen-overlay" :style="overlayHeightStyle">
      <!-- ここに歌詞、アルバムアート、アナライザ等のコンポーネントを配置する -->
      <div class="overlay-content">
        <AudioCanvas @toggleView="toggleView" ></AudioCanvas>
      </div>
    </div>
  </teleport>

</template>

<script>
import { AudioClip } from '../../audio/type/AudioClip';
import audio from '../../audio/AudioPlayer';
import { AudioLoopModeEnum } from '../../audio/enum/AudioLoopModeEnum';
import { AudioPlayStateEnum } from '../../audio/enum/AudioPlayStateEnum';
import { BaseFrameWork, ContextMenu, timeToText } from '../../base';
import { audioParamLoad, audioParamSave } from '../../utilization/register';
import MarqueeText from '../common/MarqueeText.vue';
import PingPongMarquee from '../common/PingPongMarquee.vue';
import CurrentAudioList from './parts/CurrentAudioList.vue';
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue';
import AudioCanvas from './parts/AudioCanvas.vue';
import { BASE } from '../../utilization/path';

export default {
  name: 'MusicControlBarWithProgress',
  data() {
    return {
      currentPlaySoundClip: audio.currentAudioClip != null ? audio.currentAudioClip : new AudioClip,
      durationTime: 0,
      playTime: 0,
      isAudioList: false,
      isVolumeViewOpen: true,
      volume: 1,
      volumeMenu: false,
      playTimeString: '',
      isFillLayout: false,
      isVisibleAnalyser: true,
      isPlaying: true,
      isAudioListVisible: false,
      // 全画面オーバーレイ状態管理
      isFullScreenOverlay: false,
    }
  },
  setup() {
    const parentContainer = ref(null);
    const containerHeight = ref(0);
    let resizeObserver = null;

    onMounted(() => {
      const el = (parentContainer.value && parentContainer.value.$el) || parentContainer.value;
      if (el) {
        containerHeight.value = el.offsetHeight;
        resizeObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
            containerHeight.value = entry.target.offsetHeight;
          }
        });
        resizeObserver.observe(el);
      }
    });
    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });
    const currentPlayListStyle = computed(() => {
      return {
        background: 'rgb(var(--v-theme-surface))',
        bottom: containerHeight.value + 'px',
        'z-index': 2000,
        'max-height': `calc(100vh - ${containerHeight.value}px - 48px)`
      };
    });

    const overlayHeightStyle = computed(()=>{
      return {
        bottom: `${{containerHeight}}px`,
        'max-height': `calc(100vh - ${containerHeight.value}px )`
      }
    });
    return {
      overlayHeightStyle,
      parentContainer,
      currentPlayListStyle
    };
  },
  components: {
    MarqueeText,
    PingPongMarquee,
    CurrentAudioList,
    AudioCanvas
  },
  created() {
    watch(
      () => this.isFullScreenOverlay,
      (newVal) => {
        document.html().setAttribute('style', `overflow:${newVal ? 'hidden' : ''};`);
      }
    );
    audioParamLoad();
    audio.eventSupport.addEventListener('audioSet', () => {
      if (this.currentPlaySoundClip != audio.currentAudioClip) {
        this.currentPlaySoundClip = audio.currentAudioClip;
      }
      if (this.playTime != audio.audio.currentTime) {
        this.playTime = audio.audio.currentTime;
      }
      if (this.durationTime != audio.audio.duration) {
        this.durationTime = audio.audio.duration;
      }
    });
    audio.eventSupport.addEventListener('update', () => {
      this.durationTime = audio.audio.duration;
      this.playTime = audio.audio.currentTime;
    });
    this.volume = audio.volume;

    audio.eventSupport.addEventListener('play', () => {
      this.audioPlayState = audio.currentPlayState;
      this.actionName = 'Pause';
      this.isPlaying = true;
    });
    audio.eventSupport.addEventListener('stop', () => {
      this.audioPlayState = audio.currentPlayState;
      this.actionName = 'Play';
      this.isPlaying = false;
    });
    audio.eventSupport.addEventListener('pause', () => {
      this.audioPlayState = audio.currentPlayState;
      this.actionName = 'Play';
      this.isPlaying = false;
    });
    audio.eventSupport.addEventListener('update', () => {
      this.durationTime = audio.audio.duration;
      this.playTime = audio.audio.currentTime;
    });
    this.actionName = 'Pause';
    this.isPlaying = false;
    this.loopName = this.repeatName();
  },
  methods: {
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=${albumKey}`;
    },
    onVolumeChanged(value) {
      audio.volume = this.volume;
      this.volume = audio.volume;
      audioParamSave();
    },
    toggleView() {
      this.$el.parentNode.classList.toggle('analyser');
      this.$el.parentNode.classList.toggle('lyrics');
    },
    progressText() {
      let currentText = timeToText(this.playTime);
      return currentText['min'] + ':' + currentText['sec'];
    },
    togglePlayListView() {
      this.isAudioList = !this.isAudioList;
    },
    toggleControllerFillView() {
      document.getElementById('controller').classList.toggle('current-sound-controller-fill-layout');
      this.isFillLayout = !this.isFillLayout;
    },
    toggleVolumeView() {
      this.isVolumeViewOpen = !this.isVolumeViewOpen;
    },
    volumeClass() {
      let classList = 'audio-controller-volume vertical-progress';
      return classList + (this.isVolumeViewOpen ? ' hide' : '');
    },
    changeVolume(event) {
      this.volume = event.target.getAttribute('slider-value');
      audio.volume = this.volume;
      audioParamSave();
    },
    beforeIconClick() {
      if (ContextMenu.isVisible) return;
      let beforeAudioClip = audio.playList.previous();
      if (beforeAudioClip == null) return;
      if (audio.currentPlayState === AudioPlayStateEnum.PLAY) {
        audio.play(beforeAudioClip);
      }
      audio.audio.currentTime = 0;
      audio.audioDeployment();
    },
    nextIconClick() {
      let nextAudioClip = audio.playList.next();
      if (nextAudioClip == null) return;
      if (audio.currentPlayState === AudioPlayStateEnum.PLAY) {
        audio.play(nextAudioClip);
      }
      audio.audio.currentTime = 0;
      audio.audioDeployment();
    },
    playPauseIconClick() {
      if (ContextMenu.isVisible) return;
      if (audio.currentPlayState === AudioPlayStateEnum.PLAY) {
        audio.pause();
        this.isPlaying = false;
      } else {
        audio.play();
        this.isPlaying = true;
      }
    },
    repeatName() {
      switch (audio.playList.loopMode) {
        case AudioLoopModeEnum.NON_LOOP: {
          return 'No loop';
        }
        case AudioLoopModeEnum.TRACK_LOOP: {
          return 'Track loop';
        }
        case AudioLoopModeEnum.AUDIO_LOOP: {
          return 'Audio loop';
        }
      }
    },
    changedPlayPoint(event) {
      audio.lockEventTarget.action('setStopUpdate');
      let rePoint = audio.currentPlayState;
      audio.stop();
      let target = event.target;
      if (event.target.mousePositionvalue == undefined) {
        target = event.target.parentNode;
      }
      setTimeout(() => {
        audio.audio.currentTime = parseFloat(target._value);
        if (rePoint == AudioPlayStateEnum.PLAY) {
          setTimeout(() => {
            audio.play();
          }, 1);
        }
        audio.lockEventTarget.action('setUpdate');
      }, 10);
    },
    changeingPlayPoint(event) {
      audio.lockEventTarget.action('setStopUpdate');
      let target = event.target;
      if (event.target.mousePositionvalue == undefined) {
        target = event.target.parentNode;
      }
      audio.audio.currentTime = parseFloat(target._value);
      if (audio.currentPlayState === AudioPlayStateEnum.PLAY) {
        audio.audio.pause();
      }
    },
    hint(event) {
      let positionTime = 0;
      let target = event.target;
      if (event.target.mousePositionvalue == undefined) {
        target = event.target.parentNode;
      } else if (!isNaN(target.mousePositionvalue(event))) {
        positionTime = target.mousePositionvalue(event);
      }
      let textTime = timeToText(positionTime);

      this.$nextTick(() => {
        this.playTimeString = textTime['min'] + ':' + textTime['sec'];
      });
    },
    toggleAudioList() {
      console.log(this.isAudioListVisible);
      this.isAudioListVisible = !this.isAudioListVisible;
    },
    // 全画面オーバーレイの開閉
    toggleFullScreenOverlay() {
      this.isFullScreenOverlay = !this.isFullScreenOverlay;
      document.body.style.overflow = this.isFullScreenOverlay?'hidden':'';
    }
  }
}
</script>

<style scoped>

.album-image {
  border-radius: 8px;
  max-width: 100%;
  max-height: 100%;
}

.audio-title {
  font-size: 0.9rem;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0;
}

.sub {
  font-size: 0.8rem;
}

.audio-list-overlay {
  position: fixed;
  right: 0;
  z-index: 50;
  width: 564px;
  height: 100vw;
}

/* 全画面オーバーレイのスタイル */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1999;
  color: white;
}
.overlay-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
@media screen and (max-width: 768px) {
  .footer-media {
    min-width: 100%;
    width: 100%;
  }
  .space {
    visibility: hidden;
    display: none;
  }
}
</style>
