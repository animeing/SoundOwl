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
})

const { speed, pauseTime } = props

// Refs
const containerRef = ref(null)
const textRef = ref(null)

// コンテナ幅およびテキスト幅の取得用
const containerWidthValue = ref(0)
const textWidth = ref(0)

// スクロール位置（offset）
const offset = ref(0)

// アニメーション管理
let animationFrame = new BaseFrameWork.AnimationFrame();
let isComponentMounted = true

// MutationObserver 管理
let mutationObserver = null
let debounceTimeout = null  // デバウンス用タイマー

// テキストに適用するスタイル
const textStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  whiteSpace: 'nowrap',
  transition: 'none',
}))

// 一時停止用の Promise
function pause(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

// 指定したオフセットまでスクロールする関数
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

      // 目標に到達したか判定
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

// メインのスクロールループ
async function runMarquee() {
  // 初期状態で数秒停止（offset = 0：テキスト左端が揃っている）
  await pause(pauseTime)
  while (isComponentMounted) {
    // 左方向へスクロール：テキスト末尾がコンテナ右端に来る位置
    const targetOffset = containerWidthValue.value - textWidth.value
    await scrollTo(targetOffset)
    await pause(pauseTime)

    // 右方向へスクロール：テキスト先頭がコンテナ左端に戻る（offset = 0）
    await scrollTo(0)
    await pause(pauseTime)
  }
}

async function updateMeasurementsAndRestart() {
  await nextTick()
  if (!containerRef.value || !textRef.value) {
    console.error('containerRef or textRef is null')
    return
  }
  containerWidthValue.value = containerRef.value.clientWidth
  textWidth.value = textRef.value.scrollWidth

  // テキストがコンテナに収まるならスクロール不要
  if (textWidth.value <= containerWidthValue.value) {
    offset.value = 0
    return
  }

  // 再起動する前にキャンセル
  animationFrame.stopAnimation()
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

  mutationObserver = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      updateMeasurementsAndRestart()
    }, 100)
  })

  mutationObserver.observe(textRef.value, {
    childList: true,
    subtree: true,
    characterData: true,
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
