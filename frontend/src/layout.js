'use strict';
import audio from './audio/AudioPlayer';
import { BaseFrameWork, ProgressComposite } from './base';
import router from './router';
import { BASE } from './utilization/path';

export const SoundOwlProperty = {};
SoundOwlProperty.WebSocket = {};
SoundOwlProperty.WebSocket.EventTarget = new EventTarget();
/**
 * @type {WebSocket}
 */
SoundOwlProperty.WebSocket.Socket = null;
SoundOwlProperty.WebSocket.MessageType = class {
  constructor(messageTypeName) {
    this.messageTypeName = messageTypeName;
  }
  set message(message) {
    this._message = message;
  }
  get message() {
    return this._message;
  }

  toJson() {
    return JSON.stringify({
      'messageType':this.messageTypeName,
      'message':this._message
    });
  }
};
SoundOwlProperty.SoundRegist = {};
SoundOwlProperty.SoundRegist.registStatus = false;
SoundOwlProperty.SoundRegist.RegistDataCount = {};
SoundOwlProperty.SoundRegist.RegistDataCount.sound = 0;
SoundOwlProperty.SoundRegist.RegistDataCount.artist = 0;
SoundOwlProperty.SoundRegist.RegistDataCount.album = 0;

(()=>{
  let retryCount = 0;
  const webSocketAction = () =>{
    SoundOwlProperty.WebSocket.Socket = new WebSocket(`ws://${BASE.WEBSOCKET}:8080`);

    SoundOwlProperty.WebSocket.Socket.onopen = function() {
      if(retryCount > SoundOwlProperty.WebSocket.retryCount){
        let message = document.createElement('sw-message-button');
        message.addItem('Close', ()=>{
          message.close();
        });
        message.value = 'Successfully connected to the server.';
        message.close(10000);
        message.open();
      }
      retryCount = 0;
      SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('connect'));
    };

    SoundOwlProperty.WebSocket.Socket.onmessage = function(event) {
      let websocketData = JSON.parse(event.data);
      SoundOwlProperty.WebSocket.retryCount = websocketData.context.websocket.retry_count;
      SoundOwlProperty.WebSocket.retryInterval = websocketData.context.websocket.retry_interval;
      SoundOwlProperty.SoundRegist.RegistDataCount.sound = websocketData.context.regist_data_count.sound;
      SoundOwlProperty.SoundRegist.RegistDataCount.album = websocketData.context.regist_data_count.album;
      SoundOwlProperty.SoundRegist.RegistDataCount.artist = websocketData.context.regist_data_count.artist;
      SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound = websocketData.context.regist_data_count.analysis_sound;
      SoundOwlProperty.SoundRegist.registStatus = websocketData.context.regist_status;
      SoundOwlProperty.SoundRegist.registStatusStep1 = websocketData.context.regist_status_step1;
      SoundOwlProperty.SoundRegist.registStatusStep2 = websocketData.context.regist_status_step2;
      SoundOwlProperty.WebSocket.status = true;
      SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('update'));
    };

    SoundOwlProperty.WebSocket.Socket.onclose = function() {
      if(SoundOwlProperty.WebSocket.status) {
        SoundOwlProperty.WebSocket.status = false;
        SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('change'));
      }
      setTimeout(()=>{
        retryCount++;
        if(retryCount >= SoundOwlProperty.WebSocket.retryCount){
                    
          let message = document.createElement('sw-message-button');
          message.addItem('Reconnect', ()=>{
            webSocketAction();
            message.close();
          });
          message.addItem('Close', ()=>{
            message.close();
          });
          message.value = 'Failed to connect to the server.';
          message.open();
          return;
        }
        webSocketAction();
      }, SoundOwlProperty.WebSocket.retryInterval);
    };
  };
  webSocketAction();
})();




class AudioProgressComposite extends ProgressComposite{
  constructor(){
    super();
    audio.eventSupport.addEventListener('update',()=>{
      let audioBuffer = audio.audio.buffered;
      while((this.children[0] != undefined && this.children[0] != this.progress) && audioBuffer.length+1 != this.children.length){
        const element = this.children[0];
        this.removeChild(element);
      }
      let count = 0;
      let findCount = 0;
      while (audioBuffer.length>count&&audioBuffer.start(count) != null && audioBuffer.end(count)) {
        let load = undefined;
        if(this.children[findCount] == null){
          load = document.createElement('div');
          this.insertBefore(load,this.firstChild);
        } else {
          load = this.children[findCount];
          if(load == this.progress){
            findCount++;
            continue;
          }
        }
        load.style.left = (((audioBuffer.start(count)-this.min) / this.range)*100)+'%';
        load.style.transform = `scaleX(${((audioBuffer.end(count)-audioBuffer.start(count)-this.min) / this.range)})`;
        load.style.background='#fff';
        count++;
        findCount++;
      }
    });
  }
  connectedCallback(){
    super.connectedCallback();
  }
}
customElements.define('sw-audio-progress', AudioProgressComposite);


const searchBox = document.createElement('sw-searchbox');
export default searchBox;
(()=>{
  const mainMenu=()=>{
    let menu = document.getElementById('main-menu');
    menu.innerHTML = '';
    searchBox.searchEvent = value =>{
      router.push({name:'search', query: {SearchWord: value}});
    };
    searchBox.classList.add('searchbox');
    menu.appendChild(searchBox);
        
    let dropdownMenu = BaseFrameWork.createCustomElement('sw-dropdown');
    dropdownMenu.classList.add('header-item', 'nonselectable');
    dropdownMenu.displayName = 'Menu';
    menu.appendChild(dropdownMenu);
    dropdownMenu.addItem('Artist List', ()=>{
      router.push({name:'artist_list'});
    });
    dropdownMenu.addItem('Album List', ()=>{
      router.push({name:'album_list'});
    });
    dropdownMenu.addItem('Play List',()=>{
      router.push({name:'playlists'});
    });
    dropdownMenu.addItem('Setting', ()=>{
      router.push({name:'setting'});
    });

        
  };
  window.addEventListener('load', mainMenu);
    

})();


