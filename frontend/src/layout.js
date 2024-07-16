'use strict';
import audio from './audio/AudioPlayer';
import { BaseFrameWork, ProgressComposite } from './base';

class AudioProgressComposite extends ProgressComposite{
  constructor(){
    super();
    audio.eventSupport.addEventListener('update',()=>{
      let audioBuffer = audio.audio.buffered;
      while((this.children[0] != undefined && this.children[0] != this.progress) && audioBuffer.length+1 != this.children.length){
        const element = this.children[0];
        this.removeChild(element);
      }
      let count = 0;
      let findCount = 0;
      while (audioBuffer.length>count&&audioBuffer.start(count) != null && audioBuffer.end(count)) {
        let load = undefined;
        if(this.children[findCount] == null){
          load = document.createElement('div');
          this.insertBefore(load,this.firstChild);
        } else {
          load = this.children[findCount];
          if(load == this.progress){
            findCount++;
            continue;
          }
        }
        load.style.left = (((audioBuffer.start(count)-this.min) / this.range)*100)+'%';
        load.style.transform = `scaleX(${((audioBuffer.end(count)-audioBuffer.start(count)-this.min) / this.range)})`;
        load.style.background='#fff';
        count++;
        findCount++;
      }
    });
  }
  connectedCallback(){
    super.connectedCallback();
  }
}
customElements.define('sw-audio-progress', AudioProgressComposite);



