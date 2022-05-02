(()=>{
    window.addEventListener('load',popPage);
    const soket = new WebSocket('ws://localhost:8000');
    soket.addEventListener('open', function (event) {
        soket.send('Hello Server!');
    });
    soket.addEventListener('message', e=>{
        console.log('message ', e.data);
    });
})();

function popPage() {
    let getterParam = toGetParamMap(UrlParam.getGetter());
    if(getterParam.page == undefined) {
        setTitle('');
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
