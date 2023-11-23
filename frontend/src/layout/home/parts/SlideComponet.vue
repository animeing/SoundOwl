<template>
    <div class="box">
        <p>{{ slideTitle }}</p>
        <SlideList
            :on-click="itemClick"
            :context-menu="contextmenu"
            :data-request="dataRequest" />
    </div>
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
