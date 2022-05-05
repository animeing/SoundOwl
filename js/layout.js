
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
                        if(new ClipBoard().set(currentSoundTitle.value)){
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
                let currentSoundTitle = document.createElement('span');
                currentSoundTitle.classList.add('audio-play-item', 'hide-text-color');
                currentSoundTitle.addEventListener('contextmenu', copy);
                frameAppend(currentSoundTitle);
            }
            {
                let currentSpanObject = document.createElement('span');
                currentSpanObject.classList.add('audio-play-item', 'hide-text-color', 'nonselectable');
                currentSpanObject.innerText = '-'
                frameAppend(currentSpanObject);
            }
            {
                let currentUpLoader = document.createElement('span');
                currentUpLoader.classList.add('audio-play-item', 'hide-text-color');
                currentUpLoader.addEventListener('contextmenu', copy);
                frameAppend(currentUpLoader);
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
        }
        {
            let volumeIcon = document.createElement('input');
            volumeIcon.value = '';
            volumeIcon.type = 'button';
            volumeIcon.classList.add('audio-controller-parts', 'icon');
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
        this.appendObject(this.canvas);
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
    window.addEventListener('load', mainMenu);
    window.addEventListener('load', ()=>{
        let audioController = document.createElement('sw-audio-controller');
        document.body.appendChild(audioController);
    });

})();


