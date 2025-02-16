<template>
  <span @contextmenu.prevent="openContextMenu($event)">
    <slot name="main"></slot>
  </span>
  <teleport to="body">
    <span
      v-if="menuVisible"
      class="context-menu"
      :style="{
        position: 'fixed',
        top: menuY + 'px',
        left: menuX + 'px',
        zIndex: 2000
      }"
    >
      <v-list class="pa-0">
        <slot name="menu"></slot>
      </v-list>
    </span>
  </teleport>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

let contextMenuIdCounter = 0

export default {
  inheritAttrs: false, 
  setup() {
    const instanceId = contextMenuIdCounter++
    const menuVisible = ref(false)
    const menuX = ref(0)
    const menuY = ref(0)

    const handleGlobalClose = event => {
      if (event.detail !== instanceId) {
        menuVisible.value = false
      }
    }

    onMounted(() => {
      window.addEventListener('closeContextMenus', handleGlobalClose)
    })

    onUnmounted(() => {
      window.removeEventListener('closeContextMenus', handleGlobalClose)
    })

    const openContextMenu = event => {
      window.dispatchEvent(new CustomEvent('closeContextMenus', { detail: instanceId }))
      menuX.value = event.clientX
      menuY.value = event.clientY
      menuVisible.value = true
      window.addEventListener('click', closeContextMenu)
    }

    const closeContextMenu = () => {
      menuVisible.value = false
      window.removeEventListener('click', closeContextMenu)
    }

    return { menuVisible, menuX, menuY, openContextMenu }
  },
}
</script>
