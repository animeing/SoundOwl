<template>
  <section class="slide-section">
    <h2 class="slide-title">{{ slideTitle }}</h2>
    <SlideList
      :on-click="itemClick"
      :context-menu="contextmenu"
      :data-request="dataRequest"
    />
  </section>
</template>

<script>
import SlideList from './SlideList.vue';

export default {
  name: 'SlideComponent',
  components: {
    SlideList
  },
  props: {
    slideTitle: {
      type: String,
      require: true,
      default(){
        return '';
      }
    },
    dataRequest: {
      type: Function,
      require: true,
      default(){
        return ()=>{return {};};
      }
    },
    itemClick: {
      type: Function,
      require: true,
      default(){
        return ()=>{return {};};
      }
    },
    contextMenu: {
      type: Function,
      require: true,
      default(){
        return ()=>{return {};};
      }
    }
  },
  methods: {
    contextmenu(item) {
      if (!this.contextMenu) {
        return;
      }
      this.contextMenu(item);
    }
  }
};
</script>

<style scoped>
.slide-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slide-title {
  margin: 0;
  padding-inline: 2px;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.2;
}

@media screen and (max-width: 600px) {
  .slide-title {
    font-size: 1rem;
  }
}
</style>
