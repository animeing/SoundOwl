import { BaseFrameWork, setTitle } from '../base';
import { AudioPlayStateEnum } from './enum/AudioPlayStateEnum';

/**
 * AudioPlayerから再生制御の責務を分離したコントローラー。
 *
 * AudioPlayerインスタンスを参照し、再生状態の遷移、
 * 再生対象の差し替え、再生開始前の準備処理を実行する。
 */
export class AudioPlaybackController {
  /**
   * @param {import('./AudioPlayer').default} audioPlayer
   */
  constructor(audioPlayer) {
    /**
     * 再生処理を委譲する対象のAudioPlayer。
     * @type {import('./AudioPlayer').default}
     */
    this.audioPlayer = audioPlayer;
  }

  /**
   * 現在のオーディオクリップを差し替え、必要な再配置処理を行う。
   *
   * @param {import('./type/AudioClip').AudioClip} setAudioClip
   */
  setCurrentAudioClip(setAudioClip){
    if(this.audioPlayer.playList.currentAudioClip === setAudioClip || setAudioClip == undefined){
      return;
    }
    this.audioPlayer.playList.currentAudioClip = setAudioClip;
    this.audioDeployment();
  }

  /**
   * Audio要素へsrcを反映し、関連イベント発火とエフェクト初期化を行う。
   */
  audioDeployment(){
    this.audioPlayer.eventSupport.dispatchEvent(new CustomEvent('audioSet'));
    this.audioPlayer.audio.src = this.audioPlayer.playList.currentAudioClip.src;
    this.audioPlayer.exAudioEffect.reset();
  }

  /**
   * 指定クリップ（未指定時は現在クリップ）を再生する。
   *
   * 必要に応じてプレイリスト更新と音源準備を行い、
   * 準備完了後に再生状態をPLAYへ遷移させる。
   *
   * @param {import('./type/AudioClip').AudioClip | undefined} audioClip
   */
  play(audioClip = undefined){
    if(this.audioPlayer.audioEffectManager.audioContext == null) {
      this.audioPlayer.initalize();
    }
    if(audioClip == undefined && this.audioPlayer.playList.currentAudioClip == undefined) {
      return;
    }
    this.audioPlayer.audioPlayStateAction.lockEventTarget.action('setStopUpdate');
    if(audioClip != undefined && this.audioPlayer.playList.findAudioClipPosition(audioClip) == -1) {
      this.audioPlayer.playList.appendAudioClipNext(audioClip);
      this.audioPlayer.playList.currentAudioClip = audioClip;
      this.audioDeployment();
    } else if( audioClip != undefined && (this.audioPlayer.playList.currentAudioClip == undefined || !this.audioPlayer.playList.currentAudioClip.equals(audioClip))) {
      this.audioPlayer.playList.currentAudioClip = audioClip;
      this.audioDeployment();
    } else if(audioClip != undefined && audioClip.equals(this.audioPlayer.playList.currentAudioClip)) {
      this.audioDeployment();
    }

    BaseFrameWork.waitForValue(
      ()=>{
        if(this.audioPlayer.loudnessNormalize.soundClip == null) {
          return null;
        }
        return this.audioPlayer.loudnessNormalize.soundClip.src;
      },
      this.audioPlayer.playList.currentAudioClip.src,
      2e5).
      then(()=>{
        setTitle(this.audioPlayer.playList.currentAudioClip.title);
        this.audioPlayer.audio.play();
        this.audioPlayer.audioPlayStateAction.currentPlayState = AudioPlayStateEnum.PLAY;
        this.audioPlayer.eventSupport.dispatchEvent(new CustomEvent('play'));
      }).finally(()=>{
        this.audioPlayer.audioPlayStateAction.lockEventTarget.action('setUpdate');
      });
  }

  /**
   * 再生を一時停止し、再生状態をPAUSEへ遷移させる。
   */
  pause(){
    this.audioPlayer.audio.pause();
    this.audioPlayer.audioPlayStateAction.currentPlayState = AudioPlayStateEnum.PAUSE;
    this.audioPlayer.eventSupport.dispatchEvent(new CustomEvent('pause'));
  }

  /**
   * 再生を停止し、再生位置を先頭へ戻してSTOPへ遷移させる。
   */
  stop(){
    if(this.audioPlayer.audio.src == null){
      return;
    }
    this.audioPlayer.audio.pause();
    this.audioPlayer.audio.currentTime = 0;
    this.audioPlayer.audioPlayStateAction.currentPlayState = AudioPlayStateEnum.STOP;
    this.audioPlayer.eventSupport.dispatchEvent(new CustomEvent('stop'));
  }
}
