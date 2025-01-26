<template>
    <li :class="{'active':isActive}">
        <button @click="action">
            {{ name }}
        </button>
    </li>
</template>
<script>
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
        this.$router.push({name:this.link});
      this.isActive = this.$route.name == this.link;
    }
  }
};
</script>

<style scoped>
li {
  flex-grow: 1;
  height: inherit;
  border-top: 1px solid var(--subcoloraccentcolor);
  border-left: 1px solid var(--subcoloraccentcolor);
  border-right: 1px solid var(--subcoloraccentcolor);

  border-radius: 20px 20px 0 0;
  overflow: hidden;
}
li:not(.active) {
  background: var(--subcoloraccentcolor);
}
li > button {
  width: 100%;
  height: inherit;
}
</style>
