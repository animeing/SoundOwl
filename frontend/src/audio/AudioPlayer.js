import { BaseFrameWork, MessageWindow, setTitle, WakeLockManager } from '../base';
import { SoundInfomation, SoundPlayedAction } from '../page';
import { AudioPlayStateEnum } from './enum/AudioPlayStateEnum';
import { AudioStateEnum } from './enum/AudioStateEnum';
import { conversionToWav, ffmpegInitalize } from './conversionToWav';
import { Playlist } from './Playlist';
import { AudioClip } from './type/AudioClip';
import { LoudnessNormalizeComponent } from './effect/normalize/LoudnessNormalizeComponent';
import { StereoAudioEqualizerComposite } from './effect/equalizer/StereoAudioEqualizerComposite';
import { SoundSculptEffectComposite } from './effect/soundSculpt/SoundSculptEffectComposite';
import { AudioEffectManager } from './effect/AudioComponentManager';
import { ImpulseResponseEffect } from './effect/effect3d/ImpulseResponseEffect';
import { SoundOwlProperty } from '../websocket';
import { VolumeComponent } from './effect/volume/VolumeComponent';

class AudioPlayer{
  constructor(){
    this.audio = new Audio;
    this.audioEffectManager = new AudioEffectManager(this.audio);

    this.loudnessNormalize = new LoudnessNormalizeComponent();
    this.equalizer = new StereoAudioEqualizerComposite();
    this.exAudioEffect = new SoundSculptEffectComposite(this.equalizer);
    this.inpulseResponseEffect = new ImpulseResponseEffect();
    this.volumeComponent = new VolumeComponent();
    /**
     * @type {Playlist}
     */
    this.playList = new Playlist();
    this.currentPlayState = AudioPlayStateEnum.STOP;
    this.eventSupport = new EventTarget;
    this.stateInit();
    this.audioUpdateEvent = new CustomEvent('update');
    this.audioUpdatedEvent = new CustomEvent('updated');
    this.data = {};
    this.loadGiveUpTime = 10000;
    this.lockEventTarget = new BaseFrameWork.LockAction;
    this.lockEventTarget.addLockEventListener('setUpdate', ()=>{
      if(this.updateJob == null){
        this.updateJob = setInterval(()=>{
          this.audioUpdate();
        }, this.UPDATE_MILI_SEC);
      }
    });
    this.lockEventTarget.addLockEventListener('setStopUpdate', ()=>{
      if(this.updateJob != null){
        clearInterval(this.updateJob);
        this.updateJob = null;
      }
    });
    const wakeLockManager = new WakeLockManager();
    this.eventSupport.addEventListener('play',()=>{wakeLockManager.requestWakeLock();});
    this.eventSupport.addEventListener('pause', ()=>{wakeLockManager.releaseWakeLock();});
    this.eventSupport.addEventListener('stop', ()=>{wakeLockManager.releaseWakeLock();});

    ffmpegInitalize();
    this.audio.addEventListener('error', async function (){
      console.log('Error ' + audio.audio.error.code + '; details: ' + audio.audio.error.message);
      
      if(audio.audio.error.code == 4 && audio.audio.src.includes('sound_create')) {
        //MEDIA_ERR_SRC_NOT_SUPPORTED && defaultlink
        let audiosrc = audio.audio.src;
        let wavBlob = await conversionToWav(audiosrc);
        if(audio.currentPlayState == AudioPlayStateEnum.PLAY && decodeURI(audiosrc) == audio.playList.currentAudioClip.src) {
          audio.audio.src = wavBlob;
          audio.audio.play();
        }
        console.log(audiosrc+'    '+audio.playList.currentAudioClip.src);
        console.log(audio.currentPlayState);
      }
    });
    this.eventSupport.addEventListener('audioSet', ()=>{
      let request = new SoundInfomation();
      request.httpRequestor.addEventListener('success', event=>{
        this.data = event.detail.response;
        this.loudnessNormalize.soundClip = this.currentAudioClip;
        this.loudnessNormalize.soundMeanVolume = this.data.loudness_target;
        this.eventSupport.dispatchEvent(new CustomEvent('audio_info_loaded'));
      });
      request.formDataMap.append('SoundHash', this.playList.currentAudioClip.soundHash);
      request.execute();
    });

    this.lockEventTarget.action('setUpdate');
  }

  initalize() {

    this.audioEffectManager.initialize();

    this.audioEffectManager.addEffect('loudnessNormalize', this.loudnessNormalize);
    this.audioEffectManager.addEffect('soundSculpt', this.exAudioEffect);
    this.audioEffectManager.addEffect('volume', this.volumeComponent);
    this.audioEffectManager.addEffect('equalizer', this.equalizer);
    this.audioEffectManager.addEffect('impulseEffect', this.inpulseResponseEffect);

    this.audioEffectManager.apply();

    this.eventSupport.dispatchEvent(new CustomEvent('initalize'));
  }

  set volume(volume) {
    volume = +volume;
    if (volume < 0.0) volume = 0.0;
    if (volume > 1.0) volume = 1.0;
    this.volumeComponent.applyEffect(volume);
  }

  get volume() {
    return +this.volumeComponent.volume;
  }

  /**
     * @type {AudioClip}
     */
  get currentAudioClip(){
    return this.playList.currentAudioClip;
  }

  set currentAudioClip(currentAudioClip){
    this.playList.currentAudioClip = currentAudioClip;
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
        this.audioState = state;
      });
    }
    
    for (const playState of audioPlayStates) {
      this.audio.addEventListener(playState, () => {
        this.audioPlayState = playState;
      });
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
          let audioClip = this.playList.next();
          if(audioClip == undefined){
            this.pause();
            this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
            return;
          }
          this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
          this.play();
          this.errorTime = null;
        };
        let playError = () => {
          if(this.audioState == AudioStateEnum.ERROR){
            let errorWindow = new MessageWindow;
            errorWindow.value='Sound load missing.\nPlease check network.';
            errorWindow.close(1000);
          }
        };
        if(this.isError){
          if(this.errorTime == null){
            this.errorTime = setTimeout(()=>{
              if(this.audioState != AudioStateEnum.STALLED){
                playError();
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
                  playError();
                  return;
                }
                return com();
              }, this.loadGiveUpTime);
            }
          }
        }
      }
      if(!this.isLoading && (this.audio.currentTime === this.audio.duration)){
        if(this.playList.currentAudioClip == undefined) {
          return;
        }
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
    }
  }

  /**
     * 
     * @param {AudioClip} setAudioClip 
     */
  setCurrentAudioClip(setAudioClip){
    if(this.playList.currentAudioClip === setAudioClip || setAudioClip == undefined){
      return;
    }
    this.playList.currentAudioClip = setAudioClip;
    this.audioDeployment();
    // this.audioUpdate(); //CHECK
  }

  audioDeployment(){
    this.eventSupport.dispatchEvent(new CustomEvent('audioSet'));
    this.audio.src = this.playList.currentAudioClip.src;
    this.exAudioEffect.reset();
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
   * 指定されたオーディオクリップを再生します。引数が未指定の場合、現在選択されているオーディオクリップを再生します。
   * 引数で指定されたオーディオクリップがプレイリストに存在しない場合、プレイリストの次の位置に追加してから再生します。
   * 指定されたオーディオクリップが現在のオーディオクリップと異なる場合、そのクリップを現在のオーディオクリップとして設定してから再生します。
   * 引数が未指定で現在のオーディオクリップも未定義の場合は、何もしません。
   * この関数は、オーディオの準備が整い次第再生を開始し、タイトルの設定と再生イベントの発火を行います。
   * @param {AudioClip} audioClip - 再生するオーディオクリップ。未指定の場合、現在のオーディオクリップが使用されます。
   */
  play(audioClip = undefined){
    if(this.audioEffectManager.audioContext == null) {
      this.initalize();
    }
    if(audioClip == undefined && this.playList.currentAudioClip == undefined) {
      return;
    }
    this.lockEventTarget.action('setStopUpdate');
    if(audioClip != undefined && this.playList.findAudioClipPosition(audioClip) == -1) {
      this.playList.appendAudioClipNext(audioClip);
      this.playList.currentAudioClip = audioClip;
      this.audioDeployment();
    } else if( audioClip != undefined && (this.playList.currentAudioClip == undefined || !this.playList.currentAudioClip.equals(audioClip))) {
      this.playList.currentAudioClip = audioClip;
      this.audioDeployment();
    } else if(audioClip != undefined && audioClip.equals(this.playList.currentAudioClip)) {
      this.audioDeployment();
    }

    BaseFrameWork.waitForValue(
      ()=>{
        if(this.loudnessNormalize.soundClip == null) {
          return null;
        }
        return this.loudnessNormalize.soundClip.src;
      },
      this.playList.currentAudioClip.src,
      2e5).
      then(()=>{
        setTitle(this.playList.currentAudioClip.title);
        this.audio.play();
        this.currentPlayState = AudioPlayStateEnum.PLAY;
        this.eventSupport.dispatchEvent(new CustomEvent('play'));
      }).finally(()=>{
        this.lockEventTarget.action('setUpdate');
      });
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

const audio = new AudioPlayer;
export default audio;