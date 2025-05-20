import { BaseFrameWork, setTitle, WakeLockManager } from '../base';
import { SoundInfomation } from '../page';
import { AudioPlayStateEnum } from './enum/AudioPlayStateEnum';
import { conversionToWav, ffmpegInitalize } from './conversionToWav';
import { Playlist } from './Playlist';
import { AudioClip } from './type/AudioClip';
import { LoudnessNormalizeComponent } from './effect/normalize/LoudnessNormalizeComponent';
import { StereoAudioEqualizerComposite } from './effect/equalizer/StereoAudioEqualizerComposite';
import { SoundSculptEffectComposite } from './effect/soundSculpt/SoundSculptEffectComposite';
import { AudioEffectManager } from './effect/AudioComponentManager';
import { ImpulseResponseEffect } from './effect/effect3d/ImpulseResponseEffect';
import { VolumeComponent } from './effect/volume/VolumeComponent';
import { AudioPlayStateAction } from './AudioPlayStateAction';

class AudioPlayer{
  constructor(){
    this.eventSupport = new EventTarget;

    this.audio = new Audio;
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
   * @use AudioPlayer.AudioPlayStateAction.currentPlayState
   */
  get currentPlayState(){
    return this.audioPlayStateAction.currentPlayState;
  }

  set currentAudioClip(currentAudioClip){
    this.playList.currentAudioClip = currentAudioClip;
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


  /**
   * @deprecated
   * @use AudioPlayer.AudioPlayStateAction.isError
   */
  get isError(){
    return this.audioPlayStateAction.isError;
  }

  /**
   * @deprecated
   * @use AudioPlayer.AudioPlayStateAction.isLoading
   */
  get isLoading(){
    return this.audioPlayStateAction.isLoading;
  }
  
  /**
   * @deprecated
   * @use AudioPlayer.AudioPlayStateAction.isPlaying
   */
  get isPlaying(){
    return this.audioPlayStateAction.isPlaying;
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
    this.audioPlayStateAction.lockEventTarget.action('setStopUpdate');
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
        this.audioPlayStateAction.currentPlayState = AudioPlayStateEnum.PLAY;
        this.eventSupport.dispatchEvent(new CustomEvent('play'));
      }).finally(()=>{
        this.audioPlayStateAction.lockEventTarget.action('setUpdate');
      });
  }
  pause(){
    this.audio.pause();
    this.audioPlayStateAction.currentPlayState = AudioPlayStateEnum.PAUSE;
    this.eventSupport.dispatchEvent(new CustomEvent('pause'));
  }
  stop(){
    if(this.audio.src == null){
      return;
    }
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audioPlayStateAction.currentPlayState = AudioPlayStateEnum.STOP;
    this.eventSupport.dispatchEvent(new CustomEvent('stop'));
  }
}

const audio = new AudioPlayer;
export default audio;