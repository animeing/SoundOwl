<template>
  <v-app-bar
    app
    :elevation="2"
    color="grey-darken-4"
    dense 
    density="compact">
    <v-toolbar-title>
      <router-link
        :to="{name:'home'}"
        title="Home"
        style="color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));">
        SoundOwl
      </router-link>
    </v-toolbar-title>
    <v-spacer></v-spacer>
    <v-text-field
      v-model="q"
      placeholder="Search..."
      flat
      rounded
      hide-details
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      @keydown.enter="submit"
    ></v-text-field>
    <Menu></Menu>
  </v-app-bar>
</template>

<script>
import Menu from './menu/Menu.vue';

export default {
  name: 'Header',
  components: {
    Menu
  },
  data() {
    return {
      q: '',
    };
  },
  methods: {
    submit() {
      this.$router.push({ name: 'search', query: { SearchWord: this.q } });
    },
  },
}
</script>
