<template>
    <ul class="tabmenu">
        <TabItem
            name="Server"
            link="setting" />
        <TabItem
            name="Equalizer"
            link="equalizer" />
        <TabItem
            name="Effect"
            link="effect" />
    </ul>
</template>
<script>
import TabItem from '../../common/TabItem.vue';

export default {
  components:{
    TabItem
  }
};
</script>