<template> 
  <v-slide-group
    v-model="model"
    show-arrows
    color="grey-darken-4"
    center-active
    class="pa-4"
  >
    <v-slide-group-item
      v-for="item in data"
      :key="item.id"
      :value="item.id"
    >
      <v-tooltip bottom>
        <template #activator="{ props }">
          <div
            v-bind="props">
            <v-card
              class="ma-4 d-flex flex-column"
              color="grey-lighten-1"
              height="300"
              width="250"
              @click.right.prevent="contextmenu(item)"
              @click="click(item)"
            >
              <v-img
                loading="lazy"
                aspect-ratio="1"
                :src="createImageSrc(item.albumKey)"
                height="225"
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
                <p :data-hint="item.title" class="text-center">
                  {{ item.title }}
                </p>
              </v-card-actions>
            </v-card>
            </div>
        </template>
        <p>Title : {{ item.title }}</p>
        <p>Artist : {{ item.artist }}</p>
        <p>Album : {{ item.album }}</p>
      </v-tooltip>
    </v-slide-group-item>
  </v-slide-group>
</template>

<script>
import { ContextMenu } from '../../../base';
import '../../../websocket';
import { BASE } from '../../../utilization/path';

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
    contextmenu(item) {
      ContextMenu.contextMenu.destroyChildren();
      if (!this.contextMenu) {
        return;
      }
      this.contextMenu(item);
    },
  },
};
</script>

<style scoped>
.v-slide-group .v-card {
  width: 250px;
  height: 300px;
  background-color: var(--basecolor);
  display: flex;
  flex-direction: column;
}

.v-card-actions {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.v-card-actions p {
  word-wrap: break-word;
  white-space: normal;
}

</style>
