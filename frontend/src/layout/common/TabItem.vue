<template>
    <li :class="{'active':isActive}">
        <button @click="action">
            {{ name }}
        </button>
    </li>
</template>
<script>
import router from '../../router';
export default {
  name:'TabItem',
  props:{
    name:{
      type:String,
      require: true,
      default(){
        return '';
      }
    },
    link:{
      type:String,
      require: true,
      default() {
        return '';
      }
    }
  },
  data(){
    return {
      isActive:false
    };
  },
  watch: {
    '$route'(_to, _from) {
      this.isActive = this.$route.name == this.link;
    }
  },
  mounted() {
    this.isActive = this.$route.name == this.link;
  },
  methods:{
    action() {
      if(!this.isActive)
        router.push({name:this.link});
      this.isActive = this.$route.name == this.link;
    }
  }
};
</script>