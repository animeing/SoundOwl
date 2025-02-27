<template>
    <canvas
        v-if="isVisibleAnalyser"
        class="analyser-view"
        style="height: 100%;display: block;"
        :width="width"
        :height="height"
        @click.right.prevent="contextCanvasMenu()" />

    <div
        v-else
        class="lyrics-view"
        @click.right.prevent="contextCanvasMenu()">
        {{ lyrics }}
    </div>
</template>
<script>
import { onBeforeUnmount } from 'vue';
import audio from '../../../audio/AudioPlayer';
import { AudioPlayStateEnum } from '../../../audio/enum/AudioPlayStateEnum';
import { BaseFrameWork, ContextMenu } from '../../../base';

export default {
  name:'AudioCanvas',
  props:{
    'isView':{
      type:Boolean
    }
  },
  emits: {'toggleView': null},
  data() {
    return {
      width:window.innerWidth,
      height:window.innerHeight - 45,
      isVisibleAnalyser:true,
      lyrics:''
    };
  },
  watch:{
    isView(){
      this.resize();
    },
    isVisibleAnalyser(){
      this.$nextTick(()=>{
        if(this.isVisibleAnalyser) {
          this.ctx = this.$el.getContext('2d');
          this.animationId = requestAnimationFrame(this.run);
          for (const box of this.canvasObjects) {
            box.fcontext(this.ctx);
          }
        } else {
          cancelAnimationFrame(this.animationId);
          this.$el.scroll({top: 0});
        }
      });
    }
  },
  created(){
    window.addEventListener('resize', ()=>{
      this.resize();
    });
    audio.eventSupport.addEventListener('audio_info_loaded', ()=>{
      this.lyrics = '';
      if( audio.data.lyrics == undefined) {
        return;
      }
      this.lyrics = audio.data.lyrics;
    });
  },
  mounted() {
    this.ctx = this.$el.getContext('2d');
    let color = BaseFrameWork.getCSSProperty(this.$el, '--box-color');
    this.animationId = requestAnimationFrame(this.run);
    this.canvasObjects = new BaseFrameWork.List();
    const initalize = ()=>{
      this.analyser = audio.audioEffectManager.audioContext.createAnalyser();
      this.analyser.fftSize = 1<<7+1;
      audio.audioEffectManager.source.connect(this.analyser);
      let filter = audio.audioEffectManager.audioContext.createBiquadFilter();
      filter.type = 'allpass';
      audio.audioEffectManager.source.connect(filter);
          
      let leng = this.analyser.frequencyBinCount;
      this.spectrums = new Uint8Array(leng);
      this.analyser.smoothingTimeConstant = .5;
      this.analyser.getByteFrequencyData(this.spectrums);
      for(let createCount = 0, len = this.spectrums.length; createCount < len; createCount++){
        let box = new BaseFrameWork.Draw.Figure.BoxCanvasObject2D;
        box.color.setRgb(color);
        box.update = async ()=>{
          if(this.spectrums != null){
            box.transform.position.x = (createCount+1)*(this.$el.width / (len+4));
            box.transform.position.y = 0;
            box.transform.scale.x = (this.$el.width / len) >> 1;
            box.transform.scale.y = (this.spectrums[createCount] / 0xff ) * (this.$el.height >> 1);
          }
        };
        box.fcontext(this.ctx);
        let scale = new BaseFrameWork.Draw.Point2D;
        scale.x = this.$el.width;
        scale.y = this.$el.height;
        box.canvasScale = scale;
        this.canvasObjects.add(box);
      }
      audio.eventSupport.removeEventListener('play', initalize);
    };
    audio.eventSupport.addEventListener('play',initalize);
    if(audio.currentPlayState == AudioPlayStateEnum.PLAY) {
      initalize();
    }
    onBeforeUnmount(()=>{
      audio.eventSupport.removeEventListener('play', initalize);
    })
  },
  methods: {
    contextCanvasMenu() {
      ContextMenu.contextMenu.destoryChildren();
      let lyricsView = BaseFrameWork.createCustomElement('sw-libutton');
      if(this.isVisibleAnalyser) {
        lyricsView.menuItem.value = 'Lyrics';
      } else {
        lyricsView.menuItem.value = 'Visualizer';
      }
      lyricsView.menuItem.onclick=()=>{
        this.isVisibleAnalyser = !this.isVisibleAnalyser;
        this.$emit('toggleView');
      };
      ContextMenu.contextMenu.appendChild(lyricsView);
    },
    run(){
      this.clear();
      this.reset();
      this.earlyRender();
      this.render();
      this.lateRender();
      this.animationId = requestAnimationFrame(this.run);
    },
    resize() {
      this.width = window.innerWidth - 56;
      this.height = window.innerHeight - 45;
    },
    clear() {
      this.ctx.clearRect(
        0,
        0,
        this.$el.width,
        this.$el.height
      );
    },
    reset() {
      for (const canvasObject of this.canvasObjects) {
        canvasObject.renderObjectBase();
      }
    },
    earlyRender() {

    },
    render() {
      if(this.analyser != null){
        let leng = this.analyser.frequencyBinCount;
        this.spectrums = new Uint8Array(leng);
        this.analyser.getByteFrequencyData(this.spectrums);
      }
      for (const canvasObject of this.canvasObjects) {
        canvasObject.update();
      }
    },
    lateRender() {

    }
  }
};
</script>
<style scope>
canvas {
  --box-color: #aaa;
}
</style>