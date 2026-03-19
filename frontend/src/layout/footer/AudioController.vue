<template>
  <v-container
    fluid
    class="footer-shell"
    ref="parentContainer"
  >
    <div class="deploy-marker" aria-hidden="true" v-html="deployMarkerComment"></div>

    <div class="footer-layout">
      <div class="footer-meta">
        <v-img
          :src="createImageSrc(currentPlaySoundClip.albumKey)"
          aspect-ratio="1"
          width="70"
          height="66"
          class="album-image"
          lazy-src="img/placeholder-image.webp"
        >
          <template #placeholder>
            <v-skeleton-loader type="image" class="fill-height"></v-skeleton-loader>
          </template>
        </v-img>

        <div class="footer-meta-text">
          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.title">
                <PingPongMarquee>
                  <span>{{ currentPlaySoundClip.title }}</span>
                </PingPongMarquee>
              </div>
            </template>
            {{ currentPlaySoundClip.title }}
          </v-tooltip>

          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.artist">
                <router-link
                  v-bind="props"
                  :to="{ name: 'artist', query: { ArtistHash: currentPlaySoundClip.artistKey } }"
                  class="meta-link"
                >
                  <MarqueeText style="max-width: 100%;">
                    <span class="text-medium-emphasis sub">{{ currentPlaySoundClip.artist }}</span>
                  </MarqueeText>
                </router-link>
              </div>
            </template>
            {{ currentPlaySoundClip.artist }}
          </v-tooltip>

          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <div v-bind="props" class="audio-title" :title="currentPlaySoundClip.album">
                <router-link
                  v-bind="props"
                  :to="{ name: 'album', query: { AlbumHash: currentPlaySoundClip.albumKey } }"
                  class="meta-link"
                >
                  <MarqueeText style="max-width: 100%;">
                    <span class="text-medium-emphasis sub">{{ currentPlaySoundClip.album }}</span>
                  </MarqueeText>
                </router-link>
              </div>
            </template>
            {{ currentPlaySoundClip.album }}
          </v-tooltip>
        </div>
      </div>

      <v-divider vertical class="space"></v-divider>

      <div class="footer-main">
        <div class="footer-controls-row">
          <div class="controls-spacer"></div>

          <div class="primary-controls">
            <v-btn icon @click="beforeIconClick" data-hint="Previous">
              <v-icon>mdi-skip-previous</v-icon>
            </v-btn>
            <v-btn icon v-if="!isPlaying" @click="playPauseIconClick" data-hint="Play">
              <v-icon>mdi-play</v-icon>
            </v-btn>
            <v-btn icon v-else @click="playPauseIconClick" data-hint="Pause">
              <v-icon>mdi-pause</v-icon>
            </v-btn>
            <v-btn icon @click="nextIconClick" data-hint="Next">
              <v-icon>mdi-skip-next</v-icon>
            </v-btn>
          </div>

          <div class="secondary-controls">
            <v-btn icon @click="toggleAudioList">
              <v-icon>mdi-playlist-music</v-icon>
            </v-btn>
            <v-menu v-model="volumeMenu" location="top" :close-on-content-click="false">
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
            <v-btn icon @click="toggleFullScreenOverlay">
              <v-icon>
                {{ isFullScreenOverlay ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}
              </v-icon>
            </v-btn>
          </div>
        </div>

        <div class="footer-progress-row">
          <sw-audio-progress
            class="progress-times footer-progress"
            :data-hint="playTimeString"
            :slider-value="playTime"
            :max="durationTime"
            min="0"
            @changingValue="changeingPlayPoint"
            @changed="changedPlayPoint"
            @mousemove="hint"
          />
          <span class="progress-label">{{ progressText() }}</span>
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
        <AudioCanvas @toggleView="toggleView"></AudioCanvas>
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
      currentPlaySoundClip: audio.currentAudioClip != null ? audio.currentAudioClip : new AudioClip(),
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
      isFullScreenOverlay: false,
      deployMarkerComment: '<!-- TEMP_DEPLOY_MARKER: audio-controller-layout-fix-2026-03-19 REMOVE_BEFORE_MERGING_TO_MAIN -->'
    };
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
        bottom: `${containerHeight.value}px`,
        'z-index': 2000,
        'max-height': `calc(100vh - ${containerHeight.value}px - 48px)`
      };
    });

    const overlayHeightStyle = computed(() => {
      return {
        bottom: `${containerHeight.value}px`,
        'max-height': `calc(100vh - ${containerHeight.value}px)`
      };
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
        document.body.style.overflow = newVal ? 'hidden' : '';
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
      return currentText.min + ':' + currentText.sec;
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
        case AudioLoopModeEnum.NON_LOOP:
          return 'No loop';
        case AudioLoopModeEnum.TRACK_LOOP:
          return 'Track loop';
        case AudioLoopModeEnum.AUDIO_LOOP:
          return 'Audio loop';
        default:
          return '';
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
        this.playTimeString = textTime.min + ':' + textTime.sec;
      });
    },
    toggleAudioList() {
      this.isAudioListVisible = !this.isAudioListVisible;
      if (this.isAudioListVisible) {
        this.$nextTick(() => {
          this.$refs.currentAudioList?.scrollToCurrentPlaying?.();
        });
      }
    },
    toggleFullScreenOverlay() {
      this.isFullScreenOverlay = !this.isFullScreenOverlay;
      document.body.style.overflow = this.isFullScreenOverlay ? 'hidden' : '';
    }
  }
};
</script>

<style scoped>
.footer-shell {
  background-color: black;
  color: white;
  padding: 12px 16px 10px;
  border-radius: 8px 8px 0 0;
}

.deploy-marker {
  display: none;
}

.footer-layout {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 1 clamp(240px, 34vw, 620px);
  min-width: 0;
}

.footer-meta-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.album-image {
  border-radius: 8px;
  flex-shrink: 0;
}

.audio-title {
  font-size: 0.9rem;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.meta-link {
  color: inherit;
  text-decoration: none;
  display: block;
}

.sub {
  font-size: 0.8rem;
}

.space {
  align-self: stretch;
}

.footer-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.footer-controls-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
}

.controls-spacer {
  min-width: 0;
}

.primary-controls,
.secondary-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-progress-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.footer-progress {
  flex: 1;
  min-width: 0;
}

.progress-label {
  min-width: 56px;
  text-align: right;
  color: inherit;
  font-variant-numeric: tabular-nums;
}

.audio-list-overlay {
  position: fixed;
  right: 0;
  z-index: 50;
  width: min(564px, 100vw);
  max-width: 100vw;
  height: min(100vw, 100vh);
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

@media screen and (max-width: 960px) {
  .footer-layout {
    align-items: stretch;
  }

  .footer-meta {
    flex-basis: 280px;
  }
}

@media screen and (max-width: 768px) {
  .footer-shell {
    padding: 10px 12px 8px;
    border-radius: 0;
  }

  .footer-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .footer-meta {
    flex-basis: auto;
    width: 100%;
  }

  .space {
    display: none;
  }

  .footer-controls-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .controls-spacer {
    display: none;
  }

  .primary-controls,
  .secondary-controls {
    justify-content: center;
  }

  .footer-progress-row {
    gap: 10px;
  }
}
</style>
