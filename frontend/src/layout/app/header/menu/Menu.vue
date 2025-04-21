<template>
  <v-menu
    :open-on-hover="isDesktop"
    :close-on-content-click="false"
    :max-width="200"
    transition="scale-transition"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        width="5%"
        variant="elevated"
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
  data() {
    return {
      menuItems: [
        { title: 'Artist List',  route: { name: 'artist_list' },  icon: 'mdi-account-music' },
        { title: 'Album List',   route: { name: 'album_list' },   icon: 'mdi-album' },
        { title: 'Play List',    route: { name: 'playlists'   },  icon: 'mdi-playlist-music' },
        { title: 'History List', route: { name: 'history_list'},  icon: 'mdi-history' },
        { title: 'Setting',      route: { name: 'setting'     },  icon: 'mdi-cog' }
      ]
    }
  },
  computed: {
    // md 未満＝スマホ扱い。PC(マウス)だけ hover を有効化
    isDesktop() {
      return this.$vuetify.display.mdAndUp
    }
  }
}
</script>
