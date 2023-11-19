import { BaseFrameWork,BASE, setTitle } from "./base";
import { SoundInfomation } from "./page";
import { SoundPlayedAction } from "./page";

class CanvasAudioAnalizer extends BaseFrameWork.Draw.Canvas2D{
    render=()=>{
        if(this.analyser != null){
            let leng = this.analyser.frequencyBinCount;
            this.spectrums = new Uint8Array(leng);
            this.analyser.getByteFrequencyData(this.spectrums);
        }

        super.render();
    };

    /**
     * 
     * @param {AudioContext} audioContext 
     */
    connect(audioContext, audioSourceNode){
        this.object.classList.add('analyser-view');
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = CanvasAudioAnalizer.fftSize;
        audioSourceNode.connect(this.analyser);
        
        let leng = this.analyser.frequencyBinCount;
        this.spectrums = new Uint8Array(leng);
        this.analyser.smoothingTimeConstant = .5;
        this.analyser.getByteFrequencyData(this.spectrums);

        this.canvasObjectList.removeAll();
        for(let createCount = 0, len = this.spectrums.length; createCount < len; createCount++){
            let box = new BaseFrameWork.Draw.Figure.BoxCanvasObject2D;
            box.update = async ()=>{
                if(this.spectrums != null){
                    box.transform.position.x = (createCount+1)*(this.object.width / (len+4));
                    box.transform.position.y = 0;
                    box.transform.scale.x = (this.object.width / len) >> 1;
                    box.transform.scale.y = (this.spectrums[createCount] / 0xff ) * (this.height >> 1);
                }
            };
            this.addCanvasObjectList(box);
        }
    }

    static get fftSize(){
        return 1<<7+1;
    }

}

class MenuItem {
    /**
     * 
     * @param {WebObject} webObject 
     */
    constructor(webObject){
        this.webObject = webObject;
        this.value = '';
        this.onClickEvent= ()=>{};
    }

    get value(){
        return this.webObject.value;
    }

    set value(value){
        this.webObject.value = value;
    }

    set onClickEvent(func){
        if(this.webObject instanceof WebObject){
            return this.webObject.object.addEventListener(MouseEventEnum.CLICK, (e)=>{func(e)});
        } else if(this.webObject instanceof Element){
            this.webObject.addEventListener(MouseEventEnum.CLICK, (e)=>{func(e)});
        }
    }
}


export class AudioClip{
    constructor(){
        this.no=0;
        this.soundHash=null;
        this.artist=null;
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

class AudioStateEnum{
    static get LOAD_START(){
        return 'loadstart';
    }
    static get PROGRESS(){
        return 'progress';
    }
    static get SUSPEND(){
        return 'suspend';
    }
    static get ABORT(){
        return 'abort';
    }
    static get ERROR(){
        return 'error';
    }
    static get EMPTIED(){
        return 'emptied';
    }
    static get STALLED(){
        return 'stalled';
    }
    static get LOADED_METADATA(){
        return 'loadedmetadata';
    }
    static get LOADED_DATA(){
        return 'loadeddata';
    }
    static get CAN_PLAY(){
        return 'canplay';
    }
    static get CAN_PLAY_THROUGH(){
        return 'canplaythrough';
    }
    static get PLAYING(){
        return 'playing';
    }
    static get WAITING(){
        return 'waiting';
    }
    static get ENDED(){
        return 'ended';
    }
    static get PAUSE(){
        return 'pause';
    }
}

export class AudioPlayStateEnum{
    static get PLAY(){
        return 'play';
    }
    static get PAUSE(){
        return 'pause';
    }
    static get STOP(){
        return 'stop';
    }
}

export class AudioLoopModeEnum{
    static get NON_LOOP(){
        return 'NON_LOOP';
    }
    static get AUDIO_LOOP(){
        return 'AUDIO_LOOP';
    }
    static get TRACK_LOOP(){
        return 'TRACK_LOOP';
    }
}


class StereoExAudioEffect {
    /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     * @param {StereoAudioEqualizer} equalizer
     */
    constructor(audioSource, audioContext, equalizer) {
        this.audioSource = audioSource;
        this.audioContext = audioContext;
        this.leftExAudioEffect = new SoundSculptEffect(this.audioSource, this.audioContext, equalizer.leftEqualizer);
        this.rightExAudioEffect = new SoundSculptEffect(this.audioSource, this.audioContext, equalizer.rightEqualizer);
        this._isUseEffect = true;
        this.leftExAudioEffect.isUseEffect;
    }

    reset() {
        this.leftExAudioEffect.reset()
        this.rightExAudioEffect.reset();
    }

    /**
     * 
     * @param {AudioNode} audioNode 
     */
    connect(audioNode) {
        this.leftExAudioEffect.connect(audioNode);
        this.rightExAudioEffect.connect(audioNode);
    }

    set isUseEffect(val) {
        this._isUseEffect = val;
        this.leftExAudioEffect.isUseEffect = this._isUseEffect;
        this.rightExAudioEffect.isUseEffect = this._isUseEffect;
    }

    get isUseEffect() {
        return this._isUseEffect;
    }
}


class SoundSculptEffect { 
    /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     * @param {AudioEqualizer} equalizer
     */
    constructor(audioSource, audioContext, equalizer) {
        this.audioContext = audioContext;
        this.equalizer = equalizer;
        /**
         * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>}
         */
        this.prevEffectHz = [];

        this.analyser = this.audioContext.createAnalyser();
        this.voice = {'sum': 0, 'count':0, 'avg': 0, 'normalizedAvg': 0, 'minHz': 64, 'maxHz': 8e3};

        this.analyser.fftSize = 32768;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        audioSource.connect(this.analyser);
        /**
         * @type {number}
         */
        this.frameId = null;
        this._isUseEffect = true;

        this.effectMain();
    }

    set isUseEffect(val) {
        if(this._isUseEffect == val) {
            return;
        }
        this._isUseEffect = val;
        if(this._isUseEffect) {
            this.effectMain();
        } else if(this.frameId != null) {
            cancelAnimationFrame(this.frameId);
            this.updateDefaultGainsFilter();
        }
    }

    get isUseEffect() {
        return this._isUseEffect;
    }
    reset() {
        this.prevEffectHz = [];
    }
    /**
     * 
     * @param {AudioNode} audioNode 
     */
    connect(audioNode) {
        this.analyser.connect(audioNode);
    }
    effectMain(){
        const SELF = this;
        let animationFrame =()=>{
            SELF.analyser.getByteFrequencyData(SELF.dataArray);
            let effectHz = this.calcBandValue();
            const MIN_GAIN = -6;
            const MAX_GAIN = 6;
            let logs = '';
            let newGains = {};
            SELF.equalizer.gains.forEach(element=>{
                let newGain = effectHz[element.hz+''].smoothing * effectHz[element.hz+''].multiplier;
                if(isNaN(newGain)) {
                    return;
                }
                if (element.hz >= this.voice.minHz && element.hz <= this.voice.maxHz) {
                    let alpha = 0.5;
                    newGain = (1-alpha)*this.voice.normalizedAvg + alpha * newGain;
                }
                newGains[element.hz+''] = SELF.getAdjustedValue(
                    newGain,
                    MAX_GAIN,
                    MIN_GAIN,
                    1.3);
                
                logs += 'hz ['+element.hz+'] newGain['+newGain+']\nhz ['+element.hz+']    Gain['+newGains[element.hz+'']+']\n';
            });
            newGains = this.equalizerWaveAdjustment(newGains);
            newGains = this.adjustmentAudioLevel(newGains);

            SELF.equalizer.gains.forEach(element => {
                if(newGains == null || newGains[element.hz+''] == null || isNaN(newGains[element.hz+''])) {
                    SELF.equalizer.filters[element.hz].gain.value = 0;
                    return;
                }
                const baseGain = (+element.gain);
                SELF.equalizer.filters[element.hz].gain.value = newGains[element.hz+''] + baseGain;
            });

            // console.log(logs);
            SELF.frameId = requestAnimationFrame(animationFrame);
        };
        animationFrame();
    }

    /**
     * 
     * @param {Array} newGains 
     * @returns 
     */
     adjustmentAudioLevel(newGains) {
        if(newGains == null){
            return;
        }
        if(Object.keys(newGains).length == 0){
            return;
        }
        let sumGain = 0;
        for (const key of Object.keys(newGains)) {
            if(isNaN(newGains[key])) {
                continue;
            }
            sumGain+=newGains[key];
        }
        let avgGain = (sumGain)/(Object.keys(newGains).length);
        for (const key of Object.keys(newGains)) {
            newGains[key] -= (avgGain);
        };
        return newGains;
    }

    /**
     * @param {number} currentValue 
     * @param {number} maxValue 
     * @param {number} minValue 
     * @returns 
     */
    getAdjustedValue(currentValue, maxValue, minValue, easeParameter = 2) {
        const normalizedX = (currentValue - minValue) / (maxValue - minValue);
        const easedX = Math.pow(normalizedX, easeParameter) / (Math.pow(normalizedX, easeParameter) + Math.pow(1 - normalizedX, easeParameter));
        return easedX * (maxValue - minValue) + minValue;
    }
        
    /**
     * 
     * @param {Array<{hz: number, gain: number}>} newGains
     */
    equalizerWaveAdjustment(newGains){
        if(newGains == null){
            return;
        }
        if(Object.keys(newGains).length == 0){
            return;
        }
        let lowHzGain = 0;
        let toLow = +Object.keys(newGains)[0];
        let maxDiff = 1.5;
        for (const key in newGains) {
            if (Object.hasOwnProperty.call(newGains, key)) {
                const element = newGains[key];
                if(key == toLow) {
                    lowHzGain = element;
                    continue;
                }
                const diff = Math.abs(lowHzGain - element);
                if(diff < maxDiff) {
                    lowHzGain = element;
                    continue;
                }
                if(lowHzGain > element) {
                    newGains[key+''] = lowHzGain - maxDiff;
                } else {
                    newGains[key+''] = lowHzGain + maxDiff;
                }
                lowHzGain = newGains[key+''];
            }
        }
        return newGains;
    }

    /**
     * 
     * @param {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>} effectHz 
     */
    smoothing(effectHz) {
        if (this.prevEffectHz === null) {
            this.prevEffectHz = JSON.parse(JSON.stringify(effectHz));
            return;
        }
        for(const key in effectHz) {
            if(this.prevEffectHz[key] == null) {
                continue;
            }
            let alpha = 0.5;
            effectHz[key].smoothing = (1 - alpha) * this.prevEffectHz[key].smoothing + alpha * effectHz[key].normalizedAvg;
        }
        this.prevEffectHz = JSON.parse(JSON.stringify(effectHz));
    }

    calcBandValue(){
        /**
         * 周波数データを格納するオブジェクト。
         * 各キーは特定の周波数（Hz）を表し、それに関連するデータを持つ。
         * 
         * @type {Object.<string, {hz: number, count: number, sum: number, avg: number, smoothing: number, normalizedAvg: number, multiplier: number}>}
         */
        let effectHzs = {
            '8':{'hz':8, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1},
            '16':{'hz':16, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.2},
            '32':{'hz':32, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.2},
            '64':{'hz':64, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.26},
            '125':{'hz':125, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':1.6},
            '250':{'hz':250, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2},
            '500':{'hz':500, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.5},
            '1000':{'hz':1e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.5},
            '2000':{'hz':2e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.6},
            '4000':{'hz':4e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':2.7},
            '8000':{'hz':8e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3},
            '16000':{'hz':16e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':3.7},
            '24000':{'hz':24e3, 'count':0, 'sum':0, 'avg':0, 'smoothing':0, 'normalizedAvg':0, 'multiplier':4},
        };
        this.voice = {'hz':'voiceRange','sum': 0, 'count':0, 'avg': 0, 'normalizedAvg': 0, 'minHz': 64, 'maxHz': 8e3};
        let total = {'count':0, 'sum':0};
        for (const key in effectHzs) {
            if (!Object.hasOwnProperty.call(effectHzs, key)) {
                continue;
            }
            const effectHz = effectHzs[key];
            const RANGE = this.getRange(effectHz.hz);
            
            for (let i = RANGE.min; i < RANGE.max; i++) {
                if(this.dataArray[i] == 0 || isNaN(this.dataArray[i])) {
                    continue;
                }
                if (effectHz.hz >= this.voice.minHz && effectHz.hz <= this.voice.maxHz) {
                    this.voice.sum += this.dataArray[i];
                    this. voice.count++;
                }
                effectHz.sum += this.dataArray[i];
                effectHz.count++;
                total.sum += this.dataArray[i];
                total.count++;
            }
            effectHz.avg = effectHz.count != 0 ? effectHz.sum / effectHz.count : 0;
        }
        this.voice.avg = this.voice.sum / this.voice.count;
        const overallAvg = total.sum / total.count;
        const scaleFactor = 0;
        for(const key in effectHzs) {
            const effectHz = effectHzs[key];
            effectHz.normalizedAvg = (effectHz.avg / overallAvg - 1.0) * (scaleFactor + 1.0);
        }
        this.voice.normalizedAvg = (this.voice.avg / overallAvg -1.0) * (scaleFactor + 1.0);
        this.smoothing(effectHzs);
        return effectHzs;
    }
    updateDefaultGainsFilter() {
        this.equalizer.gains.forEach(element=>{
            this.equalizer.filters[element.hz].gain.value = element.gain;
        });
    }

    /**
     * 
     * @param {number} hz 
     * @returns 
     */
     getRange(hz) {
        return {'min':(hz/2),'max':(hz*2)};
    }
}

class StereoAudioEqualizer {
    /**
     * 
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
    constructor(audioSource, audioContext) {
        this.splitter = audioContext.createChannelSplitter(2);
        this.merger = audioContext.createChannelMerger(2);
        let AudioEqualizerStereo = class extends AudioEqualizer{
            /**
             * 
             * @param {AudioNode} audioSource 
             * @param {AudioContext} audioContext 
             * @param {ChannelMergerNode} merger
             */
            constructor(audioSource, audioContext, merger) {
                super(audioSource, audioContext);
                this.merger = merger;
                this._connect();
            }
        }

        this.leftEqualizer = new class extends AudioEqualizerStereo{
            /**
             * @param {AudioDestinationNode} audioDestination
             */
            _connect(audioDestination = null) {
                if(this.merger == null) {
                    return;
                }
                this.filters[this.gains[this.gains.length - 1].hz].connect(this.merger, 0, 0);
            }
        }(audioSource, audioContext, this.merger);
        this.rightEqualizer = new class extends AudioEqualizerStereo{
            /**
             * @param {AudioDestinationNode} audioDestination
             */
            _connect(audioDestination = null) {
                if(this.merger == null) {
                    return;
                }
                this.filters[this.gains[this.gains.length - 1].hz].connect(this.merger, 0, 1);
            }
        }(audioSource, audioContext, this.merger);

        audioSource.connect(this.splitter);

        this.splitter.connect(this.leftEqualizer.filters[this.leftEqualizer.gains[0].hz], 0);
        this.splitter.connect(this.rightEqualizer.filters[this.rightEqualizer.gains[0].hz], 1);

    }

    /**
     * @param {AudioNode} audioNode 
     */
    connect(audioNode) {
        this.merger.connect(audioNode);
    }

    /**
     * 左右同時にgain変更を行う。
     * @param {Number} hz 
     * @param {Number} gain 
     */
     setMonoGain(hz, gain) {
        this.leftEqualizer.setGain(hz, gain);
        this.rightEqualizer.setGain(hz, gain);
     }

    /**
     * 左右同時にgain変更を行う。
     * @param {Array<{hz: number, gain: number}>} value
     */
    set monoGains(value) {
        this.leftEqualizer.gains = value;
        this.rightEqualizer.gains = value;
    }

    /**
     * 
     * @param {{left:Array<{hz: number, gain: number}>,right:Array<{hz: number, gain: number}>}} value
     */
    set gains(value) {
        this.leftEqualizer.gains = value['left'];
        this.rightEqualizer.gains = value['right'];
    }
    get gains() {
        let value = {
            'left':this.leftEqualizer.gains,
            'right':this.rightEqualizer.gains
        };
        return value;
    }
}

class LoudnessNormalize {
    /**
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
    constructor(audioSource, audioContext) {
        this.gainNode = audioContext.createGain();
        audioSource.connect(this.gainNode);
        this._isUseEffect = true;
        this.desiredMeanVolume = -16;
        /**
         * @type {AudioClip} 
         */
        this.soundClip = null;
        this._isUse = true;
        this._decibel = 0;
    }

    /**
     * @param {AudioNode} audioSource 
     */
    connect(audioSource){
        this.gainNode.connect(audioSource);
    }

    set isUse(isUse) {
        this._isUse = isUse;
        if(isUse) {
            this.soundMeanVolume = this._decibel;
        } else {
            this.gainNode.gain.value = 1;
        }
    }

    get isUse(){
        return this._isUse;
    }

    set soundMeanVolume(meanVolume) {
        this._decibel = (+meanVolume);
        if(!this._isUse) {
            return;
        }
        const gainVolume = this.decibelToGain(meanVolume);
        this.gainNode.gain.value = gainVolume;
    }

    /**
     * 
     * @param {number} decibel 
     * @returns 
     */
    decibelToGain(decibel) {
        return Math.pow(10, (this.desiredMeanVolume - (decibel)) /20);
    }
}

class AudioEqualizer {
    /**
     * 
     * @param {AudioNode} audioSource 
     * @param {AudioContext} audioContext 
     */
    constructor(audioSource, audioContext) {
        this._gainFlat = [{'hz':8,'gain':0},{'hz':16,'gain':0},{'hz':32,'gain':0},{'hz':64,'gain':0},{'hz':125,'gain':0},{'hz':250,'gain':0},{'hz':500,'gain':0},{'hz':1e3,'gain':0},{'hz':2e3,'gain':0},{'hz':4e3,'gain':0},{'hz':8e3,'gain':0},{'hz':16e3,'gain':0},{'hz':24e3,'gain':0}];
        const QUALITY_FACTOR = {8:{'q':0.7},16:{'q':0.7},32:{'q':0.7},64:{'q':1.0},125:{'q':1.1},250:{'q':1.1},500:{'q':1.1},1e3:{'q':1.2},2e3:{'q':1.3},4e3:{'q':1.4},8e3:{'q':1.5},16e3:{'q':1.7},24e3:{'q':1.8}};
        this._currentGains =  JSON.parse(JSON.stringify(this._gainFlat));
        /**
         * @type {BiquadFilterNode[]}
         */
        this.filters =[];
        this._gainFlat.forEach(element => {
            const filter = audioContext.createBiquadFilter();
            if(element == this._gainFlat[0]){
                filter.type = 'lowshelf';
            } else if(element == this._gainFlat[this.gains.length-1]){
                filter.type = 'highshelf';
            } else {
                filter.type = 'peaking';
            }
            filter.frequency.value = element.hz;
            filter.Q.value = QUALITY_FACTOR[element.hz].q;
            filter.gain.value = element.gain;
            this.filters[element.hz] = filter;
        });
        audioSource.connect(this.filters[this._gainFlat[0].hz]);
        for (let i = 0; i < this._gainFlat.length - 1; i++) {
            this.filters[this._gainFlat[i].hz].connect(this.filters[this._gainFlat[i + 1].hz]);
        }
        this._connect(audioContext.destination);
    }

    /**
     * @param {AudioNode} audioDestination
     */
    _connect(audioDestination) {
        this.filters[this._gainFlat[this._gainFlat.length - 1].hz].connect(audioDestination);
    }
    
    /**
     * 
     * @param {Array<{hz: number, gain: number}>} gains
     */
    set gains(gains){
        if(gains == undefined) {
            return;
        }
        this._currentGains = gains;
        this._currentGains.forEach(element => {
            this.filters[element.hz].gain.value = element.gain;
        });
    }
    get gains() {
        return this._currentGains;
    }

    /**
     * 
     * @param {Number} hz 
     * @param {Number} gain 
     */
     setGain(hz, gain) {
        if(this.filters[hz] == undefined) {
            return;
        }
        this.filters[hz].gain.value = gain;
        for (const gainParam of this.gains) {
            if(gainParam.hz == hz) {
                gainParam.gain = gain;
            }
        }
    }
}

class AudioPlayer{
    _currentAudioClip = null;
    constructor(){
        this.audio = new Audio;
        this.audioContext = new AudioContext;
        this.source = this.audioContext.createMediaElementSource(this.audio);
        /**
         * @type {BaseFrameWork.List<AudioClip>}
         */
        this.playList = new BaseFrameWork.List;
        this.loopMode = AudioLoopModeEnum.NON_LOOP;
        this.currentPlayState = AudioPlayStateEnum.STOP;
        this.eventSupport = new EventTarget;
        this.stateInit();
        this.audioUpdateEvent = new CustomEvent('update');
        this.audioUpdatedEvent = new CustomEvent('updated');
        this.data = {};
        this.loadGiveUpTime = 10000;
        this.audio.onerror = ()=> {
            console.log("Error " + this.audio.error.code + "; details: " + this.audio.error.message);
            
            if(this.loopMode != AudioLoopModeEnum.AUDIO_LOOP && this.playList.count() >= 1) {
                let errorWindow = new MessageWindow;
                errorWindow.value='Sound load failed.\nAudioFile decode failed.';
                errorWindow.open();
                errorWindow.close(2000);
                let audioClip = this.autoNextClip;
                if(audioClip == undefined){
                    this.pause();
                    this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                    return;
                }
                this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                this.play(audioClip);
            } else {
                let errorWindow = new MessageButtonWindow;
                errorWindow.value='Sound load failed.\nAudioFile decode failed.';
                errorWindow.addItem('OK', ()=>{
                    errorWindow.close();
                });
                errorWindow.open();
            }
        };
        this.eventSupport.addEventListener('audioSet', ()=>{
            let request = new SoundInfomation();
            request.httpRequestor.addEventListener('success', event=>{
                this.data = event.detail.response;
                this.loudnessNormalize.soundMeanVolume = this.data.loudness_target;
                this.loudnessNormalize.soundClip = this.currentAudioClip;
                this.eventSupport.dispatchEvent(new CustomEvent('audio_info_loaded'));
            });
            request.formDataMap.append('SoundHash', this.currentAudioClip.soundHash);
            request.execute();
        });
        this.loudnessNormalize = new LoudnessNormalize(this.source, this.audioContext);
        this.equalizer = new StereoAudioEqualizer(this.loudnessNormalize.gainNode, this.audioContext);
        this.exAudioEffect = new StereoExAudioEffect(this.equalizer.merger, this.audioContext, this.equalizer);
        this.exAudioEffect.connect(this.audioContext.destination);

        this.setUpdate();
    }

    /**
     * @type {AudioClip}
     */
    get currentAudioClip(){
        return this._currentAudioClip;
    }

    set currentAudioClip(currentAudioClip){
        this._currentAudioClip = currentAudioClip;
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
    
    updateLockAccess = false;

    /**
     * @private
     */
    setUpdate(){
        if(this.updateLockAccess) return;
        this.updateLockAccess = true;
        try {
            if(this.updateJob == null){
                this.updateJob = setInterval(()=>{
                    this.audioUpdate();
                }, this.UPDATE_MILI_SEC);
            }
        } finally {
            this.updateLockAccess = false;
        }
    }

    setStopUpdate(){
        if(this.updateLockAccess) return;
        this.updateLockAccess = true;
        try{
            if(this.updateJob != null){
                clearInterval(this.updateJob);
                this.updateJob = null;
            }
        } finally {
            this.updateLockAccess = false;
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
                        let audioClip = this.autoNextClip;
                        if(audioClip == undefined){
                            this.pause();
                            this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                            return;
                        }
                        this.eventSupport.dispatchEvent(this.audioUpdatedEvent);
                        this.play(audioClip);
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
                    let clip = this.autoNextClip;
                    let playedAction = new SoundPlayedAction;
                    playedAction.formDataMap.append('SoundHash', this.currentAudioClip.soundHash);
                    playedAction.execute();
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
        if(this.currentAudioClip === setAudioClip || setAudioClip == undefined){
            return;
        }
        this.currentAudioClip = setAudioClip;
        this.audioDeployment();
        // this.audioUpdate(); //CHECK
    }

    audioDeployment(){
        this.eventSupport.dispatchEvent(new CustomEvent('audioSet'));
        this.audio.src = this.currentAudioClip.src;
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
     * @private
     */
    get autoNextClip() {
        if (this.currentAudioClip == null) {
            return this.playList.get(0);
        }
        switch (this.loopMode) {
            case AudioLoopModeEnum.AUDIO_LOOP:
                return this.currentAudioClip;
            case AudioLoopModeEnum.NON_LOOP:
            case AudioLoopModeEnum.TRACK_LOOP:
                return this.nextClip();
        }
        return undefined;
    }
    
    nextClip() {
        if (this.currentAudioClip == null) {
            return this.playList.get(0);
        }
    
        const clipIndex = this.playList.gets().findIndex(clip => clip != null && this.currentAudioClip != null && clip.soundHash == this.currentAudioClip.soundHash);
    
        if (clipIndex === -1) {
            return this.currentAudioClip;
        }
    
        const nextClip = this.playList.gets().slice(clipIndex + 1).find(clip => clip != null);
        
        if (nextClip) {
            return nextClip;
        } else {
            return this.handleNoNextClip();
        }
    }
    
    handleNoNextClip() {
        switch (this.loopMode) {
            case AudioLoopModeEnum.AUDIO_LOOP:
                return this.currentAudioClip;
            case AudioLoopModeEnum.NON_LOOP:
                return undefined;
            case AudioLoopModeEnum.TRACK_LOOP:
                return this.playList.get(0);
        }
    }
    

    play(audioClip = undefined){
        this.setStopUpdate();
        if(audioClip != undefined){
            this.currentAudioClip = audioClip;
            this.audioDeployment();
        } else if(this.currentAudioClip == null){
            this.currentAudioClip = this.playList.get(0);
            if(this.currentAudioClip == undefined){
                return;
            }
            this.audioDeployment();
        } else {
            if(this.audio.src == null){
                this.audioDeployment();
            }
        }
        BaseFrameWork.waitForValue(
            ()=>{
                if(this.loudnessNormalize.soundClip == null) {
                    return null;
                }
                return this.loudnessNormalize.soundClip.src
            },
            this.currentAudioClip.src,
            2e5).
        then(()=>{
            setTitle(this.currentAudioClip.title);
            this.audio.play();
            this.currentPlayState = AudioPlayStateEnum.PLAY;
            this.eventSupport.dispatchEvent(new CustomEvent('play'));
        }).finally(()=>{
            this.setUpdate();
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
