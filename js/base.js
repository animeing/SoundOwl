'use strict';
const BASE = {
    DOMAIN:'',
    SAVE_PATH:'/',
    HOME:'',
    API:'/api/'
};

const BaseFrameWork={};
BaseFrameWork.Network={};
BaseFrameWork.Storage={};
BaseFrameWork.Storage.Application={};
BaseFrameWork.Storage.Application.Module={};
BaseFrameWork.Storage.WebDB={};
BaseFrameWork.Draw={};
BaseFrameWork.Draw.Figure={};
BaseFrameWork.Draw.Figure.Module={};
BaseFrameWork.Draw.Module={};

BaseFrameWork.defineCustomElement=(tagName, constructor, options={})=>{
    if(BaseFrameWork.registoryElement == undefined){
        BaseFrameWork.registoryElement = new Map;
    }
    customElements.define(tagName, constructor, options);
    BaseFrameWork.registoryElement.set(tagName, {name:tagName, class:constructor, tagOptions:options});
}

BaseFrameWork.createCustomElement=(tagName)=>{
    if(BaseFrameWork.registoryElement == undefined) {
        return document.createElement(tagName);
    }
    let tagSettings = BaseFrameWork.registoryElement.get(tagName);
    if(tagSettings == undefined) {
        return document.createElement(tagName);
    }
    let element = null;
    if(tagSettings.tagOptions == {}){
        element = document.createElement(tagName)
    } else {
        element = document.createElement(tagSettings.tagOptions.extends, {is:tagName});
    }
    let classPropertys = Object.getOwnPropertyNames(tagSettings.class.prototype);

    let shouldActions = {initalize:false,connected:false};
    //create Tag check (一部ブラウザにて正しくCustomElementが作られない問題があるため、チェックを行い、不備を訂正する)
    for(const valuePosition in classPropertys) {
        if(element[classPropertys[valuePosition]] == undefined) {
            let descript = Object.getOwnPropertyDescriptor(tagSettings.class.prototype ,classPropertys[valuePosition]);
            if(descript.hasOwnProperty('value')) {
                element[classPropertys[valuePosition]] = tagSettings.class.prototype[classPropertys[valuePosition]];
                if(classPropertys[valuePosition] == 'connectedCallback') {
                    shouldActions.connected = true;
                }
            }
            if(descript.hasOwnProperty('get') || descript.hasOwnProperty('set')) {
                Object.defineProperty(element, classPropertys[valuePosition], descript);
            }
        }
        if(classPropertys[valuePosition] == 'initalize') {
            shouldActions.initalize = true;
        }
    }
    if(shouldActions.initalize){
        element.initalize();
    }
    return element;
};


BaseFrameWork.Draw.Point2D=class {
    constructor(){
        this.x = 0;
        this.y = 0;
    }
};

BaseFrameWork.Draw.Point = class {
    constructor(){
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
};

BaseFrameWork.Draw.Transform2D=class {
    constructor(){
        this.position = new BaseFrameWork.Draw.Point2D;
        this.rotate = new BaseFrameWork.Draw.Point2D;
        this.scale = new BaseFrameWork.Draw.Point2D;
    }
};

BaseFrameWork.Draw.Transform=class{
    constructor(){
        this.position = new BaseFrameWork.Draw.Point;
        this.rotate = new BaseFrameWork.Draw.Point;
        this.scale = new BaseFrameWork.Draw.Point;
    }
};

class MousePosition{
    _element = null;
    /**
     * 
     * @param {HTMLElement} element 
     */
    constructor(element){
        this._element = element;
    }

    /**
     * element in mouse position
     * @param {Event} e 
     */
    localMousePosition(e){
        let position = new BaseFrameWork.Draw.Point2D;
        position = this.worldMousePosition(e);
        position.x = e.clientX - this._element.offsetLeft;
        position.y = e.clientY - this._element.offsetTop;
        return position;
    }
    /**
     * viewport in mouse position
     * @param {Event} e 
     */
    worldMousePosition(e){
        let position = new BaseFrameWork.Draw.Point2D;
        position.x = e.clientX;
        position.y = e.clientY;
        return position;
    }
    toLocalMousePosition(worldPosition){
        let localPosition = worldPosition;
        localPosition.x -= this._element.offsetLeft;
        localPosition.y -= this._element.offsetTop;
        return localPosition;
    }
    toWorldMousePosition(localPosition){
        let worldPosition = localPosition;
        worldPosition.x += this._element.offsetLeft;
        worldPosition.y += this._element.offsetTop;
        return worldPosition;
    }
}

const Rand = (min, max)=> {
    return Math.random() * (max - min) + min;
};

const Base64 = {
    encode: (str)=> {
        if(str == null){
            return ;
        }
        return btoa(unescape(encodeURIComponent(str)));
    },
    decode: (str)=> {
        if(str == null){
            return ;
        }
        return decodeURIComponent(escape(atob(str)));
    }
};

class MouseEventEnum {
    /**
     * mousedown
     */
    static get DOWN(){
        return 'mousedown';
    }
    /**
     * mouseup
     */
    static get UP(){
        return 'mouseup';
    }
    /**
     * click
     */
    static get CLICK(){
        return 'click';
    }
    /**
     * mouseover
     */
    static get OVER(){
        return 'mouseover';
    }
    /**
     * mouseout
     */
    static get OUT(){
        return 'mouseout';
    }

    static get MOUSE_MOVE(){
        return 'mousemove';
    }
}

class TouchEventEnum{
    /**
     * touchstart
     */
    static get DOWN(){
        return 'touchstart';
    }
    /**
     * touchend
     */
    static get UP(){
        return 'touchend';
    }
    /**
     * touchmove
     */
    static get MOVE(){
        return 'touchmove';
    }
    /**
     * click
     */
    static get CLICK(){
        return 'click';
    }
}
const toBoolean=(data)=> {
    if(data === true || data === false) {
        return data;
    }
    return String(data).toLowerCase() === 'true';
};

class DisplayPoint extends BaseFrameWork.Draw.Point2D{
    constructor(){
        super();
    }
    isHorizontalOverFlow(horizontalSize = 0){
        let htmlWidth = document.html().clientWidth;
        return htmlWidth < this.x + horizontalSize;
    }
    isVerticalOverFlow(verticalSize = 0){
        let htmlHeight = document.html().clientHeight;
        return htmlHeight < this.y + verticalSize;
    }
}

class DragMoveEvent extends Event{
    /**
     * @type {Element}
     */
    targetElement=undefined;
    /**
     * 
     * @param {Element} targetElement 
     * @param {string} eventName 
     */
    constructor(eventName,targetElement, init=undefined){
        super(eventName, init);
        this.targetElement = targetElement;
    }

}

{
    let hint = document.createElement`p`;
    let currentHintObject = null;
    window.addEventListener(MouseEventEnum.OVER, (e)=>{
        const dom = document.elementFromPoint(e.clientX, e.clientY);
        if(dom == null || (!dom.hasAttribute`hint` && !dom.hasAttribute`title`)){
            return;
        }
        let hintText = dom.getAttribute`hint` || dom.getAttribute`title`;
        hint.classList.add`hint-box`;
        hint.innerText = hintText;
        if(!hint.hasParent()){
            document.body.appendChild(hint);
        }
        let displayPoint = new DisplayPoint;
        displayPoint.x = e.pageX;
        displayPoint.y = e.pageY;
        if(displayPoint.isHorizontalOverFlow(hint.clientWidth)){
            displayPoint.x = displayPoint.x - hint.clientWidth;
        }
        if(displayPoint.isVerticalOverFlow(hint.clientHeight)){
            displayPoint.y = displayPoint.y - hint.clientHeight;
        }

        hint.style.left = displayPoint.x+'px';
        hint.style.top = displayPoint.y+'px';

        currentHintObject = dom;
        e.stopPropagation();
    }, !0);

    window.addEventListener(MouseEventEnum.MOUSE_MOVE, (e)=>{
        if(!hint.hasParent()){
            return;
        }
        const doms = document.elementsFromPoint(e.clientX, e.clientY);
        /**
         * @ver dom {Element}
         */
        for (const dom of doms) {
            if(currentHintObject == dom){
                let displayPoint = new DisplayPoint;
                displayPoint.x = e.pageX;
                displayPoint.y = e.pageY;
                if(displayPoint.isHorizontalOverFlow(hint.clientWidth)){
                    displayPoint.x = displayPoint.x - hint.clientWidth;
                }
                if(displayPoint.isVerticalOverFlow(hint.clientHeight)){
                    displayPoint.y = displayPoint.y - hint.clientHeight;
                } else {
                    displayPoint.y+=10;
                }

                hint.style.left = displayPoint.x+'px';
                hint.style.top = displayPoint.y+'px';
                let hintText = dom.getAttribute`hint`;
                if(hintText === null){
                    return;
                }
                if(hint.innerText !== hintText){
                    hint.innerText = hintText;
                }
                return;
            }
        }
        hint.destory();
    });
}

((p)=>{
    
    Object.defineProperties(p, {
        destory:{
            value:async function(time = 0){
                setTimeout(()=>{
                    if(this.parentNode != null)
                        this.parentNode.removeChild(this);
                }, time);
            }
        },
        hasParent:{
            value:function(){
                return this.parentNode != null;
            }
        },
        appendObject:{
            value:function(object){
                return this.appendChild(object.object);
            }
        },
        destoryChildren:{
            value:function(){
                while(this.lastChild){
                    this.removeChild(this.lastChild);
                }
            }
        },
        createChildElement:{
            /**
             * 
             * @param {string} tagName 
             * @param {ElementCreationOptions} options 
             */
            value:function(tagName, options=undefined){
                let element = document.createElement(tagName, options);
                this.appendChild(element);
                return element;
            }
        },
        de:{
            value:{
                ondragElement:null,
                offset:0,
                ds: function(e){
                    this.de.offset = e.clientY;
                    this.de.ondragElement = null;
                },
                de: function(){
                    this.de.offset = 0;
                    this.de.ondragElement = null;
                },
                d: function(e){
                    if(!this.de.ondragElement){
                        for (const element of document.findPointElements(e.clientX, e.clientY, `*[d-group='${this.getAttribute('d-group')}']`)) {
                            if(element != this && element.parentElement === this.parentElement && element !== this.nextElementSibling){
                                this.de.ondragElement = element;
                                return;
                            }
                        }
                    }
                    if(this.de.ondragElement){
                        if(this.dispatchEvent(new DragMoveEvent('dragelementchange', (this.de.offset - e.clientY) < 0 ? this.de.ondragElement.previousElementSibling:this.de.ondragElement))){
                            this.parentElement.insertBefore(this, this.de.ondragElement);
                            this.de.ondragElement = null;
                        }
                    }
                } 
            }
        },
        setContextMenu:{
            value:function(contextMenuCreateIterator){
                if(contextMenuCreateIterator == undefined){
                    return;
                }
                let menuFunction = e=>{
                    ContextMenu.contextMenu.destoryChildren();
                    let iterator = contextMenuCreateIterator(this);
                    if(iterator != null){
                        for (const contextMenu of iterator) {
                            ContextMenu.contextMenu.appendChild(contextMenu);
                        }
                    }
                    ContextMenu.visible(e);
                    e.stopPropagation();
                };
                this.oncontextmenu = menuFunction;
            }
        },
        isDragMove:{
            value:function(){
                return this._isDragMove == undefined ? false : this._isDragMove;
            }
        },
        enableDragMove:{
            value:function(){
                if(!this.isDragMove()){
                    this._isDragMove = true;
                    this.setAttribute('draggable',!0);
                    this.addEventListener('dragstart', this.de.ds);
                    this.addEventListener('dragend',this.de.de);
                    this.addEventListener('drag', this.de.d);
                }
            }
        },
        disableDragMove:{
            value:function(){
                if(this.isDragMove()){
                    this.setAttribute('draggable', !1);
                    this.removeEventListener('dragstart', this.de.ds);
                    this.removeEventListener('dragend', this.de.de);
                    this.removeEventListener('drag', this.de.d);
                }
            }
        }
    });
})(Element.prototype);


((p)=>{
    Object.defineProperties(p, 
    {
        dispatch:{
            value:function(eventName){
                return this.dispatchEvent(new CustomEvent(eventName));
            }
        }
    });
})(EventTarget.prototype);

((p)=>{
    Object.defineProperties(p, {
        html:{
            value:function(){
                return document.getElementsByTagName`html`[0];
            }
        },
        findPointElements:{
            /**
             * 
             * @param {Number} pointx 画面左を起点0とした座標
             * @param {Number} pointy 画面上を起点0とした座標
             * @param {string} selector
             */
            value:function *(pointx, pointy, selector) {
                const select = document.querySelectorAll(selector);
                const doms = document.elementsFromPoint(pointx, pointy);
                for (const selectElement of Array.prototype.slice.call(select)) {
                    for (const pointElement of doms) {
                        if(selectElement == pointElement){
                            yield pointElement;
                        } 
                    }
                }
            }
        }
    });
})(Document.prototype);

((p)=>{
    Object.defineProperties(p, {
        copy:{
            value:function(){
                return this.concat();
            }
        }
    });
})(Array.prototype);

/**
 * @template T
 */
BaseFrameWork.List=class {
    /**
     * @param {Array} array
     */
    constructor(array = []){
        this.eventSupport = new EventTarget;
        this.array = array;
    }
    
    /**
     * @returns {T[]}
     */
    gets(){
        return this.array;
    }

    get length(){
        return this.gets().length;
    }

    *[Symbol.iterator](){
        for(const value of this.gets()){
            yield value;
        }
    }

    copy(){
        return new BaseFrameWork.List(this.gets().copy());
    }
    
    /**
     * @param {List|Array|Iterator} list
     */
    addAll(list){
        for (const iterator of list) {
            this.add(iterator);
        }
    }

    /**
     * adding data
     * @param {T} value 
     * @param {Number} index start = 0
     */
    add(value, index = this.length){
        if(this.length === index){
            this.gets()[index] = value;
        } else {
            this.gets().splice(index, 0, value);
        }
        this.eventSupport.dispatch('change');
    }
    /**
     * remove data
     * @param {T} value 
     */
    remove(value){
        for(let data in this.gets()){
            if(value === this.gets()[data]){
                delete this.gets()[data];
                this.eventSupport.dispatch('change');
                return;
            }
        }
    }
    /**
     * @param {Number} index
     * @returns {T}
     */
    get(index){
        return this.gets()[index];
    }
    /**
     * remove all data
     */
    removeAll(){
        this.array = [];
    }

    /**
     * 
     * @param {T} value 
     * @returns {Number}
     */
    equalFindIndex(value){
        return this.gets().findIndex(item => item === value);
    }

    deepEquals(value){
        try{
            if(this.length !== value.length){
                return false;
            }
            const selfArray = this.gets();
            const otherArray = value.gets();
            for (let index = 0; index < selfArray.length; index++) {
                if(selfArray[index] !== otherArray[index]){
                    return false;
                }
            }
            return true;
        }catch(e){
            return false;    
        }
    }
    
    count(){
        return Object.keys(this.gets()).length;
    }
    /**
     * Overwrites the current value.
     * @param {T} value 
     * @param {Number} index 
     */
    replace(value, index){
        this.gets().splice(index, 1, value);
    }

    /**
     * @param {T} target 
     * @param {T} change 
     */
    swap(target, change){
        let targetIndex = this.equalFindIndex(target);
        let changeIndex = this.equalFindIndex(change);
        this.replace(target, changeIndex);
        this.replace(change, targetIndex);
        this.eventSupport.dispatch('swap');
    }
};

/**
 * This List is not allowed to be null or undefined.
 * @extends {List}WebObject
 * @template {WebObject} T
 * @type {BaseFrameWork.List<T>}
 */
class WebObjectList extends BaseFrameWork.List{
    /**
     * @param {WebObject} parent 
     */
    constructor(parent){
        super();
        this.parent = parent;
    }

    gets(){
        this.array = super.gets().filter(Boolean);
        return this.array;
    }

    copy(){
        return new WebObjectList(this.parent.object.cloneNode(!0));
    }

    /**
     * @override
     * @param {T} value 
     */
    add(value, index = this.length){
        super.add(value, index);
        if(this.length == 0|| index == this.length-1){
            if(value instanceof WebObject){
                this.parent.appendObject(value);
            } else if (value instanceof HTMLElement) {
                this.parent.appendChild(value);
            }
        } else {
            this.get(index).object.insertAdjacentElement('beforebegin', value.object);
        }
    }
    /**
     * @override
     */
    remove(value){
        super.remove(value);
        if(value instanceof WebObject){
            value.object.destory();
        } else if (value instanceof HTMLElement) {
            value.destory();
        }
    }
    /**
     * @override
     */
    removeAll(){
        super.removeAll();
        if(this.parent instanceof WebObject){
            this.parent.removeAll();
        } else if (this.parent instanceof HTMLElement) {
            this.parent.destoryChildren();
        }
    }

    /**
     * @override
     * @param {T} value
     * @param {Number} index
     */
    replace(value, index){
        parent.object.replaceChild(value, this.get(index));
        super.replace(value, index);
    }
}

BaseFrameWork.Storage.Application.CookieMap=class {
    _savePath = '';
    constructor(savePath = ''){
        this._savePath = savePath;
    }

    *[Symbol.iterator](){
        let cookies = document.cookie.split('; ');
        for(const cookie of cookies){
            if(cookie === ''){
                continue;
            }
            const split = cookie.match('([^\S= ]*)=([A-z0-9=]*)');
            try {
                yield [split[1] , Base64.decode(split[2])];
            } catch (error) {
                
            }
        }
    }

    get(key){
        return Base64.decode(((document.cookie + '; ').match('['+key+'= ]=([A-z0-9=]*)')||[])[1]);
    }

    get path(){
        return this._savePath;
    }

    /**
     * 
     * @override
     * @param {*} key 
     * @param {*} value 
     */
    set(key, value){
        document.cookie = key+'='+Base64.encode(value)+'; path='+this.path;
    }

    /**
     * 
     * @override
     * @param {*} key 
     */
    delete(key){
        document.cookie = key+'=;max-age=0';
    }
};

BaseFrameWork.Storage.WebDB.IndexedTable = class {
    /**
     * @internal
     * @param {function(IDBObjectStore)} callback
     */
    executer = (callback)=>{console.error('db connection error');};
    /**
     * @internal
     * @param {String} tableName 
     * @param {BaseFrameWork.List<IndexedColumn>} columns
     */
    constructor(tableName, columns){
        this.tableName = tableName;
        this.columns = columns;
    }

    /**
     * @internal
     * @param {IDBDatabase} database
     * @returns {IDBObjectStore}
     */
    initalize(database){
        let objectStore = null;
        for(const column of this.columns){
            if(column.unique){
                objectStore = database.createObjectStore(this.tableName, {keyPath:column.column_name});
                break;
            }
        }
        if(objectStore == null){
            objectStore = database.createObjectStore(this.tableName);
        }
        /**
         * @var {IndexedColumn} column
         */
        for (const column of this.columns) {
            if(column.isIndex){
                objectStore.createIndex(column);
            }
        }
        return objectStore;
    }

    /**
     * @internal
     * @param {IDBDatabase} database
     * @param {string} mode
     * @returns {IDBObjectStore}
     */
    open(database, mode='readwrite'){
        return database.transaction([this.tableName], mode).objectStore(this.tableName);
    }

    /**
     * 
     * @param {function(IDBObjectStore)} action 
     */
    async getObjectStore(action){
        this.executer(objectStore=>action(objectStore));
    }
    
    /**
     * @param {Map} data
     **/
    async add(data){
        this.executer(objectStore=>objectStore.add(data));
    }

    /**
     * 
     * @param {Function} execute 
     */
    async count(execute){
        this.executer(objectStore=>execute(objectStore.count));
    }
    
    /**
     * @param {any} key
     * @param {function(*)} execute
     **/
    async get(key, execute){
        this.executer(objectStore=>execute(objectStore.get(key)));
    }
    /**
     * cursor access record.
     * @param {Function} execute 
     */
    async gets(execute){
        this.executer((objectStore)=>{
            objectStore.openCursor().onsuccess = e =>{
                let cursor = e.target.result;
                execute(cursor);
            }
        });
    }

    /**
     * 
     * @param {function(BaseFrameWork.List)} execute 
     */
    async getGenerator(execute){
        this.executer((objectStore)=>{
            objectStore.getAll().onsuccess = e =>{
                execute(
                    new BaseFrameWork.List(e.target.result)
                );
            }
        });
    }
    /**
     * remove remove.
     * @param {any} key 
     */
    remove(key){
        this.executer((objectStore)=>objectStore.delete(key));
    }
};


BaseFrameWork.Storage.WebDB.IndexedDB = class {
    /**
     * @type {Map<string,BaseFrameWork.Storage.WebDB.IndexedTable>}
     */
    tables = new Map();
    /**
     * 
     * @param {String} dbName 
     */
    constructor(dbName){
        this.dbName = dbName;
    }

    /**
     * get indexed table.
     * @param {string} tableName 
     */
    getTable(tableName){
        return this.tables.get(tableName);
    }

    /**
     * 
     * @param {string} tableName
     * @param {Number} version
     * @param {{column_name:string, unique:boolean?, isIndex:boolean?}[]}columns
     */
    createTable(tableName, version, columns){
        if(!this.tables.has(tableName)){
            let table = new BaseFrameWork.Storage.WebDB.IndexedTable(tableName, columns);
            this.tables.set(table.tableName, table);
        }
        let self = this;
        this.tables.get(tableName).executer = (func=()=>{}, actionType='readwrite')=>{
            let factory = window.indexedDB.open(self.dbName, version);
            let db = null;
            factory.onerror = e =>{
                let errorMessage = new MessageButtonWindow();
                errorMessage.value = 'Your browser does not support this feature.';
                console.log(e);
                errorMessage.addItem('Close',()=>{
                    errorMessage.close();
                });
            };
            factory.onupgradeneeded = e =>{
                db = this.tables.get(tableName).initalize(e.target.result);
                func(db);
            };
            factory.onsuccess = e =>{
                db = this.tables.get(tableName).open(e.target.result, actionType);
                func(db);
            };
        };
        return this.tables.get(tableName);
    }

};

/**
 * @virtual
 */
BaseFrameWork.Storage.Application.Module.StorageMap=class {
    constructor(){}
    static get [Symbol.species](){
        return StorageMap;
    }
    /**
     * @virtual
     * @protected
     * @returns {Storage}
     */
    getStorage(){
        return undefined;
    }
    /**
     * @readonly
     */
    get length(){
        return this.getStorage().length;
    }
    *[Symbol.iterator](){
        for (let index = 0; index < this.length; index++) {
            const key = this.getStorage().key(index);
            const value = this.get(key);
            yield [key , value];
        }
    }
    
    /**
     * Key iterator
     * @see Object.keys
     */
    *keys(){
        for (let index = 0; index < this.length; index++) {
            yield(this.getStorage().key(index));
        }
    }

    /**
     * Value iterator
     * @see keys
     */
    *values(){
        for (let index = 0; index < this.length; index++) {
            yield this.get(this.getStorage().key(index));
        }
    }

    /**
     * remove data
     * @param {*} key 
     */
    delete(key){
        this.getStorage().removeItem(key);
    }

    set(key, value){
        this.getStorage().setItem(key, value);
    }

    get(key){
        return this.getStorage().getItem(key);
    }

    clear(){
        for (const key of this.keys()) {
            this.getStorage().removeItem(key);
        }
    }

    has(key){
        return this.get(key) !== null;
    }
};

BaseFrameWork.Storage.Application.LocalStorageMap=class extends BaseFrameWork.Storage.Application.Module.StorageMap{
    static get [Symbol.species](){
        return LocalStorageMap;
    }
    getStorage(){
        return window.localStorage;
    }
};

BaseFrameWork.Storage.Application.SessionStorageMap=class extends BaseFrameWork.Storage.Application.Module.StorageMap{
    static get [Symbol.species](){
        return SessionStorageMap;
    }
    getStorage(){
        return window.sessionStorage;
    }
};

const UrlParam = {
    getGetter(url = location.search){
        let params = new Map;
        let search = url.split('?')[1];
        if(search == null){
            return params;
        }
        let pair = search.split('&');
        for(let paramCount = 0; pair[paramCount]; paramCount++){
            let sp = pair[paramCount].split('=');
            params.set(sp[0], decodeURIComponent(sp[1]));
        }
        return params;
    },
    /**
     * 
     * @param {Array} value 
     * @param {string} url default location.pathname+location.search
     */
    setGetter(value, url = location.pathname+location.search){
        let currentMap = UrlParam.getGetter(url);
        let _url =  url.split('?')[0];
        if(_url.indexOf('?') === -1){
            _url+='?';
        }
        for(let key of currentMap.keys()){
            value[key]=( (value[key] == null) ? currentMap.get(key) : value[key] );
        }
        for(let key in value){
            _url += key+'='+encodeURIComponent(value[key])+'&';
        }
        return _url.slice(0, -1);
    }
};

class ClipBoard {
    static set(str) {
        if(navigator.clipboard){
            navigator.clipboard.writeText(str);
            return true;
        } else {
            return false;
        }
    }
    static get(element) {
        if(navigator.clipboard){
            navigator.clipboard.readText().then(text=>{
                element.value = text;
            });
        }
    }
}
BaseFrameWork.Network.HttpRequestType=class {
    static get GET(){
        return 'GET';
    }
    static get POST(){
        return 'POST';
    }
};

BaseFrameWork.Network.HttpResponseType=class {
    static get TEXT(){
        return 'text';
    }
    static get JSON(){
        return 'json';
    }
    static get BLOB(){
        return 'blob';
    }
    static get ARRAY_BUFFER(){
        return 'arraybuffer';
    }
    static get DOCUMENT(){
        return 'document';
    }
};


BaseFrameWork.Network.RequestServerBase=class {
    _callBack = (e) =>{};
    /**
     * @constructor
     * @param {Map} requestHeader Post Param
     * @param {string} src url 
     * @param {string} type http request type
     * @param {string} responseType http response type
     */
    constructor(requestHeader, src, responseType=BaseFrameWork.Network.HttpResponseType.TEXT, type=BaseFrameWork.Network.HttpRequestType.POST){
        this.requestHeader = requestHeader;
        this.responseType = responseType;
        this.httpRequestor = this.httpRequest();
        this.path = src;
        this.type = type;
        this.sourceAsync = true;
        this.formDataMap = new FormData;

        {
            this.httpRequestor.addEventListener('load',()=>{
                if(this.httpRequestor.readyState !== this.httpRequestor.DONE){
                    return;
                }
                let response = this.httpRequestor.response;
                if(!this._async && this.responseType != BaseFrameWork.Network.HttpResponseType.TEXT) {
                    if(this.responseType == BaseFrameWork.Network.HttpResponseType.JSON) {
                        response = JSON.parse(this.httpRequestor.response);
                    } else if(this.responseType == BaseFrameWork.Network.HttpResponseType.BLOB){
                        response = new  Blob(this.httpRequestor.response, { type: 'application/octet-binary' });
                    }
                    //全てのresponseTypeに対応はしていない。
                }
                if((this.httpRequestor.status >= 200 && this.httpRequestor.status < 300)) {
                    this.httpRequestor.dispatchEvent(new CustomEvent('success',{
                        detail:{
                            response : response
                        }
                    }));
                } else if (this.httpRequestor.status >= 300 && this.httpRequestor.status < 400) {
                    this.httpRequestor.dispatchEvent(new CustomEvent('redirect',{
                        detail:{
                            response : response
                        }
                    }));
                } else {
                    if(this.httpRequestor.status === 418) {
                        this.httpRequestor.dispatchEvent(new CustomEvent('error',
                            {
                                detail:{
                                    response : response,
                                    message:'Server is a teapot. So I refused to make coffee. See "Hyper Text Coffee Pot Control Protocol" for details.'
                                }
                            }
                        ));
                    } else {
                        this.httpRequestor.dispatchEvent(new CustomEvent('error',{
                            detail:{
                                response : response
                            }
                        }));
                    }
                }
            });
        }
    }

    set src(value){
        this.path = value;
    }

    get src(){
        return this.path;
    }

    set sourceAsync(async){
        this._async = async;
    }
    
    execute(){
        if(this.type == BaseFrameWork.Network.HttpRequestType.GET) {
            let param = {};
            for(let key of this.formDataMap.keys()){
                param[key] = this.formDataMap.get(key);
            }
            this.httpRequestor.open(this.type, UrlParam.setGetter(param, this.path), this._async);
        } else {
            this.httpRequestor.open(this.type, this.path, this._async);
        }
        if(this._async){
            this.httpRequestor.responseType=this.responseType;
        }
        if(this.requestHeader != null && this.requestHeader.size > 0){
            for(let key of this.requestHeader.keys()){
                this.httpRequestor.setRequestHeader(key, this.requestHeader.get(key));
            }
        }
        this.httpRequestor.send(this.formDataMap);
    }

    /**
     * @private
     */
    httpRequest(){
        if(window.ActiveXObject) {
            try {
                return new ActiveXObject("Msxml2.XMLHTTP");
            } catch(exception) {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                } catch(ignore){}
            }
        }
        return new XMLHttpRequest;
    }
};


class BindValue{
    _currentValue = "";
    _bindObject = new WebObject;

    constructor(bindWrapper){
        this._bindObject = bindWrapper;
    }

    set value(newValue){
        if(this._currentValue !== newValue){
            this.bindObject.value = newValue;
            this._currentValue = newValue;
        }
    }
    get value(){
        return this._currentValue;
    }

    get bindObject(){
        return this._bindObject;
    }
}

/**
 * @abstract
 * @deprecated Use Element
 */
class WebObject{
    _obj = undefined;
    constructor(){
        this._obj = document.createElement(this.tagName);
    }

    /**
     * object tag name
     */
    get tagName(){
        return undefined;
    }

    /**
     * remove child all
     */
    removeAll(){
        while(this.object.lastChild){
            this.object.removeChild(this.object.lastChild);
        }
    }

    /**
     * @param {WebObject|BindValue} object 
     */
    appendObject(object){
        this.object.appendObject(object);
    }

    /**
     * 
     * @param {Element} element 
     */
    appendChild(element){
        this.object.appendChild(element);
    }

    /**
     * @returns {HTMLElement}
     */
    get object(){
        return this._obj;
    }
    
    set value(str){
        this.object.innerText = str;
    }
    
    get value(){
        return this.object.innerText;
    }
}

class ProgressComposite extends HTMLElement{
    _max = 0;
    _min = 0;
    _value = 0;
    constructor(){
        super();
        this.mousePosition = new MousePosition(this);
        this.readOnly = false;
        this.isManualMoving = !1;
        this.progress = document.createElement`div`;
        this.addEventListener('mousedown',()=>{
            this.isProgressManualMove = !0;
            this.dispatch('change');
            this.dispatch('changingValue');
        });
        this.addEventListener('mouseout',(e)=>{
            if(e.relatedTarget !== this.object && e.relatedTarget !== this.progress && this.isProgressManualMove){
                this.dispatch('changingValue');
                this.dispatch('change');
                this.isProgressManualMove = !1;
            }
        });
        this.addEventListener('mouseup',()=>{
            if(this.readOnly) return;
            this.isProgressManualMove = !1;
            this.dispatch('changed');
        }, !0);
        this.addEventListener('mousemove',(e)=>{
            if(this.readOnly) return;
            if(this.isProgressManualMove){
                this.mouseMove(e);
                this.dispatch('changingValue');
            }
        });
        this.addEventListener('click',(e)=>{
            if(this.readOnly) return;
            this.mouseMove(e);
            this.dispatch('changingValue');
        });
    }
    static get observedAttributes() {
        return ['value', 'max', 'min', ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if('value' == name) {
            this.value = Number(newValue);
        }
        if('max' == name) {
            this.max = Number(newValue);
        }
        if('min' == name) {
            this.min = Number(newValue);
        }
      }

    /**
     * @protected
     */
    connectedCallback(){
        this.appendChild(this.progress);
    }

    mousePositionvalue(event){
        return (this.getOffset(event) / this.clientWidth * this.range) + this.min;
    }

    mouseMove(event){
        this.setAttribute('value', (this.getOffset(event) / this.clientWidth * this.range) + this.min);
    }

    getOffset(event){
        return this.mousePosition.localMousePosition(event).x;
    }
    /**
     * 
     * @param {Number} value 
     */
    update(value = this.value){
        if(this.max === this.min){
            return
        }
        if(this.max < value){
            this.setAttribute('value', this.max);
        }
        if(this.min > value){
            this.setAttribute('value', this.min);
        }
        if(this.progress != undefined){
            this.progress.style.transform = this.scaleStyle;
        }
        this.dispatch('valueSet');
    }

    get scaleStyle(){
        return `scaleX(${this.per})`;
    }
    
    /**
     * @param {number} value
     */
    get value(){
        return this._value;
    }

    /**
     * @param {number} value
     */
    set value(value){
        if(this._value == value || isNaN(value)){
            return;
        }
        this._value = value;
        this.update(value);
    }


    /**
     * @param {number} max
     */
    get max(){
        return this._max;
    }

    /**
     * @param {number} max
     */
    set max(max){
        if(this.min >= max || this.max == max || isNaN(max)) return;
        this._max = max;
        this.update();
    }

    get min(){
        return this._min;
    }

    set min(min){
        if(min >= this.max || this.min == min || isNaN(min)) return;
        this._min = min;
        this.update()
    }

    get per(){
        if(this.max == 0){
            return 0;
        }
        return ((this.value-this.min) / this.range);
    }

    get range(){
        return this.max - this.min;
    }

}

customElements.define('sw-h-progress', ProgressComposite);

class VerticalProgressComposite extends ProgressComposite{
    
    constructor(){
        super();
    }

    connectedCallback(){
        super.connectedCallback();
        this.classList.add`vertical-progress`;
    }

    mouseMove(event){
        this.setAttribute('value', (this.getOffset(event) / this.clientHeight * this.range) + this.min);
    }

    getOffset(event){
        return this.getBoundingClientRect().bottom - event.clientY;
    }
    get scaleStyle(){
        return `scaleY(${this.per})`;
    }
}

customElements.define('sw-v-progress', VerticalProgressComposite);


class ComboBoxObject extends WebObject{

    /**
     * @type {BaseFrameWork.List<OptionObject>}
     */
    optionList = new BaseFrameWork.List;

    constructor(){
        super();
        this.object.size = this.SIZE;
    }

    get tagName(){
        return 'select';
    }

    /**
     * record size
     */
    get SIZE(){
        return 1;
    }

    /**
     * selection index
     * @param {Number} index
     */
    set value(index){
        this.optionList.get(index).object.selected = true;
    }

    get value(){
        this.optionList.gets().forEach((element)=>{
            if(element.object.selected){
                return element.value;
            }
        });
        return undefined;
    }

    /**
     * 
     * @param {Number} value 
     * @param {String} displayName 
     */
    addOption(value, displayName){
        const option = BaseFrameWork.createCustomElement('sw-option');
        option.value = value;
        option.displayName = displayName;
        this.optionList.add(option);
        this.appendObject(option);
    }

    removeOption(index){
        this.optionList.get(index).object.destory();
        this.optionList.remove(index);
    }
}

/**
 * inner class
 * @internal
 */
class OptionObject extends HTMLOptionElement{
    
    set value(index){
        this.value = index;
    }

    get value(){
        return this.value;
    }

    set displayName(string){
        this.label = string;
        this.innerText = string;
    }
    get displayName(){
        return this.innerText;
    }
}

BaseFrameWork.defineCustomElement('sw-option', OptionObject, {extends:'option'});

class MessageWindow extends HTMLElement{
    _messageElement = document.createElement('p');
    constructor(){
        super();
    }

    set value(message){
        if(this._messageElement.innerText == message){
            return;
        }
        this._messageElement.innerText = message;
    }

    get value(){
        return this._messageElement.innerText;
    }

    open(){
        fixed.appendChild(this);
    }

    /**
     * @protected
     */
    connectedCallback(){
        this.appendChild(this._messageElement);
        return this;
    }
    /**
     * close window
     * @param {Number} viewTime 
     */
    close(viewTime = 0){
        let instance = this;
        setTimeout(()=>{
            instance.classList.add`height-hide`;
            this.dispatch('closeEvent');
            instance.destory(300);
        },viewTime);
    }
}

customElements.define('sw-message-box', MessageWindow);

class MessageButtonWindow extends MessageWindow {
    _buttonNameList = new BaseFrameWork.List;
    constructor(){
        super();
        this.buttonFrame = document.createElement('div');
        this._buttonNameList.eventSupport.addEventListener('change',()=>this.changeButtonList());
    }

    connectedCallback(){
        super.connectedCallback();
        this.createButtonBlock();
        this.appendChild(this.buttonFrame);
    }

    /**
     * @private
     */
    createButtonBlock(){
        this.changeButtonList();
        return this.buttonFrame;
    }

    /**
     * @private
     */
    changeButtonList(){
        this.buttonFrame.destoryChildren();
        for (const buttonName of this._buttonNameList) {
            this.addButton(buttonName);
        }
    }

    /**
     * @param {MenuItem} menuitem
     */
    addButton(menuItem){
        if(menuItem === undefined) return;
        this.buttonFrame.appendChild(menuItem.webObject);
    }

    /**
     * 
     * @param {String} value 
     * @param {Function} onclick 
     */
    addItem(value, onclick){
        let button = document.createElement('input');
        button.type='button';
        let menuItem = new MenuItem(button);
        menuItem.value = value;
        menuItem.onClickEvent = onclick;
        this._buttonNameList.add(menuItem);
    }
}

customElements.define('sw-message-button', MessageButtonWindow);

class LIButtonObject extends HTMLLIElement{
    constructor(){
        super();
    }

    initalize() {
        this.menuItem = document.createElement('input');
        this.menuItem.type = 'button';
        this.appendChild(this.menuItem);
    }
}

BaseFrameWork.defineCustomElement('sw-libutton', LIButtonObject, {extends:'li'});

class DropDownElement extends HTMLUListElement{
    _dropdownNameObject = null;
    constructor(){
        super();
    }

    initalize() {
        this.list = new WebObjectList(this);
        this.dropdownObject = document.createElement('li');
        this.classList.add('dropdown');
    }

    set dropdownObject(value){
        if(value == undefined) {
            return;
        }
        if(this.dropdownObject != null){
            this.dropdownObject.destory();
        }
        this._dropdownNameObject = value;
        if(this.list == undefined||this.list.get(0) == undefined){
            this.appendChild(this.dropdownObject);
        } else {
            this.object.insertBefore(this.dropdownObject,this.list.get(0).object);
        }
    }

    get dropdownObject(){
        return this._dropdownNameObject;
    }

    set displayName(value){
        this.dropdownObject.innerText = value;
    }

    get displayName(){
        if(this.dropdownObject == undefined) {
            return undefined;
        }
        return this.dropdownObject.innerText;
    }

    /**
     * @param {String} value 
     * @param {Function} onclick 
     */
    addItem(value, onclick){
        /**
         * @type {LIButtonObject}
         */
        let menuItem = BaseFrameWork.createCustomElement('sw-libutton');
        this.list.add(menuItem);
        menuItem.menuItem.value = value;
        menuItem.menuItem.onclick = onclick;
    }
}

BaseFrameWork.defineCustomElement('sw-dropdown', DropDownElement, {extends: 'ul'});


/**
 * @abstract
 */
BaseFrameWork.Draw.Module.CanvasBase=class extends WebObject{
    _canvasObjectList = new BaseFrameWork.List;
    _paramClass = null;
    constructor(){
        super();
        this._paramClass = {
            mousePosition: new MousePosition(this.object)
            
        };
    }
    get canvas(){
        return this.context.canvas;
    }
    get tagName(){
        return 'canvas';
    }
    get width(){
        return this.canvas.width;
    }
    get height(){
        return this.canvas.height;
    }

    addCanvasObjectList(canvasObject){
        canvasObject.fcontext(this.context);
        let scale = new BaseFrameWork.Draw.Point2D;
        scale.x = this.width;
        scale.y = this.height;
        canvasObject.canvasScale = scale;
        this.canvasObjectList.add(canvasObject);
    }
    removeCanvasObjectList(canvasObject){
        this.canvasObjectList.remove(canvasObject);
    }
    get canvasObjectList(){
        return this._canvasObjectList;
    }
    run(){
        this.renderFunction = (t)=>{
            this.render();
        };
        this.animationId = requestAnimationFrame(()=>{
            this.awake();
            this.reset();
            this.start();
            this.renderFunction();
        });
    }
    clear(){
        this.context.clearRect(
            0,
            0,
            this.width,
            this.height
        );
    }
    awake(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.awake();
        }
    }
    reset(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.reset();
        }
    }
    start(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.start();
        }
    }
    fixedUpdate(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.renderObjectBase();
        }
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.fixedUpdate();
        }
    }
    checkCollisiton(){

    }
    update(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.update();
        }
    }
    lateUpdate(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.lateUpdate();
        }
    }

    render(){
        this.clear();
        this.fixedUpdate();
        this.checkCollisiton();
        this.update();
        this.lateUpdate();
        this.animationId = requestAnimationFrame(this.renderFunction);
    }

    quit(){
        for (const canvasObject of this.canvasObjectList) {
            canvasObject.quit();
        }
        cancelAnimationFrame(this.animationId); 
    }   
};

BaseFrameWork.Draw.Canvas2D=class extends BaseFrameWork.Draw.Module.CanvasBase{
    constructor(){
        super();
        this.context = this.object.getContext`2d`;
    }
};

/**
 * 3dオブジェクトを表示するCanvasオブジェクト
 * (関数実行順はUnityを参考に作成)
 */
BaseFrameWork.Draw.Canvas=class extends BaseFrameWork.Draw.Module.CanvasBase{
    constructor(){
        super();
        this.canvas = this.object.getContext`webgl` || this.object.getContext`experimental-webgl`;
    }
};

class CanvasObjectColor{
    r = 0xff;
    g = 0xff;
    b = 0xff;
    a = 100;
    get color(){
        return `rgb(${this.r},${this.g},${this.b},${this.a}%)`;
    }
}

BaseFrameWork.Draw.Figure.Module.CanvasObjectBase=class {
    _color = new CanvasObjectColor;
    __context = null;
    update = ()=>{};
    /**
     * @returns {CanvasObjectColor}
     */
    get color(){
        return this._color;
    }

    /**
     * @param {RenderingContext} context
     * @returns {RenderingContext}
     */
    fcontext(context){
        this.__context = context;
        return this.context;
    }
    /**
     * @returns {RenderingContext}
     */
    get context(){
        return this.__context;
    }

    async renderObjectBase(){
        this.context.beginPath();
        this.context.save();
        this.pathReset();
        this.renderObject();
        this.context.restore();
        this.context.closePath();
    }

    pathReset(){}

    renderObject(){}

    awake(){}
    reset(){}
    start(){}
    fixedUpdate(){}
    update(){}
    lateUpdate(){}
    quit(){}

};

BaseFrameWork.Draw.Figure.CanvasObject2DBase=class extends BaseFrameWork.Draw.Figure.Module.CanvasObjectBase{
    _path = new Path2D();
    _isFill = true;
    constructor(){
        super();
        this.transform = new BaseFrameWork.Draw.Transform2D;
    }
    /**
     * @private
     */
    pathReset(){
        this._path = new Path2D;
    }
    /**
     * @returns {Path2D}
     */
    get path(){
        return this._path;
    }
    /**
     * @return {boolean}
     */
    get fill(){
        return this._isFill;
    }

    set fill(value){
        this._isFill = value;
    }

};

BaseFrameWork.Draw.Figure.BoxCanvasObject2D=class extends BaseFrameWork.Draw.Figure.CanvasObject2DBase{

    async renderObject(){
        this.context.translate(
            (this.transform.scale.x>>1)-this.transform.position.x,
            (this.transform.scale.y>>1)-this.transform.position.y);
        this.context.rotate(this.transform.rotate.x);
        this.context.translate(
            -((this.transform.scale.x>>1)-this.transform.position.x),
            -((this.transform.scale.y>>1)-this.transform.position.y));

        let path = this.path;
        path.rect(
            this.transform.position.x, this.transform.position.y,
            this.transform.scale.x, this.transform.scale.y);

        this.context.fillStyle = this.color.color;
        this.context.fill(path);

    }
};

class CanvasAudioAnalizer extends BaseFrameWork.Draw.Canvas2D{
    render=()=>{
        if(this.analyser != null){
            let leng = this.analyser.frequencyBinCount;
            this.spectrums = new Uint8Array(leng);
            this.analyser.getByteFrequencyData(this.spectrums);
        }

        super.render();
    };

    /**
     * 
     * @param {AudioContext} audioContext 
     */
    connect(audioContext, audioSourceNode){
        this.object.classList.add('analyser-view');
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = CanvasAudioAnalizer.fftSize;
        audioSourceNode.connect(this.analyser);
        let filter = audioContext.createBiquadFilter();
        filter.type = 'allpass';
        audioSourceNode.connect(filter);
        
        let leng = this.analyser.frequencyBinCount;
        this.spectrums = new Uint8Array(leng);
        this.analyser.smoothingTimeConstant = .5;
        this.analyser.getByteFrequencyData(this.spectrums);

        this.canvasObjectList.removeAll();
        for(let createCount = 0, len = this.spectrums.length; createCount < len; createCount++){
            let box = new BaseFrameWork.Draw.Figure.BoxCanvasObject2D;
            box.update = async ()=>{
                if(this.spectrums != null){
                    box.transform.position.x = (createCount+1)*(this.object.width / (len+4));
                    box.transform.position.y = 0;
                    box.transform.scale.x = (this.object.width / len) >> 1;
                    box.transform.scale.y = (this.spectrums[createCount] / 0xff ) * (this.height >> 1);
                }
            };
            this.addCanvasObjectList(box);
        }
    }

    static get fftSize(){
        return 1<<7+1;
    }

}

class MenuItem {
    /**
     * 
     * @param {WebObject} webObject 
     */
    constructor(webObject){
        this.webObject = webObject;
        this.value = '';
        this.onClickEvent= ()=>{};
    }

    get value(){
        return this.webObject.value;
    }

    set value(value){
        this.webObject.value = value;
    }

    set onClickEvent(func){
        if(this.webObject instanceof WebObject){
            return this.webObject.object.addEventListener(MouseEventEnum.CLICK, (e)=>{func(e)});
        } else if(this.webObject instanceof Element){
            this.webObject.addEventListener(MouseEventEnum.CLICK, (e)=>{func(e)});
        }
    }
}

/**
 * 
 * @param {HTMLAnchorElement} tag 
 */
const LinkAction = (tag)=>{
    tag.onclick = (e)=>{
        e.preventDefault();
        let link = tag.getAttribute('name');
        router.push({name:link});
        setTitle('');
    };
};

const _history = {
    pushState(url){
        history.pushState(url, null, url);
    }
};

const ContextMenu = {
    isVisible: false,
    contextMenu: document.createElement('ul'),
    position: new DisplayPoint,
    /**
     * @param {Element} baseElement
     */
    baseElement: null,
    /**
     * 
     * @param {Event} e 
     */
    visible(e){
        if(e.preventDefault != undefined){
            e.preventDefault();
        }
        if(ContextMenu.isVisible){
            ContextMenu.remove();
        }
        ContextMenu.baseElement = document.createElement('div');
        ContextMenu.baseElement.id='context-menu';
        ContextMenu.baseElement.appendChild(this.contextMenu);
        document.html().append(ContextMenu.baseElement);
        ContextMenu.setPosition(e);
        ContextMenu.isVisible=true;
        if(e.stopImmediatePropagation != undefined){
            e.stopImmediatePropagation();
        }
    },
    /**
     * @private
     */
    removeEventSet(){
        let disableAction = ()=>{
            if(ContextMenu.isVisible){
                ContextMenu.remove();
                ContextMenu.contextMenu.destoryChildren();
            }
        };
        document.html().addEventListener(MouseEventEnum.CLICK,disableAction, !1);
        window.addEventListener('scroll',disableAction, !1);
        window.addEventListener('drag',disableAction, !1);
    },
    /**
     * @private
     * @param {Event} e 
     */
    setPosition(e){
        let point = new MousePosition(ContextMenu.baseElement).worldMousePosition(e);
        ContextMenu.position.x = point.x;
        ContextMenu.position.y = point.y;
        if(ContextMenu.position.isHorizontalOverFlow(ContextMenu.baseElement.clientWidth)){
            ContextMenu.position.x = ContextMenu.position.x - ContextMenu.baseElement.clientWidth;
        }
        if(ContextMenu.position.isVerticalOverFlow(ContextMenu.baseElement.clientHeight)){
            ContextMenu.position.y = ContextMenu.position.y - ContextMenu.baseElement.clientHeight;
        }
        ContextMenu.baseElement.style.left = ContextMenu.position.x+"px";
        ContextMenu.baseElement.style.top = ContextMenu.position.y+"px";
    },
    remove(){
        if(ContextMenu.isVisible){
            try{
                ContextMenu.baseElement.remove();
                ContextMenu.isVisible = false;
            }catch(e){}
        }
    }
};

window.addEventListener('contextmenu', (e)=>{
    ContextMenu.visible(e);
    e.stopPropagation();
});

class AudioClip{
    constructor(){
        this.no=0;
        this.soundHash=null;
        this.artist=null;
        this.title=null;
        this.album=null;
        this.albumKey = null;
    }

    get src(){
        if(this.soundHash != null){
            return BASE.HOME+'sound_create/sound.php?media_hash='+this.soundHash;
        }
        return null;
    }

    /**
     * @param {AudioClip} param
     */
    equals(param){
        if(param == null || param.no != this.no){
            return false;
        }
        if(param.soundHash != this.soundHash){
            return false;
        }
        return true;
    }
    static createAudioClip(serverFileTitle, title, album, artist, no){
        let audioClip = new AudioClip;
        audioClip.no = no;
        audioClip.title = title;
        audioClip.album = album;
        audioClip.soundHash = serverFileTitle;
        audioClip.artist = artist;
        return audioClip;
    }
}

class AudioStateEnum{
    static get LOAD_START(){
        return 'loadstart';
    }
    static get PROGRESS(){
        return 'progress';
    }
    static get SUSPEND(){
        return 'suspend';
    }
    static get ABORT(){
        return 'abort';
    }
    static get ERROR(){
        return 'error';
    }
    static get EMPTIED(){
        return 'emptied';
    }
    static get STALLED(){
        return 'stalled';
    }
    static get LOADED_METADATA(){
        return 'loadedmetadata';
    }
    static get LOADED_DATA(){
        return 'loadeddata';
    }
    static get CAN_PLAY(){
        return 'canplay';
    }
    static get CAN_PLAY_THROUGH(){
        return 'canplaythrough';
    }
    static get PLAYING(){
        return 'playing';
    }
    static get WAITING(){
        return 'waiting';
    }
    static get ENDED(){
        return 'ended';
    }
    static get PAUSE(){
        return 'pause';
    }
}

class AudioPlayStateEnum{
    static get PLAY(){
        return 'play';
    }
    static get PAUSE(){
        return 'pause';
    }
    static get STOP(){
        return 'stop';
    }
}

class AudioLoopModeEnum{
    static get NON_LOOP(){
        return 'NON_LOOP';
    }
    static get AUDIO_LOOP(){
        return 'AUDIO_LOOP';
    }
    static get TRACK_LOOP(){
        return 'TRACK_LOOP';
    }
}



class AudioPlayer{
    _currentAudioClip = null;
    constructor(){
        this.audio = new Audio;
        this.audioContext = new AudioContext;
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.audioContext.destination);
        /**
         * @type {BaseFrameWork.List<AudioClip>}
         */
        this.playList = new BaseFrameWork.List;
        this.loopMode = AudioLoopModeEnum.NON_LOOP;
        this.currentPlayState = AudioPlayStateEnum.STOP;
        this.eventSupport = new EventTarget;
        this.stateInit();
        this.audioUpdateEvent = new CustomEvent('update');
        this.audioUpdatedEvent = new CustomEvent('updated');
        this.data = {};
        this.loadGiveUpTime = 10000;
        this.audio.onerror = ()=> {
            console.log("Error " + this.audio.error.code + "; details: " + this.audio.error.message);
        };
        this.eventSupport.addEventListener('audioSet', ()=>{
            let request = new SoundInfomation();
            request.httpRequestor.addEventListener('success', event=>{
                this.data = event.detail.response;
                this.eventSupport.dispatchEvent(new CustomEvent('audio_info_loaded'));
            });
            request.formDataMap.append('SoundHash', this.currentAudioClip.soundHash);
            request.execute();
        });
        this.setUpdate();
    }

    /**
     * @type {AudioClip}
     */
    get currentAudioClip(){
        return this._currentAudioClip;
    }

    set currentAudioClip(currentAudioClip){
        this._currentAudioClip = currentAudioClip;
    }

    stateInit(){
        let instance = this;
        this.audioState = AudioStateEnum.PAUSE;
        this.audio.addEventListener(AudioStateEnum.ABORT,()=>{
            instance.audioState = AudioStateEnum.ABORT;
        });
        this.audio.addEventListener(AudioStateEnum.CAN_PLAY,()=>{
            instance.audioState = AudioStateEnum.CAN_PLAY;
        });
        this.audio.addEventListener(AudioStateEnum.CAN_PLAY_THROUGH,()=>{
            instance.audioState = AudioStateEnum.CAN_PLAY_THROUGH;
        });
        this.audio.addEventListener(AudioStateEnum.EMPTIED,()=>{
            instance.audioState = AudioStateEnum.EMPTIED;
        });
        this.audio.addEventListener(AudioStateEnum.ENDED,()=>{
            instance.audioState = AudioStateEnum.ENDED;
        });
        this.audio.addEventListener(AudioStateEnum.ERROR,()=>{
            instance.audioState = AudioStateEnum.ERROR;
        });
        this.audio.addEventListener(AudioStateEnum.LOADED_DATA,()=>{
            instance.audioState = AudioStateEnum.LOADED_DATA;
        });
        this.audio.addEventListener(AudioStateEnum.LOADED_METADATA,()=>{
            instance.audioState = AudioStateEnum.LOADED_METADATA;
        });
        this.audio.addEventListener(AudioStateEnum.LOAD_START,()=>{
            instance.audioState = AudioStateEnum.LOAD_START;
        });
        this.audio.addEventListener(AudioStateEnum.PAUSE,()=>{
            instance.audioState = AudioStateEnum.PAUSE;
        });
        this.audio.addEventListener(AudioStateEnum.PLAYING,()=>{
            instance.audioState = AudioStateEnum.PLAYING;
        });
        this.audio.addEventListener(AudioStateEnum.PROGRESS,()=>{
            instance.audioState = AudioStateEnum.PROGRESS;
        });
        this.audio.addEventListener(AudioStateEnum.STALLED,()=>{
            instance.audioState = AudioStateEnum.STALLED;
        });
        this.audio.addEventListener(AudioStateEnum.SUSPEND,()=>{
            instance.audioState = AudioStateEnum.SUSPEND;
        });
        this.audio.addEventListener(AudioStateEnum.WAITING,()=>{
            instance.audioState = AudioStateEnum.WAITING;
        });
        this.audio.addEventListener(AudioPlayStateEnum.PLAY,()=>{
            instance.audioPlayState = AudioPlayStateEnum.PLAY;
        });
        this.audio.addEventListener(AudioPlayStateEnum.PAUSE,()=>{
            instance.audioPlayState = AudioPlayStateEnum.PAUSE;
        });
    }

    updateLockAccess = false;

    /**
     * @private
     */
    setUpdate(){
        if(this.updateLockAccess) return;
        this.updateLockAccess = true;
        try {
            if(this.updateJob == null){
                this.updateJob = setInterval(()=>{
                    this.audioUpdate();
                }, this.UPDATE_MILI_SEC);
            }
        } finally {
            this.updateLockAccess = false;
        }
    }

    setStopUpdate(){
        if(this.updateLockAccess) return;
        this.updateLockAccess = true;
        try{
            if(this.updateJob != null){
                clearInterval(this.updateJob);
                this.updateJob = null;
            }
        } finally {
            this.updateLockAccess = false;
        }
    }

    /**
     * @private
     */
    audioUpdate(){
        this.eventSupport.dispatchEvent(this.audioUpdateEvent);
        switch(this.currentPlayState){
            case AudioPlayStateEnum.STOP:
            case AudioPlayStateEnum.PAUSE:
            {
                return;
            }
            case AudioPlayStateEnum.PLAY:
            {
                if(!this.isPlaying && !this.isLoading){
                    let com = ()=>{
                        let audioClip = this.autoNextClip;
                        if(audioClip == undefined){
                            this.pause();
                            this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                            return;
                        }
                        this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                        this.play(audioClip);
                        this.errorTime = null;
                    };
                    if(this.isError){
                        if(this.errorTime == null){
                            this.errorTime = setTimeout(()=>{
                                if(this.audioState != AudioStateEnum.STALLED){
                                    if(this.audioState == AudioStateEnum.ERROR){
                                        let errorWindow = new MessageWindow;
                                        errorWindow.value='Sound load missing.\nPlease check network.';
                                        errorWindow.close(1000);
                                    }
                                    return;
                                }
                                return com();
                            }, this.loadGiveUpTime);
                        }
                    } else {
                        if(this.audioState != AudioStateEnum.ERROR){
                            if(this.errorTime == null){
                                this.errorTime = setTimeout(()=>{
                                    if(this.audioState != AudioStateEnum.STALLED){
                                        if(this.audioState == AudioStateEnum.ERROR){
                                            let errorWindow = new MessageWindow;
                                            errorWindow.value='Sound load missing.\nPlease check network.';
                                            errorWindow.close(1000);
                                        }
                                        return;
                                    }
                                    return com();
                                }, this.loadGiveUpTime);
                            }
                        }
                    }
                }
                if(!this.isLoading && (this.audio.currentTime === this.audio.duration)){
                    let clip = this.autoNextClip;
                    if(clip == null)
                    {
                        return;
                    }
                    this.play(clip);
                }
            }
        }
    }

    /**
     * 
     * @param {AudioClip} setAudioClip 
     */
    setCurrentAudioClip(setAudioClip){
        if(this.currentAudioClip === setAudioClip || setAudioClip == undefined){
            return;
        }
        this.currentAudioClip = setAudioClip;
        this.audioDeployment();
        // this.audioUpdate(); //CHECK
    }

    audioDeployment(){
        this.eventSupport.dispatchEvent(new CustomEvent('audioSet'));
        this.audio.src = this.currentAudioClip.src;
    }

    get UPDATE_MILI_SEC(){
        return 500;
    }

    get isError(){
        return (
               this.audioState === AudioStateEnum.ERROR 
            || this.audioState === AudioStateEnum.EMPTIED
            || this.audioState === AudioStateEnum.STALLED
            || this.audioState === AudioStateEnum.WAITING);
    }

    get isLoading(){
        return (
               this.audioState === AudioStateEnum.LOAD_START 
            || this.audioState === AudioStateEnum.PROGRESS 
            || this.audioState === AudioStateEnum.ABORT
            || this.audioState === AudioStateEnum.LOADED_METADATA
            || this.audioState === AudioStateEnum.LOADED_DATA);
    }

    get isPlaying(){
        if(this.audio.currentTime == 0 && isNaN(this.audio.duration)) return false;
        return (this.audio.currentTime !== this.audio.duration);
    }
    /**
     * @private
     */
    get autoNextClip(){
        if(this.currentAudioClip == null) {
            return this.playList.get(0);
        }
        switch(this.loopMode){
            case AudioLoopModeEnum.AUDIO_LOOP:
            {
                return this.currentAudioClip;
            }
            case AudioLoopModeEnum.NON_LOOP:
            case AudioLoopModeEnum.TRACK_LOOP:
            {
                return this.nextClip();
            }
        }
        return undefined;
    }
    nextClip(){
        let clipIndex = -1;
        for (let position = 0; position < this.playList.length; position++) {
            const element = this.playList.get(position);
            if(element != null && this.currentAudioClip != null && element.soundHash == this.currentAudioClip.soundHash){
                clipIndex = position;
                break;
            }
            
        }
        if(this.currentAudioClip == null){
            return this.playList.get(0);
        }
        if(clipIndex === -1){
            return this.currentAudioClip;
        }
        let nextClip = null;
        for(let position = clipIndex+1; position < this.playList.length; position++){
            nextClip = this.playList.get(position);
            if(nextClip != null){
                break;
            }
        };
        if(nextClip == undefined){
            switch (this.loopMode) {
                case AudioLoopModeEnum.AUDIO_LOOP:
                {
                    return this.currentAudioClip;
                }
                case AudioLoopModeEnum.NON_LOOP:
                {
                    return undefined;
                }
                case AudioLoopModeEnum.TRACK_LOOP:
                {
                    return this.playList.get(0);
                }
            }
        }
        return nextClip;
    }
    play(audioClip = undefined){
        this.setStopUpdate();
        try{
            if(audioClip != undefined){
                this.currentAudioClip = audioClip;
                this.audioDeployment();
            } else if(this.currentAudioClip == null){
                this.currentAudioClip = this.playList.get(0);
                if(this.currentAudioClip == undefined){
                    return;
                }
                this.audioDeployment();
            } else {
                if(this.audio.src == null){
                    this.audioDeployment();
                }
            }
            this.audio.play();
            this.currentPlayState = AudioPlayStateEnum.PLAY;
            this.eventSupport.dispatchEvent(new CustomEvent('play'));
        } finally {
            this.setUpdate();
        }
    }
    pause(){
        this.audio.pause();
        this.currentPlayState = AudioPlayStateEnum.PAUSE;
        this.eventSupport.dispatchEvent(new CustomEvent('pause'));
    }
    stop(){
        if(this.audio.src == null){
            return;
        }
        this.audio.pause();
        this.audio.currentTime = 0;
        this.currentPlayState = AudioPlayStateEnum.STOP;
        this.eventSupport.dispatchEvent(new CustomEvent('stop'));
    }
}




var fixed = document.createElement`div`;
fixed.classList.add`fixed-window`;

let bindObject = new BindValue;
let testPtag = document.createElement('p');

const setTitle = (pageName)=>{
    if(pageName == ''){
        document.title = 'SoundOwl';
        return;
    }
    if(getPageName() == pageName){
        return;
    }
    document.title = pageName+' - SoundOwl';
};

const getPageName = () =>{
    return getTitle().slice(0, -11);
};

const getTitle = ()=>{
    return document.title;
};
const getTime=(sec)=> {
    return {
      "min": ~~(sec / 60),
      "sec": ~~(sec % 60)
    };
};

const timeToText=(time)=> {
    let t = getTime(time);
    return {
      "min": ("0" + t["min"]).slice(-2),
      "sec": ("0" + t["sec"]).slice(-2)
    };
};

/**
 * add bottom event
 * @param {HTMLElement|Window} element
 */
const addBottomEvent = (element)=>{
    if(element == window){
        element.addEventListener('scroll',()=>{
            const windowHeight = element.innerHeight;
            const pageHeight = document.documentElement.offsetHeight;
            if((pageHeight - windowHeight) <= document.documentElement.scrollTop){
                window.dispatchEvent(new CustomEvent('bottom'));
            }
        });
    } else {
        element.addEventListener('scroll',()=>{
            if((element.scrollHeight - element.clientHeight) <= element.scrollTop){
                element.dispatchEvent(new CustomEvent('bottom'));
            }
        });
    }
};

addBottomEvent(window);
window.addEventListener('load', ()=>{
    Array.prototype.forEach.call(document.getElementsByClassName('page-title'), element=>{
        if(element.tagName.toLowerCase() == 'a'){
            LinkAction(element);
        }
    });
});

window.addEventListener('load', ()=>{
    document.body.appendChild(fixed);
    ContextMenu.removeEventSet();

}, !0);

var audio = new AudioPlayer;
