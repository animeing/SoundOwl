<template>
  <div
    ref="containerRef"
    class="marquee-container"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div ref="textRef" :style="textStyle" class="marquee-text">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { BaseFrameWork } from '../../base.js'

const props = defineProps({
  speed: { type: Number, default: 1, validator: v => v > 0 },
  pauseTime: { type: Number, default: 2000, validator: v => v >= 0 },
})
const { speed, pauseTime } = props

const containerRef = ref(null)
const textRef = ref(null)
const containerWidthValue = ref(0)
const textWidth = ref(0)
const offset = ref(0)
const isHovered = ref(false)

let animationFrame = new BaseFrameWork.AnimationFrame()
let isComponentMounted = true

const textStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  whiteSpace: 'nowrap',
  transition: 'none',
}))

function pause(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

function scrollTo(targetOffset) {
  return new Promise(resolve => {
    function step() {
      if (!isComponentMounted || !isHovered.value) {
        resolve()
        return
      }
      const distance = targetOffset - offset.value
      const direction = distance < 0 ? -1 : 1
      const move = Math.min(Math.abs(distance), speed) * direction
      offset.value += move
      if (
        (direction === -1 && offset.value <= targetOffset) ||
        (direction === 1 && offset.value >= targetOffset)
      ) {
        offset.value = targetOffset
        resolve()
      } else {
        animationFrame.startAnimation(step)
      }
    }
    animationFrame.startAnimation(step)
  })
}

async function runMarquee() {
  while (isHovered.value && isComponentMounted) {
    const targetOffset = containerWidthValue.value - textWidth.value
    await scrollTo(targetOffset)
    if (!isHovered.value) break
    await pause(pauseTime)
    await scrollTo(0)
    if (!isHovered.value) break
    await pause(pauseTime)
  }
}

function handleMouseEnter() {
  isHovered.value = true
  if (containerRef.value && textRef.value) {
    containerWidthValue.value = containerRef.value.clientWidth
    textWidth.value = textRef.value.scrollWidth
  }
  if (textWidth.value > containerWidthValue.value) {
    runMarquee()
  }
}

function handleMouseLeave() {
  isHovered.value = false
  animationFrame.stopAnimation()
  offset.value = 0
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value || !textRef.value) return
  containerWidthValue.value = containerRef.value.clientWidth
  textWidth.value = textRef.value.scrollWidth
})

onBeforeUnmount(() => {
  isComponentMounted = false
  animationFrame.stopAnimation()
})
</script>

<style scoped>
.marquee-container {
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
}
.marquee-text {
  display: inline-block;
}
</style>
