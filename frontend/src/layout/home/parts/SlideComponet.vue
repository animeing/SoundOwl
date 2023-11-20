<template>
    <div class="box">
        <p>{{ slideTitle }}</p>
        <SlideList :on-click="itemClick" :context-menu="contextmenu" :data-request="dataRequest"></SlideList>
    </div>
</template>

<script>
import SlideList from './SlideList.vue';

export default {
    name: 'SlideComponent',
    props: {
        slideTitle: {
            type: String
        },
        dataRequest: {
            type: Function
        },
        itemClick: {
            type: Function
        },
        contextMenu: {
            type: Function
        }
    },
    methods: {
        contextmenu(item) {
            if (!this.contextMenu) {
                return;
            }
            this.contextMenu(item);
        }
    },
    components: {
        SlideList
    }
};
</script>

<style>
/* ここにCSSスタイルを追加 */
</style>
