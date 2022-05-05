
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
        this.playCountList = document.createElement('sw-audio-slide-list');
        let playCountAction = new PlayCountAction();
        playCountAction.httpRequestor.addEventListener('success', event=>{
            let e = event.detail.response;
            for (const response of e) {
                let item = document.createElement('button',{is:'sw-audio-slide-item'});
                item.title = response['title'];
                item.src = BASE.HOME+'img/album_art.php?media_hash='+response['Album']['album_key'];
                this.playCountList.add(item);
            }
        });
        playCountAction.execute();
        window.layoutBase.appendChild(this.playCountList);
    }
}

function popPage() {
    if(window.layoutBase.parentNode == undefined) {
        document.body.appendChild(window.layoutBase);
    }
    let getterParam = toGetParamMap(UrlParam.getGetter());
    if(getterParam.page == undefined) {
        setTitle('');
        new TopPageLayout();
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
