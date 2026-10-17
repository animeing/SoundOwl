<template>
  <div ref="containerRef" class="marquee-container">
    <div ref="textRef" class="marquee-text">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { useOverflowMarquee } from './useOverflowMarquee';

const props = defineProps({
  speed: {
    type: Number,
    default: 1,
    validator: value => value > 0,
  },
  pauseTime: {
    type: Number,
    default: 2000,
    validator: value => value >= 0,
  },
  extraSpace: {
    type: Number,
    default: 0,
    validator: value => value >= 0,
  },
});

const { containerRef, textRef } = useOverflowMarquee(props, 'loop');
</script>

<style scoped>
.marquee-container {
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
}

.marquee-text {
  display: inline-block;
  white-space: nowrap;
}
</style>
