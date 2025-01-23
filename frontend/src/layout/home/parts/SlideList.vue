<template>
    <sw-audio-slide-list>
        <div>
            <button
                v-for="item in data"
                :key="item.id"
                @click.right.prevent="contextmenu(item)"
                @click="click(item)">
                <v-img
                    loading="lazy"
                    aspect-ratio="1"
                    :height='225'
                    :width='250'
                    :src="createImageSrc(item.albumKey)">
                  <template v-slot:placeholder>
                    <div class="d-flex align-center justify-center fill-height">
                      <v-progress-circular
                        color="grey-lighten-4"
                        indeterminate
                      ></v-progress-circular>
                    </div>
                  </template>
                </v-img>
                <p :data-hint="item.title">
                    {{ item.title }}
                </p>
            </button>
        </div>
    </sw-audio-slide-list>
</template>

<script>
import { ContextMenu } from '../../../base';
import '../../../websocket';
import { BASE } from '../../../utilization/path';

export default {
  props: {
    dataRequest: {
      type: Function,
      require: true,
      default(){
        return ()=>{};
      }
    },
    onClick: {
      type: Function,
      require: true,
      default(){
        return ()=>{};
      }
    },
    contextMenu: {
      type: Function,
      require: true,
      default(){
        return ()=>{};
      }
    }
  },
  data() {
    return {
      data: []
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
      return;
    },
    contextmenu(item) {
      ContextMenu.contextMenu.destoryChildren();
      if(!this.contextMenu) {
        return;
      }
      this.contextMenu(item);
    }
  }
};
</script>
<style scoped>
sw-audio-slide-list > div > button {
  width: 250px;
  height: 250px;
  background-color: var(--basecolor);
}
</style>
