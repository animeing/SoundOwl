<template>
    <div class='audio-list'>
        <button v-for="(item, index) in requestData()" :key="index" :class='audioItemClass(item)' @click.right.prevent="soundContext(item)" @click="click(item)">
            <SoundClipComponent :sound-clip='item'></SoundClipComponent>
        </button>
        <LoadingListComponent v-show="isLoading"></LoadingListComponent>
    </div>
</template>
<script>
import audio from '../../audio/audioPlayer';
import { AudioPlayStateEnum } from '../../audio/enum/audioPlayStateEnum';
import { AudioClip } from '../../audio/type/audioClip';
import { BaseFrameWork, ContextMenu } from '../../base';
import searchBox, { SoundOwlProperty } from '../../layout';
import { SoundSearchAction, UpdateSoundInfomationAction } from '../../page';
import LoadingListComponent from '../common/LoadingListComponent.vue';
import SoundClipComponent from '../common/SoundClipComponent.vue';

export default {
    name:'Search',
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
            audio.playList.addAll(this.soundClips);
            
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
}
</script>

