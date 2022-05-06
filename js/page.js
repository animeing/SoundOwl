
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
                    let item = document.createElement('button',{is:'sw-audio-slide-item'});
                    item.title = response['title'];
                    item.src = BASE.HOME+'img/album_art.php?media_hash='+response['album']['album_key'];
                    this.playCountList.add(item);
                    
                    let audioClip = new AudioClip();
                    audioClip.soundHash = response['sound_hash'];
                    audioClip.title = response['title'];
                    audioClip.artist = response['artist_name'];
                    audioClip.album = response['album']['album_title'];
                    audioClip.albumKey = response['album']['album_key'];
                    audioClip.no = listNo;
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
                        audio.play(audioClip)
                    });
                }
            });
            playCountAction.execute();
            frame.appendChild(this.playCountList)
            window.layoutBase.appendChild(frame);
        }
    }
}

let currentPage = '';

function popPage() {
    if(window.layoutBase.parentNode == undefined) {
        document.body.appendChild(window.layoutBase);
    }
    let getterParam = toGetParamMap(UrlParam.getGetter());
    let isChangePage = currentPage != getterParam.page;
    currentPage = getterParam.page;
    if(getterParam.page == undefined) {
        setTitle('');
        if(isChangePage) {
            new TopPageLayout();
        }
    }
    if(getterParam.page == 'file_setting') {
        setTitle('File Setting');
    }
}

const toGetParamMap=getParam=>{
    getterNewParam = new Array();
    for (const key of getParam) {
        getterNewParam[key[0]] = decodeURI(key[1]);
    }
    return getterNewParam;
};
