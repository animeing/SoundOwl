<template>
        <div>
            <p class='sound-info-frame'>
                <CurrentAudioList :is-view='isAudioList'></CurrentAudioList>
                <span class='audio-play-item'>{{currentPlaySoundClip.title}}</span>
                <span class="audio-play-item nonselectable">-</span>
                <span class='audio-play-item'>{{currentPlaySoundClip.artist}}</span>
                <span class='audio-play-item nonselectable'>-</span>
                <a href='#' class="audio-play-item" v-on:click.stop.prevent='albumClick()'>{{currentPlaySoundClip.album}}</a>
                <AudioIconControl @togglePlayListView='togglePlayListView' @toggleControllerFillView='toggleControllerFillView' @toggleVolumeView='toggleVolumeView'></AudioIconControl>
            </p>
            <span class="progress-times progress-time nonselectable">{{progressText()}}</span>
            <sw-audio-progress class="progress-times" :data-hint="playTimeString" :value="playTime" :max="durationTime" min="0" v-on:changingValue="changeingPlayPoint" v-on:changed="changedPlayPoint" v-on:mousemove="hint"></sw-audio-progress>
            <sw-v-progress :class="volumeClass()" :value="volume" max="1" min="0" v-on:changingValue="changeVolume" v-on:wheel="volumeAction"></sw-v-progress>
            <AudioCanvas :is-view='isFillLayout' @toggleView='toggleView'></AudioCanvas>
        </div>
</template>
<script>
import CurrentAudioList from "./parts/CurrentAudioList.vue";
import AudioCanvas from "./parts/AudioCanvas.vue";
import AudioIconControl from './parts/AudioIconControl.vue';
import { AudioClip } from '../../audio/type/AudioClip';
import audio from '../../audio/AudioPlayer';
import { ContextMenu, timeToText } from '../../base';
import router from '../../router';
import { AudioPlayStateEnum } from '../../audio/enum/AaudioPlayStateEnum';
import { audioParamLoad } from '../../utilization/register';


export default {
    name:'AudioController',
    components:{
        CurrentAudioList,
        AudioCanvas,
        AudioIconControl
    },
    data(){
        return {
            currentPlaySoundClip:(audio.currentAudioClip != null?audio.currentAudioClip:new AudioClip),
            durationTime:0,
            playTime:0,
            isAudioList:false,
            isVolumeViewOpen:true,
            volume:1,
            playTimeString:'',
            isFillLayout:false,
            isVisibleAnalyser:true
        };
    },
    created(){
        audioParamLoad();
        audio.eventSupport.addEventListener('audioSet',()=>{
            this.currentPlaySoundClip = audio.currentAudioClip;
        });
        audio.eventSupport.addEventListener('update', ()=>{
            this.playTime = audio.audio.currentTime;
            this.durationTime = audio.audio.duration;
        });
        this.volume = audio.audio.volume;
    },
    methods:{
        volumeAction(e) {
            e.preventDefault();
            this.volume -= e.deltaY/1e4;
            audio.audio.volume = this.volume;
            audioParamSave();
        },
        albumClick() {
            if(ContextMenu.isVisible || this.currentPlaySoundClip.albumKey == ''){
                return;
            }
            router.push({name:'album', query: {AlbumHash: this.currentPlaySoundClip.albumKey}});
        },
        toggleView() {
            this.$el.parentNode.classList.toggle('analyser');
            this.$el.parentNode.classList.toggle('lyrics');
        },
        isPlaying() {
            return audio.currentPlayState === AudioPlayStateEnum.PLAY && audio.isPlaying;
        },
        progressText(){
            let durationText = timeToText(this.durationTime);
            let currentText = timeToText(this.playTime);
            return currentText['min']+':'+currentText['sec']+'/'+durationText['min']+':'+durationText['sec'];
        },
        togglePlayListView() {
            this.isAudioList = !this.isAudioList;
        },
        toggleControllerFillView() {
            document.getElementById('controller').classList.toggle('current-sound-controller-fill-layout');
            this.isFillLayout = !this.isFillLayout;
        },
        toggleVolumeView() {
            this.isVolumeViewOpen =! this.isVolumeViewOpen;
        },
        volumeClass(){
            let classList = 'audio-controller-volume vertical-progress';
            return classList+(this.isVolumeViewOpen?' hide':'');
        },
        changeVolume(event) {
            this.volume = event.target.getAttribute('value');
            audio.audio.volume = this.volume;
            audioParamSave();
        },
        changedPlayPoint(event){
            audio.updateLockAccess = true;
            let rePoint = audio.currentPlayState;
            audio.stop();
            let target = event.target;
            if(event.target.mousePositionvalue == undefined){
                target = event.target.parentNode;
            }
            audio.audio.currentTime = parseFloat(target._value);
            if(rePoint == AudioPlayStateEnum.PLAY){
                setTimeout(()=>{
                    audio.play();
                },1);
            }
            audio.updateLockAccess = false;
        },
        changeingPlayPoint(event) {
            let target = event.target;
            if(event.target.mousePositionvalue == undefined){
                target = event.target.parentNode;
            }
            audio.audio.currentTime = target._value;
            if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
                audio.audio.pause();
            }
        },
        hint(event){
            let positionTime = 0;
            let target = event.target;
            if(event.target.mousePositionvalue == undefined){
                target = event.target.parentNode;
            }
            if(!isNaN(target.mousePositionvalue(event))) {
                positionTime = target.mousePositionvalue(event);
            }
            let textTime = timeToText(positionTime);
            this.playTimeString = textTime['min']+':'+textTime['sec'];
        }
    }
}
</script>