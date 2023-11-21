'use strict';
import { BASE } from "./utilization/path";
import { BaseFrameWork } from "./base";
import { AudioClip } from "./audio/type/audioClip";
import audio from "./audio/audioPlayer";
import { AudioPlayStateEnum } from "./audio/enum/audioPlayStateEnum";
import { audioParamSave } from "./utilization/register";
import router from "./router";
import { ContextMenu } from "./base";
import searchBox from "./layout";
import LoadingListComponent from "./layout/common/LoadingListComponent.vue";
import SoundClipComponent from "./layout/common/SoundClipComponent.vue";
import { MessageWindow } from "./base";


export class PlayCountAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'play_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

    }
}

export class AlbumCountAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'album_count_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);

    }
}

export class SoundSearchAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_search.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);

    }
}

export class AlbumSoundListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'album_sounds.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

export class SiteStatus extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'site_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}
export class LockStatus extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'lock_status.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}


export class SoundInfomation extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_data.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

export class SoundAddTimeListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_addtime_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class AlbumListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'album_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class ArtistListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'artist_list.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class ArtistSoundListAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'artist_sounds.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class GetSetting extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'get_setting.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

export class UpdateSetting extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'update_setting.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class SoundRegistAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_regist.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class UpdateSoundInfomationAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'sound_regist.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

export class SetupDataBase extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'setup_database_table.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
    }
}

export class SoundPlayedAction extends BaseFrameWork.Network.RequestServerBase {
    constructor() {
        super(null, BASE.API+'action/sound_played.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.GET);
    }
}

let currentPage = '';


export const ArtistSoundList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in requestData()" :class='audioItemClass(item)' @click.right.prevent="soundContext(item)" @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
        <LoadingListComponent v-show="isLoading"></LoadingListComponent>
    </div>
    `,
    data() {
        return {
            soundClips:[],
            currentPlaySoundClip:audio.currentAudioClip,
            albumHash:null,
            isLoading:false,
            isLoad:false,
        };
    },
    components:{
        SoundClipComponent,
        LoadingListComponent
    },
    methods:{
        soundContext:(soundClip)=>{
            ContextMenu.contextMenu.destoryChildren();
            {
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
            }
            {
                let updateSoundData = BaseFrameWork.createCustomElement('sw-libutton');
                updateSoundData.menuItem.onclick=e=>{
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'soundHash':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                    let updateSoundinfoAction = new UpdateSoundInfomationAction;
                    updateSoundinfoAction.formDataMap.append('soundhash', soundClip.soundHash);
                    updateSoundinfoAction.httpRequestor.addEventListener('success', event=>{
                        let messageWindow = new MessageWindow;
                        messageWindow.value = `Updated sound infomation ${soundClip.artist} - ${soundClip.title}`;
                        messageWindow.open();
                        messageWindow.close(1000);
                    });
                    updateSoundinfoAction.execute();
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'lock':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                };
                updateSoundData.menuItem.value = 'Information update';
                ContextMenu.contextMenu.appendChild(updateSoundData);
            }
        },
        requestData(){
            if(!this.isLoad) {
                this.isLoading = true;
                this.isLoad = true;
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
                    this.isLoading = false;
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
                this.isLoad = false;
            }
        }
    }
}

export const AlbumSoundList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in requestData()" :class='audioItemClass(item)' @click.right.prevent="soundContext(item)" @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
        <LoadingListComponent v-show="isLoading"></LoadingListComponent>
    </div>
    `,
    data() {
        return {
            soundClips:[],
            currentPlaySoundClip:audio.currentAudioClip,
            albumHash:null,
            isLoading:false,
            isLoad:false
        };
    },
    components:{
        SoundClipComponent,
        LoadingListComponent
    },
    methods:{
        soundContext:(soundClip)=>{
            ContextMenu.contextMenu.destoryChildren();
            {
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
            }
            {
                let updateSoundData = BaseFrameWork.createCustomElement('sw-libutton');
                updateSoundData.menuItem.onclick=e=>{
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'soundHash':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                    let updateSoundinfoAction = new UpdateSoundInfomationAction;
                    updateSoundinfoAction.formDataMap.append('soundhash', soundClip.soundHash);
                    updateSoundinfoAction.httpRequestor.addEventListener('success', event=>{
                        let messageWindow = new MessageWindow;
                        messageWindow.value = `Updated sound infomation ${soundClip.artist} - ${soundClip.title}`;
                        messageWindow.open();
                        messageWindow.close(1000);
                    });
                    updateSoundinfoAction.execute();
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'lock':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                };
                updateSoundData.menuItem.value = 'Information update';
                ContextMenu.contextMenu.appendChild(updateSoundData);
            }
        },
        requestData(){
            if(!this.isLoad) {
                this.isLoading = true;
                this.isLoad = true;
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
                    this.isLoading = false;
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
                this.isLoad = false;
            }
        }
    }
};

export const Search = {
    template:`
    <div class='audio-list'>
        <button v-for="item in requestData()" :class='audioItemClass(item)' @click.right.prevent="soundContext(item)" @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
        <LoadingListComponent v-show="isLoading"></LoadingListComponent>
    </div>
    `,
    data() {
        return {
            soundClips:[],
            currentPlaySoundClip:audio.currentAudioClip,
            isLoading:false,
            isLoad:false
        };
    },
    components:{
        SoundClipComponent,
        LoadingListComponent
    },
    methods:{
        requestData(){
            if(!this.isLoad) {
                this.isLoading = true;
                this.isLoad = true;
                let soundSearch = new SoundSearchAction();

                searchBox.value = this.$route.query.SearchWord;
                soundSearch.formDataMap.append('SearchWord', searchBox.value);
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
                    this.isLoading = false;
                });
                soundSearch.execute();
                return this.soundClips;
            } else {
                return this.soundClips;
            }
        },
        soundContext:(soundClip)=>{
            ContextMenu.contextMenu.destoryChildren();
            {
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
            }
            {
                let updateSoundData = BaseFrameWork.createCustomElement('sw-libutton');
                updateSoundData.menuItem.onclick=e=>{
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'soundHash':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                    let updateSoundinfoAction = new UpdateSoundInfomationAction;
                    updateSoundinfoAction.formDataMap.append('soundhash', soundClip.soundHash);
                    updateSoundinfoAction.httpRequestor.addEventListener('success', event=>{
                        let messageWindow = new MessageWindow;
                        messageWindow.value = `Updated sound infomation ${soundClip.artist} - ${soundClip.title}`;
                        messageWindow.open();
                        messageWindow.close(1000);
                    });
                    updateSoundinfoAction.execute();
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'lock':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                };
                updateSoundData.menuItem.value = 'Information update';
                ContextMenu.contextMenu.appendChild(updateSoundData);
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
                this.isLoad=false;
            }
        }
    }
};

const PlaylistClipComponent = {
    template:`
    <div>
        <div class="album">
            <img loading='lazy' :src="createImageSrc(playlist.play_list)">
        </div>
        <div class='layout-box'>
            <p class="audio-title" :data-hint='playlist.play_list'>{{playlist.play_list}}</p>
            <p class='audio-uploader'>
                <span class='audio-infomation' :data-hint='playlist.sound_point'>{{playlist.sound_point}} sounds</span>
            </p>
        </div>
    </div>
    `,
    props:{
        playlist:{
            type: Object,
            require: true
        }
    },
    methods:{
        createImageSrc(playlistName) {
            return `${BASE.HOME}img/playlist_art.php?playlist=${playlistName}`;
        }
    }
};

const ArtistClipComponent = {
    template:`
    <div>
        <div class="album">
            <img loading='lazy' :src="createImageSrc(artistClip.album.album_key)">
        </div>
        <div class='layout-box'>
            <p class="audio-title" :data-hint='artistClip.artist_name'>{{artistClip.artist_name}}</p>
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
        <div class="album">
            <img loading='lazy' :src="createImageSrc(albumClip.album_key)">
        </div>
        <div class='layout-box'>
            <p class='audio-title' :data-hint='albumClip.title'>{{albumClip.title}}</p>
            <p class='audio-uploader'>
                <span class='audio-infomation' :data-hint='albumClip.artist.artist_name'>{{albumClip.artist.artist_name}}</span>
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

export const PlaylistSoundList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in soundClips" :class='audioItemClass(item)' @click.right.prevent="soundContext(item)" @click="click(item)">
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
    mounted(){
        let action = new class extends BaseFrameWork.Network.RequestServerBase {
            constructor() {
                super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
            }
        }
        action.formDataMap.append('method', 'sounds');
        action.formDataMap.append('name', this.$route.query.list);
        action.httpRequestor.addEventListener('success', event=>{
            this.soundClips.splice(0);
            let listNo = 0;
            for (const response of event.detail.response) {
                let audioClip = new AudioClip();
                audioClip.soundHash = response['sound_hash'];
                audioClip.title = response['title'];
                audioClip.artist = response['artist_name'];
                audioClip.album = response['album_title'];
                audioClip.albumKey = response['album_hash'];
                audioClip.no = listNo;
                listNo++;
                this.soundClips.push(audioClip);
            }
        });
        action.execute();
    },
    methods:{
        soundContext:(soundClip)=>{
            ContextMenu.contextMenu.destoryChildren();
            {
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
            }
            {
                let updateSoundData = BaseFrameWork.createCustomElement('sw-libutton');
                updateSoundData.menuItem.onclick=e=>{
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'soundHash':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                    let updateSoundinfoAction = new UpdateSoundInfomationAction;
                    updateSoundinfoAction.formDataMap.append('soundhash', soundClip.soundHash);
                    updateSoundinfoAction.httpRequestor.addEventListener('success', event=>{
                        let messageWindow = new MessageWindow;
                        messageWindow.value = `Updated sound infomation ${soundClip.artist} - ${soundClip.title}`;
                        messageWindow.open();
                        messageWindow.close(1000);
                    });
                    updateSoundinfoAction.execute();
                    {
                        let wsSendMessage = new SoundOwlProperty.WebSocket.MessageType('sound_update');
                        wsSendMessage.message = {
                            'lock':soundClip.soundHash
                        };
                        SoundOwlProperty.WebSocket.Socket.send(wsSendMessage.toJson());
                    }
                };
                updateSoundData.menuItem.value = 'Information update';
                ContextMenu.contextMenu.appendChild(updateSoundData);
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
    }
};

export const AlbumList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in albumClips" class='audio-item' @click="click(item)">
            <AlbumClipComponent :album-clip='item'></AlbumClipComponent>
        </button>
        <LoadingListComponent v-show="isLoading"></LoadingListComponent>
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
        AlbumClipComponent,
        LoadingListComponent
    },
    data() {
        return {
            currentPlaySoundClip:audio.currentAudioClip,
            start: this.albumClips.length,
            isMoreLoad:true,
            isLoading:false
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
                    if(!this.isLoading){
                        this.isLoading = true;
                    } else {
                        reject();
                        return;
                    }
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
                        this.isLoading = false;
                        reject();
                        return;
                    });
                    albumAction.formDataMap.set('start', this.start);
                    albumAction.formDataMap.set('end', 50);
                    albumAction.execute();
                } else {
                    reject();
                    return;
                }
            }).then(()=>{
                let albumClipsCache = JSON.stringify(this.albumClips);
                let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
                cache.set('albumList', albumClipsCache);
                this.isLoading = false;
            }).catch(()=>{
                //ignore
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

export const PlayListNames = {
    template:`
    <div class='audio-list'>
        <button v-for='item in playlist' class='audio-item' @click="onclick(item)" @click.right.prevent="soundContext(item)">
            <PlaylistClipComponent :playlist='item'></PlaylistClipComponent>
        </button>
    </div>
    `,
    data(){
        return {playlist:[]}
    },
    components:{
        PlaylistClipComponent
    },
    methods:{
        soundContext(playlist) {

            let deleted = BaseFrameWork.createCustomElement('sw-libutton');
            deleted.menuItem.onclick=e=>{
                
                let action = new class extends BaseFrameWork.Network.RequestServerBase {
                    constructor() {
                        super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
                    }
                }
                action.formDataMap.append('method', 'delete');
                action.formDataMap.append('name', playlist.play_list);
                
                action.httpRequestor.addEventListener('success', event=>{
                    let message = new MessageWindow;
                    message.value = `${playlist.play_list} has been deleted.`;
                    message.open();
                    message.close(500);
                    this.getPlaylists();
                });
                action.execute();

            };
            deleted.menuItem.value = 'Deleted';
            ContextMenu.contextMenu.appendChild(deleted);



        },
        onclick(playlistData) {
            router.push({name:'playlist_sounds', query: {list: playlistData.play_list}});
        },
        getPlaylists() {

            let action = new class extends BaseFrameWork.Network.RequestServerBase {
                constructor() {
                    super(null, BASE.API+'playlist_action.php', BaseFrameWork.Network.HttpResponseType.JSON, BaseFrameWork.Network.HttpRequestType.POST);
                }
            }
            action.formDataMap.append('method', 'names');
            action.httpRequestor.addEventListener('success', event=>{
                this.playlist.splice(0);
                for (const response of event.detail.response) {
                    this.playlist.push(response);
                }
            });
            action.execute();
        }
    },
    mounted() {
        this.getPlaylists();
    }
}

export const ArtistList = {
    template:`
    <div class='audio-list'>
        <button v-for="item in artistClips" class='audio-item' @click="click(item)">
            <ArtistClipComponent :artistClip='item'></ArtistClipComponent>
        </button>
        <LoadingListComponent v-show="isLoading"></LoadingListComponent>
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
        ArtistClipComponent,
        LoadingListComponent
    },
    data() {
        return {
            currentPlaySoundClip:audio.currentAudioClip,
            start: this.artistClips.length,
            isMoreLoad: true,
            isLoading:false
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
                } else {
                    reject();
                    return;
                }
                if(!this.isLoading){
                    this.isLoading = true;
                } else {
                    reject();
                    return;
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
                    this.isLoading = false;
                    reject();
                    return;
                });
                artistAction.formDataMap.set('start', this.start);
                artistAction.formDataMap.set('end', 50);
                artistAction.execute();
            }).then(()=>{
                let artistClipsCache = JSON.stringify(this.artistClips);
                let cache = new BaseFrameWork.Storage.Application.SessionStorageMap;
                cache.set('artistList', artistClipsCache);
                this.isLoading = false;
            }).catch(()=>{
                //ignore
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

const SettingEffectComponent = {
    template:`
    <div>
        <div class="block">
            <p class="title">Effect</p>
            <div class="block">
                <p class="title">SoundSculpt</p>
                <p>SoundSculpt dynamically adjusts audio frequencies in real-time, enhancing or attenuating different frequency bands to provide a richer audio experience.</p>
                <input type="checkbox" v-model="isUseSoundSculpt" @change='toggleEffect'>
            </div>
            <div class="block">
                <p class="title">Loudness normalization</p>
                <p>Loudness normalization is a process used in audio mastering where the average loudness of a recording is adjusted to a consistent level. This ensures that all tracks or programs sound at a similar volume level to the listener, reducing the need to adjust volume between tracks or when switching between different media sources.</p>
                <input type="checkbox" v-model="isUseLoudnessNormalization" @change='toggleLoudnessNormalization'>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            isUseSoundSculpt:audio.exAudioEffect.isUseEffect,
            isUseLoudnessNormalization:audio.loudnessNormalize.isUse
        }
    },
    methods: {
        toggleEffect() {
            audio.exAudioEffect.isUseEffect = !audio.exAudioEffect.isUseEffect;
            audioParamSave();
        },
        toggleLoudnessNormalization() {
            audio.loudnessNormalize.isUse = !audio.loudnessNormalize.isUse;
            audioParamSave();
        }
    }
};

const SettingEqualizerComponent = {
    template:`
    <div>
        <div class="block">
            <p class="title">Equalizer</p>
            <div class="block">
                <p class="title">Preset</p>
                <div>
                    <select v-model='selectPreset' @change='changedPreset'>
                        <option v-for='key in presetNames' :value='key'>{{key}}</option>
                    </select>
                </div>
            </div>
            <div class="block">
                <p class="title">Setting</p>
                <div class="equalizer-setting-container">
                    <p class="equalizer-setting-item" v-for='item in hzArray'>
                        <span>{{toViewName(item.hz)}}</span>
                        <sw-h-progress class="setting-equalizer" max="15" min="-15" :value="item.gain" @valueSet="valueChange($event, item)"></sw-h-progress>
                    </p>
                </div>
            </div>
        </div>
    </div>
    `,
    data(){
        return {
            hzArray:[],
            presets:[],
            presetNames:[],
            selectPreset:'Manual'
        }
    },
    methods:{
        valueChange(event, value){
            value.gain = (event.target.value);
            audio.equalizer.setMonoGain(value.hz, value.gain);
            audioParamSave();
        },
        changedPreset(){
            if(this.presets[this.selectPreset] == undefined) {
                this.selectPreset = 'Manual';
            }
            this.hzArray = JSON.parse(JSON.stringify(this.presets[this.selectPreset]));
        },
        gainsUpdate(){
            audio.equalizer.monoGains = this.hzArray.slice();
            audioParamSave();
        },
        toViewName(val) {
            let hzInt = ~~val;
            let isKiloParam = (hzInt%1000) == 0;
            let kiloParam = hzInt/1000;
            if(isKiloParam){
                return `${kiloParam}kHz`;
            }
            return `${hzInt}Hz`;
        },
    },
    mounted() {
        this.hzArray = JSON.parse(JSON.stringify(audio.equalizer.leftEqualizer.gains));
        let equalizerPreset = new class extends BaseFrameWork.Network.RequestServerBase{
            constructor(){
                super(
                    null,
                    `${BASE.API}/sound_equalizer_preset.json`,
                    BaseFrameWork.Network.HttpResponseType.JSON,
                    BaseFrameWork.Network.HttpRequestType.GET);
            }
        };
        equalizerPreset.httpRequestor.addEventListener('success',e=>{
            this.presets = e.detail.response;
            this.presets['Manual'] = this.hzArray;
            this.presetNames = Object.keys(this.presets);
        });
        equalizerPreset.execute();
    }
}

const SettingFormComponent = {
    template:`
    <div>
        <div class="block">
            <p class="title">Current Status</p>
            <div>
                <div style="display: flex;justify-content: space-around;">
                    <div class="block">
                        <p class="title">Regist Status</p>
                        <p>{{registStatus?'Action':'Finished'}}</p>
                    </div>
                    <div class="block">
                        <p class="title">Regist Step1</p>
                        <p>{{registStatusStep1?'Action':'Finished'}}</p>
                    </div>
                    <div class="block">
                        <p class="title">Regist Step2</p>
                        <p>{{registStatusStep2?'Action':'Finished'}}</p>
                    </div>
                </div>
                <div style="display: flex;justify-content: space-around;">
                    <div class="block">
                        <p class="title">Analysis/Sound Count</p>
                        <p><span>{{analysisSoundCount}}</span>/<span>{{registSoundCount}}</span></p>
                    </div>
                    <div class="block">
                        <p class="title">Album Count</p>
                        <p>{{albumCount}}</p>
                    </div>
                    <div class="block">
                        <p class="title">Artist Count</p>
                        <p>{{artistCount}}</p>
                    </div>
                </div>
            </div>
        </div>
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
        <div class="block">
            <p class="title">WebSocket</p>
            <sw-input-param data-title="Retry Count Limit" :value="websocketRetryCount" name="websocket_retry_count" type="number" min="0" max="100" pattern="[0-9]"></sw-input-param>
            <sw-input-param data-title="Reconnection Interval (ms)" :value="websocketRetryIntervalMs" name="websocket_retry_interval" type="number" min="0" max="999999" pattern="[0-9]"></sw-input-param>
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
            websocketRetryCount:0,
            websocketRetryIntervalMs:10000,

            registStatus:SoundOwlProperty.SoundRegist.registStatus,
            registStatusStep1:SoundOwlProperty.SoundRegist.registStatusStep1,
            registStatusStep2:SoundOwlProperty.SoundRegist.registStatusStep2,

            registSoundCount:SoundOwlProperty.SoundRegist.RegistDataCount.sound,
            analysisSoundCount:SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound,
            albumCount:SoundOwlProperty.SoundRegist.RegistDataCount.album,
            artistCount: SoundOwlProperty.SoundRegist.RegistDataCount.artist
        };
    },
    methods:{
        updateCurrentStatus(){

            this.registStatus=SoundOwlProperty.SoundRegist.registStatus;
            this.registStatusStep1=SoundOwlProperty.SoundRegist.registStatusStep1;
            this.registStatusStep2=SoundOwlProperty.SoundRegist.registStatusStep2;

            this.registSoundCount=SoundOwlProperty.SoundRegist.RegistDataCount.sound;
            this.analysisSoundCount=SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound;
            this.albumCount=SoundOwlProperty.SoundRegist.RegistDataCount.album;
            this.artistCount=SoundOwlProperty.SoundRegist.RegistDataCount.artist;
        }
    },
    mounted() {
        let getSettingAction = new GetSetting;
        getSettingAction.httpRequestor.addEventListener('success', event=>{
            this.ip = event.detail.response.db_ip_address;
            this.dbName = event.detail.response.db_name;
            this.user = event.detail.response.db_user;
            this.pass = event.detail.response.db_pass;
            this.sound = event.detail.response.sound_directory;
            this.websocketRetryCount = event.detail.response.websocket_retry_count;
            this.websocketRetryIntervalMs = event.detail.response.websocket_retry_interval;
        });
        getSettingAction.execute();
        SoundOwlProperty.WebSocket.EventTarget.addEventListener('update',this.updateCurrentStatus);
    },
    beforeDestroy() {
        SoundOwlProperty.WebSocket.EventTarget.removeEventListener('update', this.updateCurrentStatus);
    }
};

const TabItem = {
    template:`
    <li v-bind:class="{'active':isActive}">
        <button @click="action">{{name}}</button>
    </li>
    `,
    props:{
        name:{
            type:String,
            require: true
        },
        link:{
            type:String,
            require: true
        }
    },
    data(){
        return {
            isActive:false
        }
    },
    methods:{
        action() {
            if(!this.isActive)
                router.push({name:this.link});
                this.isActive = this.$route.name == this.link;
        }
    },
    watch: {
        '$route'(to, from) {
            this.isActive = this.$route.name == this.link;
        }
    },
    mounted() {
        this.isActive = this.$route.name == this.link;
    }
}

const SettingTab = {
    template:`
    <ul class="tabmenu">
        <TabItem name="General" link="setting"></TabItem>
        <TabItem name="Equalizer" link="equalizer"></TabItem>
        <TabItem name="Effect" link="effect"></TabItem>
    </ul>
    `,
    components:{
        TabItem
    }
}

export const Setting = {
    template:`
    <div>
        <SettingTab></SettingTab>
        <div class="context" v-show="isGeneral">
            <SettingFormComponent></SettingFormComponent>
            <div style="font-size:0;line-height:0;">
                <input type="button" class="button" value="setting update" @click="settingUpdate" :disabled="!isConnectWebSocket" v-bind:data-hint="isConnectWebSocket ? undefined : 'The operation cannot be performed because the WebSocket connection has not been established.'">
                <div style="position: relative; display: inline-block;">
                    <input type="button" class="button" value="sound regist" @click="soundRegist" style="position: relative;" :disabled="!isConnectWebSocket" v-bind:data-hint="isConnectWebSocket ? undefined : 'The operation cannot be performed because the WebSocket connection has not been established.'">
                    <span style="position: absolute; top: 0; left: 0; display: flex;align-items: center; justify-content: center;" hint="Currently registering sound." v-show="isAction">
                        <svg width="100" height="43" viewBox="0 0 50 50">
                        <defs>
                        <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feComponentTransfer in="SourceAlpha">
                            <feFuncA type="table" tableValues="1 0"></feFuncA>
                            </feComponentTransfer>
                            <feGaussianBlur stdDeviation="3"></feGaussianBlur>
                            <feOffset dx="2" dy="2" result="offsetblur"></feOffset>
                            <feFlood flood-color="black" result="color"></feFlood>
                            <feComposite in2="offsetblur" operator="in"></feComposite>
                            <feComposite in2="SourceAlpha" operator="in"></feComposite>
                            <feMerge>
                            <feMergeNode in="SourceGraphic"></feMergeNode>
                            <feMergeNode></feMergeNode>
                            </feMerge>
                        </filter>
                        </defs>
                        <circle cx="25" cy="25" r="20" stroke="grey" stroke-width="4" fill="none" filter="url(#innerShadow)"></circle>
                        <circle cx="25" cy="25" r="20" stroke="black" stroke-width="4" stroke-dasharray="31.4159265359 94.2477796077" stroke-dashoffset="0" fill="none">
                        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"></animateTransform>
                        </circle>
                        </svg>
                    </span>
                </div>
            </div>
        </div>
        <div class="context" v-show="isEqualizer">
            <SettingEqualizerComponent></SettingEqualizerComponent>
        </div>
        <div class="context" v-show="isEffect">
            <SettingEffectComponent></SettingEffectComponent>
        </div>
    </div>
    `,
    components:{
        SettingTab,
        SettingFormComponent,
        SettingEqualizerComponent,
        SettingEffectComponent
    },
    data(){
        return {
            isGeneral:true,
            isEqualizer:false,
            isEffect:false,
            isConnectWebSocket: SoundOwlProperty.WebSocket.status,
            isAction: false
        }
    },
    methods:{
        updateWebConnection() {
            this.isConnectWebSocket = SoundOwlProperty.WebSocket.status;
        },
        updateProperties() {
            this.isAction = SoundOwlProperty.SoundRegist.registStatus;
            if(this.isAction) {
                this.isConnectWebSocket = false;
            } else if (SoundOwlProperty.WebSocket.status) {
                this.isConnectWebSocket = true;
            }
        },
        settingUpdate(){
            let updateSetting = new UpdateSetting;
            updateSetting.httpRequestor.addEventListener('success', event=>{
                let message = new MessageWindow;
                message.value = "Updated.";
                message.open();
                message.close(500);
            });

            for(const element of Array.prototype.slice.call(document.getElementsByTagName('sw-input-param'))){
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
                        return;
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
    },
    created(){
        SoundOwlProperty.WebSocket.EventTarget.addEventListener('change', this.updateWebConnection);
        SoundOwlProperty.WebSocket.EventTarget.addEventListener('update', this.updateProperties);
    },
    beforeDestroy() {
        SoundOwlProperty.WebSocket.EventTarget.removeEventListener('change', this.updateWebConnection);
        SoundOwlProperty.WebSocket.EventTarget.removeEventListener('update', this.updateProperties);
    },
    watch: {
        '$route'(to, from) {
            this.isGeneral = this.$route.name == 'setting';
            this.isEqualizer = this.$route.name == 'equalizer';
            this.isEffect = this.$route.name == 'effect';
        }
    },
    mounted() {
        this.isGeneral = this.$route.name == 'setting';
        this.isEqualizer = this.$route.name == 'equalizer';
        this.isEffect = this.$route.name == 'effect';
    }
};

export const SetUp = {
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
                        return;
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

const toGetParamMap=getParam=>{
    let getterNewParam = new Array();
    for (const key of getParam) {
        getterNewParam[key[0]] = decodeURI(key[1]);
    }
    return getterNewParam;
};