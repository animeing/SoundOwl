<template>
  <div ref="containerRef" class="marquee-container">
    <div ref="textRef" :style="textStyle" class="marquee-text">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import {BaseFrameWork} from '../../base.js'

const props = defineProps({
  speed: {
    type: Number,
    default: 1, // ピクセル/フレーム
    validator: value => value > 0
  },
  pauseTime: {
    type: Number,
    default: 2000, // ミリ秒
    validator: value => value >= 0
  },
  extraSpace: {
    type: Number,
    default: 0, // ピクセル
    validator: value => value >= 0
  },
})

const { speed, pauseTime, extraSpace } = props

// Refs
const containerRef = ref(null)
const textRef = ref(null)

// 幅計測用
const containerWidthValue = ref(0)
const textWidth = ref(0)

// スクロール位置
const offset = ref(0)

// アニメーション管理
let animationFrame = new BaseFrameWork.AnimationFrame();
let isComponentMounted = true
let stopMarqueeLoop = false

// MutationObserver 管理
let mutationObserver = null

// スタイル（translateX で位置制御）
const textStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  whiteSpace: 'nowrap',
  transition: 'none'
}))

// 一時停止用関数
function pause(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

// スクロールを行う関数
function scrollTo(targetOffset) {
  return new Promise(resolve => {
    function step() {
      if (!isComponentMounted) {
        resolve()
        return
      }
      const distance = targetOffset - offset.value
      const direction = distance < 0 ? -1 : 1
      const move = Math.min(Math.abs(distance), speed) * direction
      offset.value += move

      if ((direction === -1 && offset.value <= targetOffset) ||
          (direction === 1 && offset.value >= targetOffset)) {
        offset.value = targetOffset
        resolve()
      } else {
        animationFrame.startAnimation(step)
      }
    }
    animationFrame.startAnimation(step)
  })
}

// メインのスクロールループ
async function runMarquee() {
  stopMarqueeLoop = false
  while (isComponentMounted && !stopMarqueeLoop) {
    await scrollTo(-(textWidth.value + extraSpace))
    if (stopMarqueeLoop) break

    offset.value = containerWidthValue.value + extraSpace
    await scrollTo(0)
    await pause(pauseTime)
  }
}

// 再計測しスクロールの必要性をチェックする関数
async function updateMeasurementsAndRestart() {
  await nextTick()
  if (!containerRef.value || !textRef.value) return

  containerWidthValue.value = containerRef.value.clientWidth
  textWidth.value = textRef.value.scrollWidth


  stopMarqueeLoop = true
  animationFrame.stopAnimation()

  if (textWidth.value <= containerWidthValue.value) {
    offset.value = 0
    return
  }
  offset.value = 0
  runMarquee()
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value || !textRef.value) {
    console.error('containerRef or textRef is null')
    return
  }
  containerWidthValue.value = containerRef.value.clientWidth
  textWidth.value = textRef.value.scrollWidth

  mutationObserver = new MutationObserver((mutationsList) => {
    updateMeasurementsAndRestart()
  })
  mutationObserver.observe(textRef.value, {
    childList: true,
    subtree: true,
    characterData: true
  })
  if (textWidth.value <= containerWidthValue.value) {
    return
  }
  offset.value = 0
  runMarquee()

})

onBeforeUnmount(() => {
  isComponentMounted = false
  animationFrame.stopAnimation()
  if (mutationObserver) mutationObserver.disconnect()
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
