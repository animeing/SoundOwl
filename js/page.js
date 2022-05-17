'use strict';
(()=>{
    window.layoutBase = document.createElement('div');
    window.layoutBase.classList.add('layout-base');
    window.addEventListener('load',popPage);
})();

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

//何かいい書き方がある気がする。。。
function popPage() {
    if(window.layoutBase.parentNode == undefined) {
        document.body.appendChild(window.layoutBase);
    }
    let getterParam = toGetParamMap(UrlParam.getGetter());
    if(getterParam.page == undefined) {
        getterParam.page = 'Top';
    }
    if(getterParam.SearchWord == undefined) {
        getterParam.SearchWord = '';
    }
    let isChangePage = currentPage != getterParam.page+getterParam.SearchWord;
    currentPage = getterParam.page+getterParam.SearchWord;
    if(getterParam.page == 'Top') {
        setTitle('');
        if(isChangePage) {
            new TopPageLayout();
        }
    }
    if(getterParam.page == 'search') {
        
        if(isChangePage) {
            new SearchSoundLayout(getterParam.SearchWord);
        }

    }
    if(getterParam.page == 'file_setting') {
        setTitle('File Setting');
    }
}

const toGetParamMap=getParam=>{
    let getterNewParam = new Array();
    for (const key of getParam) {
        getterNewParam[key[0]] = decodeURI(key[1]);
    }
    return getterNewParam;
};
