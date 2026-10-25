import audio from '../audio/AudioPlayer';
import { BaseFrameWork, MessageWindow } from '../base';

const toBoolean = value => value === true || value === 1 || value === '1' || value === 'true';

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
      'audioIREffect':audio.inpulseResponseEffect.pendingLoad?.fileName ?? audio.inpulseResponseEffect.fileName
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
  audio.exAudioEffect.isUse = toBoolean(audioParams.soundSculpt);
  audio.loudnessNormalize.isUse = toBoolean(audioParams.audioLondnessNormalize);
  audio.equalizer.applyEffect(audioParams.equalizerGains);
  audio.inpulseResponseEffect.applyEffect(audioParams.audioIREffect).then(applied => {
    if (applied === false) {
      const message = new MessageWindow();
      message.value = 'Failed to load saved impulse response.';
      message.open(3000);
    }
  });
};
