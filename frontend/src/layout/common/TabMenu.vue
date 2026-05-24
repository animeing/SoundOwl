<template>
    <v-tabs v-model="tab" class="mt-2 settings-tabs">
      <v-tab
        v-for="(item, index) in menuItems"
        :key="index"
        :to="item.route"
        class="font-weight-medium text-uppercase"
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
.settings-tabs :deep(.v-tab) {
  min-width: auto;
  padding-inline: 16px;
}

@media screen and (max-width: 600px) {
  .settings-tabs :deep(.v-tab) {
    max-width: 84px;
    min-width: auto;
    padding-inline: 12px;
  }

  .settings-tabs :deep(.v-btn__content) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
