<template>
  <div class="my-slide-group-wrapper">
    <v-slide-group
      ref="slideGroup"
      v-model="model"
      show-arrows
      color="grey-darken-4"
      class="slide-group"
    >
      <ContextMenu
        v-for="(item, index) in data"
        :key="item.soundHash || item.albumKey || item.id || index"
        :value="item.soundHash || item.albumKey || item.id || index"
        :items="menuData"
        @select="select => contextMenuSelection(select, item)"
      >
        <v-slide-group-item>
          <div class="slide-item">
            <v-tooltip location="bottom">
              <template #activator="{ props }">
                <div v-bind="props">
                  <v-card
                    :style="cardStyle"
                    class="slide-card"
                    color="grey-lighten-1"
                    rounded="lg"
                    @click="click(item)"
                  >
                    <v-img
                      loading="lazy"
                      aspect-ratio="1"
                      cover
                      :src="createImageSrc(item.albumKey)"
                      :style="{ height: cardImgHeight + 'px' }"
                    >
                      <template #placeholder>
                        <div class="d-flex align-center justify-center fill-height">
                          <v-progress-circular color="grey-lighten-4" indeterminate />
                        </div>
                      </template>
                    </v-img>
                    <v-card-text class="slide-card-text">
                      <HoverPingPongMarquee>
                        <p :data-hint="item.title" class="slide-card-title text-center">
                          {{ item.title }}
                        </p>
                      </HoverPingPongMarquee>
                    </v-card-text>
                  </v-card>
                </div>
              </template>
              <p>Title: {{ item.title }}</p>
              <p>Artist: {{ item.artist }}</p>
              <p>Album: {{ item.album }}</p>
            </v-tooltip>
          </div>
        </v-slide-group-item>
      </ContextMenu>
    </v-slide-group>
  </div>
</template>

<script>
import ContextMenu from '../../common/ContextMenu.vue';
import HoverPingPongMarquee from '../../common/HoverPingPongMarquee.vue';
import { BASE } from '../../../utilization/path';
import audio from '../../../audio/AudioPlayer';

export default {
  components: { ContextMenu, HoverPingPongMarquee },
  props: {
    dataRequest: {
      type: Function,
      required: true,
      default: () => () => {},
    },
    onClick: {
      type: Function,
      required: true,
      default: () => () => {},
    },
    contextMenu: {
      type: Function,
      required: true,
      default: () => () => {},
    },
  },
  data() {
    return {
      data: [],
      model: null,
      menuData: [
        {
          label: 'Add to PlayList',
          children: [
            { label: 'Play Next', action: 'playNext' },
            { label: 'Add to Last', action: 'addLast' },
          ],
        },
      ],
      cardWidth: 250,
      cardHeight: 300,
      cardImgHeight: 225,
      resizeObserver: null,
    };
  },
  computed: {
    cardStyle() {
      return {
        width: `${this.cardWidth}px`,
        minWidth: `${this.cardWidth}px`,
        height: `${this.cardHeight}px`
      };
    }
  },
  created() {
    this.data = this.dataRequest();
  },
  mounted() {
    this.$nextTick(() => {
      const slideGroupEl = this.$refs.slideGroup?.$el || this.$refs.slideGroup;
      const contentEl = slideGroupEl?.querySelector('.v-slide-group__content');
      if (contentEl && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          this.calculateDimensions();
        });
        this.resizeObserver.observe(contentEl);
      }
      this.calculateDimensions();
    });
  },
  updated() {
    this.calculateDimensions();
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  methods: {
    contextMenuSelection(select, item) {
      if (select.action === 'playNext') {
        this.addPlayList(item);
      } else if (select.action === 'addLast') {
        this.addPlayList(item, audio.playList.length);
      }
    },
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=` + albumKey;
    },
    click(item) {
      if (this.onClick) {
        this.onClick(item);
      }
    },
    addPlayList(item, point = 0) {
      if (audio.currentAudioClip === undefined && point === 0) {
        audio.playList.insertAudioClip(item, 0);
        return;
      }
      if (point === 0) {
        audio.playList.appendAudioClipNext(item);
        return;
      } else {
        audio.playList.insertAudioClip(item, point);
      }
    },
    calculateDimensions() {
      let availableWidth = window.innerWidth - 48;
      const slideGroupEl = this.$refs.slideGroup?.$el || this.$refs.slideGroup;
      const contentEl = slideGroupEl?.querySelector('.v-slide-group__content');
      if (contentEl) {
        availableWidth = contentEl.getBoundingClientRect().width;
      }

      let itemsPerView = 6;
      if (availableWidth < 600) {
        itemsPerView = 2;
      } else if (availableWidth < 960) {
        itemsPerView = 3;
      } else if (availableWidth < 1400) {
        itemsPerView = 4;
      }

      const gap = 16;
      this.cardWidth = Math.max(160, (availableWidth - gap * Math.max(itemsPerView - 1, 0)) / itemsPerView);
      this.cardHeight = this.cardWidth + 92;
      this.cardImgHeight = this.cardWidth;
    },
  },
};
</script>

<style scoped>
.my-slide-group-wrapper {
  width: 100%;
}

:deep(.slide-group .v-slide-group__container) {
  padding-block: 4px;
}

:deep(.slide-group .v-slide-group__content) {
  gap: 16px;
  align-items: stretch;
}

.slide-item {
  display: flex;
  height: 100%;
}

.slide-card {
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.slide-card-text {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 76px;
  padding: 12px;
}

.slide-card-title {
  width: 100%;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 1);
}

@media screen and (max-width: 959px) {
  :deep(.slide-group .v-slide-group__content) {
    gap: 12px;
  }
}

@media screen and (max-width: 600px) {
  .slide-card-text {
    min-height: 64px;
    padding: 10px;
  }

  .slide-card-title {
    font-size: 0.92rem;
  }
}
</style>
