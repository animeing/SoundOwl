<template>
    <div>
        <SettingTab />
        <div
            v-show="isGeneral"
            class="context">
            <SettingFormComponent />
            <div style="font-size:0;line-height:0;">
                <input
                    type="button"
                    class="button"
                    value="setting update"
                    :disabled="!isConnectWebSocket"
                    :data-hint="isConnectWebSocket ? undefined : 'The operation cannot be performed because the WebSocket connection has not been established.'"
                    @click="settingUpdate">
                <div style="position: relative; display: inline-block;">
                    <input
                        type="button"
                        class="button"
                        value="sound regist"
                        style="position: relative;"
                        :disabled="!isConnectWebSocket"
                        :data-hint="isConnectWebSocket ? undefined : 'The operation cannot be performed because the WebSocket connection has not been established.'"
                        @click="soundRegist">
                    <span
                        v-show="isAction"
                        style="position: absolute; top: 0; left: 0; display: flex;align-items: center; justify-content: center;"
                        hint="Currently registering sound.">
                        <svg
                            width="100"
                            height="43"
                            viewBox="0 0 50 50">
                            <defs>
                                <filter
                                    id="innerShadow"
                                    x="-50%"
                                    y="-50%"
                                    width="200%"
                                    height="200%">
                                    <feComponentTransfer in="SourceAlpha">
                                        <feFuncA
                                            type="table"
                                            tableValues="1 0" />
                                    </feComponentTransfer>
                                    <feGaussianBlur stdDeviation="3" />
                                    <feOffset
                                        dx="2"
                                        dy="2"
                                        result="offsetblur" />
                                    <feFlood
                                        flood-color="black"
                                        result="color" />
                                    <feComposite
                                        in2="offsetblur"
                                        operator="in" />
                                    <feComposite
                                        in2="SourceAlpha"
                                        operator="in" />
                                    <feMerge>
                                        <feMergeNode in="SourceGraphic" />
                                        <feMergeNode />
                                    </feMerge>
                                </filter>
                            </defs>
                            <circle
                                cx="25"
                                cy="25"
                                r="20"
                                stroke="grey"
                                stroke-width="4"
                                fill="none"
                                filter="url(#innerShadow)" />
                            <circle
                                cx="25"
                                cy="25"
                                r="20"
                                stroke="black"
                                stroke-width="4"
                                stroke-dasharray="31.4159265359 94.2477796077"
                                stroke-dashoffset="0"
                                fill="none">
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 25 25"
                                    to="360 25 25"
                                    dur="1s"
                                    repeatCount="indefinite" />
                            </circle>
                        </svg>
                    </span>
                </div>
            </div>
        </div>
        <div
            v-show="isEqualizer"
            class="context">
            <SettingEqualizerComponent />
        </div>
        <div
            v-show="isEffect"
            class="context">
            <SettingEffectComponent />
        </div>
    </div>
</template>
<script>
import { BaseFrameWork, MessageButtonWindow, MessageWindow, toBoolean } from '../../base';
import { SoundOwlProperty } from '../../websocket';
import { SiteStatus, SoundRegistAction, UpdateSetting } from '../../page';
import SettingFormComponent from './contents/SettingFormComponent.vue';
import SettingEqualizerComponent from './contents/SettingEqualizerComponent.vue';
import SettingEffectComponent from './contents/SettingEffectComponent.vue';
import SettingTab from './parts/SettingTab.vue';

export default {
  name:'SettingVue',
  components:{
    SettingTab,
    SettingFormComponent,
    SettingEqualizerComponent,
    SettingEffectComponent
  },
  data(){
    return {
      isGeneral:true,
      isEqualizer:false,
      isEffect:false,
      isConnectWebSocket: SoundOwlProperty.WebSocket.status,
      isAction: false
    };
  },
  watch: {
    '$route'(_to, _from) {
      this.isGeneral = this.$route.name == 'setting';
      this.isEqualizer = this.$route.name == 'equalizer';
      this.isEffect = this.$route.name == 'effect';
    }
  },
  created(){
    SoundOwlProperty.WebSocket.EventTarget.addEventListener('change', this.updateWebConnection);
    SoundOwlProperty.WebSocket.EventTarget.addEventListener('update', this.updateProperties);
  },
  beforeUnmount() {
    SoundOwlProperty.WebSocket.EventTarget.removeEventListener('change', this.updateWebConnection);
    SoundOwlProperty.WebSocket.EventTarget.removeEventListener('update', this.updateProperties);
  },
  mounted() {
    this.isGeneral = this.$route.name == 'setting';
    this.isEqualizer = this.$route.name == 'equalizer';
    this.isEffect = this.$route.name == 'effect';
  },
  methods:{
    updateWebConnection() {
      this.isConnectWebSocket = SoundOwlProperty.WebSocket.status;
    },
    updateProperties() {
      this.isAction = SoundOwlProperty.SoundRegist.registStatus;
      if(this.isAction) {
        this.isConnectWebSocket = false;
      } else if (SoundOwlProperty.WebSocket.status) {
        this.isConnectWebSocket = true;
      }
    },
    settingUpdate(){
      let updateSetting = new UpdateSetting;
      updateSetting.httpRequestor.addEventListener('success', _event=>{
        let message = new MessageWindow;
        message.value = 'Updated.';
        message.open();
        message.close(500);
      });

      for(const element of Array.prototype.slice.call(document.getElementsByTagName('sw-input-param'))){
        updateSetting.formDataMap.set(element.name, element.value);
      }
      for(const element of Array.prototype.slice.call(document.getElementsByTagName('sw-textarea-param'))) {
        updateSetting.formDataMap.set(element.name, BaseFrameWork.removeEmptyLines(element.value).replace(/\n/g, '|'));
        element.value = BaseFrameWork.removeEmptyLines(element.value);
      }
      updateSetting.execute();
    },
    async soundRegist() {
      await new Promise((resolve, reject)=>{
        let siteStatus = new SiteStatus;
        siteStatus.httpRequestor.addEventListener('success', event=>{
          let data = event.detail.response;
          if(toBoolean(data['regist_status'])) {
            reject();
            return;
          } else {
            resolve();
          }
        });
        siteStatus.execute();
      }).then(()=>{
        let soundRegistAction = new SoundRegistAction;
        soundRegistAction.httpRequestor.addEventListener('success', _event=>{
          let messageButtonWindow = new MessageButtonWindow;
          messageButtonWindow.value = 'Sound Registed.';
          messageButtonWindow.addItem('Close', ()=>{
            messageButtonWindow.close();
          });
          messageButtonWindow.open();
        });
        soundRegistAction.execute();
        let messageButtonWindow = new MessageButtonWindow;
        messageButtonWindow.value = 'Sound Registing.';
        messageButtonWindow.addItem('Close', ()=>{
          messageButtonWindow.close();
        });
        messageButtonWindow.open();
      });
    }
  }
};
</script>