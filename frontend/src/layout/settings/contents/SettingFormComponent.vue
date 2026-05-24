<template>
  <v-container class="pa-4" fluid>
    <v-card class="box mb-12" style="background: inherit;">
      <v-card-title class="text-h6 font-weight-medium">Current Status</v-card-title>
        <v-divider></v-divider>
        <div>
          <v-card style="background: inherit;">
            <v-card-title class="d-flex align-center ga-2 px-4 py-2">
              <v-chip color="red" v-if="registStatus">Action</v-chip>
              <v-chip color="green" v-else>Finished</v-chip>
              <span>Regist Status</span>
            </v-card-title>
            <v-card-text>
              <v-expansion-panels>
                <v-expansion-panel>
                  <v-expansion-panel-title>Detail</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <p>Regist Step1: 
                      <v-chip color="red" v-if="registStatusStep1">
                        Action
                      </v-chip>
                      <v-chip color="green" v-else>
                        Finished
                      </v-chip>
                    </p>
                    <p>Regist Step2: 
                      <v-chip color="red" v-if="registStatusStep2">
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
          <v-card style="background: inherit;">
            <div class="d-flex" style="flex-wrap: wrap;align-content: space-around;">
              <v-card class="count-card" style="flex-shrink: 1; flex-grow: 1; background: inherit;">
                <v-card-title class="text-h6 font-weight-medium">Analysis/Sound Count</v-card-title>
                <v-card-text class="pt-0 px-4 pb-4">
                  <v-divider></v-divider>
                  <span>{{ analysisSoundCount }}</span>/<span>{{ registSoundCount }}</span>
                </v-card-text>
              </v-card>
              <v-card class="count-card" style="flex-shrink: 1; flex-grow: 1;background: inherit;">
                <v-card-title class="text-h6 font-weight-medium">Album Count</v-card-title>
                <v-card-text class="pt-0 px-4 pb-4">
                  <v-divider></v-divider>
                  {{ albumCount }}
                </v-card-text>
              </v-card>
              <v-card class="count-card" style="flex-shrink: 1; flex-grow: 1;background: inherit;">
                <v-card-title class="text-h6 font-weight-medium">Artist Count</v-card-title>
                <v-card-text class="pt-0 px-4 pb-4">
                  <v-divider></v-divider>
                  {{ artistCount }}
                </v-card-text>
              </v-card>
            </div>
          </v-card>
        </div>
    </v-card>
    
    <v-row class="mt-12">
      <!-- DB -------------------------------------------------------->
      <v-col cols="12" md="3">
        <v-card class="box h-100" style="background: inherit;">
          <v-card-title class="text-h6 font-weight-medium">DB</v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-text-field class="mt-4" label="IP Address" v-model="ip" name="db_ip_address" />
            <v-text-field class="mt-4" label="DB Name" v-model="dbName" name="db_name" />
            <v-text-field class="mt-4" label="User" v-model="user" name="db_user" />
            <v-text-field class="mt-4" label="Password" v-model="pass" name="db_pass" type="password" />
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Sound ----------------------------------------------------->
      <v-col cols="12" md="5">
        <v-card class="box h-100" style="background: inherit;">
          <v-card-title class="text-h6 font-weight-medium">Sound</v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-text-field class="mt-4" label="Sound Directory" v-model="sound" name="sound_directory" />
            <v-textarea class="mt-4" label="Exclusion Paths" v-model="exclusionPaths" name="exclusionPaths" rows="4" auto-grow />
          </v-card-text>
        </v-card>
      </v-col>
      <!-- WebSocket ------------------------------------------------->
      <v-col cols="12" md="4">
        <v-card class="box h-100" style="background: inherit;">
          <v-card-title class="text-h6 font-weight-medium">WebSocket</v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-text-field class="mt-4" label="Retry Count Limit" v-model.number="websocketRetryCount" name="websocket_retry_count" type="number" min="0" max="100" />
            <v-text-field class="mt-4" label="Reconnection Interval (ms)" v-model.number="websocketRetryIntervalMs" name="websocket_retry_interval" type="number" min="0" max="999999" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import { SoundOwlProperty } from '../../../websocket';
import { GetSetting } from '../../../page';
import { BaseFrameWork } from '../../../base';
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
    getFormData() {
      return {
        db_ip_address: this.ip,
        db_name: this.dbName,
        db_user: this.user,
        db_pass: this.pass,
        sound_directory: this.sound,
        exclusionPaths: BaseFrameWork.removeEmptyLines(this.exclusionPaths).replace(/\n/g, '|'),
        websocket_retry_count: this.websocketRetryCount,
        websocket_retry_interval: this.websocketRetryIntervalMs
      };
    },
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
