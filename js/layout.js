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
        let self = this;
        this.addEventListener(MouseEventEnum.CLICK, ()=>{
            if(ContextMenu.isVisible){
                return;
            }
            let url = UrlParam.setGetter({'PlayerHash': self.audioClip.soundHash});
            if(url != location.pathname+location.search){
                history.pushState(null,null,url);
                popPage();
            }
            

            if(audio.currentAudioClip == null){
                audio.play(self.audioClip);
                return;
            }
            if(self.audioClip.equals(audio.currentAudioClip)){
                if(audio.currentPlayState === AudioPlayStateEnum.PAUSE || audio.currentPlayState === AudioPlayStateEnum.STOP ){
                    audio.play();
                } else {
                    if(audio.currentPlayState === AudioPlayStateEnum.PLAY || audio.currentPlayState !== AudioPlayStateEnum.STOP ){
                        audio.pause();
                    }
                }
                return;
            } else {
                audio.play(self.audioClip);
            }
        });
    }

    /**
     * @param {AudioClip} audioClip 
     */
    setAudioClip(audioClip){
        if(audioClip.soundHash === this._audioClip.soundHash) return;
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

customElements.define('sw-audioclip', AudioClipObject, {extends: "button"});

/**
 * @singleton
 * @template AudioClipObject
 * @type {BaseFrameWork.List<AudioClipObject>}
 */
 class PlacementList extends WebObjectList{
    constructor(){
        super(document.createElement('div'));
        this.parent.classList.add('layout-base', 'audio-list');
        audio.eventSupport.addEventListener('update',()=>{
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
        });
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
            while(this.children[0] != this.progress && audioBuffer.length+1 != this.children.length){
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
            let copy = e=>{
                ContextMenu.contextMenu.removeAll();
                {
                    let copy = document.createElement('li', {is:'sw-libutton'});
                    copy.menuItem.value = 'Copy to clipboard';
                    copy.menuItem.onclick = ()=>{
                        let window = document.createElement('sw-message-box');
                        if(new ClipBoard().set(e)){
                            window.value = 'Copied it.';
                        } else {
                            window.value = 'Copy failed.';
                        }
                        window.open();
                        window.close(1e3);
                    };
                    ContextMenu.contextMenu.list.add(copy);
                }
                ContextMenu.visible(e);
                e.stopPropagation();
            };
            let frameAppend = this.currentSoundInfoFrame.appendChild.bind(this.currentSoundInfoFrame);
            {
                this._playList = new PlacementList();
                this._playList.parent.classList.add('audio-controller-playlist', 'height-hide');
                frameAppend(this._playList.parent);
                audio.eventSupport.addEventListener('play', ()=>{
                    
                    if(!audio.playList.deepEquals(this._playList.audioClips)){
                        this._playList.removeAll();
                        for (const iterator of audio.playList) {
                            let audioClipObject = document.createElement('button',{is:'sw-audioclip'});
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
                this.currentSoundTitle.addEventListener('contextmenu', ()=>{copy(this.currentSoundTitle.innerText);});
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
                this.currentUpLoader.addEventListener('contextmenu', ()=>{copy(this.currentUpLoader.innerText);});
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
                ContextMenu.contextMenu.removeAll();
                {
                    let openClose = document.createElement('li', {is:'sw-libutton'});
                    if(this._playList.parent.classList.contains('height-hide')){
                        openClose.menuItem.value = 'Open';
                    } else {
                        openClose.menuItem.value = 'Close';
                    }
                    openClose.menuItem.onclick=e=>{
                        this._playList.parent.classList.toggle('height-hide');
                    };
                    ContextMenu.contextMenu.list.add(openClose);
                }
                ContextMenu.visible(e);
                e.stopPropagation();
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
                ContextMenu.contextMenu.removeAll();
                {
                    let volumeUp = document.createElement('li', {is:'sw-libutton'});
                    volumeUp.menuItem.value = 'Volume Up (+10%)';
                    volumeUp.menuItem.onclick=e=>{
                        this._volumeObject.value+=.1;
                        volumeChangeEventAction();
                    };
                    ContextMenu.contextMenu.list.add(volumeUp);
                }
                {
                    let volumeDown = document.createElement('li', {is:'sw-libutton'});
                    volumeDown.menuItem.value = 'Volume Down (-10%)';
                    volumeDown.menuItem.onclick=e=>{
                        this._volumeObject.value-=.1;
                        volumeChangeEventAction();
                    };
                    ContextMenu.contextMenu.list.add(volumeDown);
                }
                ContextMenu.visible(e);
                e.stopPropagation();
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
            openIcon.addEventListener(MouseEventEnum.CLICK, musicCanvasEvent);
            openIcon.addEventListener('contextmenu',e=>{
                ContextMenu.contextMenu.removeAll();
                {
                    let soundOpenClose = document.createElement('li', {is:'sw-libutton'});
                    if(openIcon.value === ''){
                        soundOpenClose.menuItem.value = 'Open';
                    } else {
                        soundOpenClose.menuItem.value = 'Close';
                    }
                    soundOpenClose.menuItem.onclick=e=>{
                        musicCanvasEvent();
                    };
                    ContextMenu.contextMenu.list.add(soundOpenClose);
                }
                ContextMenu.visible(e);
                e.stopPropagation();
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
        this.append(this.frame);
    }
    add(element) {
        this.frame.appendChild(element);
    }

}

customElements.define('sw-audio-slide-list', AudioSlideList);

class AudioSlideItem extends HTMLButtonElement {
    constructor() {
        super();
        this.img = document.createElement('img');
        this.soundTitle = document.createElement('p');
    }

    connectedCallback() {
        this.appendChild(this.img);
        this.appendChild(this.soundTitle);
    }
    set src(value) {
        this.img.src = value;
    }
    get src() {
        return this.img.src;
    }

    set title(value) {
        this.soundTitle.innerText = value;
    }
    get title() {
        return this.soundTitle.innerText;
    }
}

customElements.define('sw-audio-slide-item', AudioSlideItem, {extends: "button"});

(()=>{
    const mainMenu=()=>{
        let menu = document.getElementById('main-menu');
        menu.innerHTML = '';
        const searchBox = document.createElement('sw-searchbox');
        searchBox.searchEvent = value =>{
            let url = UrlParam.setGetter({'SearchWord': value,'page': 'search'}, location.pathname);
            if(url != location.pathname+location.search) {
                history.pushState(null, null, url);
                popPage();
            }
        }
        searchBox.classList.add('searchbox');
        menu.appendChild(searchBox);
        
        let dropdownMenu = document.createElement('ul', {is:'sw-dropdown'});
        dropdownMenu.classList.add('header-item', 'nonselectable');
        dropdownMenu.displayName = 'Menu';
        dropdownMenu.dropdownObject.classList.add('icon');
        menu.appendChild(dropdownMenu);
        dropdownMenu.addItem('File Setting', ()=>{
            history.pushState(null, null, BASE.HOME+'?page=file_setting');
            popPage();
        });

        
    };
    window.addEventListener('load', audioParamLoad);
    window.addEventListener('load', mainMenu);
    window.addEventListener('load', ()=>{
        let audioController = document.createElement('sw-audio-controller');
        document.body.appendChild(audioController);
    });

})();


