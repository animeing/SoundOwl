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

let animationFrameId = null
let animationCancel = null
let runGeneration = 0
let isComponentMounted = true

const textStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  whiteSpace: 'nowrap',
  transition: 'none',
}))

function pause(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

function stopAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  const cancel = animationCancel
  animationCancel = null
  cancel?.()
}

function isRunActive(generation) {
  return isComponentMounted && isHovered.value && generation === runGeneration
}

function scrollTo(targetOffset, generation) {
  return new Promise(resolve => {
    stopAnimation()

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      if (animationCancel === finish) {
        animationCancel = null
      }
      resolve()
    }
    animationCancel = finish

    function step() {
      if (!isRunActive(generation)) {
        finish()
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
        finish()
        return
      }

      animationFrameId = requestAnimationFrame(step)
    }
    animationFrameId = requestAnimationFrame(step)
  })
}

async function runMarquee(generation) {
  while (isRunActive(generation)) {
    const targetOffset = containerWidthValue.value - textWidth.value
    await scrollTo(targetOffset, generation)
    if (!isRunActive(generation)) break
    await pause(pauseTime)
    if (!isRunActive(generation)) break
    await scrollTo(0, generation)
    if (!isRunActive(generation)) break
    await pause(pauseTime)
  }
}

function handleMouseEnter() {
  const generation = ++runGeneration
  isHovered.value = true
  if (containerRef.value && textRef.value) {
    containerWidthValue.value = containerRef.value.clientWidth
    textWidth.value = textRef.value.scrollWidth
  }
  if (textWidth.value > containerWidthValue.value) {
    runMarquee(generation)
  }
}

function handleMouseLeave() {
  runGeneration += 1
  isHovered.value = false
  stopAnimation()
  offset.value = 0
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value || !textRef.value) return
  containerWidthValue.value = containerRef.value.clientWidth
  textWidth.value = textRef.value.scrollWidth
})

onBeforeUnmount(() => {
  runGeneration += 1
  isComponentMounted = false
  stopAnimation()
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
