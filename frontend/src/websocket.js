import { BASE } from './utilization/path';

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const existingProperty = globalScope.SoundOwlProperty || {};
globalScope.SoundOwlProperty = existingProperty;

export const SoundOwlProperty = existingProperty;
SoundOwlProperty.WebSocket = SoundOwlProperty.WebSocket || {};
SoundOwlProperty.WebSocket.EventTarget = SoundOwlProperty.WebSocket.EventTarget || new EventTarget();
if (typeof SoundOwlProperty.WebSocket.status !== 'boolean') {
  SoundOwlProperty.WebSocket.status = false;
}
if (typeof SoundOwlProperty.WebSocket.retryCount !== 'number') {
  SoundOwlProperty.WebSocket.retryCount = 0;
}
if (typeof SoundOwlProperty.WebSocket.retryInterval !== 'number') {
  SoundOwlProperty.WebSocket.retryInterval = 1000;
}
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
SoundOwlProperty.SoundRegist = SoundOwlProperty.SoundRegist || {};
SoundOwlProperty.SoundRegist.registStatus = SoundOwlProperty.SoundRegist.registStatus || false;
SoundOwlProperty.SoundRegist.RegistDataCount = SoundOwlProperty.SoundRegist.RegistDataCount || {};
SoundOwlProperty.SoundRegist.RegistDataCount.sound = SoundOwlProperty.SoundRegist.RegistDataCount.sound || 0;
SoundOwlProperty.SoundRegist.RegistDataCount.artist = SoundOwlProperty.SoundRegist.RegistDataCount.artist || 0;
SoundOwlProperty.SoundRegist.RegistDataCount.album = SoundOwlProperty.SoundRegist.RegistDataCount.album || 0;
SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound = SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound || 0;

(()=>{
  const maxRetryLimit = 10; // Maximum number of retries allowed
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
      let retryInterval = websocketData.context.websocket.retry_interval;
      if (typeof retryInterval !== 'number' || retryInterval < 100 || retryInterval > 5000) {
        console.warn('Invalid retryInterval received. Falling back to default value of 1000ms.');
        retryInterval = 1000; // Default to 1000ms if invalid
      }
      SoundOwlProperty.WebSocket.retryInterval = retryInterval;
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
        if(retryCount >= SoundOwlProperty.WebSocket.retryCount || retryCount >= maxRetryLimit){
          let message = document.createElement('sw-message-button');
          message.addItem('Close', ()=>{
            message.close();
          });
          message.value = 'Failed to connect to the server after maximum retries.';
          message.open();
          return;
        }
        webSocketAction();
      }, SoundOwlProperty.WebSocket.retryInterval); // Already validated above
    };
  };
  webSocketAction();
})();


