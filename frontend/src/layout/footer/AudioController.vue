<template>
  <v-container
    fluid
    class="audio-controller-shell"
    ref="parentContainer"
  >
    <div class="audio-controller-main">
      <div class="audio-info-panel">
        <v-img
          :src="createImageSrc(currentPlaySoundClip.albumKey)"
          aspect-ratio="1"
          width="64"
          height="64"
          class="album-image"
          lazy-src="img/placeholder-image.webp"
        >
          <template #placeholder>
            <v-skeleton-loader type="image" class="fill-height" />
          </template>
        </v-img>

        <div class="audio-meta-text">
          <v-tooltip location="top">
            <template #activator="{ props }">
              <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.title">
                <PingPongMarquee>
                  <span>{{ currentPlaySoundClip.title }}</span>
                </PingPongMarquee>
              </div>
            </template>
            {{ currentPlaySoundClip.title }}
          </v-tooltip>

          <v-tooltip location="top">
            <template #activator="{ props }">
              <router-link
                v-bind="props"
                :to="{ name: 'artist', query: { ArtistHash: currentPlaySoundClip.artistKey } }"
                class="audio-sub-link"
              >
                <MarqueeText style="max-width: 100%;">
                  <span class="sub">{{ currentPlaySoundClip.artist }}</span>
                </MarqueeText>
              </router-link>
            </template>
            {{ currentPlaySoundClip.artist }}
          </v-tooltip>

          <v-tooltip location="top">
            <template #activator="{ props }">
              <router-link
                v-bind="props"
                :to="{ name: 'album', query: { AlbumHash: currentPlaySoundClip.albumKey } }"
                class="audio-sub-link"
              >
                <MarqueeText style="max-width: 100%;">
                  <span class="sub">{{ currentPlaySoundClip.album }}</span>
                </MarqueeText>
              </router-link>
            </template>
            {{ currentPlaySoundClip.album }}
          </v-tooltip>
        </div>
      </div>

      <div class="audio-center-panel">
        <div class="control-buttons">
          <v-btn icon size="small" @click="beforeIconClick" data-hint="Previous">
            <v-icon>mdi-skip-previous</v-icon>
          </v-btn>
          <v-btn icon size="small" @click="playPauseIconClick" :data-hint="isPlaying ? 'Pause' : 'Play'">
            <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
          </v-btn>
          <v-btn icon size="small" @click="nextIconClick" data-hint="Next">
            <v-icon>mdi-skip-next</v-icon>
          </v-btn>
        </div>

        <div class="progress-panel">
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
        </div>
      </div>

      <div class="audio-side-panel">
        <div class="utility-buttons">
          <v-btn icon size="small" @click="toggleAudioList">
            <v-icon>mdi-playlist-music</v-icon>
          </v-btn>
          <v-menu v-model="volumeMenu" offset-y :close-on-content-click="false">
            <template #activator="{ props }">
              <v-btn icon size="small" v-bind="props">
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
          <v-btn icon size="small" @click="toggleFullScreenOverlay">
            <v-icon>
              {{ isFullScreenOverlay ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}
            </v-icon>
          </v-btn>
        </div>

        <div class="progress-time-text">
          {{ progressText() }}
        </div>
      </div>
    </div>
  </v-container>

  <teleport to="body">
    <keep-alive>
      <CurrentAudioList
        :isView="true"
        ref="currentAudioList"
        v-if="isAudioListVisible"
        class="audio-list-overlay"
        :style="currentPlayListStyle"
      />
    </keep-alive>
  </teleport>

  <teleport to="body">
    <div v-if="isFullScreenOverlay" class="fullscreen-overlay" :style="overlayHeightStyle">
      <div class="overlay-content">
        <AudioCanvas @toggleView="toggleView" />
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
        bottom: `${containerHeight.value}px`,
        maxHeight: `calc(100vh - ${containerHeight.value}px)`
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
        document.documentElement.style.overflow = newVal ? 'hidden' : '';
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
      audio.audioPlayStateAction.lockEventTarget.action('setStopUpdate');
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
        audio.audioPlayStateAction.lockEventTarget.action('setUpdate');
      }, 10);
    },
    changeingPlayPoint(event) {
      audio.audioPlayStateAction.lockEventTarget.action('setStopUpdate');
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
      this.isAudioListVisible = !this.isAudioListVisible;
      // 開いた直後だけ現在再生中へスクロール
      if (this.isAudioListVisible) {
        this.$nextTick(() => {
          this.$refs.currentAudioList?.scrollToCurrentPlaying?.();
        });
      }
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
.audio-controller-shell {
  background-color: #000;
  color: #fff;
  padding: 10px 16px 8px;
  border-radius: 8px 8px 0 0;
}

.audio-controller-main {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

.audio-info-panel {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.audio-meta-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.album-image {
  border-radius: 6px;
  max-width: 100%;
  max-height: 100%;
}

.audio-title {
  font-size: 0.92rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-sub-link {
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  display: block;
  overflow: hidden;
}

.sub {
  font-size: 0.78rem;
}

.audio-center-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.control-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.progress-panel {
  width: 100%;
}

.audio-side-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  min-width: 132px;
}

.utility-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-time-text {
  min-width: 52px;
  text-align: right;
  font-size: 0.82rem;
  color: #fff;
}

.audio-list-overlay {
  position: fixed;
  right: 0;
  z-index: 50;
  width: min(564px, 100vw);
  height: auto;
  max-height: 100vh;
}

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

@media screen and (max-width: 959px) {
  .audio-controller-main {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .audio-center-panel,
  .audio-side-panel {
    align-items: center;
  }

  .audio-side-panel {
    min-width: 0;
  }

  .progress-panel {
    order: 2;
  }

  .progress-time-text {
    text-align: center;
  }
}

@media screen and (max-width: 600px) {
  .audio-controller-shell {
    padding: 8px 10px 6px;
  }

  .audio-info-panel {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 8px;
  }

  .audio-title {
    font-size: 0.85rem;
  }

  .sub,
  .progress-time-text {
    font-size: 0.75rem;
  }

  .control-buttons,
  .utility-buttons {
    gap: 6px;
  }
}
</style>
