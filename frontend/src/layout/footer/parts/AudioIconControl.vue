<template>
    <span class="audio-play-item audio-play-item-controller">
        <input type="button" :data-hint="loopName" value="" @click="repeatIconClick()" class="audio-controller-parts icon">
        <input type="button" data-hint="Back" value="" @click="beforeIconClick()" class="audio-controller-parts icon">
        <input type="button" :data-hint="actionName" :value="playIcon" @click="playIconClick()" class="audio-controller-parts icon">
        <input type="button" data-hint="Next" value="" @click="nextIconClick()" class="audio-controller-parts icon">
        <input type="button" data-hint="Playlist" value="" @click="togglePlayListView()" class="audio-controller-parts icon">
        <input type="button" value="" @click="audioViewOpen()" class="audio-controller-parts icon">
        <input type="button" value="" @click="toggleControllerFillView()" class="audio-controller-parts icon">
    </span>
</template>
<script>
import audio from '../../../audio/AudioPlayer';
import { AudioLoopModeEnum } from '../../../audio/enum/AudioLoopModeEnum';
import {AudioPlayStateEnum} from "../../../audio/enum/AaudioPlayStateEnum";
import { ContextMenu } from '../../../base';

export default {
    name :'AudioIconControl',
    data(){
        return {
            playIcon: '',
            audioPlayState:audio.currentAudioClip,
            loopName:'',
            actionName:''
        }
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
    }
}
</script>