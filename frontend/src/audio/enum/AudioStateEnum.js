export class AudioStateEnum{
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
