<template>
  <SettingFormComponent ref="formRef" />
  <div class="d-flex justify-start mb-6">
    <v-btn
      :disabled="isAction && !isConnectWebSocket"
      :data-hint="isConnectWebSocket
        ? undefined
        : 'The operation cannot be performed because the WebSocket connection has not been established.'"
      @click="settingUpdate"
      class="ma-2 pa-2"
    >setting update</v-btn>
    <div style="position: relative; display: inline-block;">
      <v-btn
        :disabled="isAction && !isConnectWebSocket"
        :loading="isAction"
        style="position: relative;"
        :data-hint="isConnectWebSocket
          ? undefined
          : 'The operation cannot be performed because the WebSocket connection has not been established.'"
        @click="soundRegist"
        class="ma-2 pa-2"
      >sound regist</v-btn>
    </div>
  </div>
</template>

<script>
import { MessageButtonWindow, MessageWindow, toBoolean } from '../../../base';
import SettingFormComponent from './SettingFormComponent.vue';
import { SiteStatus, SoundRegistAction, UpdateSetting } from '../../../page';
import { SoundOwlProperty } from '../../../websocket';

export default {
  name:'SettingServerComponent',
  components:{
    SettingFormComponent
  },
  data(){
    return {
      isConnectWebSocket: SoundOwlProperty.WebSocket.status,
      isAction: false
    };
  },
  created(){
    SoundOwlProperty.WebSocket.EventTarget.addEventListener('change', this.updateWebConnection);
    SoundOwlProperty.WebSocket.EventTarget.addEventListener('update', this.updateProperties);
  },
  beforeUnmount() {
    SoundOwlProperty.WebSocket.EventTarget.removeEventListener('change', this.updateWebConnection);
    SoundOwlProperty.WebSocket.EventTarget.removeEventListener('update', this.updateProperties);
  },
  methods:{
    settingUpdate(){
      const formData = this.$refs.formRef.getFormData();
      const updateSetting = new UpdateSetting();
      for(const [key, value] of Object.entries(formData)) {
        updateSetting.formDataMap.set(key, value);
      }
      updateSetting.httpRequestor.addEventListener('success', () => {
        const message = new MessageWindow();
        message.value = 'Updated.';
        message.open();
        message.close(500);
      });
      updateSetting.execute();
    },
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
}

</script>

