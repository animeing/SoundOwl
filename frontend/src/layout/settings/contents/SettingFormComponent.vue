<template>
    <div>
        <div class="block">
            <p class="title">
                Current Status
            </p>
            <div>
                <div style="display: flex;justify-content: space-around;">
                    <div class="block">
                        <p class="title">
                            Regist Status
                        </p>
                        <p>{{ registStatus?'Action':'Finished' }}</p>
                    </div>
                    <div class="block">
                        <p class="title">
                            Regist Step1
                        </p>
                        <p>{{ registStatusStep1?'Action':'Finished' }}</p>
                    </div>
                    <div class="block">
                        <p class="title">
                            Regist Step2
                        </p>
                        <p>{{ registStatusStep2?'Action':'Finished' }}</p>
                    </div>
                </div>
                <div style="display: flex;justify-content: space-around;">
                    <div class="block">
                        <p class="title">
                            Analysis/Sound Count
                        </p>
                        <p><span>{{ analysisSoundCount }}</span>/<span>{{ registSoundCount }}</span></p>
                    </div>
                    <div class="block">
                        <p class="title">
                            Album Count
                        </p>
                        <p>{{ albumCount }}</p>
                    </div>
                    <div class="block">
                        <p class="title">
                            Artist Count
                        </p>
                        <p>{{ artistCount }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="block">
            <p class="title">
                DB
            </p>
            <sw-input-param
                data-title="IP Address"
                type="text"
                :value="ip"
                name="db_ip_address" />
            <sw-input-param
                data-title="DB Name"
                type="text"
                :value="dbName"
                name="db_name" />
            <sw-input-param
                data-title="User"
                type="text"
                :value="user"
                name="db_user" />
            <sw-input-param
                data-title="Password"
                type="password"
                :value="pass"
                name="db_pass" />
        </div>
        <div class="block">
            <p class="title">
                Sound
            </p>
            <sw-input-param
                data-title="Sound Directory"
                type="text"
                :value="sound"
                name="sound_directory" />
            <sw-textarea-param 
                data-title="Exclusion Paths"
                :value="exclusionPaths"
                name="exclusionPaths" />
        </div>
        <div class="block">
            <p class="title">
                WebSocket
            </p>
            <sw-input-param
                data-title="Retry Count Limit"
                :value="websocketRetryCount"
                name="websocket_retry_count"
                type="number"
                min="0"
                max="100"
                pattern="[0-9]" />
            <sw-input-param
                data-title="Reconnection Interval (ms)"
                :value="websocketRetryIntervalMs"
                name="websocket_retry_interval"
                type="number"
                min="0"
                max="999999"
                pattern="[0-9]" />
        </div>
    </div>
</template>
<script>
import { SoundOwlProperty } from '../../../layout';
import { GetSetting } from '../../../page';
export default {
  
  data() {
    return {
      ip:'',
      dbName:'',
      user:'',
      pass:'',
      sound:'',
      exclusionPaths: '',
      websocketRetryCount:0,
      websocketRetryIntervalMs:10000,

      registStatus:SoundOwlProperty.SoundRegist.registStatus,
      registStatusStep1:SoundOwlProperty.SoundRegist.registStatusStep1,
      registStatusStep2:SoundOwlProperty.SoundRegist.registStatusStep2,

      registSoundCount:SoundOwlProperty.SoundRegist.RegistDataCount.sound,
      analysisSoundCount:SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound,
      albumCount:SoundOwlProperty.SoundRegist.RegistDataCount.album,
      artistCount: SoundOwlProperty.SoundRegist.RegistDataCount.artist
    };
  },
  mounted() {
    let getSettingAction = new GetSetting;
    getSettingAction.httpRequestor.addEventListener('success', event=>{
      this.ip = event.detail.response.db_ip_address;
      this.dbName = event.detail.response.db_name;
      this.user = event.detail.response.db_user;
      this.pass = event.detail.response.db_pass;
      this.sound = event.detail.response.sound_directory;
      this.exclusionPaths = event.detail.response.exclusionPaths.replaceAll('|','\n');
      this.websocketRetryCount = event.detail.response.websocket_retry_count;
      this.websocketRetryIntervalMs = event.detail.response.websocket_retry_interval;
    });
    getSettingAction.execute();
    SoundOwlProperty.WebSocket.EventTarget.addEventListener('update',this.updateCurrentStatus);
  },
  beforeUnmount() {
    SoundOwlProperty.WebSocket.EventTarget.removeEventListener('update', this.updateCurrentStatus);
  },
  methods:{
    updateCurrentStatus(){

      this.registStatus=SoundOwlProperty.SoundRegist.registStatus;
      this.registStatusStep1=SoundOwlProperty.SoundRegist.registStatusStep1;
      this.registStatusStep2=SoundOwlProperty.SoundRegist.registStatusStep2;

      this.registSoundCount=SoundOwlProperty.SoundRegist.RegistDataCount.sound;
      this.analysisSoundCount=SoundOwlProperty.SoundRegist.RegistDataCount.analysisSound;
      this.albumCount=SoundOwlProperty.SoundRegist.RegistDataCount.album;
      this.artistCount=SoundOwlProperty.SoundRegist.RegistDataCount.artist;
    }
  }
};
</script>