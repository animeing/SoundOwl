function popPage() {
    let getterParam = toGetParamMap(UrlParam.getGetter());
    if(getterParam.page == 'file_setting') {
        console.log('file_setting');
    }
}

const toGetParamMap=getParam=>{
    getterNewParam = new Array();
    for (const key of getParam) {
        getterNewParam[key[0]] = decodeURI(key[1]);
    }
    return getterNewParam;
};
