<template>
  <div @contextmenu.prevent="openMenu($event)" class="context-menu-wrapper">
    <slot></slot>
    <!-- オーバーレイ：ContextMenu が開いている間、全画面を覆ってクリックをキャッチ -->
    <div
      v-if="menuVisible"
      class="context-menu-overlay"
      @click.stop="closeMenu"
    ></div>
    <v-menu
      ref="menuRef"
      v-model="menuVisible"
      offset-y
      eager
      content-class="custom-context-menu"
      :style="{
        top: adjustedY + 'px',
        left: adjustedX + 'px',
        zIndex: 5000,
        position: 'fixed',
      }"
    >
      <v-list>
        <template v-for="(item, index) in items" :key="index">
          <!-- 子要素がある場合 -->
          <template v-if="item.children">
            <v-menu
              open-on-hover
              offset-x
              eager
              v-if="menuVisible"
              :style="{
                    zIndex: 6000
                  }"
            >
              <template #activator="{ props }">
                <v-list-item v-bind="props">
                  <v-list-item-title
                    >{{ item.label }}<v-icon
                      >mdi-chevron-right</v-icon
                    ></v-list-item-title
                  >
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
  import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'

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

  function closeMenu() {
    menuVisible.value = false
    console.log('closeMenu')
  }

  function openMenu(event) {
    // ContextMenu を開く前に全体のクリックをブロックするため、すべてのメニューを閉じる処理（前回の実装があればここで実施）
    window.dispatchEvent(new CustomEvent('closeAllContextMenus'))
    x.value = event.clientX
    y.value = event.clientY
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
  onMounted(() => {
    window.addEventListener('scroll', closeMenu)
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', closeMenu)
  })
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
    closeMenu()
  }
</script>

<style scoped>
  .context-menu-wrapper {
    position: relative;
  }

  /* オーバーレイで全画面を覆い、下層へのクリックを防止 */
  .context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 4000; /* ContextMenuの5000より低く設定 */
    background: transparent;
  }
  .custom-context-menu {
    z-index: 5000 !important;
  }
</style>
