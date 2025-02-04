<template>
  <v-app-bar
    app
    :elevation="2"
    color="grey-darken-4"
    dense 
    density="compact">
    <v-toolbar-title >
      <router-link
        :to="{name:'home'}"
        title="Home"
        style="color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));">
        SoundOwl
      </router-link>
    </v-toolbar-title>
    <v-spacer></v-spacer>
    <v-btn
      v-if="isSmall && !showSearch"
      variant="outlined"
      density="compact"
      rounded
      @click="toggleSearch"
      class="search-btn"
    >
      <v-icon>mdi-magnify</v-icon>
    </v-btn>

    <v-text-field
      v-if="!isSmall || showSearch"
      v-model="q"
      placeholder="Search..."
      flat
      rounded
      hide-details
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      @keydown.enter="submit"
      @blur="handleBlur"
      ref="searchField"
      class="transition-width search-input"
      :append-inner-icon="isSmall ? 'mdi-close' : ''"
      @click:append-inner="closeSearch"
    ></v-text-field>
    <Menu></Menu>
  </v-app-bar>
</template>
<script>
import Menu from './menu/Menu.vue';
import { ref, watch, nextTick, computed } from 'vue'
import { useDisplay } from 'vuetify'

export default {
  name: 'Header',
  components: {
    Menu
  },
  data() {
    return {
      q: '',
      showSearch: false,
      isSmall:false
    };
  },
  created(){
    const {xs, sm} = useDisplay();
    this.isSmall = computed(() => xs.value || sm.value);
  },
  methods: {
    submit() {
      this.$router.push({ name: 'search', query: { SearchWord: this.q } });
    },
    toggleSearch()  {
      this.showSearch = !this.showSearch;
      if (this.showSearch) {
        nextTick(() => {
          this.$refs.searchField.focus();
        })
      }
    },
    closeSearch() {
      if (this.isSmall) {
        this.showSearch = false;
      }
    },
    handleBlur() {
      if (this.isSmall) {
        setTimeout(() => {
          this.showSearch = false;
        }, 100);
      }
    }

  },
}
</script>

<style scoped>
  .transition-width {
    transition: width 0.3s ease;
  }

  .search-input {
    width: 250px;
  }

  .v-toolbar-title{
    overflow-x: hidden;
  }
  .search-btn {
    width: 40px;
    min-height: 40px; 
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media screen and (max-width: 768px) {
    .v-spacer {
      display: none;
      visibility: hidden;

    }
  }
</style>
