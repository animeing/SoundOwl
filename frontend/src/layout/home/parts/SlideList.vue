<template>
    <sw-audio-slide-list>
        <div>
            <button v-for="item in data" @click.right.prevent="contextmenu(item)" @click="click(item)" :key="item.id">
                <img loading="lazy" :src="createImageSrc(item.albumKey)">
                <p :data-hint="item.title">{{ item.title }}</p>
            </button>
        </div>
    </sw-audio-slide-list>
</template>

<script>
import "../../../layout";
import { BASE } from '../../../utilization/path';

export default {
    data() {
        return {
            data: []
        };
    },
    props: {
        dataRequest: {
            type: Function
        },
        onClick: {
            type: Function
        },
        contextMenu: {
            type: Function
        }
    },
    methods: {
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=` + albumKey;
        },
        click(soundClip) {
            if (this.onClick) {
                this.onClick(soundClip);
            }
            return;
        },
        contextmenu(item) {
            ContextMenu.contextMenu.destoryChildren();
            if(!this.contextMenu) {
                return;
            }
            this.contextMenu(item);
        }
    },
    created() {
        this.data = this.dataRequest();
    }
};
</script>

<style>
/* ここにCSSスタイルを追加 */
</style>
