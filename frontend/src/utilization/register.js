import audio from "../audio/audioPlayer";
import { BaseFrameWork } from "../base";

export const audioParamSave=()=>{
    let localStorageMap = new BaseFrameWork.Storage.Application.LocalStorageMap();
    let saveParams = JSON.stringify(
        {
            'volume': audio.audio.volume,
            'loopMode': audio.loopMode,
            'loadGiveUpTime':audio.loadGiveUpTime,
            'equalizerGains':audio.equalizer.gains,
            'soundSculpt':audio.exAudioEffect.isUseEffect,
            'audioLondnessNormalize':audio.loudnessNormalize.isUse
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
    audio.audio.volume = audioParams.volume;
    audio.loopMode = audioParams.loopMode;
    audio.loadGiveUpTime = audioParams.loadGiveUpTime;
    audio.equalizer.gains = audioParams.equalizerGains;
    audio.exAudioEffect.isUseEffect = audioParams.soundSculpt;
    audio.loudnessNormalize.isUse = audioParams.audioLondnessNormalize;
};
audioParamLoad();