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
import SoundClipComponent from "./layout/common/SoundClipComponent.vue";

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


