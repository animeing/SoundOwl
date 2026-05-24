<template>
    <v-tabs v-model="tab" class="settings-tabs">
      <v-tab
        v-for="(item, index) in menuItems"
        :key="index"
        :to="item.route"
      >
        {{ item.title }}
      </v-tab>
    </v-tabs>
</template>

<script>
export default {
  name: 'TabMenu',
  props: {
    menuItems: {
      type: Array,
      required: true,
      default: () => [],
    },
  },
  data() {
    return {
      tab: null,
    };
  },
  watch: {
    $route(to) {
      const activeIndex = this.menuItems.findIndex((item) =>
        this.routeMatches(item.route, to)
      );
      this.tab = activeIndex !== -1 ? activeIndex : null;
    },
  },
  mounted() {
    const activeIndex = this.menuItems.findIndex((item) =>
      this.routeMatches(item.route, this.$route)
    );
    this.tab = activeIndex !== -1 ? activeIndex : null;
  },
  methods: {
    routeMatches(route, currentRoute) {
      if (typeof route === 'object') {
        return route.name === currentRoute.name;
      }
      return route === currentRoute.path;
    },
  },
};
</script>

<style scoped>
.settings-tabs {
  margin-top: 8px;
}

.settings-tabs :deep(.v-tab) {
  font-family: "Lucida Grande", "Lucida Sans Unicode", "Hiragino Kaku Gothic Pro", "Meiryo", Helvetica, Arial, Verdana, sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  min-width: 102px;
  padding-inline: 14px;
  text-transform: uppercase;
}

@media screen and (max-width: 600px) {
  .settings-tabs :deep(.v-tab) {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    max-width: 84px;
    min-width: auto;
    padding-inline: 10px;
  }

  .settings-tabs :deep(.v-btn__content) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
