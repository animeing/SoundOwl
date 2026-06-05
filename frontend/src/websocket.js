
import { BASE } from './utilization/path';

export const SoundOwlProperty = {};
SoundOwlProperty.WebSocket = {};
SoundOwlProperty.WebSocket.EventTarget = new EventTarget();
SoundOwlProperty.WebSocket.status = false;
SoundOwlProperty.WebSocket.retryCount = 7;
SoundOwlProperty.WebSocket.retryInterval = 1000;
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

const maxRetryLimit = 10;
let retryCount = 0;
let reconnectTimer = null;

export const connectWebSocket = () =>{
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  SoundOwlProperty.WebSocket.Socket = new WebSocket(BASE.WEBSOCKET_URL);

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
    const serverRetryCount = Number(websocketData.context.websocket.retry_count);
    SoundOwlProperty.WebSocket.retryCount = Number.isInteger(serverRetryCount) && serverRetryCount >= 0
      ? Math.min(serverRetryCount, maxRetryLimit)
      : 7;
    const serverRetryInterval = Number(websocketData.context.websocket.retry_interval);
    let retryInterval = Number.isFinite(serverRetryInterval) ? Math.floor(serverRetryInterval) : NaN;
    if (retryInterval < 100 || retryInterval > 5000) {
      console.warn('Invalid retryInterval received. Falling back to default value of 1000ms.');
      retryInterval = 1000;
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
    reconnectTimer = setTimeout(()=>{
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
      connectWebSocket();
    }, SoundOwlProperty.WebSocket.retryInterval);
  };
};

export const reconnectWebSocket = () => {
  retryCount = 0;
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const socket = SoundOwlProperty.WebSocket.Socket;
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.onclose = null;
    socket.close();
  }
  SoundOwlProperty.WebSocket.status = false;
  SoundOwlProperty.WebSocket.EventTarget.dispatchEvent(new Event('change'));
  connectWebSocket();
};

connectWebSocket();


