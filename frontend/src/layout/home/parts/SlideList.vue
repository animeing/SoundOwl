<template>
  <div class="slide-list-shell">
    <v-btn icon variant="text" class="slide-arrow" @click="scrollTrack(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>

    <div ref="viewport" class="slide-viewport">
      <div class="slide-track" :style="trackStyle">
        <ContextMenu
          v-for="(item, index) in data"
          :key="item.soundHash || item.albumKey || item.id || index"
          :items="menuData"
          @select="select => contextMenuSelection(select, item)"
        >
          <div class="slide-item">
            <v-tooltip location="bottom">
              <template #activator="{ props }">
                <v-card
                  v-bind="props"
                  :style="cardStyle"
                  class="slide-card"
                  color="grey-lighten-1"
                  rounded="sm"
                  @click="click(item)"
                >
                  <v-img
                    loading="lazy"
                    aspect-ratio="1"
                    cover
                    :src="createImageSrc(item.albumKey)"
                    :style="{ height: `${cardWidth}px` }"
                  >
                    <template #placeholder>
                      <div class="d-flex align-center justify-center fill-height">
                        <v-progress-circular color="grey-lighten-4" indeterminate />
                      </div>
                    </template>
                  </v-img>
                  <div class="slide-card-text">
                    <HoverPingPongMarquee>
                      <p :data-hint="item.title" class="slide-card-title">
                        {{ item.title }}
                      </p>
                    </HoverPingPongMarquee>
                  </div>
                </v-card>
              </template>
              <p>Title: {{ item.title }}</p>
              <p>Artist: {{ item.artist }}</p>
              <p>Album: {{ item.album }}</p>
            </v-tooltip>
          </div>
        </ContextMenu>
      </div>
    </div>

    <v-btn icon variant="text" class="slide-arrow" @click="scrollTrack(1)">
      <v-icon>mdi-chevron-right</v-icon>
    </v-btn>
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
      menuData: [
        {
          label: 'Add to PlayList',
          children: [
            { label: 'Play Next', action: 'playNext' },
            { label: 'Add to Last', action: 'addLast' },
          ],
        },
      ],
      cardWidth: 220,
      gap: 12,
      resizeObserver: null,
    };
  },
  computed: {
    cardStyle() {
      return {
        width: `${this.cardWidth}px`,
        minWidth: `${this.cardWidth}px`
      };
    },
    trackStyle() {
      return {
        gap: `${this.gap}px`
      };
    }
  },
  created() {
    this.data = this.dataRequest();
  },
  mounted() {
    this.$nextTick(() => {
      const viewport = this.$refs.viewport;
      if (viewport && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          this.calculateDimensions();
        });
        this.resizeObserver.observe(viewport);
      }
      this.calculateDimensions();
    });
  },
  updated() {
    this.calculateDimensions();
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect();
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
      return `${BASE.HOME}img/album_art.php?media_hash=${albumKey}`;
    },
    click(item) {
      this.onClick?.(item);
    },
    addPlayList(item, point = 0) {
      if (audio.currentAudioClip === undefined && point === 0) {
        audio.playList.insertAudioClip(item, 0);
        return;
      }
      if (point === 0) {
        audio.playList.appendAudioClipNext(item);
        return;
      }
      audio.playList.insertAudioClip(item, point);
    },
    calculateDimensions() {
      const viewport = this.$refs.viewport;
      if (!viewport) {
        return;
      }
      const width = viewport.clientWidth;
      let itemsPerView = 5;
      if (width < 600) {
        itemsPerView = 2;
      } else if (width < 960) {
        itemsPerView = 3;
      } else if (width < 1280) {
        itemsPerView = 4;
      }
      const totalGap = this.gap * Math.max(itemsPerView - 1, 0);
      this.cardWidth = Math.max(150, (width - totalGap) / itemsPerView);
    },
    scrollTrack(direction) {
      const viewport = this.$refs.viewport;
      if (!viewport) {
        return;
      }
      viewport.scrollBy({
        left: direction * (this.cardWidth + this.gap) * 2,
        behavior: 'smooth'
      });
    }
  },
};
</script>

<style scoped>
.slide-list-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.slide-arrow {
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.slide-viewport {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.slide-track {
  display: flex;
  align-items: stretch;
  width: max-content;
  padding-bottom: 4px;
}

.slide-item {
  display: block;
}

.slide-card {
  overflow: hidden;
  cursor: pointer;
}

.slide-card-text {
  min-height: 52px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-card-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
}

@media screen and (max-width: 600px) {
  .slide-list-shell {
    gap: 4px;
  }

  .slide-card-text {
    min-height: 48px;
    padding: 6px 8px;
  }

  .slide-card-title {
    font-size: 0.82rem;
  }
}
</style>
