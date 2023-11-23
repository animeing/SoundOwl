<template>
    <span class="audio-play-item audio-play-item-controller">
        <input
            type="button"
            :data-hint="loopName"
            value=""
            class="audio-controller-parts icon"
            @click="repeatIconClick()">
        <input
            type="button"
            data-hint="Back"
            value=""
            class="audio-controller-parts icon"
            @click="beforeIconClick()">
        <input
            type="button"
            :data-hint="actionName"
            :value="playIcon"
            class="audio-controller-parts icon"
            @click="playIconClick()">
        <input
            type="button"
            data-hint="Next"
            value=""
            class="audio-controller-parts icon"
            @click="nextIconClick()">
        <input
            type="button"
            data-hint="Playlist"
            value=""
            class="audio-controller-parts icon"
            @click="togglePlayListView()">
        <input
            type="button"
            value=""
            class="audio-controller-parts icon"
            @click="audioViewOpen()">
        <input
            type="button"
            value=""
            class="audio-controller-parts icon"
            @click="toggleControllerFillView()">
    </span>
</template>
<script>
import audio from '../../../audio/AudioPlayer';
import { AudioLoopModeEnum } from '../../../audio/enum/AudioLoopModeEnum';
import {AudioPlayStateEnum} from '../../../audio/enum/AudioPlayStateEnum';
import { ContextMenu } from '../../../base';
import { audioParamSave } from '../../../utilization/register';

export default {
  name :'AudioIconControl',
  emits: ['togglePlayListView', 'toggleControllerFillView', 'toggleVolumeView'],
  data(){
    return {
      playIcon: '',
      audioPlayState:audio.currentAudioClip,
      loopName:'',
      actionName:''
    };
  },
  created(){
    audio.eventSupport.addEventListener('play', ()=>{
      this.audioPlayState = audio.currentPlayState;
      //PauseIcon
      this.playIcon = '';
      this.actionName = 'Pause';
    });
    audio.eventSupport.addEventListener('stop', ()=>{
      this.audioPlayState = audio.currentPlayState;
      //PlayIcon
      this.playIcon = '';
      this.actionName = 'Play';
    });
    audio.eventSupport.addEventListener('pause',()=>{
      this.audioPlayState = audio.currentPlayState;
      //PlayIcon
      this.playIcon = '';
      this.actionName = 'Play';
    });
    audio.eventSupport.addEventListener('update', ()=>{
      this.durationTime = audio.audio.duration;
      this.playTime = audio.audio.currentTime;
    });
    this.actionName = 'Pause';
    this.loopName = this.repeatName();
  },
  methods:{
    repeatIconClick(){
      switch(audio.loopMode) {
        case AudioLoopModeEnum.NON_LOOP:{
          audio.loopMode = AudioLoopModeEnum.TRACK_LOOP;
          break;
        }
        case AudioLoopModeEnum.TRACK_LOOP:{
          audio.loopMode = AudioLoopModeEnum.AUDIO_LOOP;
          break;
        }
        case AudioLoopModeEnum.AUDIO_LOOP:{
          audio.loopMode = AudioLoopModeEnum.NON_LOOP;
          break;
        }
      }
      this.loopName = this.repeatName();
      audioParamSave();
    },
    repeatName() {
      switch(audio.loopMode) {
        case AudioLoopModeEnum.NON_LOOP:{
          return 'No loop';
        }
        case AudioLoopModeEnum.TRACK_LOOP:{
          return 'Track loop';
        }
        case AudioLoopModeEnum.AUDIO_LOOP:{
          return 'Audio loop';
        }
      }
    },
    playIconClick(){
      if(ContextMenu.isVisible)return;
      if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
        audio.pause();
      } else {
        audio.play();
      }
    },
    beforeIconClick(){
      if(ContextMenu.isVisible)return;
      let currentIndex = audio.playList.equalFindIndex(audio.currentAudioClip);
      let beforeAudioClip = audio.playList.get(--currentIndex);
      if(beforeAudioClip == null)return;
      audio.setCurrentAudioClip(beforeAudioClip);
      if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
        audio.play(beforeAudioClip);
      }
      audio.audio.currentTime = 0;
    },
    nextIconClick(){
      let nextAudioClip = audio.nextClip();
      if(nextAudioClip == null)return;
      audio.setCurrentAudioClip(nextAudioClip);
      if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
        audio.play(nextAudioClip);
      }
      audio.audio.currentTime = 0;
    },
    togglePlayListView() {
      this.$emit('togglePlayListView');
    },
    toggleControllerFillView() {
      this.$emit('toggleControllerFillView');
    },
    audioViewOpen(){
      this.$emit('toggleVolumeView');
    }
  }
};
</script>