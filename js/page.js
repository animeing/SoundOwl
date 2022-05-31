'use strict';

class LayoutBase {
    constructor() {
        window.layoutBase.destoryChildren();
    }
}

class PlayCountAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'play_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

    }
}

class SoundSearchAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_search.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);

    }
}

class SiteStatus extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'site_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class SoundRegist extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_regist.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class SoundInfomation extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_data.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}


class TopPageLayout extends LayoutBase{
    constructor() {
        super();
        {
            let frame = document.createElement('div');
            let titleElement = document.createElement('p');
            titleElement.innerText = 'Play Top 20';
            frame.appendChild(titleElement);
            this.playCountList = document.createElement('sw-audio-slide-list');
            let playCountAction = new PlayCountAction();
            playCountAction.httpRequestor.addEventListener('success', event=>{
                let e = event.detail.response;
                let listNo = 0;
                let list = new BaseFrameWork.List();
                for (const response of e) {
                    let item = BaseFrameWork.createCustomElement('sw-audio-slide-item');
                    this.playCountList.add(item);
                    
                    let audioClip = new AudioClip();
                    audioClip.soundHash = response['sound_hash'];
                    audioClip.title = response['title'];
                    audioClip.artist = response['artist_name'];
                    audioClip.album = response['album']['album_title'];
                    audioClip.albumKey = response['album']['album_hash'];
                    audioClip.no = listNo;
                    item.audioClip = audioClip;
                    list.add(audioClip);
                    listNo++;
                    item.addEventListener(MouseEventEnum.CLICK, e=>{
                        if(ContextMenu.isVisible){
                            return;
                        }
                        audio.playList.removeAll();
                        for(const audioclip of list) {
                            audio.playList.add(audioclip);
                        }
                    }, !0);
                }
            });
            playCountAction.execute();
            frame.appendChild(this.playCountList)
            window.layoutBase.appendChild(frame);
        }
    }
}

class SearchSoundLayout extends LayoutBase {
    
    constructor(searchWord) {
        super();
        {
            let currentAudioListObject = new PlacementList();

            let soundSearch = new SoundSearchAction();
            window.searchBox.value = searchWord;
            soundSearch.formDataMap.append('SearchWord', searchWord);
            soundSearch.httpRequestor.addEventListener('success', event => {
                let e = event.detail.response;
                let listNo = 0;
                let list = new BaseFrameWork.List();
                for (const response of e) {         
                    let item = BaseFrameWork.createCustomElement('sw-audioclip');           
                    currentAudioListObject.add(item);

                    let audioClip = new AudioClip();
                    audioClip.soundHash = response['sound_hash'];
                    audioClip.title = response['title'];
                    audioClip.artist = response['artist_name'];
                    audioClip.album = response['album']['album_title'];
                    audioClip.albumKey = response['album']['album_hash'];
                    audioClip.no = listNo;
                    item.audioClip = audioClip;
                    list.add(audioClip);
                    listNo++;
                    item.addEventListener(MouseEventEnum.CLICK, e=>{
                        if(ContextMenu.isVisible){
                            return;
                        }
                        audio.playList.removeAll();
                        for(const audioclip of list) {
                            audio.playList.add(audioclip);
                        }

                    }, !0);
                }
            });
            soundSearch.execute();
            window.layoutBase.appendChild(currentAudioListObject.parent);
        }
    }
}

let currentPage = '';

const SlideList = {
    template: `
    <sw-audio-slide-list>
        <div>
            <button v-for="item in requestData()" @click="click(item)">
                <img loading='lazy' :src="createImageSrc(item.albumKey)">
                <p :hint="item.title">{{ item.title }}</p>
            </button>
        </div>
    </sw-audio-slide-list>`,
    
    data() {
        return {soundClips:[]};
    },
    methods:{
        requestData(){
            if(this.soundClips.length == 0) {
                let playCountAction = new PlayCountAction();
                
                let listNo = 0;
                playCountAction.httpRequestor.addEventListener('success', event=>{
                    for (const response of event.detail.response) {
                        let audioClip = new AudioClip();
                        audioClip.soundHash = response['sound_hash'];
                        audioClip.title = response['title'];
                        audioClip.artist = response['artist_name'];
                        audioClip.album = response['album']['album_title'];
                        audioClip.albumKey = response['album']['album_hash'];
                        audioClip.no = listNo;
                        listNo++;
                        this.soundClips.push(audioClip);
                    }
                });
                playCountAction.execute();
                return this.soundClips;
            } else {
                return this.soundClips;
            }
        },
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        },
        click(soundClip){
            if(ContextMenu.isVisible){
                return;
            }
            audio.playList.removeAll();
            for(const audioclip of this.soundClips) {
                audio.playList.add(audioclip);
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
        }
    },
    computeds:{}
};
const SlideComponet = {
    template:
    `
    <div>
        <p>{{title}}</p>
        <SlideList></SlideList>
    </div>
    `,
    components:{
        SlideList
    },
    data(){
        return {title:'Sound Top 20'}
    }
};


const Search = {
    template:`
    <div class='audio-list'>
        <button v-for="item in requestData()" :class='audioItemClass(item)' @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
    </div>
    `,
    data() {
        return {soundClips:[], currentPlaySoundClip:audio.currentAudioClip};
    },
    components:{
        SoundClipComponent
    },
    methods:{
        requestData(){
            if(this.soundClips.length == 0) {
                let soundSearch = new SoundSearchAction();

                window.searchBox.value = this.$route.query.SearchWord;
                soundSearch.formDataMap.append('SearchWord', window.searchBox.value);
                let listNo = 0;
                soundSearch.httpRequestor.addEventListener('success', event=>{
                    for (const response of event.detail.response) {
                        let audioClip = new AudioClip();
                        audioClip.soundHash = response['sound_hash'];
                        audioClip.title = response['title'];
                        audioClip.artist = response['artist_name'];
                        audioClip.album = response['album']['album_title'];
                        audioClip.albumKey = response['album']['album_hash'];
                        audioClip.no = listNo;
                        listNo++;
                        this.soundClips.push(audioClip);
                    }
                });
                soundSearch.execute();
                return this.soundClips;
            } else {
                return this.soundClips;
            }
        },
        click(soundClip){
            if(ContextMenu.isVisible){
                return;
            }
            audio.playList.removeAll();
            for(const audioclip of this.soundClips) {
                audio.playList.add(audioclip);
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
        }
    },
    created(){
        audio.eventSupport.addEventListener('audioSet',()=>{
            this.currentPlaySoundClip = audio.currentAudioClip;
        });
    },
    watch: {
        $route(to, from) {
            if(to.query.SearchWord != from.query.SearchWord){
                this.soundClips.splice(0);
            }
        }
    }
};

const router = new VueRouter({
    routes: [
        {
            path: '/',
            component: SlideComponet
        },
        {
            path: '/search',
            name:'search',
            component: Search
        }
    ]
});
window.addEventListener('load', ()=>{
    let vue = new Vue({
        el:'#base',
        router
    });
});

const toGetParamMap=getParam=>{
    let getterNewParam = new Array();
    for (const key of getParam) {
        getterNewParam[key[0]] = decodeURI(key[1]);
    }
    return getterNewParam;
};
