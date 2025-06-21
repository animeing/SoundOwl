<template>
  <ContextMenu
    :items="menuItems"
    @select="(item) => item.action()"
    style="height: 100%;width: 100%;"
  >
    <transition-group
      name="album-art"
      tag="div"
      class="album-art-container"
    >
      <img
        v-for="art in arts"
        :key="art.id"
        :src="art.url"
        class="album-art-img"
      />
    </transition-group>

    <canvas
      ref="canvas"
      v-if="isVisibleAnalyser"
      class="analyser-view"
      style="height: 100%;display: block;"
      :width="width"
      :height="height"></canvas>

    <div
      v-if="isLyricsVisible"
      class="lyrics-view"
    >
      <pre>{{ lyrics }}</pre>
    </div>
  </ContextMenu>
</template>
<script>
import { onBeforeUnmount } from 'vue';
import audio from '../../../audio/AudioPlayer';
import { AudioPlayStateEnum } from '../../../audio/enum/AudioPlayStateEnum';
import { BaseFrameWork } from '../../../base';
import ContextMenu from '../../common/ContextMenu.vue';
import { BASE } from '../../../utilization/path';

export default {
  name: 'AudioCanvas',
  components: { ContextMenu },
  props: {
    isView: {
      type: Boolean
    }
  },
  emits: { 'toggleView': null },
  data() {
    return {
      width: window.innerWidth,
      height: window.innerHeight - 45,
      isVisibleAnalyser: true,
      isLyricsVisible: false,
      lyrics: '',
      arts: [],
      seq: 0,
      menuItems: [
        { label: 'Lyrics',
          action: () => {
            this.isVisibleAnalyser = false;
            this.isLyricsVisible = true;
            this.$emit('toggleView');
            this.resetCanvas();
          }
        },
        { label: 'Visualizer',
          action: () => {
            this.isVisibleAnalyser = true;
            this.isLyricsVisible = false;
            this.$emit('toggleView');
            this.resetCanvas();
          }
        },
        { label: 'Album Art',
          action: () => {
            this.isVisibleAnalyser = false;
            this.isLyricsVisible = false;
            this.$emit('toggleView');
            this.resetCanvas();
          }
        },
      ]
    };
  },
  mounted() {
    if(audio.audioEffectManager.audioContext != null){
      this.initializeCanvas();
    } else {
      audio.eventSupport.addEventListener('initalize', this.initializeCanvas);
    }
    this.updateLyrics();
    audio.eventSupport.addEventListener('audio_info_loaded', this.updateLyrics);
    audio.eventSupport.addEventListener('audio_info_loaded', this.pushArt);
    this.pushArt();
  },
  beforeUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    audio.eventSupport.removeEventListener('audio_info_loaded', this.updateLyrics);
    audio.eventSupport.removeEventListener('audio_info_loaded', this.pushArt);
    audio.eventSupport.removeEventListener('initalize', this.initializeCanvas);
  },
  methods: {
    initializeCanvas() {
      const canvas = this.$refs.canvas;
      if (canvas && canvas.getContext) {
        this.ctx = canvas.getContext('2d');
        this.animationId = requestAnimationFrame(this.run);
        this.setupVisualizer();
      } else {
        console.error('Canvas element not found or getContext is not a function');
      }
    },
    pushArt(){
      if(audio.currentAudioClip == null) return; // 現在の曲が無い場合は何もしない
      const url = `${BASE.HOME}img/album_art.php?media_hash=${audio.currentAudioClip.albumKey}`;
      if(this.seq[this.seq.length-1] == url) return; // 連続で同じアートを追加しない
      this.arts.push({id:++this.seq,url});
      // 600ms 後に旧アートを削除して1枚だけ残す
      setTimeout(()=>{ if(this.arts.length>1) this.arts.shift(); }, 250);
    },
    resetCanvas() {
      if (this.isVisibleAnalyser) {
        this.$nextTick(() => {
          const canvas = this.$refs.canvas;
          if (canvas) {
            this.initializeCanvas();
          } else {
            console.warn('Canvas element not found during resetCanvas after DOM update');
          }
        });
      } else {
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
        }
      }
    },
    setupVisualizer() {
      const color = BaseFrameWork.getCSSProperty(this.$refs.canvas, '--box-color');
      this.canvasObjects = new BaseFrameWork.List();
      this.analyser = audio.audioEffectManager.audioContext.createAnalyser();
      this.analyser.fftSize = 1<<7+1;
      this.analyser.smoothingTimeConstant = .5;
      audio.audioEffectManager.source.connect(this.analyser);
      const createCount = this.analyser.frequencyBinCount;
      this.spectrums = new Uint8Array(createCount);
      for (let createIndex = 0; createIndex < createCount; createIndex++) {
        const box = new BaseFrameWork.Draw.Figure.BoxCanvasObject2D();
        box.color.setRgb(color);
        box.update = () => {
          if (this.spectrums) {
            box.transform.position.x = (createIndex + 1) * (this.width / (createCount + 4));
            box.transform.position.y = 0;
            box.transform.scale.x = (this.width / createCount) >> 1;
            box.transform.scale.y = (this.spectrums[createIndex] / 0xff) * (this.height >> 1);
          }
        };
        box.fcontext(this.ctx);
        this.canvasObjects.add(box);
      }
    },
    run() {
      if (this.ctx) {
        this.clear();
        this.renderVisualizer();
        this.animationId = requestAnimationFrame(this.run);
      }
    },
    clear() {
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    },
    renderVisualizer() {
      if (this.analyser) {
        this.analyser.getByteFrequencyData(this.spectrums);
        for (const box of this.canvasObjects) {
          box.update();
          box.renderObjectBase();
        }
      }
    },
    updateLyrics() {
      this.lyrics = audio.data.lyrics || 'No lyrics available';
    }
  }
};
</script>
<style scoped>
canvas {
  --box-color: #aaa;
}
.lyrics-view {
  white-space: pre-wrap;
  padding: 10px;
  font-size: 1.2em;
  line-height: 1.5;
  color: var(--box-color);
  border: 1px solid #ddd;
  border-radius: 5px;
  overflow-y: auto;
  height: 100%;
  display: block; /* Ensure the lyrics-view is visible */
}
.album-art-container{
  position:absolute; inset:0;
  overflow:hidden; perspective:1000px;
}
.album-art-img{
  position:absolute; top:50%; left:50%;
  width:60vmin; height:60vmin; object-fit:cover;
  transform:translate(-50%,-50%);
}

/* === トランジション === */
.album-art-enter-from{
  transform:translate(-50%,-50%) translateZ(-500px) scale(.3);
  opacity:0;
}
.album-art-enter-to,
.album-art-leave-from{
  transform:translate(-50%,-50%) translateZ(0) scale(1);
  opacity:1;
}
.album-art-leave-to{
  transform:translate(-50%,-50%) translateZ(-500px) scale(.3);
  opacity:0;
}
.album-art-enter-active,
.album-art-leave-active{
  transition:transform .6s ease, opacity .6s ease;
}
</style>