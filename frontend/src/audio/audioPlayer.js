import { LoudnessNormalize } from "./effect/normalize/loudnessNormalize";
import { StereoAudioEqualizer } from "./effect/equalizer/stereoAudioEqualizer";
import { StereoExAudioEffect } from "./effect/soundSculpt/stereoExAudioEffect";
import { AudioLoopModeEnum } from "./enum/audioLoopModeEnum";
import { AudioPlayStateEnum } from "./enum/audioPlayStateEnum";
import { AudioStateEnum } from "./enum/audioStateEnum";
import { SoundInfomation } from "../page";
import { SoundPlayedAction } from "../page";
import { BaseFrameWork, setTitle } from "../base";

class AudioPlayer{
    _currentAudioClip = null;
    constructor(){
        this.audio = new Audio;
        this.audioContext = new AudioContext;
        this.source = this.audioContext.createMediaElementSource(this.audio);
        /**
         * @type {BaseFrameWork.List<AudioClip>}
         */
        this.playList = new BaseFrameWork.List;
        this.loopMode = AudioLoopModeEnum.NON_LOOP;
        this.currentPlayState = AudioPlayStateEnum.STOP;
        this.eventSupport = new EventTarget;
        this.stateInit();
        this.audioUpdateEvent = new CustomEvent('update');
        this.audioUpdatedEvent = new CustomEvent('updated');
        this.data = {};
        this.loadGiveUpTime = 10000;
        this.audio.onerror = ()=> {
            console.log("Error " + this.audio.error.code + "; details: " + this.audio.error.message);
            
            if(this.loopMode != AudioLoopModeEnum.AUDIO_LOOP && this.playList.count() >= 1) {
                let errorWindow = new MessageWindow;
                errorWindow.value='Sound load failed.\nAudioFile decode failed.';
                errorWindow.open();
                errorWindow.close(2000);
                let audioClip = this.autoNextClip;
                if(audioClip == undefined){
                    this.pause();
                    this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                    return;
                }
                this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                this.play(audioClip);
            } else {
                let errorWindow = new MessageButtonWindow;
                errorWindow.value='Sound load failed.\nAudioFile decode failed.';
                errorWindow.addItem('OK', ()=>{
                    errorWindow.close();
                });
                errorWindow.open();
            }
        };
        this.eventSupport.addEventListener('audioSet', ()=>{
            let request = new SoundInfomation();
            request.httpRequestor.addEventListener('success', event=>{
                this.data = event.detail.response;
                this.loudnessNormalize.soundMeanVolume = this.data.loudness_target;
                this.loudnessNormalize.soundClip = this.currentAudioClip;
                this.eventSupport.dispatchEvent(new CustomEvent('audio_info_loaded'));
            });
            request.formDataMap.append('SoundHash', this.currentAudioClip.soundHash);
            request.execute();
        });
        this.loudnessNormalize = new LoudnessNormalize(this.source, this.audioContext);
        this.equalizer = new StereoAudioEqualizer(this.loudnessNormalize.gainNode, this.audioContext);
        this.exAudioEffect = new StereoExAudioEffect(this.equalizer.merger, this.audioContext, this.equalizer);
        this.exAudioEffect.connect(this.audioContext.destination);

        this.setUpdate();
    }

    /**
     * @type {AudioClip}
     */
    get currentAudioClip(){
        return this._currentAudioClip;
    }

    set currentAudioClip(currentAudioClip){
        this._currentAudioClip = currentAudioClip;
    }
    
    stateInit() {
        const audioStates = [
            AudioStateEnum.ABORT, AudioStateEnum.CAN_PLAY, AudioStateEnum.CAN_PLAY_THROUGH, 
            AudioStateEnum.EMPTIED, AudioStateEnum.ENDED, AudioStateEnum.ERROR, 
            AudioStateEnum.LOADED_DATA, AudioStateEnum.LOADED_METADATA, AudioStateEnum.LOAD_START, 
            AudioStateEnum.PAUSE, AudioStateEnum.PLAYING, AudioStateEnum.PROGRESS, 
            AudioStateEnum.STALLED, AudioStateEnum.SUSPEND, AudioStateEnum.WAITING
        ];
    
        const audioPlayStates = [AudioPlayStateEnum.PLAY, AudioPlayStateEnum.PAUSE];
    
        for (const state of audioStates) {
            this.audio.addEventListener(state, () => {
                this.audioState = state;
            });
        }
    
        for (const playState of audioPlayStates) {
            this.audio.addEventListener(playState, () => {
                this.audioPlayState = playState;
            });
        }
    }
    
    updateLockAccess = false;

    /**
     * @private
     */
    setUpdate(){
        if(this.updateLockAccess) return;
        this.updateLockAccess = true;
        try {
            if(this.updateJob == null){
                this.updateJob = setInterval(()=>{
                    this.audioUpdate();
                }, this.UPDATE_MILI_SEC);
            }
        } finally {
            this.updateLockAccess = false;
        }
    }

    setStopUpdate(){
        if(this.updateLockAccess) return;
        this.updateLockAccess = true;
        try{
            if(this.updateJob != null){
                clearInterval(this.updateJob);
                this.updateJob = null;
            }
        } finally {
            this.updateLockAccess = false;
        }
    }

    /**
     * @private
     */
    audioUpdate(){
        this.eventSupport.dispatchEvent(this.audioUpdateEvent);
        switch(this.currentPlayState){
            case AudioPlayStateEnum.STOP:
            case AudioPlayStateEnum.PAUSE:
            {
                return;
            }
            case AudioPlayStateEnum.PLAY:
            {
                if(!this.isPlaying && !this.isLoading){
                    let com = ()=>{
                        let audioClip = this.autoNextClip;
                        if(audioClip == undefined){
                            this.pause();
                            this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                            return;
                        }
                        this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                        this.play(audioClip);
                        this.errorTime = null;
                    };
                    let playError = () => {
                        if(this.audioState == AudioStateEnum.ERROR){
                            let errorWindow = new MessageWindow;
                            errorWindow.value='Sound load missing.\nPlease check network.';
                            errorWindow.close(1000);
                        }
                    };
                    if(this.isError){
                        if(this.errorTime == null){
                            this.errorTime = setTimeout(()=>{
                                if(this.audioState != AudioStateEnum.STALLED){
                                    playError();
                                    return;
                                }
                                return com();
                            }, this.loadGiveUpTime);
                        }
                    } else {
                        if(this.audioState != AudioStateEnum.ERROR){
                            if(this.errorTime == null){
                                this.errorTime = setTimeout(()=>{
                                    if(this.audioState != AudioStateEnum.STALLED){
                                        playError();
                                        return;
                                    }
                                    return com();
                                }, this.loadGiveUpTime);
                            }
                        }
                    }
                }
                if(!this.isLoading && (this.audio.currentTime === this.audio.duration)){
                    let clip = this.autoNextClip;
                    let playedAction = new SoundPlayedAction;
                    playedAction.formDataMap.append('SoundHash', this.currentAudioClip.soundHash);
                    playedAction.execute();
                    if(clip == null)
                    {
                        this.currentPlayState = AudioPlayStateEnum.STOP;
                        return;
                    }
                    this.play(clip);
                }
            }
        }
    }

    /**
     * 
     * @param {AudioClip} setAudioClip 
     */
    setCurrentAudioClip(setAudioClip){
        if(this.currentAudioClip === setAudioClip || setAudioClip == undefined){
            return;
        }
        this.currentAudioClip = setAudioClip;
        this.audioDeployment();
        // this.audioUpdate(); //CHECK
    }

    audioDeployment(){
        this.eventSupport.dispatchEvent(new CustomEvent('audioSet'));
        this.audio.src = this.currentAudioClip.src;
        this.exAudioEffect.reset();
    }

    get UPDATE_MILI_SEC(){
        return 500;
    }

    get isError(){
        return (
               this.audioState === AudioStateEnum.ERROR 
            || this.audioState === AudioStateEnum.EMPTIED
            || this.audioState === AudioStateEnum.STALLED
            || this.audioState === AudioStateEnum.WAITING);
    }

    get isLoading(){
        return (
               this.audioState === AudioStateEnum.LOAD_START 
            || this.audioState === AudioStateEnum.PROGRESS 
            || this.audioState === AudioStateEnum.ABORT
            || this.audioState === AudioStateEnum.LOADED_METADATA
            || this.audioState === AudioStateEnum.LOADED_DATA);
    }

    get isPlaying(){
        if(this.audio.currentTime == 0 && isNaN(this.audio.duration)) return false;
        return (this.audio.currentTime !== this.audio.duration);
    }
    /**
     * @private
     */
    get autoNextClip() {
        if (this.currentAudioClip == null) {
            return this.playList.get(0);
        }
        switch (this.loopMode) {
            case AudioLoopModeEnum.AUDIO_LOOP:
                return this.currentAudioClip;
            case AudioLoopModeEnum.NON_LOOP:
            case AudioLoopModeEnum.TRACK_LOOP:
                return this.nextClip();
        }
        return undefined;
    }
    
    nextClip() {
        if (this.currentAudioClip == null) {
            return this.playList.get(0);
        }
    
        const clipIndex = this.playList.gets().findIndex(clip => clip != null && this.currentAudioClip != null && clip.soundHash == this.currentAudioClip.soundHash);
    
        if (clipIndex === -1) {
            return this.currentAudioClip;
        }
    
        const nextClip = this.playList.gets().slice(clipIndex + 1).find(clip => clip != null);
        
        if (nextClip) {
            return nextClip;
        } else {
            return this.handleNoNextClip();
        }
    }
    
    handleNoNextClip() {
        switch (this.loopMode) {
            case AudioLoopModeEnum.AUDIO_LOOP:
                return this.currentAudioClip;
            case AudioLoopModeEnum.NON_LOOP:
                return undefined;
            case AudioLoopModeEnum.TRACK_LOOP:
                return this.playList.get(0);
        }
    }
    

    play(audioClip = undefined){
        this.setStopUpdate();
        if(audioClip != undefined){
            this.currentAudioClip = audioClip;
            this.audioDeployment();
        } else if(this.currentAudioClip == null){
            this.currentAudioClip = this.playList.get(0);
            if(this.currentAudioClip == undefined){
                return;
            }
            this.audioDeployment();
        } else {
            if(this.audio.src == null){
                this.audioDeployment();
            }
        }
        BaseFrameWork.waitForValue(
            ()=>{
                if(this.loudnessNormalize.soundClip == null) {
                    return null;
                }
                return this.loudnessNormalize.soundClip.src
            },
            this.currentAudioClip.src,
            2e5).
        then(()=>{
            setTitle(this.currentAudioClip.title);
            this.audio.play();
            this.currentPlayState = AudioPlayStateEnum.PLAY;
            this.eventSupport.dispatchEvent(new CustomEvent('play'));
        }).finally(()=>{
            this.setUpdate();
        });
    }
    pause(){
        this.audio.pause();
        this.currentPlayState = AudioPlayStateEnum.PAUSE;
        this.eventSupport.dispatchEvent(new CustomEvent('pause'));
    }
    stop(){
        if(this.audio.src == null){
            return;
        }
        this.audio.pause();
        this.audio.currentTime = 0;
        this.currentPlayState = AudioPlayStateEnum.STOP;
        this.eventSupport.dispatchEvent(new CustomEvent('stop'));
    }
}
const audio = new AudioPlayer;
export default audio;
