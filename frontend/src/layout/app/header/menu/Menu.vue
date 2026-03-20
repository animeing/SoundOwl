<template>
  <v-menu
    :open-on-hover="isDesktop"
    :close-on-content-click="true"
    :max-width="220"
    transition="scale-transition"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="elevated"
        class="menu-button"
      >
        Menu
      </v-btn>
    </template>

    <v-list>
      <v-list-item
        v-for="(item, index) in menuItems"
        :key="index"
        :to="item.route"
        :prepend-icon="item.icon"
      >
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
export default {
  name: 'HeaderMenu',
  data() {
    return {
      width: typeof window !== 'undefined' ? window.innerWidth : 1280,
      menuItems: [
        { title: 'Artist List', route: { name: 'artist_list' }, icon: 'mdi-account-music' },
        { title: 'Album List', route: { name: 'album_list' }, icon: 'mdi-album' },
        { title: 'Play List', route: { name: 'playlists' }, icon: 'mdi-playlist-music' },
        { title: 'History List', route: { name: 'history_list' }, icon: 'mdi-history' },
        { title: 'Setting', route: { name: 'setting' }, icon: 'mdi-cog' }
      ]
    };
  },
  computed: {
    isDesktop() {
      return this.width >= 960;
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    handleResize() {
      this.width = window.innerWidth;
    }
  }
};
</script>

<style scoped>
.menu-button {
  min-width: 88px;
}

@media screen and (max-width: 959px) {
  .menu-button {
    min-width: 72px;
  }
}
</style>
