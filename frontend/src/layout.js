'use strict';
import { BaseFrameWork,BASE,ProgressComposite,MouseEventEnum } from "./base";
import { AudioClip, AudioLoopModeEnum } from "./audio";
import audio from "./audio";
import router from "./router";
import { timeToText } from "./base";
import { ContextMenu } from "./base";

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

export const audioParamSave=()=>{
    let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
    let saveParams = JSON.stringify(
        {
            'volume': audio.audio.volume,
            'loopMode': audio.loopMode,
            'loadGiveUpTime':audio.loadGiveUpTime,
            'equalizerGains':audio.equalizer.gains,
            'soundSculpt':audio.exAudioEffect.isUseEffect,
            'audioLondnessNormalize':audio.loudnessNormalize.isUse
        });
    localStorageMap.set('audioParam', saveParams);
};

export const audioParamLoad=()=>{
    let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
    let audioParam = localStorageMap.get('audioParam');
    if(audioParam == null) {
        return;
    }
    let audioParams = JSON.parse(audioParam);
    audio.audio.volume = audioParams.volume;
    audio.loopMode = audioParams.loopMode;
    audio.loadGiveUpTime = audioParams.loadGiveUpTime;
    audio.equalizer.gains = audioParams.equalizerGains;
    audio.exAudioEffect.isUseEffect = audioParams.soundSculpt;
    audio.loudnessNormalize.isUse = audioParams.audioLondnessNormalize;
};

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




class SearchBox extends HTMLElement{
    _searchBox = document.createElement('input');
    searchIcon = document.createElement('span');
    searchEvent = value=>{};
    constructor(){
        super();
        this.searchIcon.innerText = '';
        this.searchIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
            this.searchBox.focus();
        });
        this.searchBox.type='text';
        this.searchBox.addEventListener('keyup', (e)=>{
            if(e.keyCode !== 13){
                return;
            }
            this.searchEvent(this.searchBox.value);
        });
        this.searchBox.addEventListener('contextmenu', ()=>{
            ContextMenu.contextMenu.destoryChildren();
            {
                let copy = BaseFrameWork.createCustomElement('sw-libutton');
                copy.menuItem.value = 'Copy';
                copy.menuItem.onclick = ()=>{
                    ClipBoard.set(this.searchBox.value);
                };
                ContextMenu.contextMenu.appendChild(copy);
            }
            {
                let paste = BaseFrameWork.createCustomElement('sw-libutton');
                paste.menuItem.value = 'Paste';
                paste.menuItem.onclick = ()=>{
                    ClipBoard.get(this.searchBox);
                }
                ContextMenu.contextMenu.appendChild(paste);
            }
        });
    }
    
    connectedCallback(){
        this.setAttribute('data-hint', 'Search box');
        this.searchIcon.classList.add('icon');
        this.appendChild(this.searchIcon);
        this.appendChild(this.searchBox);
    }

    get value(){
        return this.searchBox.value;
    }

    set value(value){
        this.searchBox.value = value;
    }

    get searchBox(){
        return this._searchBox
    }
}
customElements.define('sw-searchbox', SearchBox);

class AudioClipObject extends HTMLButtonElement{
    _titleObject = null;
    _albumObject = null;
    _audioClip = new AudioClip;
    _artist = null;
    _image = null;
    /**
     * @var {AudioClip}
     */
    set audioClip(value){
        this.setAudioClip(value);
    }
    get audioClip(){
        return this._audioClip;
    }

    constructor(){
        super();
    }

    initalize() {
        let albumArtFrame = document.createElement('div');
        albumArtFrame.classList.add('album');
        this._image = document.createElement('img');
        this._image.setAttribute('loading', 'lazy');
        albumArtFrame.appendChild(this._image);
        this.appendChild(albumArtFrame);

        let frameObject = document.createElement('div');
        this.appendChild(frameObject);

        frameObject.classList.add('layout-box');
        this.classList.add('audio-item');
        this._titleObject = document.createElement('p');
        this._titleObject.classList.add('audio-title');
        frameObject.appendChild(this._titleObject);
        
        let uploader = document.createElement('p');
        uploader.classList.add('audio-uploader');
        frameObject.appendChild(uploader);
        this._artist = document.createElement('span');
        this._artist.classList.add('audio-infomation');
        uploader.appendChild(this._artist);

        this._albumObject = document.createElement('p');
        this._albumObject.classList.add('audio-infomation', 'audio-discription');
        
        frameObject.appendChild(this._albumObject);
        
        this.setDefaultEventListener();
    }

    /**
     * 
     * @param {Generator<LIButtonObject>} contextMenuCreateIterator
     */
    setContextMenu(contextMenuCreateIterator){
        if(!contextMenuCreateIterator){
            return;
        }
        super.setContextMenu(contextMenuCreateIterator);
        
        this.menuButton = document.createElement('button');

        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 300');

        let iconItem = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iconItem.setAttribute('cx', 100);
        iconItem.setAttribute('r', 30);
        let top = iconItem.cloneNode(!1);
        top.setAttribute('cy', 50);
        svg.appendChild(top);
        let middle = iconItem.cloneNode(!1);
        middle.setAttribute('cy', 150);
        svg.appendChild(middle);
        let bottom = iconItem.cloneNode(!1);
        bottom.setAttribute('cy', 250);
        svg.appendChild(bottom);
        this.menuButton.appendChild(svg);
        this.menuButton.classList.add('audio-item-menu');
        this.menuButton.addEventListener(MouseEventEnum.CLICK, (e)=>{
            if(ContextMenu.isVisible){
                ContextMenu.remove();
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }
            this.dispatchEvent(new MouseEvent('contextmenu', e));
            e.preventDefault();
            e.stopImmediatePropagation();
        },!1);
        this.appendChild(this.menuButton);
    }

    setDefaultEventListener(){
        this.addEventListener(MouseEventEnum.CLICK, ()=>{
            if(ContextMenu.isVisible){
                return;
            }

            if(audio.currentAudioClip == null){
                audio.play(this.audioClip);
                return;
            }
            if(this.audioClip.equals(audio.currentAudioClip)){
                if(audio.currentPlayState === AudioPlayStateEnum.PAUSE || audio.currentPlayState === AudioPlayStateEnum.STOP ){
                    audio.play();
                } else {
                    if(audio.currentPlayState === AudioPlayStateEnum.PLAY || audio.currentPlayState !== AudioPlayStateEnum.STOP ){
                        audio.pause();
                    }
                }
                return;
            } else {
                audio.play(this.audioClip);
            }
        });
    }

    /**
     * @param {AudioClip} audioClip 
     */
    setAudioClip(audioClip){
        if(this._audioClip !== undefined && audioClip.soundHash === this._audioClip.soundHash) return;
        this._image.src = BASE.HOME+'img/album_art.php?media_hash='+audioClip.albumKey;
        this._audioClip = audioClip;
        this._titleObject.innerText = audioClip.title;
        this._titleObject.setAttribute('data-hint', audioClip.title);
        this._artist.innerText = audioClip.artist;
        this._artist.setAttribute('data-hint', audioClip.artist);
        this._albumObject.innerText = audioClip.album;
        this._albumObject.setAttribute('data-hint', audioClip.album);
    }
}

BaseFrameWork.defineCustomElement('sw-audioclip', AudioClipObject, {extends: "button"});

class InputParam extends HTMLElement {
    constructor() {
        super();
        this._title = document.createElement('span');
        this._input = document.createElement('input');
        this._input.addEventListener('contextmenu', ()=>{
            ContextMenu.contextMenu.destoryChildren();
            {
                let copy = BaseFrameWork.createCustomElement('sw-libutton');
                copy.menuItem.value = 'Copy';
                copy.menuItem.onclick = ()=>{
                    ClipBoard.set(this._input.value);
                };
                ContextMenu.contextMenu.appendChild(copy);
            }
            {
                let paste = BaseFrameWork.createCustomElement('sw-libutton');
                paste.menuItem.value = 'Paste';
                paste.menuItem.onclick = ()=>{
                    ClipBoard.get(this._input);
                }
                ContextMenu.contextMenu.appendChild(paste);
            }
        });
        {
            let val = this._input.value;
            this._input.addEventListener('input', ()=>{
                if(!this._input.hasAttribute('pattern')) {
                    return;
                }
                const pattern = new RegExp(this._input.value.pattern);
                if(!pattern.test('/^'+this._input.value+'$/')) {
                    this._input.value = val;
                    return;
                }
                if(this._input.value == '') {
                    this._input.value = val;
                    return;
                }
                if(this._input.hasAttribute('max')) {
                    this._input.value = Math.min(this._input.value, this._input.max);
                }
                if(this._input.hasAttribute('min')) {
                    this._input.value = Math.max(this._input.value, this._input.min);
                }
                val = this._input.value;
            });
        }
    }
    
    static get observedAttributes() {
        return ['value', 'data-title', 'type', 'max', 'min', 'pattern','name', 'readonly'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if('value' == name) {
            this._input.value = newValue;
        }
        if('data-title' == name) {
            this._title.innerText = newValue;
        }
        if('type' == name) {
            this._input.type = newValue;
        }
        if('max' == name) {
            this._input.setAttribute('max', newValue);
        }
        if('min' == name) {
            this._input.setAttribute('min', newValue);
        }
        if('pattern' == name) {
            this._input.setAttribute('pattern', newValue);
        }
        if('name' == name) {
            this._input.name = newValue;
        }
        if('readonly' == name) {
            this._input.readOnly = newValue;
        }
    }

    get value(){
        return this._input.value;
    }
    set value(val) {
        this.setAttribute('value', val);
    }

    get title() {
        return this._title.innerText;
    }
    set title(title) {
        this.setAttribute('data-title', title);
    }

    get type() {
        return this._input.type;
    }
    set type(type) {
        this.setAttribute('type', type);
    }

    get max() {
        return this._input.max;
    }

    set max(max) {
        this.setAttribute('max', max);
    }

    get min() {
        return this._input.min;
    }

    set min(min) {
        this.setAttribute('min', min);
    }

    get pattern(){
        return this._input.pattern;
    }

    set pattern(pattern){
        this.setAttribute('pattern', pattern);
    }

    get name() {
        return this._input.name;
    }
    set name(name) {
        this.setAttribute('name', name);
    }

    get readOnly() {
        return this._input.readOnly;
    }
    set readOnly(readOnly) {
        this.setAttribute('readonly', readOnly);
    }
    
    connectedCallback(){
        let shadow = this.attachShadow({mode: 'closed'});
        shadow.appendChild(this._title);
        shadow.appendChild(this._input);
        let style = document.createElement('style');
        style.innerHTML = `
        :host {
            display: block;
        }
        
        span{
            min-width: 10em;
            width: fit-content;
            display: inline-block;
            border-bottom: 2px solid var(--subfontcolor);
            margin-bottom: 10px;
        }
          
        input{
            background-color: var(--playerbgcolor);
            width: 100%;
            border-radius: 5px;
            font-size: 1em;
            height: 23px;
            color: var(--fontcolor);
            -webkit-text-fill-color: var(--fontcolor);
            border: none;
            padding: 5px;
        }`;
        shadow.appendChild(style);
    }
}
BaseFrameWork.defineCustomElement('sw-input-param', InputParam);

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


class AudioSlideList extends HTMLElement {
    constructor() {
        super();
        this.addEventListener('wheel', e=>{
            if((this.scrollLeft == 0 && e.deltaY < 0)|| (this.scrollLeft == (this.scrollWidth - this.clientWidth) && e.deltaY > 0)){
                return;
            }
            e.preventDefault();
            this.scrollLeft += e.deltaY;
        });
        this.frame = document.createElement('div');
    }
    
    connectedCallback() {
        if(this.children.length == 0){
            this.append(this.frame);
        }
    }
    add(element) {
        this.frame.appendChild(element);
    }

}

customElements.define('sw-audio-slide-list', AudioSlideList);


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

(()=>{
    const mainMenu=()=>{
        let menu = document.getElementById('main-menu');
        menu.innerHTML = '';
        window.searchBox = document.createElement('sw-searchbox');
        window.searchBox.searchEvent = value =>{
            router.push({name:'search', query: {SearchWord: value}});
        }
        window.searchBox.classList.add('searchbox');
        menu.appendChild(window.searchBox);
        
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
    window.addEventListener('DOMContentLoaded', audioParamLoad);
    window.addEventListener('load', mainMenu);
    

})();


