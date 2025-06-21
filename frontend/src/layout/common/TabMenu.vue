<template>
    <v-tabs v-model="tab">
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
