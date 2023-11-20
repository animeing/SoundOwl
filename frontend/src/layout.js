'use strict';
import { BASE } from "./utilization/path";
import { BaseFrameWork,ProgressComposite,MouseEventEnum } from "./base";
import router from "./router";
import { timeToText } from "./base";
import { ContextMenu } from "./base";
import { AudioPlayStateEnum } from "./audio/enum/audioPlayStateEnum";
import { AudioLoopModeEnum } from "./audio/enum/audioLoopModeEnum";
import { AudioClip } from "./audio/type/audioClip";
import audio from "./audio/audioPlayer";
import { audioParamLoad, audioParamSave } from "./utilization/register";

SoundOwlProperty.WebSocket.EventTarget = new EventTarget();
/**
 * @type {WebSocket}
 */
SoundOwlProperty.WebSocket.Socket = null;
SoundOwlProperty.WebSocket.MessageType = class {
    constructor(messageTypeName) {
        this.messageTypeName = messageTypeName;
    }
    set message(message) {
        this._message = message;
    }
    get message() {
        this._message;
    }

    toJson() {
        return JSON.stringify({
            'messageType':this.messageTypeName,
            'message':this._message
        });
    }
};
SoundOwlProperty.SoundRegist = {};
SoundOwlProperty.SoundRegist.registStatus = false;
SoundOwlProperty.SoundRegist.RegistDataCount = {};
SoundOwlProperty.SoundRegist.RegistDataCount.sound = 0;
SoundOwlProperty.SoundRegist.RegistDataCount.artist = 0;
SoundOwlProperty.SoundRegist.RegistDataCount.album = 0;

(()=>{
    let retryCount = 0;
    const webSocketAction = () =>{
        SoundOwlProperty.WebSocket.Socket = new WebSocket(`ws://${BASE.WEBSOCKET}:8080`);

        SoundOwlProperty.WebSocket.Socket.onopen = function() {
            if(retryCount > SoundOwlProperty.WebSocket.retryCount){
                let message = document.createElement('sw-message-button');
                message.addItem('Close', ()=>{
                    message.close();
                });
                message.value = `Successfully connected to the server.`;
                message.close(10000);
                message.open();
            }
            retryCount = 0;
            SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('connect'));
        };

        SoundOwlProperty.WebSocket.Socket.onmessage = function(event) {
            let websocketData = JSON.parse(event.data);
            SoundOwlProperty.WebSocket.retryCount = websocketData.context.websocket.retry_count;
            SoundOwlProperty.WebSocket.retryInterval = websocketData.context.websocket.retry_interval;
            SoundOwlProperty.SoundRegist.RegistDataCount.sound = websocketData.context.regist_data_count.sound;
            SoundOwlProperty.SoundRegist.RegistDataCount.album = websocketData.context.regist_data_count.album;
            SoundOwlProperty.SoundRegist.RegistDataCount.artist = websocketData.context.regist_data_count.artist;
            SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound = websocketData.context.regist_data_count.analysis_sound;
            SoundOwlProperty.SoundRegist.registStatus = websocketData.context.regist_status;
            SoundOwlProperty.SoundRegist.registStatusStep1 = websocketData.context.regist_status_step1;
            SoundOwlProperty.SoundRegist.registStatusStep2 = websocketData.context.regist_status_step2;
            SoundOwlProperty.WebSocket.status = true;
            SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('update'));
        };

        SoundOwlProperty.WebSocket.Socket.onclose = function() {
            if(SoundOwlProperty.WebSocket.status) {
                SoundOwlProperty.WebSocket.status = false;
                SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('change'));
            }
            setTimeout(()=>{
                retryCount++;
                if(retryCount >= SoundOwlProperty.WebSocket.retryCount){
                    
                    let message = document.createElement('sw-message-button');
                    message.addItem('Reconnect', ()=>{
                        webSocketAction();
                        message.close();
                    });
                    message.addItem('Close', ()=>{
                        message.close();
                    });
                    message.value = `Failed to connect to the server.`;
                    message.open();
                    return;
                }
                webSocketAction();
            }, SoundOwlProperty.WebSocket.retryInterval);
        };
    }
    webSocketAction();
})();




class AudioProgressComposite extends ProgressComposite{
    constructor(){
        super();
        audio.eventSupport.addEventListener('update',()=>{
            let audioBuffer = audio.audio.buffered;
            while((this.children[0] != undefined && this.children[0] != this.progress) && audioBuffer.length+1 != this.children.length){
                const element = this.children[0];
                this.removeChild(element);
            }
            let count = 0;
            let findCount = 0;
            while (audioBuffer.length>count&&audioBuffer.start(count) != null && audioBuffer.end(count)) {
                let load = undefined;
                if(this.children[findCount] == null){
                    load = document.createElement('div');
                    this.insertBefore(load,this.firstChild);
                } else {
                    load = this.children[findCount];
                    if(load == this.progress){
                        findCount++;
                        continue;
                    }
                }
                load.style.left = (((audioBuffer.start(count)-this.min) / this.range)*100)+"%";
                load.style.transform = `scaleX(${((audioBuffer.end(count)-audioBuffer.start(count)-this.min) / this.range)})`;
                load.style.background="#fff";
                count++;
                findCount++;
            }
        });
    }
    connectedCallback(){
        super.connectedCallback();
    }
}
customElements.define('sw-audio-progress', AudioProgressComposite);


export const SoundClipComponent = {
    template:`
    <div>
        <div class="album">
            <img loading='lazy' :src="createImageSrc(soundClip.albumKey)">
        </div>
        <div class='layout-box'>
            <p class='audio-title' :data-hint='soundClip.title'>{{soundClip.title}}</p>
            <p class='audio-uploader'>
                <span class='audio-infomation' :data-hint='soundClip.artist'>{{soundClip.artist}}</span>
            </p>
            <a v-show='hasAlbumData' class='audio-infomation audio-discription' v-on:click.stop.prevent.capture='albumClipClick()' :data-hint='soundClip.album'>{{soundClip.album}}</a>
        </div>
    </div>
    `,
    props:{
        'soundClip':{
            type:AudioClip
        }
    },
    data() {
        return {
            hasAlbumData:true
        }
    },
    methods:{
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        },

        albumClipClick() {
            if(ContextMenu.isVisible){
                return;
            }
            router.push({name:'album', query: {AlbumHash: this.soundClip.albumKey}});
        }
    },
    mounted() {
        this.hasAlbumData = this.soundClip.albumKey != undefined && this.soundClip.albumKey != '';
    }
};


const CurrentAudioList = {
    template:`
    <sw-resize :class="audioFrameClass()" resize-direction='top-left' >
        <span class='menu-icon-frame'>
            <button class='menu-icon' @click="contextmenu($event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="29" height="24" viewBox="0 0 29 24"><path fill="currentColor" d="M1.334 2.666h26.665l.037.001a1.334 1.334 0 1 0 0-2.668L27.997 0h.002H1.334a1.334 1.334 0 0 0-.002 2.666h.002zm26.665 2.667H1.334a1.334 1.334 0 0 0-.002 2.666h26.667l.037.001a1.334 1.334 0 1 0 0-2.668l-.039.001zm0 5.334H1.334a1.334 1.334 0 0 0-.002 2.666h26.667a1.334 1.334 0 0 0 .002-2.666zm0 10.666H1.334a1.334 1.334 0 0 0-.002 2.666h26.667a1.334 1.334 0 0 0 .002-2.666zm0-5.333H1.334a1.334 1.334 0 0 0-.002 2.666h26.667A1.334 1.334 0 0 0 28.001 16z"/></svg>
            </button>
        </span>
        <p class='play-list-title' @click.right.prevent="contextmenu()">Play List</p>
        <div :class="audioListClass()" id='current-audio-list' style='overflow-y: scroll;' >
            <button v-for="item in soundClips" drag-item  @click.right.prevent="contextMenu(item)" :class='audioItemClass(item)' @click="click(item)" class="draggable-item">
                <SoundClipComponent :sound-clip='item'></SoundClipComponent>
            </button>
	</div>
    </sw-resize>
    `,
    props:{
        'isView':{
            type:Boolean
        }
    },
    data() {
        return {
            soundClips:[],
            currentPlaySoundClip:new AudioClip
        };
    },
    components:{
        SoundClipComponent
    },
    methods:{
        contextmenu(event = undefined){
            ContextMenu.contextMenu.destoryChildren();
            if(event !== undefined && ContextMenu.isVisible) {
                ContextMenu.remove();
                return;
            }
            {
                let clearPlaylist = BaseFrameWork.createCustomElement('sw-libutton');
                clearPlaylist.menuItem.onclick=e=>{
                    audio.playList.removeAll();
                };
                clearPlaylist.menuItem.value = 'Clear playlist';
                ContextMenu.contextMenu.appendChild(clearPlaylist);
            }
            {
                let savePlaylist = BaseFrameWork.createCustomElement('sw-libutton');
                savePlaylist.menuItem.onclick=e=>{
                    let messageWindow = document.createElement('sw-save-message');
                    messageWindow.value = 'Do you want to save the playlist?\nPlease enter the playlist name.';

                    messageWindow.addItem('OK',()=>{
                        messageWindow.close();
                        let playlistName = messageWindow.inputText.value;                        
                        let action = new class extends BaseFrameWork.Network.RequestServerBase {
                            constructor() {
                                super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
                            }
                        }
                        action.formDataMap.append('method', 'create');
                        action.formDataMap.append('playlist_name', playlistName);
                        for (const soundClip of this.soundClips) {
                            action.formDataMap.append('sounds[]', soundClip.soundHash);
                        }
                        action.httpRequestor.addEventListener('success', event=>{
                            let message = document.createElement('sw-message-button');
                            message.addItem('OK', ()=>{
                                message.close();
                            });
                            message.value = event.detail.response.detail;
                            if(event.detail.response.status == 'success'){
                                message.close(6000);
                            }
                        });
                        action.httpRequestor.addEventListener('error', ()=>{
                            let message = document.createElement('sw-message-button');
                            message.addItem('OK', ()=>{
                                message.close();
                            });
                            message.value = `Action error ${action.httpRequestor.status}`;
                            message.open();
                        });
                        action.execute();

                    });
                    messageWindow.addItem('CANCEL',()=>{
                        messageWindow.close();
                    });
                    messageWindow.open();
                }
                savePlaylist.menuItem.value = 'Save playlist';
                ContextMenu.contextMenu.appendChild(savePlaylist);
            }
            if(event !== undefined) {
                ContextMenu.visible(event);
            }
        },
        click(soundClip){
            if(ContextMenu.isVisible){
                return;
            }
            if(audio.currentAudioClip == null){
                audio.play(soundClip);
                return;
            }
            if(soundClip.equals(audio.currentAudioClip)){
                if(audio.currentPlayState === AudioPlayStateEnum.PAUSE || audio.currentPlayState === AudioPlayStateEnum.STOP ){
                    audio.play();
                } else {
                    if(audio.currentPlayState === AudioPlayStateEnum.PLAY || audio.currentPlayState !== AudioPlayStateEnum.STOP ){
                        audio.pause();
                    }
                }
                return;
            } else {
                audio.play(soundClip);
            }
        },
        contextMenu(soundClip) {
            ContextMenu.contextMenu.destoryChildren();
            let remove = BaseFrameWork.createCustomElement('sw-libutton');
            remove.menuItem.onclick=e=>{
                for (const playListSoundClip of audio.playList) {
                    if(!playListSoundClip.equals(soundClip)) {
                        continue;
                    }
                    audio.playList.remove(playListSoundClip);
                    break;
                }
            };
            remove.menuItem.value = 'remove';
            ContextMenu.contextMenu.appendChild(remove);
        },
        audioItemClass(soundClip) {
            if(this.currentPlaySoundClip == null){
                return 'audio-item';
            }
            return 'audio-item'+(this.currentPlaySoundClip.equals(soundClip)?' audio-list-nowplaying':'');
        },
        audioFrameClass() {
            return 'audio-controller-playlist'+(this.isView?'':' height-hide');
        },
	    audioListClass() {
            return 'layout-base audio-list audio-list-frame'+(this.isView?'':' height-hide');
	    }
    },
    created(){
        audio.eventSupport.addEventListener('audioSet',()=>{
            this.soundClips = audio.playList.array;
            this.currentPlaySoundClip = audio.currentAudioClip;
        });
        this.soundClips = audio.playList.array;
    },
    mounted() {
        let observer = new MutationObserver(()=>{
            let audioElement = document.querySelector('.audio-controller-playlist .audio-list-nowplaying');
            if(audioElement){
                document.getElementById('current-audio-list').scroll({top: audioElement.offsetTop-42});
            }
        });
        observer.observe(this.$el, {childList:true,attributes:true,subtree: true});
        audio.playList.eventSupport.addEventListener('change',()=>{
	    this.soundClips = audio.playList.array;
	});
    }
}


const AudioIconControl = {
    template:`
    <span class="audio-play-item audio-play-item-controller">
        <input type="button" :data-hint="loopName" value="" @click="repeatIconClick()" class="audio-controller-parts icon">
        <input type="button" data-hint="Back" value="" @click="beforeIconClick()" class="audio-controller-parts icon">
        <input type="button" :data-hint="actionName" :value="playIcon" @click="playIconClick()" class="audio-controller-parts icon">
        <input type="button" data-hint="Next" value="" @click="nextIconClick()" class="audio-controller-parts icon">
        <input type="button" data-hint="Playlist" value="" @click="togglePlayListView()" class="audio-controller-parts icon">
        <input type="button" value="" @click="audioViewOpen()" class="audio-controller-parts icon">
        <input type="button" value="" @click="toggleControllerFillView()" class="audio-controller-parts icon">
    </span>
    `,
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

const AudioCanvas = {
    template:`
        <canvas class="analyser-view"
            :width="width"
            :height="height"
            @click.right.prevent="contextCanvasMenu()"
            v-if="isVisibleAnalyser" ></canvas>

        <div
            class="lyrics-view"
            @click.right.prevent="contextCanvasMenu()"
            v-else>{{lyrics}}</div>
    `,
    data() {
        return {
            width:window.innerWidth - 56,
            height:window.innerHeight - 45,
            isVisibleAnalyser:true,
            lyrics:''
        };
    },
    props:{
        'isView':{
            type:Boolean
        }
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
    methods: {
        contextCanvasMenu() {
            ContextMenu.contextMenu.destoryChildren();
            let lyricsView = BaseFrameWork.createCustomElement('sw-libutton');
            if(this.isVisibleAnalyser) {
                lyricsView.menuItem.value = 'Lyrics';
            } else {
                lyricsView.menuItem.value = 'Visualizer';
            }
            lyricsView.menuItem.onclick=e=>{
                this.isVisibleAnalyser = !this.isVisibleAnalyser;
                this.$emit('toggleView');
            }
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
        this.animationId = requestAnimationFrame(this.run);
        this.canvasObjects = new BaseFrameWork.List();
        this.analyser = audio.audioContext.createAnalyser();
        this.analyser.fftSize = 1<<7+1;
        audio.source.connect(this.analyser);
        let filter = audio.audioContext.createBiquadFilter();
        filter.type = 'allpass';
        audio.source.connect(filter);
        
        let leng = this.analyser.frequencyBinCount;
        this.spectrums = new Uint8Array(leng);
        this.analyser.smoothingTimeConstant = .5;
        this.analyser.getByteFrequencyData(this.spectrums);
        for(let createCount = 0, len = this.spectrums.length; createCount < len; createCount++){
            let box = new BaseFrameWork.Draw.Figure.BoxCanvasObject2D;
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
    }

};

export const AudioController = {
    template:`
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
    `,
    components:{
        CurrentAudioList,
        AudioIconControl,
        AudioCanvas
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
};
const searchBox = document.createElement('sw-searchbox');
export default searchBox;
(()=>{
    const mainMenu=()=>{
        let menu = document.getElementById('main-menu');
        menu.innerHTML = '';
        searchBox.searchEvent = value =>{
            router.push({name:'search', query: {SearchWord: value}});
        }
        searchBox.classList.add('searchbox');
        menu.appendChild(searchBox);
        
        let dropdownMenu = BaseFrameWork.createCustomElement('sw-dropdown');
        dropdownMenu.classList.add('header-item', 'nonselectable');
        dropdownMenu.displayName = 'Menu';
        menu.appendChild(dropdownMenu);
        dropdownMenu.addItem('Artist List', ()=>{
            router.push({name:'artist_list'});
        });
        dropdownMenu.addItem('Album List', ()=>{
            router.push({name:'album_list'});
        });
        dropdownMenu.addItem('Play List',()=>{
            router.push({name:'playlists'});
        });
        dropdownMenu.addItem('Setting', ()=>{
            router.push({name:'setting'});
        });

        
    };
    window.addEventListener('load', mainMenu);
    

})();


