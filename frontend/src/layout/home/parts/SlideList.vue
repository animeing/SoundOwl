<template>
  <div class="my-slide-group-wrapper">
    <v-slide-group
      ref="slideGroup"
      v-model="model"
      show-arrows
      color="grey-darken-4"
      center-active
      class="slide-group"
    >
      <ContextMenu
        v-for="item in data"
        :key="item.id"
        :value="item.id"
        :items="menuData"
        @select="select => contextMenuSelection(select, item)"
      >
        <v-slide-group-item>
          <div class="slide-item">
            <v-tooltip bottom>
              <template #activator="{ props }">
                <div v-bind="props">
                  <v-card
                    :style="{ width: cardWidth + 'px', height: cardHeight + 'px' }"
                    class="d-flex flex-column"
                    color="grey-lighten-1"
                    @click="click(item)"
                  >
                    <v-img
                      loading="lazy"
                      aspect-ratio="1"
                      :src="createImageSrc(item.albumKey)"
                      :style="{ height: cardImgHeight + 'px' }"
                    >
                      <template #placeholder>
                        <div class="d-flex align-center justify-center fill-height">
                          <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                        </div>
                      </template>
                    </v-img>
                    <v-card-actions class="d-flex justify-center">
                      <HoverPingPongMarquee>
                        <p :data-hint="item.title" class="text-center">
                          {{ item.title }}
                        </p>
                      </HoverPingPongMarquee>
                    </v-card-actions>
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
      // 初期値。calculateDimensions で再計算される
      cardWidth: 250,
      cardHeight: 300,
      cardImgHeight: 225,
      resizeObserver: null,
    };
  },
  created() {
    this.data = this.dataRequest();
  },
  mounted() {
    // nextTick で DOM 完全描画後に計算開始
    this.$nextTick(() => {
      const slideGroupEl = this.$refs.slideGroup.$el;
      const containerEl = slideGroupEl.querySelector('.v-slide-group__container');
      if (containerEl && window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          this.calculateDimensions();
        });
        this.resizeObserver.observe(containerEl);
      }
      // 初回計算
      this.calculateDimensions();
    });
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
    // 実際のカード表示領域（.v-slide-group__container）の幅を使って計算
    calculateDimensions() {
      let availableWidth = window.innerWidth;
      if (this.$refs.slideGroup) {
        const slideGroupEl = this.$refs.slideGroup.$el;
        const containerEl = slideGroupEl.querySelector('.v-slide-group__container');
        if (containerEl) {
          availableWidth = containerEl.getBoundingClientRect().width;
        }
      }
      // 表示件数の設定。ここでは PC 表示で 6 個としているが、必要に応じて変更してください。
      let itemsPerView = 6;
      if (availableWidth < 425) {
        itemsPerView = 2;
      } else if (availableWidth < 768) {
        itemsPerView = 3;
      }
      // Math.floor を使わず、浮動小数点のまま設定する
      this.cardWidth = availableWidth / itemsPerView;
      this.cardHeight = this.cardWidth * 1.2;
      this.cardImgHeight = this.cardWidth * 0.9;
    },
  },
};
</script>

