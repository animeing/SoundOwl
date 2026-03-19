<template>
  <v-app-bar
    app
    :elevation="2"
    color="grey-darken-4"
    density="compact"
    class="header-bar"
  >
    <v-toolbar-title class="header-title">
      <router-link
        :to="{ name: 'home' }"
        title="Home"
        class="title-link"
      >
        SoundOwl
      </router-link>
    </v-toolbar-title>

    <div class="header-actions" :class="{ 'search-open': showSearch }">
      <v-btn
        v-if="isSmall && !showSearch"
        variant="outlined"
        density="comfortable"
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
      />

      <Menu />
    </div>
  </v-app-bar>
</template>

<script>
import { nextTick } from 'vue';
import Menu from './menu/Menu.vue';

export default {
  name: 'Header',
  components: {
    Menu
  },
  data() {
    return {
      q: '',
      showSearch: false,
      width: typeof window !== 'undefined' ? window.innerWidth : 1280
    };
  },
  computed: {
    isSmall() {
      return this.width < 960;
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
      if (!this.isSmall) {
        this.showSearch = false;
      }
    },
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
        setTimeout(() => {
          this.showSearch = false;
        }, 100);
      }
    }
  }
};
</script>

<style scoped>
.header-bar {
  padding-inline: 8px;
}

.header-title {
  min-width: 0;
  overflow: hidden;
}

.title-link {
  color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));
  text-decoration: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.transition-width {
  transition: width 0.3s ease;
}

.search-input {
  width: min(250px, 42vw);
  min-width: 0;
}

.search-btn {
  width: 40px;
  min-height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media screen and (max-width: 959px) {
  .header-bar {
    padding-inline: 4px;
  }

  .header-actions {
    flex: 1;
    justify-content: flex-end;
  }

  .header-actions.search-open {
    width: 100%;
  }

  .search-input {
    width: min(100%, 320px);
  }
}
</style>
