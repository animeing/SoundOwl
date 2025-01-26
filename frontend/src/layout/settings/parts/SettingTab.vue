<template>
  <TabMenu :menuItems="menuItems"></TabMenu>
</template>
<script>
import TabMenu from '../../common/TabMenu.vue';

export default {
  components:{
    TabMenu
  },
  data(){
    return {
      menuItems:[
        {title:'General', route:{name: 'setting'}},
        {title:'Equalizer', route:{name:'equalizer'}},
        {title:'Effect', route:{name:'effect'}}
      ]
    };
  }
};
</script>