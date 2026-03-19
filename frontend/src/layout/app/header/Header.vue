<template>
  <v-app-bar
    :elevation="2"
    color="grey-darken-4"
    density="compact"
    class="px-2"
  >
    <v-toolbar-title class="title-wrap">
      <router-link
        :to="{ name: 'home' }"
        title="Home"
        class="title-link"
      >
        SoundOwl
      </router-link>
    </v-toolbar-title>

    <v-spacer v-if="!isSmall" />

    <v-btn
      v-if="isSmall && !showSearch"
      variant="outlined"
      density="compact"
      rounded
      class="search-btn"
      @click="toggleSearch"
    >
      <v-icon>mdi-magnify</v-icon>
    </v-btn>

    <v-text-field
      v-if="!isSmall || showSearch"
      ref="searchField"
      v-model="q"
      placeholder="Search..."
      rounded
      hide-details
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      class="transition-width search-input"
      :append-inner-icon="isSmall ? 'mdi-close' : ''"
      @keydown.enter="submit"
      @blur="handleBlur"
      @click:append-inner="closeSearch"
    />

    <Menu />
  </v-app-bar>
</template>

<script>
import { nextTick } from 'vue';
import { useDisplay } from 'vuetify';
import Menu from './menu/Menu.vue';

export default {
  name: 'Header',
  components: {
    Menu
  },
  data() {
    return {
      q: '',
      showSearch: false
    };
  },
  setup() {
    const display = useDisplay();

    return {
      isSmall: display.smAndDown
    };
  },
  methods: {
    submit() {
      this.$router.push({ name: 'search', query: { SearchWord: this.q } });
    },
    toggleSearch() {
      this.showSearch = !this.showSearch;
      if (this.showSearch) {
        nextTick(() => {
          this.$refs.searchField?.focus();
        });
      }
    },
    closeSearch() {
      if (this.isSmall) {
        this.showSearch = false;
      }
    },
    handleBlur() {
      if (this.isSmall) {
        window.setTimeout(() => {
          this.showSearch = false;
        }, 100);
      }
    }
  }
};
</script>

<style scoped>
.transition-width {
  transition: width 0.3s ease;
}

.search-input {
  width: min(320px, 100%);
  max-width: 100%;
}

.title-wrap {
  overflow: hidden;
  min-width: 0;
}

.title-link {
  color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));
  text-decoration: none;
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
  .search-input {
    margin-inline: 8px;
  }
}
</style>
