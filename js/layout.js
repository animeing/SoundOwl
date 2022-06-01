'use strict';
const audioParamSave=()=>{
    let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
    let saveParams = JSON.stringify(
        {
            'volume': audio.audio.volume,
            'loopMode': audio.loopMode,
            'loadGiveUpTime':audio.loadGiveUpTime
        });
    localStorageMap.set('audioParam', saveParams);
};

const audioParamLoad=()=>{
    let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
    let audioParam = localStorageMap.get('audioParam');
    if(audioParam == null) {
        return;
    }
    let audioParams = JSON.parse(audioParam);
    audio.audio.volume = audioParams.volume;
    audio.loopMode = audioParams.loopMode;
    audio.loadGiveUpTime = audioParams.loadGiveUpTime;
};


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
    }
    
    connectedCallback(){
        this.setAttribute('hint', 'Search box');
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
        let alubumArtFrame = document.createElement('div');
        alubumArtFrame.classList.add('alubm');
        this._image = document.createElement('img');
        this._image.setAttribute('loading', 'lazy');
        alubumArtFrame.appendChild(this._image);
        this.appendChild(alubumArtFrame);

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
        this._titleObject.setAttribute('hint', audioClip.title);
        this._artist.innerText = audioClip.artist;
        this._artist.setAttribute('hint', audioClip.artist);
        this._albumObject.innerText = audioClip.album;
        this._albumObject.setAttribute('hint', audioClip.album);
    }
}

BaseFrameWork.defineCustomElement('sw-audioclip', AudioClipObject, {extends: "button"});

/**
 * @singleton
 * @template AudioClipObject
 * @type {BaseFrameWork.List<AudioClipObject>}
 */
 class PlacementList extends WebObjectList{
    constructor(){
        super(document.createElement('div'));
        this.parent.classList.add('layout-base', 'audio-list');
        let letDataChange = ()=>{
            if(this.currentNowPlayingSoundObject != null && this.currentNowPlayingSoundObject.audioClip != null &&
                this.currentNowPlayingSoundObject.audioClip.equals(audio.currentAudioClip)){
                    return;
            }
            Array.prototype.forEach.call(this.parent.getElementsByClassName('audio-list-nowplaying'), item=>{
                item.classList.remove('audio-list-nowplaying');
            });
            for (const audioClipObject of this) {
                if(audio.currentAudioClip !== null && audio.currentAudioClip.equals(audioClipObject.audioClip)){
                    audioClipObject.classList.add('audio-list-nowplaying');
                    break;
                }
            }
        };
        let observer = new MutationObserver(letDataChange);
        observer.observe(this.parent, {attributes:true});
        audio.eventSupport.addEventListener('play',letDataChange);

    }

    copyChilds(){
        let list = new BaseFrameWork.List;
        for (const clip of this) {
            list.add(document.importNode(clip.object, true));
        }
        return list;
    }

    get currentNowPlayingSoundObject(){
        for (const item of this) {
            if(item.classList.contains('audio-list-nowplaying')){
                return item;
            }
        }
        return null;
    }
    
    get audioClips(){
        let audioClips = new BaseFrameWork.List;
        for (const audioClipObject of this) {
            audioClips.add(audioClipObject.audioClip);
        }
        return audioClips;
    }

}


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

class AudioPlayController extends HTMLElement {

    constructor(){
        super();
        window.addEventListener('resize', e=>{
            this.canvas.object.setAttribute('height', window.innerHeight - 45);
            this.canvas.object.setAttribute('width', window.innerWidth - 56);
        });

        this._audioProgress = document.createElement('sw-audio-progress');
        this._audioProgress.classList.add('progress-times');
        this._volumeObject = document.createElement('sw-v-progress');
        this._volumeObject.classList.add('audio-controller-volume');

        let controller = document.createElement('span');

        this.currentSoundInfoFrame = document.createElement('p');
        this.currentSoundInfoFrame.classList.add('sound-info-frame');
        {
            let copy = (val, e)=>{
                ContextMenu.contextMenu.destoryChildren();
                {
                    let copy = BaseFrameWork.createCustomElement('sw-libutton');
                    copy.menuItem.value = 'Copy to clipboard';
                    copy.menuItem.onclick = () =>{
                        let window = document.createElement('sw-message-box');
                        if(new ClipBoard().set(val)){
                            window.value = 'Copied it.';
                        } else {
                            window.value = 'Copy failed.';
                        }
                        window.open();
                        window.close(1e3);
                    };
                    ContextMenu.contextMenu.appendChild(copy);
                }
                ContextMenu.visible(e);
            };
            let frameAppend = this.currentSoundInfoFrame.appendChild.bind(this.currentSoundInfoFrame);
            {
                this._playList = new PlacementList();
                this._playList.parent.classList.add('audio-controller-playlist', 'height-hide');
                frameAppend(this._playList.parent);
                let observer = new MutationObserver(()=>{
                    let audioElement = document.querySelector('.audio-controller-playlist .audio-list-nowplaying');
                    if(audioElement){
                        this._playList.parent.scroll({top: audioElement.offsetTop-42});
                    }
                });
                observer.observe(this._playList.parent, {childList:true,attributes:true,subtree: true});
                audio.eventSupport.addEventListener('play', ()=>{
                    
                    if(!audio.playList.deepEquals(this._playList.audioClips)){
                        this._playList.removeAll();
                        for (const iterator of audio.playList) {
                            let audioClipObject = BaseFrameWork.createCustomElement('sw-audioclip');
                            audioClipObject.enableDragMove();
                            audioClipObject.setAttribute('d-group', 'playlist');
                            audioClipObject.setContextMenu(function *(){
                                yield ContextAudioMenus.like(iterator.soundHash);
                                yield ContextAudioMenus.openInNewTab(iterator.soundHash);
                                if(audioClipObject.audioClip.soundHash != audio.currentAudioClip.soundHash){
                                    yield ContextAudioMenus.removeFromPlaylist(audioClipObject);
                                }
                                yield ContextAudioMenus.property(iterator);
                            });
                            audioClipObject.addEventListener('dragelementchange', e=>audio.playList.swap(e.targetElement.audioClip, audioClipObject.audioClip));
                            audioClipObject.setAudioClip(iterator);
                            this._playList.add(audioClipObject);
                        }
                    }
                });
            }
            {
                this.currentSoundTitle = document.createElement('span');
                this.currentSoundTitle.classList.add('audio-play-item');
                this.currentSoundTitle.addEventListener('contextmenu', e=>{copy(this.currentSoundTitle.innerText, e);});
                frameAppend(this.currentSoundTitle);
            }
            {
                let currentSpanObject = document.createElement('span');
                currentSpanObject.classList.add('audio-play-item', 'nonselectable');
                currentSpanObject.innerText = '-'
                frameAppend(currentSpanObject);
            }
            {
                this.currentUpLoader = document.createElement('span');
                this.currentUpLoader.classList.add('audio-play-item');
                this.currentUpLoader.addEventListener('contextmenu', e=>{copy(this.currentUpLoader.innerText, e);});
                frameAppend(this.currentUpLoader);
            }
            {
                controller.classList.add('audio-play-item', 'audio-play-item-controller');
                frameAppend(controller);
            }
        }
        let cntAppndObj = controller.appendChild.bind(controller);
        {
            let loopIcon = document.createElement('input');
            loopIcon.value = '';
            loopIcon.type = 'button';
            loopIcon.classList.add('audio-controller-parts', 'icon');
            cntAppndObj(loopIcon);
        }
        {
            let beforeIcon = document.createElement('input');
            beforeIcon.value = '';
            beforeIcon.type = 'button';
            beforeIcon.classList.add('audio-controller-parts', 'icon');
            cntAppndObj(beforeIcon);
            beforeIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
                if(ContextMenu.isVisible)return;
                let currentIndex = audio.playList.equalFindIndex(audio.currentAudioClip);
                let beforeAudioClip = audio.playList.get(--currentIndex);
                if(beforeAudioClip == null){
                    return;
                }
                audio.setCurrentAudioClip(beforeAudioClip);
                if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
                    audio.play(beforeAudioClip);
                }
                audio.audio.currentTime = 0;
            });
        }
        {
            let playIcon = document.createElement('input');
            audio.eventSupport.addEventListener('update',()=>{
                if(audio.currentPlayState === AudioPlayStateEnum.PLAY && audio.isPlaying){
                    playIcon.setAttribute('hint', 'Pause');
                    playIcon.value = '';
                } else {
                    playIcon.setAttribute('hint', 'Play');
                    playIcon.value = '';
                }
            });
            playIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
                if(ContextMenu.isVisible)return;
                if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
                    audio.pause();
                } else {
                    audio.play();
                }
            });
            playIcon.type = 'button';
            playIcon.classList.add('audio-controller-parts', 'icon');
            cntAppndObj(playIcon);
        }
        {
            let nextIcon = document.createElement('input');
            nextIcon.value = '';
            nextIcon.type = 'button';
            nextIcon.classList.add('audio-controller-parts', 'icon');
            cntAppndObj(nextIcon);
            nextIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
                let nextAudioClip = audio.nextClip();
                if(nextAudioClip == null){
                    return;
                }
                audio.setCurrentAudioClip(nextAudioClip);
                if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
                    audio.play(nextAudioClip);
                }
                audio.audio.currentTime = 0;
            });
        }
        {
            let playListIcon = document.createElement('input');
            playListIcon.value = '';
            playListIcon.type = 'button';
            playListIcon.classList.add('audio-controller-parts', 'icon');
            cntAppndObj(playListIcon);

            playListIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
                if(ContextMenu.isVisible)return;
                this._playList.parent.classList.toggle('height-hide');
            });
            playListIcon.addEventListener('contextmenu', e=>{
                ContextMenu.contextMenu.destoryChildren();
                {
                    let openClose = BaseFrameWork.createCustomElement('sw-libutton');
                    if(this._playList.parent.classList.contains('height-hide')){
                        openClose.menuItem.value = 'Open';
                    } else {
                        openClose.menuItem.value = 'Close';
                    }
                    openClose.menuItem.onclick=e=>{
                        this._playList.parent.classList.toggle('height-hide');
                    };
                    ContextMenu.contextMenu.appendChild(openClose);
                }
                ContextMenu.visible(e);
            });
        }
        {
            let volumeIcon = document.createElement('input');
            volumeIcon.value = '';
            volumeIcon.type = 'button';
            volumeIcon.classList.add('audio-controller-parts', 'icon');
            let volumeChangeEventAction = ()=>{
                audio.audio.volume = this._volumeObject.value;
                audioParamSave();
            };
            volumeIcon.addEventListener('contextmenu', e=>{
                ContextMenu.contextMenu.destoryChildren();
                {
                    let volumeUp = BaseFrameWork.createCustomElement('sw-libutton');
                    volumeUp.menuItem.value = 'Volume Up (+10%)';
                    volumeUp.menuItem.onclick=e=>{
                        this._volumeObject.value+=.1;
                        volumeChangeEventAction();
                    };
                    ContextMenu.contextMenu.appendChild(volumeUp);
                }
                {
                    let volumeDown = BaseFrameWork.createCustomElement('sw-libutton');
                    volumeDown.menuItem.value = 'Volume Down (-10%)';
                    volumeDown.menuItem.onclick=e=>{
                        this._volumeObject.value-=.1;
                        volumeChangeEventAction();
                    };
                    ContextMenu.contextMenu.appendChild(volumeDown);
                }
                ContextMenu.visible(e);
            });
            volumeIcon.setAttribute('hint', 'Volume');
            this._volumeObject.max = 1;
            this._volumeObject.min = 0;
            this._volumeObject.classList.add('hide');
            this._volumeObject.value = audio.audio.volume;
            
            volumeIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
                if(ContextMenu.isVisible)return;
                this._volumeObject.classList.toggle('hide');
            });
            this._volumeObject.eventSupport.addEventListener('changingValue', volumeChangeEventAction);
            this._volumeObject.addEventListener('wheel',e=>{
                e.preventDefault();
                this._volumeObject.value -= e.deltaY/1e4;
                volumeChangeEventAction();
            },{ passive: false });

            
            cntAppndObj(volumeIcon);
        }
        {
            let openIcon = document.createElement('input');
            openIcon.value = '';
            openIcon.type='button';
            openIcon.classList.add('audio-controller-parts', 'icon');

            let musicCanvasEvent = ()=>{
                if(openIcon.value === ''){
                    openIcon.value = '';
                    this.classList.add('current-sound-controller-fill-layout');
                    this.parentNode.addEventListener('scroll', this.disableWindowScroll);
                    this.top = window.scrollY;
                    /// /
                    this.canvas.object.setAttribute('height', window.innerHeight - 45);
                    this.canvas.object.setAttribute('width', window.innerWidth - 56);
                } else {
                    document.body.removeAttribute('style');
                    this.parentNode.removeEventListener('scroll', this.disableWindowScroll);
                    openIcon.value = '';
                    openIcon.removeAttribute('style');
                    this.classList.remove('current-sound-controller-fill-layout');
                    Array.prototype.filter.call(document.getElementsByClassName('progress-times'), (e)=>{
                        e.removeAttribute('style');
                    });
                    
                }
            };

            this.canvas = new CanvasAudioAnalizer;
            this.canvas.connect(audio.audioContext, audio.source);
            this.canvas.run();
            this.canvas._obj.addEventListener('contextmenu', e=>{
                ContextMenu.contextMenu.destoryChildren();
                let lyricsView = BaseFrameWork.createCustomElement('sw-libutton');
                lyricsView.menuItem.value = 'Lyrics';
                lyricsView.menuItem.onclick=e=>{
                    this.classList.remove('analyser');
                    this.classList.add('lyrics');
                }
                ContextMenu.contextMenu.appendChild(lyricsView);
            });
            this.lyrics = document.createElement('div');
            audio.eventSupport.addEventListener('audio_info_loaded', ()=>{
                this.lyrics.destoryChildren();
                if( audio.data.lyrics == undefined) {
                    ContextMenu.visible(e);
                    return;
                }
                for (const iterator of audio.data.lyrics.split('\r\n')) {
                    if(iterator == '') {
                        this.lyrics.appendChild(document.createElement('br'));
                        continue;
                    }
                    let parm = document.createElement('p');
                    parm.innerText = iterator;
                    this.lyrics.appendChild(parm);
                }
                this.lyrics.scroll({top: 0});
            });
            this.lyrics.addEventListener('contextmenu', e=>{
                ContextMenu.contextMenu.destoryChildren();
                let visualizerView = BaseFrameWork.createCustomElement('sw-libutton');
                visualizerView.menuItem.value = 'Visualizer';
                
                visualizerView.menuItem.onclick=e=>{
                    this.classList.add('analyser');
                    this.classList.remove('lyrics');
                }
                ContextMenu.contextMenu.appendChild(visualizerView);
                ContextMenu.visible(e);
            });
            this.lyrics.classList.add('lyrics-view');
            openIcon.addEventListener(MouseEventEnum.CLICK, musicCanvasEvent);
            openIcon.addEventListener('contextmenu',e=>{
                ContextMenu.contextMenu.destoryChildren();
                {
                    let soundOpenClose = BaseFrameWork.createCustomElement('sw-libutton');
                    if(openIcon.value === ''){
                        soundOpenClose.menuItem.value = 'Open';
                    } else {
                        soundOpenClose.menuItem.value = 'Close';
                    }
                    soundOpenClose.menuItem.onclick=e=>{
                        musicCanvasEvent();
                    };
                    ContextMenu.contextMenu.appendChild(soundOpenClose);
                }
                ContextMenu.visible(e);
            });

            
            cntAppndObj(openIcon);
        }
    }
    progressText(){
        let duration = audio.audio.duration;
        let current = audio.audio.currentTime;
        let durationText = timeToText(duration);
        let currentText = timeToText(current);
        return currentText['min']+':'+currentText['sec']+'/'+durationText['min']+':'+durationText['sec'];
    }


    connectedCallback() {
        this.classList.add('audio-play-controller');
        this.appendChild(this.currentSoundInfoFrame);
        this.appendChild(this.progressTextElement = document.createElement('span'));
        this.progressTextElement.innerText = this.progressText();
        this.progressTextElement.classList.add('progress-times', 'progress-time', 'nonselectable');
        this.appendChild(this._audioProgress);
        this.appendChild(this._volumeObject);
        this.appendObject(this.canvas);
        this.classList.add('analyser');
        this.appendChild(this.lyrics);
        this._audioProgress.addEventListener(MouseEventEnum.MOUSE_MOVE, e=>{
            let positionTime = 0;
            if(!isNaN(this._audioProgress.mousePositionvalue(e))){
                positionTime = this._audioProgress.mousePositionvalue(e);
            }
            let textTime = timeToText(positionTime);
            this._audioProgress.setAttribute('hint', textTime['min']+':'+textTime['sec']);
        });
        
        this._audioProgress.eventSupport.addEventListener('valueSet',()=>{
            this.progressTextElement.innerText = this.progressText();
            if(audio.currentAudioClip != null){
                this.currentSoundTitle.innerText = audio.currentAudioClip.title == null ? '' : audio.currentAudioClip.title;
                this.currentSoundTitle.setAttribute('hint', this.currentSoundTitle.innerText);
                setTitle(this.currentSoundTitle.innerText);
                this.currentUpLoader.innerText = audio.currentAudioClip.artist;
                this.currentUpLoader.setAttribute('hint',this.currentUpLoader.innerText);
            }
        });
        let audioPlayState = audio.audioPlayState;
        this._audioProgress.eventSupport.addEventListener('change', ()=>{
            audioPlayState = audio.audioPlayState;
        });
        this._audioProgress.eventSupport.addEventListener('changed', ()=>{
            audio.stop();
            audio.audio.currentTime = parseFloat(this._audioProgress.value);
            if(audioPlayState == AudioPlayStateEnum.PLAY){
                setTimeout(()=>{
                    audio.play();
                },1);
            }
        });
        this._audioProgress.eventSupport.addEventListener('changingValue',()=>{
            if(audio.currentAudioClip === null){
                return;
            }
            audio.audio.currentTime = this._audioProgress.value;
            if(audio.currentPlayState === AudioPlayStateEnum.PLAY){
                audio.audio.pause();
            }
        });
        this._audioProgress.min = 0;
        this._audioProgress.classList.add('progress-times');
        audio.eventSupport.addEventListener('update', ()=>{
            if(!this._audioProgress.isProgressManualMove){
                this._audioProgress.max = audio.audio.duration;
                this._audioProgress.value = audio.audio.currentTime;
            } else {
                audio.audio.currentTime = ~~this._audioProgress.value;
            }
        });
    }
}

customElements.define('sw-audio-controller', AudioPlayController);

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


const SoundClipComponent = {
    template:`
    <div>
        <div class="alubm">
            <img loading='lazy' :src="createImageSrc(soundClip.albumKey)">
        </div>
        <div class='layout-box'>
            <p class='audio-title' :hint='soundClip.title'>{{soundClip.title}}</p>
            <p class='audio-uploader'>
                <span class='audio-infomation' :hint='soundClip.artist'>{{soundClip.artist}}</span>
            </p>
            <p class='audio-infomation audio-discription' :hint='soundClip.album'>{{soundClip.album}}</p>
        </div>
    </div>
    `,
    props:{
        'soundClip':{
            type:AudioClip
        }
    },
    methods:{
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        },
    }
};

const CurrentAudioList = {
    template:`
    <div :class="audioFrameClass()">
        <button v-for="item in soundClips" :class='audioItemClass(item)' @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
    </div>
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
        audioItemClass(soundClip) {
            if(this.currentPlaySoundClip == null){
                return 'audio-item';
            }
            return 'audio-item'+(this.currentPlaySoundClip.equals(soundClip)?' audio-list-nowplaying':'');
        },
        audioFrameClass() {
            return 'layout-base audio-list audio-controller-playlist'+(this.isView?'':' height-hide');
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
                this.$el.scroll({top: audioElement.offsetTop-42});
            }
        });
        observer.observe(this.$el, {childList:true,attributes:true,subtree: true});
    }
}

const AudioIconControl = {
    template:`
    <span class="audio-play-item audio-play-item-controller">
        <input type="button" value="" class="audio-controller-parts icon">
        <input type="button" value="" @click="beforeIconClick()" class="audio-controller-parts icon">
        <input type="button" :value="playIcon" @click="playIconClick()" class="audio-controller-parts icon">
        <input type="button" value="" @click="nextIconClick()" class="audio-controller-parts icon">
        <input type="button" value="" @click="togglePlayListView()" class="audio-controller-parts icon">
        <input type="button" value="" @click="audioViewOpen()" class="audio-controller-parts icon">
        <input type="button" value="" @click="toggleControllerFillView()" class="audio-controller-parts icon">
    </span>
    `,
    data(){
        return {
            playIcon: '',
            audioPlayState:audio.currentAudioClip
        }
    },
    methods:{
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
        });
        audio.eventSupport.addEventListener('stop', ()=>{
            this.audioPlayState = audio.currentPlayState;
            //PlayIcon
            this.playIcon = '';
        });
        audio.eventSupport.addEventListener('pause',()=>{
            this.audioPlayState = audio.currentPlayState;
            //PlayIcon
            this.playIcon = '';
        });
        audio.eventSupport.addEventListener('update', ()=>{
            this.durationTime = audio.audio.duration;
            this.playTime = audio.audio.currentTime;
        });
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
                ContextMenu.visible(e);
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

const AudioController = {
    template:`
        <div>
            <p class='sound-info-frame'>
                <CurrentAudioList :is-view='isAudioList'></CurrentAudioList>
                <span class='audio-play-item'>{{currentPlaySoundClip.title}}</span>
                <span class="audio-play-item nonselectable">-</span>
                <span class="audio-play-item">{{currentPlaySoundClip.album}}</span>
                <AudioIconControl @togglePlayListView='togglePlayListView' @toggleControllerFillView='toggleControllerFillView' @toggleVolumeView='toggleVolumeView'></AudioIconControl>
            </p>
            <span class="progress-times progress-time nonselectable">{{progressText()}}</span>
            <sw-audio-progress class="progress-times" :hint="playTimeString" :value="playTime" :max="durationTime" min="0" v-on:changingValue="changeingPlayPoint" v-on:changed="changedPlayPoint" v-on:mousemove="hint"></sw-audio-progress>
            <sw-v-progress :class="volumeClass()" :value="volume" max="1" min="0" v-on:changingValue="changeVolume"></sw-v-progress>
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
            this.volume = audio.audio.volume;
        });
    },
    methods:{
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
            audio.audio.volume = event.target.value;
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

window.addEventListener('load', ()=>{
    Vue.component('audio-controller', AudioController);
    let vue = new Vue({ el: '#controller' });
});

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
        dropdownMenu.addItem('File Setting', ()=>{
            history.pushState(null, null, BASE.HOME+'?page=file_setting');
            // popPage();
        });
        dropdownMenu.addItem('Audio regist', ()=>{
            let siteStatus = new SiteStatus();
            siteStatus.httpRequestor.addEventListener('success', event=>{
                let data = event.detail.response;
                if(toBoolean(data['regist_status'])) {
                    let messageButtonWindow = new MessageButtonWindow();
                    messageButtonWindow.value = `Already in progress.
                    Sound registrations : ${data['regist_data_count']['sound']}
                    Album registrations : ${data['regist_data_count']['album']}
                    Artist registrations : ${data['regist_data_count']['artist']}
                    `;
                    messageButtonWindow.addItem('Close', ()=>{
                        messageButtonWindow.close();
                    });
                    messageButtonWindow.open();
                    return;
                }
                let soundRegist = new SoundRegist();
                soundRegist.httpRequestor.addEventListener('success', event=>{
                    let data = event.detail.response;
                    let messageButtonWindow = new MessageButtonWindow();
                    messageButtonWindow.value = `Processing of [Audio regist] is complete.
                    Sound registrations : ${data['count']}
                    `;
                    messageButtonWindow.addItem('Close', ()=>{
                        messageButtonWindow.close();
                    });
                    messageButtonWindow.open();
                });
                soundRegist.execute();
                let messageButtonWindow = new MessageButtonWindow();
                messageButtonWindow.value = `Process [Audio regist] started.`;
                messageButtonWindow.addItem('Close', ()=>{
                    messageButtonWindow.close();
                });
                messageButtonWindow.open();
            });
            siteStatus.execute();
        });

        
    };
    window.addEventListener('load', audioParamLoad);
    window.addEventListener('load', mainMenu);
    

})();


