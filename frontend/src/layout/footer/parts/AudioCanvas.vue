<template>
  <ContextMenu
    :items="menuItems"
    @select="(item) => item.action()"
    style="height: 100%;width: 100%;"
  >
    <canvas
      ref="canvas"
      v-if="isVisibleAnalyser"
      class="analyser-view"
      style="height: 100%;display: block;"
      :width="width"
      :height="height"
    />

    <div
      v-else
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
      lyrics: '',
      menuItems: [
        { label: 'Lyrics', action: () => { this.isVisibleAnalyser = false; this.$emit('toggleView'); this.resetCanvas(); } },
        { label: 'Visualizer', action: () => { this.isVisibleAnalyser = true; this.$emit('toggleView'); this.resetCanvas(); } }
      ]
    };
  },
  mounted() {
    this.initializeCanvas();
    this.updateLyrics();
    audio.eventSupport.addEventListener('audio_info_loaded', this.updateLyrics);
  },
  beforeUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    audio.eventSupport.removeEventListener('audio_info_loaded', this.updateLyrics);
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
</style>