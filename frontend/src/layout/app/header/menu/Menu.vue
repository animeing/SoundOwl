<template>
  <v-menu
    open-on-hover 
    :max-width="200"
    transition="scale-transition"
    :close-on-content-click="false"
    >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :width="130"
        variant="elevated">Menu</v-btn>
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
    data() {
      return {
        menuItems: [
          {
            title: 'Artist List',
            route: { name: 'artist_list' },
            icon: 'mdi-account-music',
          },
          {
            title: 'Album List',
            route: { name: 'album_list' },
            icon: 'mdi-album',
          },
          {
            title: 'Play List',
            route: { name: 'playlists' },
            icon: 'mdi-playlist-music',
          },
          {
            title: 'History List',
            route: { name: 'history_list' },
            icon: 'mdi-history',
          },
          { title: 'Setting', route: { name: 'setting' }, icon: 'mdi-cog' },
        ],
      }
    },
  }
</script>
