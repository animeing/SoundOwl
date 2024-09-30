import { BASE } from '../../utilization/path';

export class AudioClip{
  constructor(){
    this.no=0;
    this.soundHash=null;
    this.artist=null;
    this.artistKey=null;
    this.title=null;
    this.album=null;
    this.albumKey = null;
  }

  get src(){
    if(this.soundHash != null){
      return BASE.HOME+'sound_create/sound.php?media_hash='+this.soundHash;
    }
    return null;
  }

  /**
     * @param {AudioClip} param
     */
  equals(param){
    if(param == null || param.no != this.no){
      return false;
    }
    if(param.soundHash != this.soundHash){
      return false;
    }
    return true;
  }
  static createAudioClip(serverFileTitle, title, album, artist, no){
    let audioClip = new AudioClip;
    audioClip.no = no;
    audioClip.title = title;
    audioClip.album = album;
    audioClip.soundHash = serverFileTitle;
    audioClip.artist = artist;
    return audioClip;
  }
}