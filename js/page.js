'use strict';

class PlayCountAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'play_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

    }
}

class AlbumCountAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'album_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

    }
}

class SoundSearchAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_search.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);

    }
}

class AlbumSoundListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'album_sounds.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

class SiteStatus extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'site_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}
class LockStatus extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'lock_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}


class SoundInfomation extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_data.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

class AlbumListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'album_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class ArtistListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'artist_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class ArtistSoundListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'artist_sounds.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class GetSetting extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'get_setting.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

class UpdateSetting extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'update_setting.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class SoundRegistAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_regist.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class SetupDataBase extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'setup_database_table.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

class SoundPlayedAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'action/sound_played.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

let currentPage = '';

const SlideList = {
    template: `
    <sw-audio-slide-list>
        <div>
            <button v-for="item in data" @click.right.prevent="contextmenu(item)" @click="click(item)">
                <img loading='lazy' :src="createImageSrc(item.albumKey)">
                <p :hint="item.title">{{ item.title }}</p>
            </button>
        </div>
    </sw-audio-slide-list>`,
    
    data() {
        return {
            data:[]
        };
    },
    props:{
        dataRequest:{
            type:Function
        },
        onClick:{
            type:Function
        },
        contextMenu:{
            type:Function
        }
    },
    methods:{
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        },
        click(soundClip){
            if(this.onClick) {
                this.onClick(soundClip);
            }
            return;
        },
        contextmenu(item){
            if(!this.contextMenu) {
                return;
            }
            this.contextMenu(item);
        }
    },
    created(){
        this.data = this.dataRequest();
    },
    computeds:{}
};
const SlideComponet = {
    template:
    `
    <div class="box">
        <p>{{slideTitle}}</p>
        <SlideList :on-click='itemClick' :context-menu='contextmenu' :data-request='dataRequest'></SlideList>
    </div>
    `,
    props:{
        slideTitle:{
            type:String
        },
        dataRequest:{
            type:Function
        },
        itemClick:{
            type:Function
        }
    },
    methods:{
        contextmenu(item){
            if(!this.contextMenu) {
                return;
            }
            this.contextMenu(item);
        }
    },
    components:{
        SlideList
    }
};

const Home = {
    template:`
    <div>
        <SlideComponet :slide-title="soundTop20" :data-request="soundCountRequest" :context-menu="soundContext" :item-click="soundClipClick"></SlideComponet>
        <SlideComponet :slide-title="albumTop20" :data-request="albumCountRequest" :item-click="albumClipClick"></SlideComponet>
    </div>
    `,
    data() {
        return {
            soundTop20:'Sound Top 20',
            albumTop20:'Album Top 20',
            soundClips:[],
            albumData:[]
        };
    },
    components:{
        SlideComponet
    },
    methods:{
        soundCountRequest(){
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
        albumCountRequest(){
            if(this.albumData.length == 0) {
                let albumCountAction = new AlbumCountAction;
                albumCountAction.httpRequestor.addEventListener('success', event=>{
                    for (const response of event.detail.response) {
                        this.albumData.push(response);
                    }
                });
                albumCountAction.execute();
                return this.albumData;
            } else {
                return this.albumData;
            }
        },
        soundClipClick(soundClip){
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
        soundContext:(soundClip)=>{
            ContextMenu.contextMenu.destoryChildren();
            let addNextSound = BaseFrameWork.createCustomElement('sw-libutton');
            addNextSound.menuItem.onclick=e=>{
                if(audio.currentAudioClip == undefined) {
                    audio.playList.add(soundClip, 0);
                    return;
                }
                let appendPosition = audio.playList.equalFindIndex(audio.currentAudioClip);
                audio.playList.add(soundClip, appendPosition+1);
            };
            addNextSound.menuItem.value = 'Add to playlist';
            ContextMenu.contextMenu.appendChild(addNextSound);
        },
        albumClipClick(albumClip) {
            if(ContextMenu.isVisible){
                return;
            }
            router.push({name:'album', query: {AlbumHash: albumClip.albumKey}});

        }
    }
};

const ArtistSoundList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in requestData()" :class='audioItemClass(item)' @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
    </div>
    `,
    data() {
        return {
            soundClips:[],
            currentPlaySoundClip:audio.currentAudioClip,
            albumHash:null
        };
    },
    components:{
        SoundClipComponent
    },
    methods:{
        requestData(){
            if(this.soundClips.length == 0) {
                let soundSearch = new ArtistSoundListAction();

                soundSearch.formDataMap.append('ArtistHash', this.$route.query.ArtistHash);
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
            if(to.query.AlbumHash != from.query.AlbumHash){
                this.soundClips.splice(0);
            }
        }
    }
}

const AlbumSoundList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in requestData()" :class='audioItemClass(item)' @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
    </div>
    `,
    data() {
        return {
            soundClips:[],
            currentPlaySoundClip:audio.currentAudioClip,
            albumHash:null
        };
    },
    components:{
        SoundClipComponent
    },
    methods:{
        requestData(){
            if(this.soundClips.length == 0) {
                let soundSearch = new AlbumSoundListAction();

                soundSearch.formDataMap.append('AlbumHash', this.$route.query.AlbumHash);
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
            if(to.query.AlbumHash != from.query.AlbumHash){
                this.soundClips.splice(0);
            }
        }
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

const ArtistClipComponent = {
    template:`
    <div>
        <div class="alubm">
            <img loading='lazy' :src="createImageSrc(artistClip.album.album_key)">
        </div>
        <div class='layout-box'>
            <p class="audio-title" :hint='artistClip.artist_name'>{{artistClip.artist_name}}</p>
        </div>
    </div>
    `,
    props:{
        'artistClip':{
        }
    },
    methods:{
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        }
    }
}

const AlbumClipComponent = {
    template:`
    <div>
        <div class="alubm">
            <img loading='lazy' :src="createImageSrc(albumClip.album_key)">
        </div>
        <div class='layout-box'>
            <p class='audio-title' :hint='albumClip.title'>{{albumClip.title}}</p>
            <p class='audio-uploader'>
                <span class='audio-infomation' :hint='albumClip.artist.artist_name'>{{albumClip.artist.artist_name}}</span>
            </p>
        </div>
    </div>
    `,
    props:{
        'albumClip':{
        }
    },
    methods:{
        createImageSrc(albumKey) {
            return `${BASE.HOME}img/album_art.php?media_hash=`+albumKey;
        }
    },
};

const AlbumList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in albumClips" class='audio-item' @click="click(item)">
            <AlbumClipComponent :album-clip='item'></AlbumClipComponent>
        </button>
    </div>
    `,
    props:{
        albumClips:{
            type:Array,
            require: false,
            default: ()=>{
                let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
                let albumClipsCache = cache.get('albumList');
                if(albumClipsCache == null) {
                    return []
                }
                return JSON.parse(albumClipsCache);
            }
        }
    },
    components:{
        AlbumClipComponent
    },
    data() {
        return {
            currentPlaySoundClip:audio.currentAudioClip,
            start: this.albumClips.length,
            isMoreLoad:true
        };
    },
    cpmputed: {
        getAlbumClips(){
            return this.albumClips;
        }
    },
    methods:{
        async requestData(){
            return await new Promise((resolve, reject)=>{
                if(this.isMoreLoad){
                    this.isMoreLoad = false;
                    let albumAction = new AlbumListAction;
                    albumAction.httpRequestor.addEventListener('success', event=>{
                        for (const response of event.detail.response) {
                            this.isMoreLoad = true;
                            this.albumClips.push(response);
                            this.start++;
                        }
                        resolve();
                    });
                    albumAction.httpRequestor.addEventListener('error', event=>{
                        reject();
                    });
                    albumAction.formDataMap.set('start', this.start);
                    albumAction.formDataMap.set('end', 50);
                    albumAction.execute();
                }
            }).then(()=>{
                let albumClipsCache = JSON.stringify(this.albumClips);
                let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
                cache.set('albumList', albumClipsCache);
            });
        },
        click(albumClip) {
            if(ContextMenu.isVisible){
                return;
            }
            router.push({name:'album', query: {AlbumHash: albumClip.album_key}});
        },
        bottomEvent() {
            this.requestData();
        }
    },
    mounted() {
        window.addEventListener('bottom', this.bottomEvent);
        if(this.albumClips.length == 0){
            this.requestData();
        }
    },
    beforeRouteLeave(to, from, next)  {
        window.removeEventListener('bottom', this.bottomEvent);
        next();
    }
};

const ArtistList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in artistClips" class='audio-item' @click="click(item)">
            <ArtistClipComponent :artistClip='item'></ArtistClipComponent>
        </button>
    </div>
    `,
    props:{
        artistClips:{
            type:Array,
            require: false,
            default: ()=>{
                let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
                let artistClipsCache = cache.get('artistList');
                if(artistClipsCache == null) {
                    return [];
                }
                return JSON.parse(artistClipsCache);
            }
        }
    },
    components:{
        ArtistClipComponent
    },
    data() {
        return {
            currentPlaySoundClip:audio.currentAudioClip,
            start: this.artistClips.length,
            isMoreLoad: true
        }
    },
    cpmputed: {
        getArtistClips() {
            return this.artistClips;
        }
    },
    methods:{
        async requestData(){
            return await new Promise((resolve, reject)=>{
                if(this.isMoreLoad){
                    this.isMoreLoad = false;
                }
                let artistAction = new ArtistListAction;
                artistAction.httpRequestor.addEventListener('success', event=>{
                    for (const response of event.detail.response) {
                        this.isMoreLoad = true;
                        this.artistClips.push(response);
                        this.start++;
                    }
                    resolve();
                });
                artistAction.httpRequestor.addEventListener('error', ()=>{
                    reject();
                });
                artistAction.formDataMap.set('start', this.start);
                artistAction.formDataMap.set('end', 50);
                artistAction.execute();
            }).then(()=>{
                let artistClipsCache = JSON.stringify(this.artistClips);
                let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
                cache.set('artistList', artistClipsCache);
            });
        },
        click(artistClip) {
            if(ContextMenu.isVisible){ 
                return;
            }
            router.push({name:'artist', query: {ArtistHash: artistClip.artist_id}});
        },
        bottomEvent() {
            this.requestData();
        }
    },
    mounted() {
        window.addEventListener('bottom', this.bottomEvent);
        if(this.artistClips.length == 0) {
            this.requestData();
        }
    },
    beforeRouteLeave(to, from, next) {
        window.removeEventListener('bottom', this.bottomEvent);
        next();
    }

};

const SettingFormComponent = {
    template:`
    <div>
        <div class="block">
            <p class="title">DB</p>
            <sw-input-param data-title="IP Address" type="text" :value="ip" name="db_ip_address"></sw-input-param>
            <sw-input-param data-title="DB Name" type="text" :value="dbName" name="db_name"></sw-input-param>
            <sw-input-param data-title="User" type="text" :value="user" name="db_user"></sw-input-param>
            <sw-input-param data-title="Password" type="password" :value="pass" name="db_pass"></sw-input-param>
        </div>
        <div class="block">
            <p class="title">Sound</p>
            <sw-input-param data-title="Sound Directory" type="text" :value="sound" name="sound_directory"></sw-input-param>
        </div>
    </div>
    `,
    data() {
        return {
            ip:'',
            dbName:'',
            user:'',
            pass:'',
            sound:'',
        };
    },
    mounted() {
        let getSettingAction = new GetSetting;
        getSettingAction.httpRequestor.addEventListener('success', event=>{
            this.ip = event.detail.response.db_ip_address;
            this.dbName = event.detail.response.db_name;
            this.user = event.detail.response.db_user;
            this.pass = event.detail.response.db_pass;
            this.sound = event.detail.response.sound_directory;
        });
        getSettingAction.execute();
    }
};

const DataRegist = {
    template:`
    <div>
        <SettingFormComponent></SettingFormComponent>
        <input type="button" class="button" value="setting update" @click="settingUpdate">
        <input type="button" class="button" value="sound regist" @click="soundRegist">
    </div>
    `,
    components:{
        SettingFormComponent
    },
    methods:{
        settingUpdate(){
            let updateSetting = new UpdateSetting;
            updateSetting.httpRequestor.addEventListener('success', event=>{
                let message = new MessageWindow;
                message.value = "Updated.";
                message.open();
                message.close(500);
            });

            for(const element of Array.prototype.slice.call(document.getElementsByTagName('sw-input-param'))){
                console.log(element);
                updateSetting.formDataMap.set(element.name, element.value);
            }
            
            updateSetting.execute();
        },
        async soundRegist() {
            await new Promise((resolve, reject)=>{
                let siteStatus = new SiteStatus();
                siteStatus.httpRequestor.addEventListener('success', event=>{
                    let data = event.detail.response;
                    if(toBoolean(data['regist_status'])) {
                        reject();
                    } else {
                        resolve();
                    }
                });
                siteStatus.execute();
            }).then(()=>{
                let soundRegistAction = new SoundRegistAction
                soundRegistAction.httpRequestor.addEventListener('success', event=>{
                    let messageButtonWindow = new MessageButtonWindow();
                    messageButtonWindow.value = 'Sound Registed.';
                    messageButtonWindow.addItem('Close', ()=>{
                        messageButtonWindow.close();
                    });
                    messageButtonWindow.open();
                });
                soundRegistAction.execute();
                let messageButtonWindow = new MessageButtonWindow();
                messageButtonWindow.value = 'Sound Registing.';
                messageButtonWindow.addItem('Close', ()=>{
                    messageButtonWindow.close();
                });
                messageButtonWindow.open();
            });
        }
    }
};

const SetUp = {
    template:`
    <div>
        <SettingFormComponent></SettingFormComponent>
        <input type="button" class="button" value="SetUp" @click="setUp">
    </div>
    `,
    components:{
        SettingFormComponent
    },
    methods:{
        
        async setUp() {
            await new Promise((resolve, reject)=>{
                let lockStatus = new LockStatus();
                lockStatus.sourceAsync = !1;
                lockStatus.httpRequestor.addEventListener('success', event=>{
                    let data = event.detail.response;
                    if(toBoolean(data['regist_status'])) {
                        reject();
                    } else {
                        let messageButtonWindow = new MessageButtonWindow();
                        messageButtonWindow.value = 'Setup start.';
                        messageButtonWindow.addItem('Close', ()=>{
                            messageButtonWindow.close();
                        });
                        messageButtonWindow.open();
                        resolve();
                    }
                });
                let messageButtonWindow = new MessageButtonWindow();
                messageButtonWindow.value = 'StatusCheck Start.';
                messageButtonWindow.addItem('Close', ()=>{
                    messageButtonWindow.close();
                });
                messageButtonWindow.open();
                lockStatus.execute();
            }).then(()=>{
                let updateSetting = new UpdateSetting;
                updateSetting.sourceAsync = !1;
                updateSetting.httpRequestor.addEventListener('success', event=>{
                    console.log('setting complate.')
                    let messageButtonWindow = new MessageButtonWindow();
                    messageButtonWindow.value = "Setting complete.";
                    messageButtonWindow.addItem('Close', ()=>{
                        messageButtonWindow.close();
                    });
                    messageButtonWindow.open();
                    return;
                });
    
                for(const element of Array.prototype.slice.call(document.getElementsByTagName('sw-input-param'))){
                    console.log(element);
                    updateSetting.formDataMap.set(element.name, element.value);
                }
                
                let messageButtonWindow = new MessageButtonWindow();
                messageButtonWindow.value = "Setting start.";
                messageButtonWindow.addItem('Close', ()=>{
                    messageButtonWindow.close();
                });
                messageButtonWindow.open();
                updateSetting.execute();
            }).then(()=>{
                let createTableAction = new SetupDataBase;
                createTableAction.sourceAsync = !1;
                createTableAction.httpRequestor.addEventListener('success', event=>{
                    let data = event.detail.response;
                    if(data.status == 'error') {
                        let messageButtonWindow = new MessageButtonWindow();
                        messageButtonWindow.value = `Create DB Error
                        Code : ${data.errorNo}`;
                        messageButtonWindow.addItem('Close', ()=>{
                            messageButtonWindow.close();
                        });
                        messageButtonWindow.open();
                    } else if(data.status == 'success'){
                        
                        let messageButtonWindow = new MessageButtonWindow();
                        messageButtonWindow.value = `Created DB`;
                        messageButtonWindow.addItem('Close', ()=>{
                            messageButtonWindow.close();
                        });
                        messageButtonWindow.open();
                        return;
                    }
                });
                let messageButtonWindow = new MessageButtonWindow();
                messageButtonWindow.value = "DB Create start.";
                messageButtonWindow.addItem('Close', ()=>{
                    messageButtonWindow.close();
                });
                messageButtonWindow.open();
                createTableAction.execute();
            }).then(()=>{
                //即座にデータを入れようとすると失敗するので1秒後に実行する
                setTimeout(()=>{
                    let soundRegistAction = new SoundRegistAction
                    soundRegistAction.httpRequestor.addEventListener('success', event=>{
                        let messageButtonWindow = new MessageButtonWindow();
                        messageButtonWindow.value = 'Sound Registed.';
                        messageButtonWindow.addItem('Close', ()=>{
                            messageButtonWindow.close();
                        });
                        messageButtonWindow.open();
                        return;
                    });
                    let messageButtonWindow = new MessageButtonWindow();
                    messageButtonWindow.value = 'Sound Registing.';
                    messageButtonWindow.addItem('Close', ()=>{
                        messageButtonWindow.close();
                    });
                    messageButtonWindow.open();
                    soundRegistAction.execute();
                }, 1000);
            }).catch(()=>{});
        }
    }
}

const router = new VueRouter({
    routes: [
        {
            path: '/',
            name: 'home',
            component: Home
        },
        {
            path:'/album_list',
            name: 'album_list',
            component: AlbumList
        },
        {
            path:'/artist_list',
            name:'artist_list',
            component: ArtistList
        },
        {
            path:'/album',
            name:'album',
            component: AlbumSoundList
        },
        {
            path:'/artist',
            name:'artist',
            component:ArtistSoundList
        },
        {
            path: '/search',
            name:'search',
            component: Search
        },
        {
            path: '/regist',
            name: 'regist',
            component: DataRegist
        },
        {
            path: '/setup',
            name: 'setup',
            component: SetUp
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
