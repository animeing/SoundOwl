'use strict';


export const BaseFrameWork={};
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
  if(BaseFrameWork.registryElement == undefined){
    BaseFrameWork.registryElement = new Map;
  }
  customElements.define(tagName, constructor, options);
  BaseFrameWork.registryElement.set(tagName, {name:tagName, class:constructor, tagOptions:options});
};

BaseFrameWork.createCustomElement=(tagName)=>{
  if(BaseFrameWork.registryElement == undefined) {
    return document.createElement(tagName);
  }
  let tagSettings = BaseFrameWork.registryElement.get(tagName);
  if(tagSettings == undefined) {
    return document.createElement(tagName);
  }
  let element = null;
  if(tagSettings.tagOptions == {}){
    element = document.createElement(tagName);
  } else {
    element = document.createElement(tagSettings.tagOptions.extends, {is:tagName});
  }
  let classPropertys = Object.getOwnPropertyNames(tagSettings.class.prototype);

  let shouldActions = {initalize:false,connected:false};
  //create Tag check (一部ブラウザにて正しくCustomElementが作られない問題があるため、チェックを行い、不備を訂正する)
  for(const valuePosition in classPropertys) {
    if(element[classPropertys[valuePosition]] == undefined) {
      let descript = Object.getOwnPropertyDescriptor(tagSettings.class.prototype ,classPropertys[valuePosition]);
      // eslint-disable-next-line no-prototype-builtins
      if(descript.hasOwnProperty('value')) {
        element[classPropertys[valuePosition]] = tagSettings.class.prototype[classPropertys[valuePosition]];
        if(classPropertys[valuePosition] == 'connectedCallback') {
          shouldActions.connected = true;
        }
      }
      // eslint-disable-next-line no-prototype-builtins
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

/**
 * 指定した値が目的の値になるまで待機し、一定時間経っても目的の値にならない場合にエラー関数を実行する。
 * 
 * @param {Function} checkValue - 目的の値になったかどうかをチェックするための関数。
 * @param {*} targetValue - 目的の値。
 * @param {number} timeout - 待機する最大時間（ミリ秒）。
 * @returns {Promise} - 目的の値になるまで待機するPromiseオブジェクト。目的の値になればresolveが、タイムアウトすればrejectが呼ばれる。
 */
BaseFrameWork.waitForValue=(checkValue, targetValue, timeout)=> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function check() {
      if (checkValue() === targetValue) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Timeout'));
      } else {
        setTimeout(check, 100);
      }
    }
    check();
  });
};

/**
 * 排他制御をシンプルに実装するユーティリティクラス。  
 * 同時に 1 つだけ実行したい処理を「名前付きロック」として登録し、
 * `action()` で安全に呼び出せます。
 *
 * ### 使い方
 * ```js
 * const locker = new BaseFrameWork.LockAction();
 *
 * // 重い非同期処理を登録
 * locker.addLockEventListener(
 *   'heavyTask',
 *   async () => {
 *     //本処理
 *   },
 *   () => console.warn('timeout!'), // タイムアウト時
 *   2000                            // 2 秒以内にロック取得できなければ eject
 * );
 *
 * // 実行。並列に呼んでも同時には走らない
 * await locker.action('heavyTask');
 * ```
 */
BaseFrameWork.LockAction = class {
  /**
   * @constructor
   * 初期化。`isLocked` は現在ロック中かどうかを示します。
   */
  constructor() {
    /** @type {boolean} ロック状態 */
    this.isLocked = false;

    /**
     * ロック名ごとのハンドラ格納テーブル。
     * @type {Object.<string, {function: Function, ejectFunction: Function, timeout: number}>}
     */
    this.actionArray = {};
  }

  /**
   * 処理をロック付きで登録します。
   *
   * @param {string}   name          一意なロック名
   * @param {Function} func          ロック取得後に実行する非同期／同期関数
   * @param {Function} [ejectFunc]   タイムアウト時に呼ばれる関数（既定：空関数）
   * @param {number}   [timeout=1000] ロック取得を待つ上限ミリ秒
   * @returns {void}
   */
  addLockEventListener(name, func, ejectFunc = () => {}, timeout = 1e3) {
    this.actionArray[name] = {
      function: func,
      ejectFunction: ejectFunc,
      timeout
    };
  }

  /**
   * 登録済みロック処理を実行します。
   *
   * @param {string} name 登録時のロック名
   * @returns {Promise<void>} 実行完了を待つ Promise
   */
  async action(name) {
    const action = this.actionArray[name];
    if (!action) return;
    await this.acquire(action.function, action.ejectFunction, action.timeout);
  }

  /**
   * 内部用ロック取得関数。`@private` 扱い。
   *
   * @private
   * @param {Function} func        ロック取得後に実行する処理
   * @param {Function} [ejectFunc] タイムアウト時に呼ばれる処理
   * @param {number}   [timeout]   待機上限ミリ秒
   * @returns {Promise<void>}
   */
  async acquire(func, ejectFunc = () => {}, timeout = 1e3) {
    await BaseFrameWork
      .waitForValue(() => !this.isLocked, true, timeout)
      .then(async () => {
        this.isLocked = true;
        try {
          await func();
        } finally {
          this.isLocked = false;
        }
      })
      .catch(ejectFunc);
  }
};

/**
 * requestAnimationFrameを利用したアニメーション制御用のユーティリティクラス。
 * アニメーションの開始・停止を簡単に行うことができます。
 */
BaseFrameWork.AnimationFrame = class {
  _animationFrameId = null;
  /**
   * 
   * @param {function} func 
   */
  startAnimation(func) {
    const loop = () => {
      func();
      this._animationFrameId = requestAnimationFrame(loop);
    }
    this.stopAnimation();
    this._animationFrameId = requestAnimationFrame(loop);
  }
  stopAnimation() {
    if(this._animationFrameId == null) {
      return;
    }
    cancelAnimationFrame(this._animationFrameId);
    this._animationFrameId = null;
  }
}

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

export const Rand = (min, max)=> {
  return Math.random() * (max - min) + min;
};

const Base64 = {
  encode: (str) => {
    if(str == null){
      return;
    }
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) => {
      return String.fromCharCode(Number('0x' + p1));
    }));
  },
  decode: (str) => {
    if(str == null){
      return;
    }
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }
};


export class MouseEventEnum {
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

export class TouchEventEnum{
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
export const toBoolean=(data)=> {
  if(data === true || data === false) {
    return data;
  }
  return String(data).toLowerCase() === 'true';
};

export class DisplayPoint extends BaseFrameWork.Draw.Point2D{
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

export class DragMoveEvent extends Event{
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
    if(dom == null || !dom.hasAttribute`data-hint`){
      return;
    }
    let hintText = dom.getAttribute`data-hint`;
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
        let hintText = dom.getAttribute`data-hint`;
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

BaseFrameWork.removeEmptyLines=(text)=>{
  const lines = text.split('\n');
  const filteredLines = lines.filter(line => line.trim() !== '');
  return filteredLines.join('\n');
};

/**
 * 
 * @param {Element} element 
 * @param {string} variableName 
 * @returns 
 */
BaseFrameWork.getCSSProperty = (element, variableName)=> {
  return getComputedStyle(element).getPropertyValue(variableName).trim();
};

BaseFrameWork.LimitedList = class extends EventTarget{
  constructor(limit) {
    super();
    this.limit = limit;
    this.array = [];
  }
  add(element) {
    this.array.push(element);
    this.dispatchEvent(new CustomEvent('add'));
    if (this.array.length > this.limit) {
      let vl = this.array.shift();
      this.dispatchEvent(new CustomEvent('delete', {
        detail:{
          value:vl
        }}));
    }
  }

  *[Symbol.iterator]() {
    for (const value of this.array) {
      yield value;
    }
  }

  get(index) {
    return this.array[index];
  }

  size() {
    return this.array.length;
  }
};

export class WakeLockManager {
  #queue = [];
  #locked = false;

  /** ロック取得 */
  requestWakeLock() {
    if (this.#locked) {
      return new Promise(resolve => this.#queue.push(resolve));
    }
    this.#locked = true;
    return Promise.resolve();
  }

  /** ロック解放 */
  releaseWakeLock() {
    if (this.#queue.length) {
      // 次の待機者を起こす
      this.#queue.shift()();
    } else {
      this.#locked = false;
    }
  }

  /** 便利メソッド：排他区間を包む */
  async runExclusive(fn) {
    await this.requestWakeLock();
    try {
      return await fn();
    } finally {
      this.releaseWakeLock();
    }
  }
}

/**
 * @template T
 */
BaseFrameWork.List = class {
  /**
     * コンストラクタ: Listクラスのインスタンスを初期化します。
     * @param {Array} array - 初期化に使用する配列（オプショナル）
     */
  constructor(array = []) {
    this.eventSupport = new EventTarget();
    this.array = array.copy();
  }

  /**
     * 現在の配列を返します。
     * @returns {Array} 現在の配列のコピー
     */
  gets() {
    return this.array.copy();
  }

  /**
     * 現在の配列の長さを返します。
     * @returns {number} 配列の長さ
     */
  get length() {
    return this.array.length;
  }

  /**
     * 現在の配列のイテレータを返します。
     */
  *[Symbol.iterator]() {
    for (const value of this.array) {
      yield value;
    }
  }

  /**
     * 現在の配列のコピーを持つ新しいListインスタンスを返します。
     * @returns {BaseFrameWork.List} 新しいListインスタンス
     */
  copy() {
    return new BaseFrameWork.List(this.gets());
  }

  /**
     * 複数の要素を現在の配列に追加します。
     * @param {BaseFrameWork.List|Array|Iterator} list - 追加する要素のリスト
     */
  addAll(list) {
    for (const iterator of list) {
      this.array[this.array.length] = iterator;
    }
    this.eventSupport.dispatch('change');
  }

  /**
     * 配列に新しい要素を追加します。
     * @param {T} value - 追加する要素
     * @param {Number} index - 追加する位置（オプショナル、デフォルトは配列の末尾）
     */
  add(value, index = this.length) {
    this.array.splice(index, 0, value);
    this.eventSupport.dispatch('change');
  }

  /**
     * 配列から指定の要素を削除します。
     * @param {T} value - 削除する要素
     */
  remove(value) {
    const index = this.array.indexOf(value);
    if (index !== -1) {
      this.array.splice(index, 1);
      this.eventSupport.dispatch('change');
    }
  }

  /**
     * 配列の指定位置の要素を取得します。
     * @param {Number} index - 取得する要素の位置
     * @returns {T | undefined} 指定位置の要素
     */
  get(index) {
    return this.array[index];
  }

  /**
     * 配列のすべての要素を削除します。
     */
  removeAll() {
    this.array = [];
    this.eventSupport.dispatch('change');
  }

  /**
     * 指定した要素の位置（インデックス）を返します。
     * @param {T} value - 検索する要素
     * @returns {Number} 指定した要素の位置（見つからない場合は-1）
     */
  equalFindIndex(value) {
    return this.array.findIndex(item => item === value);
  }

  /**
     * 他のリストと内容が完全に一致するかどうかを判断します。
     * @param {List} value - 比較対象のリスト
     * @returns {boolean} 2つのリストの内容が完全に一致する場合はtrue、それ以外はfalse
     */
  deepEquals(value) {
    if (this.length !== value.length) {
      return false;
    }

    for (let index = 0; index < this.array.length; index++) {
      if (this.array[index] !== value.get(index)) {
        return false;
      }
    }

    return true;
  }

  /**
     * 配列の要素数を返します。
     * @returns {number} 配列の要素数
     */
  count() {
    return this.array.length;
  }

  /**
     * 配列の指定位置の要素を新しい要素で上書きします。
     * @param {T} value - 新しい要素
     * @param {Number} index - 上書きする位置
     */
  replace(value, index) {
    if (index >= 0 && index < this.array.length) {
      this.array[index] = value;
      this.eventSupport.dispatch('change');
    }
  }

  /**
     * 2つの要素の位置を交換（スワップ）します。
     * @param {T} target - 位置を交換する1つ目の要素
     * @param {T} change - 位置を交換する2つ目の要素
     */
  swap(target, change) {
    const targetIndex = this.equalFindIndex(target);
    const changeIndex = this.equalFindIndex(change);

    if (targetIndex !== -1 && changeIndex !== -1) {
      this.array[targetIndex] = change;
      this.array[changeIndex] = target;
      this.eventSupport.dispatch('swap');
    }
  }
};


/**
 * This List is not allowed to be null or undefined.
 * @extends {List}WebObject
 * @template {WebObject} T
 * @type {BaseFrameWork.List<T>}
 */
export class WebObjectList extends BaseFrameWork.List{
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
      const split = cookie.match('([^S= ]*)=([A-z0-9=]*)');
      yield [split[1] , Base64.decode(split[2])];
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
  executer = (callback)=>{console.error('db connection error',callback);};
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
      };
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
      };
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
    return BaseFrameWork.Storage.Application.Module.StorageMap;
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
    return BaseFrameWork.Storage.Application.LocalStorageMap;
  }
  getStorage(){
    return window.localStorage;
  }
};

BaseFrameWork.Storage.Application.SessionStorageMap=class extends BaseFrameWork.Storage.Application.Module.StorageMap{
  static get [Symbol.species](){
    return BaseFrameWork.Storage.Application.SessionStorageMap;
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

export class ClipBoard {
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

/**
 * @deprecated
 */
BaseFrameWork.Network.RequestServerBase=class {
  _callBack = (e) =>{console.log(e);};
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
    return new XMLHttpRequest;
  }
};

/**
 * @abstract
 * @deprecated Use Element
 */
export class WebObject{
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

class SwResize extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isResizing = false;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
  }

  connectedCallback() {
    this.updateHandle();
  }

  static get observedAttributes() {
    return ['resize-direction'];
  }

  attributeChangedCallback(attrName, _oldVal, _newVal) {
    if (attrName === 'resize-direction') {
      this.updateHandle();
    }
  }

  updateHandle() {
    const direction = this.getAttribute('resize-direction') || 'bottom-right';
    const directions = direction.split(' ');

    const styles = `
      :host {
        display: block;
        position: relative;
      }

      .handle {
        width: 10px;
        height: 10px;
        background-color: #000;
        position: absolute;
      }

      ${directions.includes('bottom-right') ? '.handle.bottom-right { bottom: 0; right: 0; cursor: nwse-resize; }' : ''}
      ${directions.includes('bottom-left') ? '.handle.bottom-left { bottom: 0; left: 0; cursor: nesw-resize; }' : ''}
      ${directions.includes('top-right') ? '.handle.top-right { top: 0; right: 0; cursor: nesw-resize; }' : ''}
      ${directions.includes('top-left') ? '.handle.top-left { top: 0; left: 0; cursor: nwse-resize; }' : ''}
    `;

    const template = `
      <style>${styles}</style>
      <slot></slot>
      ${directions.map(dir => `<div class="handle ${dir}"></div>`).join('')}
    `;

    this.shadowRoot.innerHTML = template;

    directions.forEach(dir => {
      const handle = this.shadowRoot.querySelector(`.handle.${dir}`);
      handle.addEventListener('mousedown', e => this.startResize(e, dir));
      document.addEventListener('mousemove', e => this.resize(e, dir));
      document.addEventListener('mouseup', e => this.stopResize(e));
    });
  }

  startResize(e, _direction) {
    this.isResizing = true;
    this.startX = e.pageX;
    this.startY = e.pageY;
    this.startWidth = parseInt(document.defaultView.getComputedStyle(this).width, 10);
    this.startHeight = parseInt(document.defaultView.getComputedStyle(this).height, 10);
  }

  resize(e, direction) {
    if (!this.isResizing) return;

    let dx = e.pageX - this.startX;
    let dy = e.pageY - this.startY;

    switch (direction) {
    case 'bottom-right':
      this.style.width = `${this.startWidth + dx}px`;
      this.style.height = `${this.startHeight + dy}px`;
      break;
    case 'bottom-left':
      this.style.width = `${this.startWidth - dx}px`;
      this.style.height = `${this.startHeight + dy}px`;
      break;
    case 'top-right':
      this.style.width = `${this.startWidth + dx}px`;
      this.style.height = `${this.startHeight - dy}px`;
      break;
    case 'top-left':
      this.style.width = `${this.startWidth - dx}px`;
      this.style.height = `${this.startHeight - dy}px`;
      break;
    }

    const event = new Event('resize');
    this.dispatchEvent(event);
  }

  stopResize(_e) {
    this.isResizing = false;
  }
}
customElements.define('sw-resize', SwResize);

export class ProgressComposite extends HTMLElement {
  constructor() {
    super();

    // Properties
    this._max = 0;
    this._min = 0;
    this._value = 0;
    this.readOnly = false;
    this.isProgressManualMove = false;
    this.progress = document.createElement('div');
    this.mousePosition = new MousePosition(this);

    // Event listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    this.addEventListener('mousedown', () => {
      this.isProgressManualMove = true;
      this.dispatch('change');
      this.dispatch('changingValue');
    });

    this.addEventListener('mouseout', (e) => {
      if ((e.relatedTarget !== this.progress && e.relatedTarget !== this) && this.isProgressManualMove) {
        this.dispatch('changingValue');
        this.dispatch('change');
        this.isProgressManualMove = false;
      }
    });

    this.addEventListener('mouseup', () => {
      if (this.readOnly) return;
      this.isProgressManualMove = false;
      this.dispatch('changed');
    }, true);

    this.addEventListener('mousemove', (e) => {
      if (this.readOnly) return;
      if (this.isProgressManualMove) {
        this.mouseMove(e);
        this.dispatch('changingValue');
      }
    });

    this.addEventListener('click', (e) => {
      if (this.readOnly) return;
      this.dispatch('change');
      this.dispatch('changingValue');
      this.mouseMove(e);
      this.dispatch('changed');
    });
  }

  static get observedAttributes() {
    return ['slider-value', 'max', 'min', 'readonly'];
  }


  attributeChangedCallback(name, _oldValue, newValue) {
    switch(name) {
    case 'slider-value':
      this.queueValueUpdate(Number(newValue));
      break;
    case 'max':
      this._max = Number(newValue);
      this.queueValueUpdate(this._pendingValue);
      break;
    case 'min':
      this._min = Number(newValue);
      this.queueValueUpdate(this._pendingValue);
      break;
    case 'readonly':
      this.readOnly = !!newValue;
      break;
    }
  }

  queueValueUpdate(newValue) {
    this._pendingValue = newValue;
    clearTimeout(this._valueUpdateTimeout);
    this._valueUpdateTimeout = setTimeout(() => {
      this.sliderValue = this._pendingValue;
    });
  }

  connectedCallback() {
    this.appendChild(this.progress);
  }

  mouseMove(event) {
    const proposedValue = this.mousePositionvalue(event);
    let value = Math.min(Math.max(proposedValue, this.min), this.max);
    this.setAttribute('slider-value', value);
  }

  mousePositionvalue(event) {
    return (this.getOffset(event) / this.clientWidth * this.range) + this.min;
  }

  getOffset(event) {
    return this.mousePosition.localMousePosition(event).x;
  }

  update(value = this.sliderValue) {
    if (this.max === this.min) {
      return;
    }

    this._value = Math.min(Math.max(value, this.min), this.max);
        
    if (this.progress) {
      this.progress.style.transform = this.scaleStyle;
    }
    this.dispatch('valueSet');
  }

  get scaleStyle() {
    return `scaleX(${this.per})`;
  }

  get sliderValue() {
    return +(this._value);
  }

  set sliderValue(value) {
    const validValue = isNaN(value) ? this._value : value;
    this.update(validValue);
  }

  get max() {
    return +(this._max);
  }

  set max(value) {
    const validMax = isNaN(value) ? this._max : value;
    if (this._min < validMax) {
      this._max = validMax;
      this.update();
    }
  }

  get min() {
    return +(this._min);
  }

  set min(value) {
    const validMin = isNaN(value) ? this._min : value;
    if (validMin < this._max) {
      this._min = validMin;
      this.update();
    }
  }

  get per() {
    return this.range === 0 ? 0 : ((this.sliderValue - this.min) / this.range);
  }

  get range() {
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

  mouseMove(event) {
    const proposedValue = (this.getOffset(event) / this.clientHeight * this.range) + this.min;
    const value = Math.min(Math.max(proposedValue, this.min), this.max);
    this.setAttribute('slider-value', value);
  }
  getOffset(event) {
    return Math.max(0, this.getBoundingClientRect().bottom - event.clientY);
  }
  get scaleStyle(){
    return `scaleY(${this.per})`;
  }
}

customElements.define('sw-v-progress', VerticalProgressComposite);


export class ComboBoxObject extends WebObject{

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

export class MessageWindow extends HTMLElement{
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

  open(viewTime = 0){
    this.classList.remove('height-hide');
    fixed.appendChild(this);
    if(viewTime > 0){
      this.close(viewTime);
    }
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

export class MessageButtonWindow extends MessageWindow {
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

export class InputMessageButtonWindow extends MessageButtonWindow {
  constructor(){
    super();
    this.inputFrame = document.createElement('div');
    this.inputText = document.createElement('input');
    this.inputText.type = 'text';
  }

  connectedCallback(){
    this.appendChild(this._messageElement);
    this.inputFrame.appendChild(this.inputText);
    this.appendChild(this.inputFrame);
    super.createButtonBlock();
    this.appendChild(this.buttonFrame);
  }
}

customElements.define('sw-save-message', InputMessageButtonWindow);

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

class SearchBox extends HTMLElement{
  _searchBox = document.createElement('input');
  searchIcon = document.createElement('span');
  searchEvent = _value=>{};
  constructor(){
    super();
    this.searchIcon.innerText = '';
    this.searchIcon.addEventListener(MouseEventEnum.CLICK, ()=>{
      this.searchBox.focus();
    });
    this.searchBox.type='text';
    this.searchBox.addEventListener('keyup', (e)=>{
      if(e.keyCode !== 13){
        return;
      }
      this.searchEvent(this.searchBox.value);
    });
    this.searchBox.addEventListener('contextmenu', ()=>{
      ContextMenu.contextMenu.destoryChildren();
      {
        let copy = BaseFrameWork.createCustomElement('sw-libutton');
        copy.menuItem.value = 'Copy';
        copy.menuItem.onclick = ()=>{
          ClipBoard.set(this.searchBox.value);
        };
        ContextMenu.contextMenu.appendChild(copy);
      }
      {
        let paste = BaseFrameWork.createCustomElement('sw-libutton');
        paste.menuItem.value = 'Paste';
        paste.menuItem.onclick = ()=>{
          ClipBoard.get(this.searchBox);
        };
        ContextMenu.contextMenu.appendChild(paste);
      }
    });
  }
    
  connectedCallback(){
    this.setAttribute('data-hint', 'Search box');
    this.searchIcon.classList.add('icon');
    this.appendChild(this.searchIcon);
    this.appendChild(this.searchBox);
  }

  get value(){
    return this.searchBox.value;
  }

  set value(value){
    this.searchBox.value = value;
  }

  get searchBox(){
    return this._searchBox;
  }
}
customElements.define('sw-searchbox', SearchBox);


class InputParam extends HTMLElement {
  constructor() {
    super();
    this._title = document.createElement('span');
    this._input = document.createElement('input');
    this._input.addEventListener('contextmenu', ()=>{
      ContextMenu.contextMenu.destoryChildren();
      {
        let copy = BaseFrameWork.createCustomElement('sw-libutton');
        copy.menuItem.value = 'Copy';
        copy.menuItem.onclick = ()=>{
          ClipBoard.set(this._input.value);
        };
        ContextMenu.contextMenu.appendChild(copy);
      }
      {
        let paste = BaseFrameWork.createCustomElement('sw-libutton');
        paste.menuItem.value = 'Paste';
        paste.menuItem.onclick = ()=>{
          ClipBoard.get(this._input);
        };
        ContextMenu.contextMenu.appendChild(paste);
      }
    });
    {
      let val = this._input.value;
      this._input.addEventListener('input', ()=>{
        if(!this._input.hasAttribute('pattern')) {
          return;
        }
        const pattern = new RegExp(this._input.value.pattern);
        if(!pattern.test('/^'+this._input.value+'$/')) {
          this._input.value = val;
          return;
        }
        if(this._input.value == '') {
          this._input.value = val;
          return;
        }
        if(this._input.hasAttribute('max')) {
          this._input.value = Math.min(this._input.value, this._input.max);
        }
        if(this._input.hasAttribute('min')) {
          this._input.value = Math.max(this._input.value, this._input.min);
        }
        val = this._input.value;
      });
    }
  }
    
  static get observedAttributes() {
    return ['value', 'data-title', 'type', 'max', 'min', 'pattern','name', 'readonly'];
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if('value' == name) {
      this._input.value = newValue;
    }
    if('data-title' == name) {
      this._title.innerText = newValue;
    }
    if('type' == name) {
      this._input.type = newValue;
    }
    if('max' == name) {
      this._input.setAttribute('max', newValue);
    }
    if('min' == name) {
      this._input.setAttribute('min', newValue);
    }
    if('pattern' == name) {
      this._input.setAttribute('pattern', newValue);
    }
    if('name' == name) {
      this._input.name = newValue;
    }
    if('readonly' == name) {
      this._input.readOnly = newValue;
    }
  }

  get value(){
    return this._input.value;
  }
  set value(val) {
    this.setAttribute('value', val);
  }

  get title() {
    return this._title.innerText;
  }
  set title(title) {
    this.setAttribute('data-title', title);
  }

  get type() {
    return this._input.type;
  }
  set type(type) {
    this.setAttribute('type', type);
  }

  get max() {
    return this._input.max;
  }

  set max(max) {
    this.setAttribute('max', max);
  }

  get min() {
    return this._input.min;
  }

  set min(min) {
    this.setAttribute('min', min);
  }

  get pattern(){
    return this._input.pattern;
  }

  set pattern(pattern){
    this.setAttribute('pattern', pattern);
  }

  get name() {
    return this._input.name;
  }
  set name(name) {
    this.setAttribute('name', name);
  }

  get readOnly() {
    return this._input.readOnly;
  }
  set readOnly(readOnly) {
    this.setAttribute('readonly', readOnly);
  }
    
  connectedCallback(){
    let shadow = this.attachShadow({mode: 'closed'});
    shadow.appendChild(this._title);
    shadow.appendChild(this._input);
    let style = document.createElement('style');
    style.innerHTML = `
        :host {
            display: block;
        }
        
        span{
            min-width: 10em;
            width: fit-content;
            display: inline-block;
            border-bottom: 2px solid var(--subfontcolor);
            margin-bottom: 10px;
        }
          
        input{
            background-color: var(--playerbgcolor);
            width: 100%;
            border-radius: 5px;
            font-size: 1em;
            height: 23px;
            color: var(--fontcolor);
            -webkit-text-fill-color: var(--fontcolor);
            border: none;
            padding: 5px;
        }`;
    shadow.appendChild(style);
  }
}
BaseFrameWork.defineCustomElement('sw-input-param', InputParam);

class InputFile extends HTMLElement {
  constructor() {
    super();
    this._title = document.createElement('span');
    this._input = document.createElement('input');
    this._input.type = 'file';
    
    this._input.addEventListener('change', () => {
      this._files = this._input.files;
      this.dispatchEvent(new CustomEvent('files-changed', { detail: this._files }));
    });

    this._input.addEventListener('contextmenu', () => {
      ContextMenu.contextMenu.destoryChildren();
      {
        let clear = BaseFrameWork.createCustomElement('sw-libutton');
        clear.menuItem.value = 'Clear';
        clear.menuItem.onclick = () => {
          this._input.value = '';
          this._files = null;
        };
        ContextMenu.contextMenu.appendChild(clear);
      }
    });
  }
    
  static get observedAttributes() {
    return ['data-title', 'accept', 'multiple', 'name'];
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if ('data-title' == name) {
      this._title.innerText = newValue;
    }
    if ('accept' == name) {
      this._input.accept = newValue;
    }
    if ('multiple' == name) {
      this._input.multiple = newValue !== null;
    }
    if ('name' == name) {
      this._input.name = newValue;
    }
  }

  get files() {
    return this._files;
  }

  set files(files) {
    // This is read-only in normal usage, so we don't set it
  }

  get title() {
    return this._title.innerText;
  }

  set title(title) {
    this.setAttribute('data-title', title);
  }

  get accept() {
    return this._input.accept;
  }

  set accept(accept) {
    this.setAttribute('accept', accept);
  }

  get multiple() {
    return this._input.multiple;
  }

  set multiple(multiple) {
    if (multiple) {
      this.setAttribute('multiple', '');
    } else {
      this.removeAttribute('multiple');
    }
  }

  get name() {
    return this._input.name;
  }

  set name(name) {
    this.setAttribute('name', name);
  }
    
  connectedCallback() {
    let shadow = this.attachShadow({ mode: 'closed' });
    shadow.appendChild(this._title);
    shadow.appendChild(this._input);
    let style = document.createElement('style');
    style.innerHTML = `
        :host {
            display: block;
            margin-bottom: 10px;
            font-family: Arial, sans-serif;
        }
        
        span {
            display: block;
            font-size: 1.2em;
            font-weight: bold;
            color: var(--title-color);
            margin-bottom: 5px;
        }
          
        input[type="file"] {
            display: block;
            width: 100%;
            padding: 10px;
            border: 1px solid var(--subcolor);
            border-radius: 5px;
            font-size: 1em;
            background-color: var(--basecolor);
            color: var(--input-color);
            cursor: pointer;
            transition: background-color 0.3s, border-color 0.3s;
        }

        input[type="file"]:hover {
            background-color: var(--subcoloraccentcolor);
            border-color: var(--subcoloraccentcolor);
        }

        input[type="file"]::file-selector-button {
            padding: 5px 10px;
            border: none;
            border-radius: 3px;
            background-color: var(--playerbgcolor);
            color: var(--button-color);
            cursor: pointer;
            transition: background-color 0.3s;
        }

        input[type="file"]::file-selector-button:hover {
            background-color: var(--subcoloraccentcolor);
        }`;
    shadow.appendChild(style);
  }
}

BaseFrameWork.defineCustomElement('sw-input-file', InputFile);



class TextAreaParam extends HTMLElement {
  constructor() {
    super();
    this._title = document.createElement('span');
    this._textarea = document.createElement('textarea');
    this._textarea.addEventListener('contextmenu', ()=>{
      ContextMenu.contextMenu.destoryChildren();
      {
        let copy = BaseFrameWork.createCustomElement('sw-libutton');
        copy.menuItem.value = 'Copy';
        copy.menuItem.onclick = ()=>{
          ClipBoard.set(this._textarea.value);
        };
        ContextMenu.contextMenu.appendChild(copy);
      }
      {
        let paste = BaseFrameWork.createCustomElement('sw-libutton');
        paste.menuItem.value = 'Paste';
        paste.menuItem.onclick = ()=>{
          ClipBoard.get(this._textarea);
        };
        ContextMenu.contextMenu.appendChild(paste);
      }
    });
    {
      let val = this._textarea.value;
      this._textarea.addEventListener('input', ()=>{
        if(!this._textarea.hasAttribute('pattern')) {
          return;
        }
        const pattern = new RegExp(this._textarea.getAttribute('pattern'));
        if(!pattern.test('/^'+this._textarea.value+'$/')) {
          this._textarea.value = val;
          return;
        }
        val = this._textarea.value;
      });
    }
  }
    
  static get observedAttributes() {
    return ['value', 'data-title', 'pattern', 'name', 'readonly'];
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if('value' == name) {
      this._textarea.value = newValue;
    }
    if('data-title' == name) {
      this._title.innerText = newValue;
    }
    if('pattern' == name) {
      this._textarea.setAttribute('pattern', newValue);
    }
    if('name' == name) {
      this._textarea.name = newValue;
    }
    if('readonly' == name) {
      this._textarea.readOnly = newValue;
    }
  }

  get value(){
    return this._textarea.value;
  }
  set value(val) {
    this.setAttribute('value', val);
  }

  get title() {
    return this._title.innerText;
  }
  set title(title) {
    this.setAttribute('data-title', title);
  }

  get pattern(){
    return this._textarea.pattern;
  }

  set pattern(pattern){
    this.setAttribute('pattern', pattern);
  }

  get name() {
    return this._textarea.name;
  }
  set name(name) {
    this.setAttribute('name', name);
  }

  get readOnly() {
    return this._textarea.readOnly;
  }
  set readOnly(readOnly) {
    this.setAttribute('readonly', readOnly);
  }
    
  connectedCallback(){
    let shadow = this.attachShadow({mode: 'closed'});
    shadow.appendChild(this._title);
    shadow.appendChild(this._textarea);
    let style = document.createElement('style');
    style.innerHTML = `
        :host {
            display: block;
        }
        
        span{
            min-width: 10em;
            width: fit-content;
            display: inline-block;
            border-bottom: 2px solid var(--subfontcolor);
            margin-bottom: 10px;
        }
          
        textarea{
            background-color: var(--playerbgcolor);
            width: 100%;
            border-radius: 5px;
            font-size: 1em;
            min-height: 100px;
            color: var(--fontcolor);
            -webkit-text-fill-color: var(--fontcolor);
            border: none;
            padding: 5px;
            resize: none;
        }`;
    shadow.appendChild(style);
  }
}

BaseFrameWork.defineCustomElement('sw-textarea-param', TextAreaParam);


class AudioSlideList extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('wheel', e=>{
      if((this.scrollLeft == 0 && e.deltaY < 0)|| (this.scrollLeft == (this.scrollWidth - this.clientWidth) && e.deltaY > 0)){
        return;
      }
      e.preventDefault();
      this.scrollLeft += e.deltaY;
    });
    this.frame = document.createElement('div');
  }
    
  connectedCallback() {
    if(this.children.length == 0){
      this.append(this.frame);
    }
  }
  add(element) {
    this.frame.appendChild(element);
  }

}

customElements.define('sw-audio-slide-list', AudioSlideList);



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
    this.renderFunction = (_t)=>{
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

export class CanvasObjectColor{
  r = 0xff;
  g = 0xff;
  b = 0xff;
  a = 100;
  get color(){
    return `rgb(${this.r},${this.g},${this.b},${this.a}%)`;
  }

  setRgb(hex) {
    if(hex == null) {
      return;
    }
    let sanitizedHex = hex.replace('#', '');
  
    if (sanitizedHex.length === 3) {
      sanitizedHex = sanitizedHex.split('').map(char => char + char).join('');
    }
  
    this.r = parseInt(sanitizedHex.substring(0, 2), 16);
    this.g = parseInt(sanitizedHex.substring(2, 4), 16);
    this.b = parseInt(sanitizedHex.substring(4, 6), 16);
    this.a = 100;
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



var fixed = document.createElement`div`;
fixed.classList.add`fixed-window`;

export const setTitle = (pageName)=>{
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
    'min': ~~(sec / 60),
    'sec': ~~(sec % 60)
  };
};

export const timeToText=(time)=> {
  let t = getTime(time);
  return {
    'min': ('0' + t['min']).slice(-2),
    'sec': ('0' + t['sec']).slice(-2)
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
      this.webObject.object.addEventListener(MouseEventEnum.CLICK, (e)=>{func(e);});
    } else if(this.webObject instanceof Element){
      this.webObject.addEventListener(MouseEventEnum.CLICK, (e)=>{func(e);});
    }
  }
}



export const ContextMenu = {
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
    ContextMenu.baseElement.style.left = ContextMenu.position.x+'px';
    ContextMenu.baseElement.style.top = ContextMenu.position.y+'px';
  },
  remove(){
    if(ContextMenu.isVisible){
      ContextMenu.baseElement.remove();
      ContextMenu.isVisible = false;
    }
  }
};


addBottomEvent(window);

window.addEventListener('load', ()=>{
  document.body.appendChild(fixed);
  ContextMenu.removeEventSet();

}, !0);



