<template>
    <sw-audio-slide-list>
        <div>
            <button
                v-for="item in data"
                :key="item.id"
                @click.right.prevent="contextmenu(item)"
                @click="click(item)">
                <img
                    loading="lazy"
                    :src="createImageSrc(item.albumKey)">
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
