<template>
  <v-container class="py-4" fluid>
    <v-card class="box">
      <v-card-title>Current Status</v-card-title>
        <v-divider></v-divider>
        <div>
          <v-card style="background: inherit;">
            <v-card-title>
              <v-chip  color="red" v-if="registStatus">Action</v-chip>
              <v-chip color="green" v-else>Finished</v-chip>
              Regist Status
            </v-card-title>
            <v-card-text>
              <v-expansion-panels>
                <v-expansion-panel>
                  <v-expansion-panel-title>Detail</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <p>Regist Step1: 
                      <v-chip  color="red" v-if="registStatusStep1">
                        Action
                      </v-chip>
                      <v-chip color="green" v-else>
                        Finished
                      </v-chip>
                    </p>
                    <p>Regist Step2: 
                      <v-chip  color="red" v-if="registStatusStep2">
                        Action
                      </v-chip>
                      <v-chip color="green" v-else>
                        Finished
                      </v-chip>
                    </p>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>
          <v-card>
            <div class="d-flex" style="flex-wrap: wrap;align-content: space-around;">
              <v-card style="flex-shrink: 1; flex-grow: 1;">
                <v-card-title>Analysis/Sound Count</v-card-title>
                <v-card-text>
                  <v-divider></v-divider>
                  <span>{{ analysisSoundCount }}</span>/<span>{{ registSoundCount }}</span>
                </v-card-text>
              </v-card>
              <v-card style="flex-shrink: 1; flex-grow: 1;">
                <v-card-title>Album Count</v-card-title>
                <v-card-text>
                  <v-divider></v-divider>
                  {{ albumCount }}
                </v-card-text>
              </v-card>
              <v-card style="flex-shrink: 1; flex-grow: 1;">
                <v-card-title>Artist Count</v-card-title>
                <v-card-text>
                  <v-divider></v-divider>
                  {{ artistCount }}
                </v-card-text>
              </v-card>
            </div>
          </v-card>
        </div>
    </v-card>
    <v-card class="box">
      <v-card-title>DB</v-card-title>
      <v-card-text>
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
      </v-card-text>
    </v-card>
    <v-card class="box">
      <v-card-title>Sound</v-card-title>
      <v-card-text>
        <sw-input-param
          data-title="Sound Directory"
          type="text"
          :value="sound"
          name="sound_directory" />
        <sw-textarea-param 
          data-title="Exclusion Paths"
          :value="exclusionPaths"
          name="exclusionPaths" />
      </v-card-text>
    </v-card>
    <v-card class="box">
      <v-card-title>WebSocket</v-card-title>
      <v-card-text>
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
      </v-card-text>
    </v-card>
  </v-container>
</template>
<script>
import { SoundOwlProperty } from '../../../websocket';
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