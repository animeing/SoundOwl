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
        class="text-h6 text-decoration-none"
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
      class="search-input"
      :append-inner-icon="isSmall ? 'mdi-close' : ''"
      @click:append-inner="closeSearch"
    ></v-text-field>
    <div class="menu-slot">
      <Menu></Menu>
    </div>
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
  :deep(.v-toolbar__content) {
    padding-inline: 16px 6px;
  }

  .search-input {
    width: min(40vw, 760px);
    max-width: 760px;
  }

  .v-toolbar-title{
    overflow-x: hidden;
    margin-inline-start: 0 !important;
    flex: 0 0 auto;
  }
  .search-btn {
    flex: 0 0 auto;
  }

  .menu-slot {
    display: flex;
    justify-content: flex-end;
  }

  @media screen and (max-width: 768px) {
    :deep(.v-toolbar__content) {
      padding-inline: 14px 4px;
    }

    .search-input {
      width: 100%;
    }

    .v-spacer {
      display: none;
      visibility: hidden;

    }

    .search-btn {
      margin-left: auto;
    }

    .menu-slot {
      margin-left: 4px;
      flex: 0 0 auto;
    }
  }
</style>
