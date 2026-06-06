import { WakeLockManager } from '../base';
import { SoundInfomation } from '../page';
import { conversionToWav, ffmpegInitalize } from './conversionToWav';
import { AudioPlayStateEnum } from './enum/AudioPlayStateEnum';
import { Playlist } from './Playlist';
import { AudioClip } from './type/AudioClip';
import { LoudnessNormalizeComponent } from './effect/normalize/LoudnessNormalizeComponent';
import { StereoAudioEqualizerComposite } from './effect/equalizer/StereoAudioEqualizerComposite';
import { SoundSculptEffectComposite } from './effect/soundSculpt/SoundSculptEffectComposite';
import { AudioEffectManager } from './effect/AudioComponentManager';
import { ImpulseResponseEffect } from './effect/effect3d/ImpulseResponseEffect';
import { VolumeComponent } from './effect/volume/VolumeComponent';
import { AudioPlayStateAction } from './AudioPlayStateAction';
import { AudioPlaybackController } from './AudioPlaybackController';

class AudioPlayer{
  constructor(){
    this.eventSupport = new EventTarget;

    this.audio = new Audio;
    // Web Audio API でクロスオリジン音源を解析できるよう、src 設定前に CORS モードへ切り替える。
    this.audio.crossOrigin = 'anonymous';
    /**
     * @type {Playlist}
     */
    this.playList = new Playlist();

    this.audioPlayStateAction = new AudioPlayStateAction(this.audio, this.play.bind(this), this.pause.bind(this), this.playList);
    this.audioPlayStateAction.addEventListener('update', (event)=>{
      this.eventSupport.dispatchEvent(new CustomEvent('update'));
    });
    this.audioPlayStateAction.addEventListener('updated', (event)=>{
      this.eventSupport.dispatchEvent(new CustomEvent('updated'));
    });

    this.audioEffectManager = new AudioEffectManager(this.audio);

    this.loudnessNormalize = new LoudnessNormalizeComponent();
    this.equalizer = new StereoAudioEqualizerComposite();
    this.exAudioEffect = new SoundSculptEffectComposite(this.equalizer);
    this.inpulseResponseEffect = new ImpulseResponseEffect();
    this.volumeComponent = new VolumeComponent();
    this.data = {};
    
    const wakeLockManager = new WakeLockManager();
    this.eventSupport.addEventListener('play',()=>{wakeLockManager.requestWakeLock();});
    this.eventSupport.addEventListener('pause', ()=>{wakeLockManager.releaseWakeLock();});
    this.eventSupport.addEventListener('stop', ()=>{wakeLockManager.releaseWakeLock();});

    ffmpegInitalize();
    this.audio.addEventListener('error', async ()=>{
      console.log('Error ' + this.audio.error.code + '; details: ' + audio.audio.error.message);
      
      if(audio.audio.error.code == 4 && audio.audio.src.includes('sound_create')) {
        //MEDIA_ERR_SRC_NOT_SUPPORTED && defaultlink
        let audiosrc = audio.audio.src;
        let wavBlob = await conversionToWav(audiosrc);
        if(audio.audioPlayStateAction.currentPlayState == AudioPlayStateEnum.PLAY && decodeURI(audiosrc) == audio.playList.currentAudioClip.src) {
          audio.audio.src = wavBlob;
          audio.audio.play();
        }
        console.log(audiosrc+'    '+audio.playList.currentAudioClip.src);
        console.log(audio.audioPlayStateAction.currentPlayState);
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

    this.playbackController = new AudioPlaybackController(this);

    this.audioPlayStateAction.lockEventTarget.action('setUpdate');
  }

  initalize() {

    this.audioEffectManager.initialize();

    // 全体の音を整えるために、loudnessNormalizeを最初に接続
    this.audioEffectManager.addEffect('loudnessNormalize', this.loudnessNormalize);
    //元の音を解析するためにloundnessNormalizeの後に接続
    this.audioEffectManager.addEffect('soundSculpt', this.exAudioEffect);
    // 後半の処理で音を消しきるためにイコライザの前にvolumeを接続
    this.audioEffectManager.addEffect('volume', this.volumeComponent);
    // イコライザを掛けた結果に対してインパルス応答を掛けるためにイコライザを先に接続
    this.audioEffectManager.addEffect('equalizer', this.equalizer);

    // 3D音響効果を掛けるために、イコライザの後に接続
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

  /**
   * @deprecated
   * @use AudioPlayer.audioPlayStateAction.currentPlayState
   */
  get currentPlayState(){
    return this.audioPlayStateAction.currentPlayState;
  }

  set currentAudioClip(currentAudioClip){
    this.playList.currentAudioClip = currentAudioClip;
  }

  /**
   * @deprecated
   * @use AudioPlayer.playbackController.setCurrentAudioClip
   */
  setCurrentAudioClip(setAudioClip){
    this.playbackController.setCurrentAudioClip(setAudioClip);
  }

  /**
   * @deprecated
   * @use AudioPlayer.playbackController.audioDeployment
   */
  audioDeployment(){
    this.playbackController.audioDeployment();
  }


  /**
   * @deprecated
   * @use AudioPlayer.audioPlayStateAction.isError
   */
  get isError(){
    return this.audioPlayStateAction.isError;
  }

  /**
   * @deprecated
   * @use AudioPlayer.audioPlayStateAction.isLoading
   */
  get isLoading(){
    return this.audioPlayStateAction.isLoading;
  }
  
  /**
   * @deprecated
   * @use AudioPlayer.audioPlayStateAction.isPlaying
   */
  get isPlaying(){
    return this.audioPlayStateAction.isPlaying;
  }

  /**
   * @deprecated
   * @use AudioPlayer.playbackController.play
   */
  play(audioClip = undefined){
    this.playbackController.play(audioClip);
  }

  /**
   * @deprecated
   * @use AudioPlayer.playbackController.pause
   */
  pause(){
    this.playbackController.pause();
  }

  /**
   * @deprecated
   * @use AudioPlayer.playbackController.stop
   */
  stop(){
    this.playbackController.stop();
  }
}

const audio = new AudioPlayer;
export default audio;