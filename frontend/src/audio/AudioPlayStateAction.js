import { BaseFrameWork, MessageWindow } from "../base";
import { SoundPlayedAction } from "../page";
import { SoundOwlProperty } from "../websocket";
import { AudioPlayStateEnum } from "./enum/AudioPlayStateEnum";
import { AudioStateEnum } from "./enum/AudioStateEnum";
import { Playlist } from "./Playlist";

/**
 * オーディオの再生状態を管理し、再生・一時停止・トラック終了・エラー処理などのアクションを提供するクラス。
 * イベント発火やプレイリスト制御、バッファ監視なども行います。
 *
 * @extends EventTarget
 */
export class AudioPlayStateAction extends EventTarget{

  /**
   * 
   * @param {Audio} audio 
   * @param {Function} play 
   * @param {Function} pause 
   * @param {Playlist} playList
   */
  constructor(audio, play, pause, playList) {
    super();
    this.audio = audio;
    this.play = play;
    this.pause = pause;
    this.playList = playList;
    this.stateInit();
    this.audioUpdateEvent = new CustomEvent('update');
    this.audioUpdatedEvent = new CustomEvent('updated');

    this.bufferWatchId = null;
    this.updateJob = null;
    
    this._lockEventTarget = new BaseFrameWork.LockAction;
    this._lockEventTarget.addLockEventListener('setUpdate', ()=>{
      if(this.updateJob == null){
        this.updateJob = setInterval(()=>{
          this.audioUpdate();
        }, AudioPlayStateAction.UPDATE_MILI_SEC);
      }
    });
    this._lockEventTarget.addLockEventListener('setStopUpdate', ()=>{
      if(this.updateJob != null){
        clearInterval(this.updateJob);
        this.updateJob = null;
      }
    });
    
    this.loadGiveUpTime = 10000;
  }

  static get UPDATE_MILI_SEC() {
    return 500;
  }
  
  /**
   * 現在のAudio要素の状態を取得します。
   * @returns {AudioStateEnum}
   */
  get audioState() {
    if (this._audioState === undefined) {
      return AudioStateEnum.ABORT;
    }
    return this._audioState;
  }

  /**
   * 現在の再生状態（再生・一時停止など）を取得します。
   * @returns {AudioPlayStateEnum}
   */
  get audioPlayState() {
    if (this._audioPlayState === undefined) {
      return AudioPlayStateEnum.PAUSE;
    }
    return this._audioPlayState;
  }

  /**
   * オーディオが現在再生中かどうかを判定します。
   * @returns {boolean}
   */
  get isPlaying(){
    if(this.audio.currentTime == 0 && isNaN(this.audio.duration)) return false;
    return (this.audio.currentTime !== this.audio.duration);
  }

  /**
   * オーディオがエラー状態かどうかを判定します。
   * @returns {boolean}
   */
  get isError(){
    return (
      this.audioState === AudioStateEnum.ERROR 
            || this.audioState === AudioStateEnum.EMPTIED
            || this.audioState === AudioStateEnum.STALLED
            || this.audioState === AudioStateEnum.WAITING);
  }

  /**
   * オーディオがロード中かどうかを判定します。
   * @returns {boolean}
   */
  get isLoading(){
    return (
      this.audioState === AudioStateEnum.LOAD_START 
            || this.audioState === AudioStateEnum.PROGRESS 
            || this.audioState === AudioStateEnum.ABORT
            || this.audioState === AudioStateEnum.LOADED_METADATA
            || this.audioState === AudioStateEnum.LOADED_DATA);
  }

  /**
   * ロックイベントターゲットを取得します。
   * @returns {BaseFrameWork.LockAction}
   */
  get lockEventTarget() {
    return this._lockEventTarget;
  }

  /**
   * 現在の再生状態（STOP, PLAY, PAUSEなど）を取得します。
   * @returns {AudioPlayStateEnum}
   */
  get currentPlayState() {
    if (this._currentPlayState === undefined) {
      return AudioPlayStateEnum.STOP;
    }
    return this._currentPlayState;
  }
  
  set currentPlayState(v){
    this._currentPlayState = v;
  }

  stateInit() {
    const audioStates = [
      AudioStateEnum.ABORT, AudioStateEnum.CAN_PLAY, AudioStateEnum.CAN_PLAY_THROUGH, 
      AudioStateEnum.EMPTIED, AudioStateEnum.ENDED, AudioStateEnum.ERROR, 
      AudioStateEnum.LOADED_DATA, AudioStateEnum.LOADED_METADATA, AudioStateEnum.LOAD_START, 
      AudioStateEnum.PAUSE, AudioStateEnum.PLAYING, AudioStateEnum.PROGRESS, 
      AudioStateEnum.STALLED, AudioStateEnum.SUSPEND, AudioStateEnum.WAITING
    ];
    
    const audioPlayStates = [AudioPlayStateEnum.PLAY, AudioPlayStateEnum.PAUSE];
    
    for (const state of audioStates) {
      this.audio.addEventListener(state, () => {
        this._audioState = state;
      });
    }
    
    for (const playState of audioPlayStates) {
      this.audio.addEventListener(playState, () => {
        this._audioPlayState = playState;
      });
    }
  }

  
  /**
   * オーディオの状態に応じてイベントを発火し、再生状態やエラー、トラック終了時の処理を行います。
   * @private
   */
  audioUpdate(){
    this.dispatchEvent(this.audioUpdateEvent);
    switch(this.currentPlayState){
      case AudioPlayStateEnum.STOP:
      case AudioPlayStateEnum.PAUSE:
      {
        return;
      }
      case AudioPlayStateEnum.PLAY:
      {
        this.#handleTrackEnd();
      }
    }
  }

  /**
   * 再生トラック終了時の処理を行います。
   * @private
   */
  #handleTrackEnd(){
    if(!this.isPlaying && !this.isLoading){
      this.#checkBufferTimeout(() => {
          if(this.audioState == AudioStateEnum.ERROR){
            let errorWindow = new MessageWindow;
            errorWindow.value='Sound load failed.\nPlease check network.';
            errorWindow.close(1000);
          }
        });
    }
    if(!this.isLoading && (this.audio.currentTime === this.audio.duration)){
      if(this.playList.currentAudioClip == undefined) {
        return;
      }
      this.handlePlayedAction();
    }
  }

  

  /**
   * バッファタイムアウトを監視し、エラーやスタック時にコールバックを実行します。
   * @param {Function} playError - エラー時に呼び出されるコールバック関数
   * @private
   */
  #checkBufferTimeout(playError) {
    const shouldWatch =
      this.isError || this.audioState !== AudioStateEnum.STALLED;

    if (!shouldWatch) {
      this.#clearBufferTimeout();
      return;
    }

    if (this.bufferWatchId != null) {
      return
    }
    this.bufferWatchId = setTimeout(() => {
      const stalled = this.audioState === AudioStateEnum.STALLED;
      stalled ? this.#advanceToNextClip()
              : playError();
      this.#clearBufferTimeout();
    }, this.loadGiveUpTime);
  }

  /**
   * プレイリストの次のクリップへ進み、再生または停止処理を行います。
   * @private
   */
  #advanceToNextClip() {
    const next = this.playList.next();
    if (!next) {
      this.pause();
      this.dispatchEvent(this.audioUpdatedEvent);
      return;
    }
    this.dispatchEvent(this.audioUpdatedEvent);
    this.play(next);
    this.#clearBufferTimeout();
  }
  
  /**
   * バッファタイムアウト監視を解除します。
   * @private
   */
  #clearBufferTimeout() {
    if (this.bufferWatchId == null) {
      return;
    }
    clearTimeout(this.bufferWatchId);
    this.bufferWatchId = null;
  }

  /**
   * 再生完了時のアクションを処理し、次のクリップの再生やWebSocket通知を行います。
   */
  handlePlayedAction(){
    let playedAction = new SoundPlayedAction;
    playedAction.formDataMap.append('SoundHash', this.playList.currentAudioClip.soundHash);
    playedAction.execute();
    SoundOwlProperty.WebSocket.Socket.send(JSON.stringify(
      {
        'eventType':'played',
        'soundHash':this.playList.currentAudioClip.soundHash,
      }
    ));
    let clip = this.playList.next();
    if(clip == null)
    {
      this.currentPlayState = AudioPlayStateEnum.STOP;
      return;
    }
    this.play(clip);
  }

}