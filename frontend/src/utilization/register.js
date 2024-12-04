import audio from '../audio/AudioPlayer';
import { BaseFrameWork } from '../base';

export const audioParamSave=()=>{
  let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
  let saveParams = JSON.stringify(
    {
      'volume': audio.volume,
      'loopMode': audio.playList.loopMode,
      'loadGiveUpTime':audio.loadGiveUpTime,
      'equalizerGains':audio.equalizer.getGains(),
      'soundSculpt':audio.exAudioEffect.isUse,
      'audioLondnessNormalize':audio.loudnessNormalize.isUse,
      'audioIREffect':audio.inpulseResponseEffect.fileName
    });
  localStorageMap.set('audioParam', saveParams);
};

export const audioParamLoad=()=>{
  let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
  let audioParam = localStorageMap.get('audioParam');
  if(audioParam == null) {
    return;
  }
  let audioParams = JSON.parse(audioParam);
  audio.volume = audioParams.volume;
  audio.playList.loopMode = audioParams.loopMode;
  audio.loadGiveUpTime = audioParams.loadGiveUpTime;
  audio.exAudioEffect.isUse = audioParams.soundSculpt;
  audio.loudnessNormalize.isUse = audioParams.audioLondnessNormalize;
  audio.equalizer.applyEffect(audioParams.equalizerGains);
  audio.inpulseResponseEffect.applyEffect(audioParams.audioIREffect);
};