<template> 
  <v-slide-group
    v-model="model"
    show-arrows
    color="grey-darken-4"
    center-active
  >
    <ContextMenu
          v-for="item in data"
          :key="item.id"
          :value="item.id">
      <template #main>
        <v-slide-group-item>
          <v-tooltip bottom>
            <template #activator="{ props }">
              <div
                v-bind="props">
                <v-card
                  class="ma-sm-4 d-flex flex-column"
                  color="grey-lighten-1"
                  @click="click(item)"
                >
                  <v-img
                    loading="lazy"
                    aspect-ratio="1"
                    :src="createImageSrc(item.albumKey)"
                  >
                    <template v-slot:placeholder>
                      <div class="d-flex align-center justify-center fill-height">
                        <v-progress-circular
                          color="grey-lighten-4"
                          indeterminate
                        ></v-progress-circular>
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
            <p>Title : {{ item.title }}</p>
            <p>Artist : {{ item.artist }}</p>
            <p>Album : {{ item.album }}</p>
          </v-tooltip>
        </v-slide-group-item>
      </template>
      <template #menu>
        <v-list-item class="pa-0" style="height:100%;">
          <button @click="addPlayList(item)" style="height:100%;" class="px-6 py-2">
            AddPlayList
          </button>
        </v-list-item>
      </template>
    </ContextMenu>
  </v-slide-group>
</template>

<script>
import ContextMenu from '../../common/ContextMenu.vue';
import '../../../websocket';
import { BASE } from '../../../utilization/path';
import HoverPingPongMarquee from '../../common/HoverPingPongMarquee.vue';
import audio from '../../../audio/AudioPlayer';

export default {
  props: {
    dataRequest: {
      type: Function,
      required: true,
      default() {
        return () => {};
      },
    },
    onClick: {
      type: Function,
      required: true,
      default() {
        return () => {};
      },
    },
    contextMenu: {
      type: Function,
      required: true,
      default() {
        return () => {};
      },
    },
  },
  components: {
    HoverPingPongMarquee,
    ContextMenu
  },
  data() {
    return {
      data: [],
      model: null,
    };
  },
  created() {
    this.data = this.dataRequest();
  },
  methods: {
    createImageSrc(albumKey) {
      return `${BASE.HOME}img/album_art.php?media_hash=` + albumKey;
    },
    click(soundClip) {
      if (this.onClick) {
        this.onClick(soundClip);
      }
    },
    addPlayList(item) {
      if(audio.currentAudioClip == undefined) {
        audio.playList.insertAudioClip(item, 0);
        return;
      }
      audio.playList.appendAudioClipNext(item);
    }
  },
};
</script>

<style scoped>
.v-card {
  width: 250px;
  height: 300px;
  background-color: var(--basecolor);
  display: flex;
  flex-direction: column;
}

.v-img {
  height:225px;
}

.v-card-actions {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media screen and (max-width: 768px) {
  .v-slide-group .v-card {
    width: 175px;
    height: 210px;
  }
  .v-img {
    height: 135px;
  }
}
@media screen and (max-width: 425px) {
  .v-slide-group .v-card {
    width: 125px;
    height: 150px;
  }
  .v-img {
    height: 100px;
  }
  p {
    font-size:0.8em;
  }
}
</style>
