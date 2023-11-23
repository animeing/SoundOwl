<template>
    <div>
        <SettingFormComponent />
        <input
            type="button"
            class="button"
            value="SetUp"
            @click="setUp">
    </div>
</template>
<script>
import { MessageButtonWindow, toBoolean } from '../../base';
import { LockStatus, SetupDataBase, SoundRegistAction, UpdateSetting } from '../../page';
import SettingFormComponent from './contents/SettingFormComponent.vue';

export default {
  name:'SetupVue',

  components:{
    SettingFormComponent
  },
  methods:{
        
    async setUp() {
      await new Promise((resolve, reject)=>{
        let lockStatus = new LockStatus();
        lockStatus.sourceAsync = !1;
        lockStatus.httpRequestor.addEventListener('success', event=>{
          let data = event.detail.response;
          if(toBoolean(data['regist_status'])) {
            reject();
            return;
          } else {
            let messageButtonWindow = new MessageButtonWindow();
            messageButtonWindow.value = 'Setup start.';
            messageButtonWindow.addItem('Close', ()=>{
              messageButtonWindow.close();
            });
            messageButtonWindow.open();
            resolve();
          }
        });
        let messageButtonWindow = new MessageButtonWindow();
        messageButtonWindow.value = 'StatusCheck Start.';
        messageButtonWindow.addItem('Close', ()=>{
          messageButtonWindow.close();
        });
        messageButtonWindow.open();
        lockStatus.execute();
      }).then(()=>{
        let updateSetting = new UpdateSetting;
        updateSetting.sourceAsync = !1;
        updateSetting.httpRequestor.addEventListener('success', _event=>{
          console.log('setting complate.');
          let messageButtonWindow = new MessageButtonWindow();
          messageButtonWindow.value = 'Setting complete.';
          messageButtonWindow.addItem('Close', ()=>{
            messageButtonWindow.close();
          });
          messageButtonWindow.open();
          return;
        });
    
        for(const element of Array.prototype.slice.call(document.getElementsByTagName('sw-input-param'))){
          updateSetting.formDataMap.set(element.name, element.value);
        }
                
        let messageButtonWindow = new MessageButtonWindow();
        messageButtonWindow.value = 'Setting start.';
        messageButtonWindow.addItem('Close', ()=>{
          messageButtonWindow.close();
        });
        messageButtonWindow.open();
        updateSetting.execute();
      }).then(()=>{
        let createTableAction = new SetupDataBase;
        createTableAction.sourceAsync = !1;
        createTableAction.httpRequestor.addEventListener('success', event=>{
          let data = event.detail.response;
          if(data.status == 'error') {
            let messageButtonWindow = new MessageButtonWindow();
            messageButtonWindow.value = `Create DB Error
                        Code : ${data.errorNo}`;
            messageButtonWindow.addItem('Close', ()=>{
              messageButtonWindow.close();
            });
            messageButtonWindow.open();
          } else if(data.status == 'success'){
                        
            let messageButtonWindow = new MessageButtonWindow();
            messageButtonWindow.value = 'Created DB';
            messageButtonWindow.addItem('Close', ()=>{
              messageButtonWindow.close();
            });
            messageButtonWindow.open();
            return;
          }
        });
        let messageButtonWindow = new MessageButtonWindow();
        messageButtonWindow.value = 'DB Create start.';
        messageButtonWindow.addItem('Close', ()=>{
          messageButtonWindow.close();
        });
        messageButtonWindow.open();
        createTableAction.execute();
      }).then(()=>{
        //即座にデータを入れようとすると失敗するので1秒後に実行する
        setTimeout(()=>{
          let soundRegistAction = new SoundRegistAction;
          soundRegistAction.httpRequestor.addEventListener('success', _event=>{
            let messageButtonWindow = new MessageButtonWindow();
            messageButtonWindow.value = 'Sound Registed.';
            messageButtonWindow.addItem('Close', ()=>{
              messageButtonWindow.close();
            });
            messageButtonWindow.open();
            return;
          });
          let messageButtonWindow = new MessageButtonWindow();
          messageButtonWindow.value = 'Sound Registing.';
          messageButtonWindow.addItem('Close', ()=>{
            messageButtonWindow.close();
          });
          messageButtonWindow.open();
          soundRegistAction.execute();
        }, 1000);
      }).catch(()=>{});
    }
  }
};
</script>