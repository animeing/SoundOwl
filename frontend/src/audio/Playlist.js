import { BaseFrameWork } from '../base';
import { AudioLoopModeEnum } from './enum/AudioLoopModeEnum';
import { AudioClip } from './type/AudioClip';

/**
 * オーディオクリップを管理し、再生するためのプレイリストを表します。
 * オーディオクリップを追加、反復処理、再生するための基本的な操作をサポートしています。
 */
export class Playlist extends EventTarget {
  /**
   * デフォルトでは非ループモードで空のプレイリストを初期化します。
   * @type {BaseFrameWork.List<AudioClip>}
   */
  _list = new class extends BaseFrameWork.List{
    /**
     * 配列に新しい要素を追加します。
     * @param {AudioClip} value - 追加する要素
     * @param {Number} index - 追加する位置（オプショナル、デフォルトは配列の末尾）
     */
    equalFindIndex(value) {
      return this.gets().findIndex(item => item.equals(value));
    }
  }();
  /**
   * プレイリスト内の再生中の位置を表します。デフォルトは -1 で、選択されているクリップがないことを示します。
   * @private
   */
  _playPosition = -1;

  /**
   * プレイリストのループモード。デフォルトは非ループです。
   * @type {AudioLoopModeEnum}
   */
  loopMode = AudioLoopModeEnum.NON_LOOP;



  constructor() {
    super();
    this._list.eventSupport.addEventListener('change',
      e=>{
        const newEvent = new Event('change', {
          bubbles: e.bubbles,
          cancelable: e.cancelable
        });
        this.dispatchEvent(newEvent);
      });
  }

  get length() { 
    return this._list.length;
  }

  /**
   * 現在再生中のオーディオクリップを取得します。選択されているクリップがない場合は undefined を返します。
   * @type {AudioClip | undefined}
   */
  get currentAudioClip() {
    if(this._playPosition === -1) {
      return undefined;
    }
    return this._list.get(this._playPosition);
  }

  /**
   * プレイリスト内で見つかった場合、再生する現在のオーディオクリップを設定します。見つからない場合は、再生位置を -1 に設定します。
   * @type {AudioClip}
   */
  set currentAudioClip(value) {
    this._playPosition = this._list.equalFindIndex(value);
  }

  /**
   * プレイリスト内の再生中の位置を示す読み取り専用プロパティ。
   * @type {number}
   * @readonly
   */
  get PLAY_POSITION() {
    return this._playPosition;
  }

  /**
   * プレイリストのオーディオクリップを反復処理するためのジェネレータ関数。
   */
  *[Symbol.iterator]() {
    for (const value of this._list) {
      yield value;
    }
  }

  /**
   * 現在の再生位置の次の位置にオーディオクリップをプレイリストに追加します。
   * @param {AudioClip} audioClip 追加するオーディオクリップ。
   */
  appendAudioClipNext(audioClip) {
    this._list.add(audioClip, this._playPosition + 1);
  }

  /**
   * プレイリストの特定の位置にオーディオクリップを挿入します。
   * @param {AudioClip} audioClip 追加するオーディオクリップ。
   * @param {number} position オーディオクリップを挿入する位置
   */
  insertAudioClip(audioClip, position) {
    let nowPlaying = this.currentAudioClip;
    if (position >= 0 && position <= this._list.length) {
      this._list.add(audioClip, position);
    }
    if(nowPlaying != null) {
      this.currentAudioClip = nowPlaying;
    }
  }

  /**
   * 引数で渡されたプレイリストが現在のプレイリストと同じかどうかを確認します。
   * @param {BaseFrameWork.List<AudioClip>} playlistToCompare 比較するプレイリスト。
   * @returns {boolean} 両方のプレイリストが同一であればtrue、そうでなければfalseを返します。
   */
  isSamePlaylist(playlistToCompare) {
    if (this._list.length !== playlistToCompare.length) {
      return false;
    }

    if(Array.isArray(playlistToCompare)) {
      playlistToCompare = new BaseFrameWork.List(playlistToCompare);
    }

    for (let i = 0; i < this._list.length; i++) {
      const clipFromCurrent = this._list.get(i);
      const clipFromCompare = playlistToCompare.get(i);

      if (!clipFromCurrent.equals(clipFromCompare)) {
        return false;
      }
    }
    return true;
  }

  
  /**
   * 指定されたオーディオクリップがプレイリスト内のどの位置にあるかを返します。
   * @param {AudioClip} audioClip 
   * @returns {number} 存在しない場合、-1が返ります。
   */
  findAudioClipPosition(audioClip) {
    return this._list.equalFindIndex(audioClip);
  }

  /**
   * プレイ位置をプレイリストの始まりにリセットし、最初のオーディオクリップを返します。
   * @returns {AudioClip | undefined} プレイリストが空の場合は undefined、それ以外の場合は最初のオーディオクリップ。
   */
  defaultPosition() {
    this._playPosition = 0;
    return this.currentAudioClip;
  }

  /**
   * 現在のプレイリストを新しいオーディオクリップのセットに置き換え、オプションで再生するオーディオクリップを選択します。
   * @param {BaseFrameWork.List<AudioClip>} playlist プレイリストとして使用する新しいオーディオクリップのセット。
   * @param {AudioClip} selectAudioClip 現在のオーディオクリップとして設定するオプションのオーディオクリップ。
   */
  updatePlaylist(playlist) {
    this._list.removeAll();
    this._list.addAll(playlist);
  }

  /**
   * Playlistをclearして現在のclipをnullにします。
   */
  clearPlaylist() {
    this._list.removeAll();
    this._playPosition = -1;
  }

  /**
   * 指定のaudioClipをPlaylistから削除します。(現在再生中のAudioClipだった場合、変化しません。)
   * @param {AudioClip} audioClip 
   * @returns 
   */
  removeClip(audioClip) {
    let remove = this.findAudioClipPosition(audioClip);
    if(remove == this.PLAY_POSITION) {
      return;
    }
    let nowPlaying = this.currentAudioClip;
    this._list.remove(audioClip);
    if(nowPlaying != null) {
      this.currentAudioClip = nowPlaying;
    }
  }

  /**
   * 現在のループモードを考慮して、プレイリストを次のオーディオクリップに進めます。
   * @returns {AudioClip | null} 次に再生するオーディオクリップ、または非ループモードの終わりに達した場合は null。
   */
  next() {
    if(this.loopMode === AudioLoopModeEnum.AUDIO_LOOP) {
      return this.currentAudioClip;
    }
    let nextAudioClip = this._list.get(this._playPosition + 1);
    if(nextAudioClip !== undefined) {
      this._playPosition++;
      return nextAudioClip;
    }
    if(this.loopMode === AudioLoopModeEnum.NON_LOOP) {
      return null;
    }
    if(this.loopMode === AudioLoopModeEnum.TRACK_LOOP) {
      this._playPosition = 0;
      return this._list.get(this._playPosition);
    }
  }

  /**
   * プレイリストを前のオーディオクリップに移動し、それを返します。
   * 前のクリップが利用不可能な場合は、現在のオーディオクリップを返します。
   * @returns {AudioClip | undefined} 前のオーディオクリップ、または開始位置にある場合は現在のクリップ。
   */
  previous() {
    let previousAudioClip = this._list.get(this._playPosition - 1);
    if(previousAudioClip === undefined) {
      return this.currentAudioClip;
    }
    this._playPosition--;
    return previousAudioClip;
  }
}
