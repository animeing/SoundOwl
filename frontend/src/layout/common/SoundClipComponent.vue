<template>
  <v-card
    color="grey-darken-3"
  >
    <v-row :class="['sound-clip-container', { 'small-height': isSmallHeight }]" align="center" justify="start">
      <v-col cols="auto" class="album">
        <v-img
          :src="createImageSrc(soundClip.albumKey)"
          :aspect-ratio="1"
          :width="albumWidth"
          :height="albumHeight"
          class="album-image"
          lazy-src="img/placeholder-image.webp"
        >
          <template #placeholder>
            <v-skeleton-loader type="image" class="fill-height"></v-skeleton-loader>
          </template>
        </v-img>
      </v-col>

      <v-col class="layout-box">
        <v-tooltip bottom>
          <template #activator="{ props }">
            <div
              v-bind="props"
              class="audio-title"
              :title="soundClip.title"
            >
              {{ soundClip.title }}
            </div>
          </template>
          <span>{{ soundClip.title }}</span>
        </v-tooltip>

        <v-tooltip bottom>
          <template #activator="{ props }">
            <router-link
              v-bind="props"
              :to="{ name: 'artist', query: { ArtistHash: soundClip.artistKey } }"
              class="audio-information"
              @click.stop
            >
              {{ soundClip.artist }}
            </router-link>
          </template>
          <span>{{ soundClip.artist }}</span>
        </v-tooltip>

        <v-tooltip bottom v-if="hasAlbumData">
          <template #activator="{ props }">
            <router-link
              v-bind="props"
              :to="{ name: 'album', query: { AlbumHash: soundClip.albumKey } }"
              class="audio-information audio-description"
              @click.stop
            >
              {{ soundClip.album }}
            </router-link>
          </template>
          <span>{{ soundClip.album }}</span>
        </v-tooltip>
      </v-col>
    </v-row>
  </v-card>
</template>


<script>
import { defineComponent, computed } from 'vue';
import { AudioClip } from '../../audio/type/AudioClip';
import { BASE } from '../../utilization/path';

export default defineComponent({
  name: 'SoundClipComponent',
  props: {
    soundClip: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    albumHeight: {
      type: Number,
      default: 170,
    },
    albumWidth: {
      type: Number,
      default: 199,
    },
  },
  data() {
    return {
      hasAlbumData: true,
    };
  },
  computed: {
    isSmallHeight() {
      return this.albumHeight <= 135;
    },
  },
  mounted() {
    this.hasAlbumData =
      this.soundClip.albumKey !== undefined && this.soundClip.albumKey !== '';
  },
  methods: {
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=${albumKey}`;
    },
  },
});
</script>

<style scoped>
.sound-clip-container {
  border-bottom: 1px solid var(--subcoloraccentcolor);
  transition: 0.8s;
  background: var(--basecolor);
  height: 100%; 
  padding: 8px 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.sound-clip-container.small-height {
  padding: 4px 8px
}

.album {
  border: 1px solid var(--itemfcbgcolor);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.album-image {
  border-radius: 8px;
  max-width: 100%;
  max-height: 100%;
}

.layout-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding-left: 16px;
  height: 100%;
  flex: 1;
  gap: 4px;
}

.sound-clip-container.small-height .layout-box {
  padding-left: 0;
  gap: 2px;
}

.audio-title {
  font-size: 1rem;
  font-weight: bold;
  text-wrap: wrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sound-clip-container.small-height .audio-title {
  font-size: 0.9rem;
}

.audio-information {
  font-size: 0.9rem;
  color: var(--text-color);
  text-decoration: none;
  display: inline;
}

.sound-clip-container.small-height .audio-information {
  font-size: 0.8rem;
}

.audio-description {
  font-size: 0.8rem;
  color: var(--subtext-color);
  display: inline;
}

.sound-clip-container.small-height .audio-description {
  font-size: 0.7rem;
}

.audio-title,
.audio-information,
.audio-description {
  margin-bottom: 0;
}

.sound-clip-container.small-height .layout-box {
  gap: 2px; 
}
.sound-clip-container {
  display: flex;
  flex-wrap: wrap;
}
</style>
