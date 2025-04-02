<template>
  <div @contextmenu.prevent="openMenu($event)" class="context-menu-wrapper">
    <slot></slot>
    <v-menu
      ref="menuRef"
      v-model="menuVisible"
      absolute
      offset-y
      teleport="false"
      eager
      content-class="custom-context-menu"
      :style="{
        top:adjustedY+'px',
        left: adjustedX+'px'
      }"
    >
      <v-list>
        <template v-for="(item, index) in items" :key="index">
          <!-- 子要素がある場合は、親項目自体を activator とする -->
          <template v-if="item.children">
            <v-menu open-on-hover offset-x teleport="false" eager>
              <template #activator="{ props }">
                <v-list-item v-bind="props">
                  <v-list-item-title>{{ item.label }}</v-list-item-title>
                  <v-icon>mdi-chevron-right</v-icon>
                </v-list-item>
              </template>
              <v-list>
                <v-list-item
                  v-for="(child, cIndex) in item.children"
                  :key="cIndex"
                  @click="selectItem(child)"
                >
                  <v-list-item-title>{{ child.label }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
          <!-- 子要素が無い場合 -->
          <template v-else>
            <v-list-item @click="selectItem(item)">
              <v-list-item-title>{{ item.label }}</v-list-item-title>
            </v-list-item>
          </template>
        </template>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup>
  import { ref, nextTick, watch } from 'vue'

  const props = defineProps({
    items: {
      type: Array,
      default: () => [],
    },
  })
  const emit = defineEmits(['select'])

  const menuVisible = ref(false)
  const x = ref(0)
  const y = ref(0)
  const adjustedX = ref(0)
  const adjustedY = ref(0)

  function openMenu(event) {
    x.value = event.clientX
    y.value = event.clientY
    // 初期値として調整前の座標を設定
    adjustedX.value = x.value
    adjustedY.value = y.value
    menuVisible.value = true
  }

  watch(menuVisible, async visible => {
    if (visible) {
      await nextTick()
      adjustPosition()
    }
  })

  // 表示されたメニューのサイズを取得し、画面外に出ないように座標を調整
  function adjustPosition() {
    const menuEl = document.querySelector('.custom-context-menu')
    if (!menuEl || typeof menuEl.getBoundingClientRect !== 'function') return
    const rect = menuEl.getBoundingClientRect()
    let newX = x.value
    let newY = y.value
    if (newX + rect.width > window.innerWidth) {
      newX = window.innerWidth - rect.width
    }
    if (newY + rect.height > window.innerHeight) {
      newY = window.innerHeight - rect.height
    }
    adjustedX.value = newX
    adjustedY.value = newY
  }

  function selectItem(item) {
    emit('select', item)
    menuVisible.value = false
  }
</script>

<style scoped>
  .context-menu-wrapper {
    position: relative;
  }
</style>
