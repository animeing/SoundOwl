<template>
  <v-container class="settings-form" fluid>
    <v-card class="box mb-12" style="background: inherit;">
      <v-card-item>
        <v-card-title class="text-h6 font-weight-medium">Current Status</v-card-title>
      </v-card-item>
        <v-divider></v-divider>
        <div>
          <v-card style="background: inherit;">
            <v-card-item>
              <div class="d-flex align-center ga-2">
                <v-chip color="red" v-if="registStatus">Action</v-chip>
                <v-chip color="green" v-else>Finished</v-chip>
                <span class="text-h6">Regist Status</span>
              </div>
            </v-card-item>
            <div class="settings-card-body">
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
            </div>
          </v-card>
          <v-card style="background: inherit;">
            <v-row no-gutters>
              <v-col cols="12" sm="4">
              <v-card class="count-card h-100" style="background: inherit;">
                <v-card-item>
                  <v-card-title class="text-h6 font-weight-medium">Analysis/Sound Count</v-card-title>
                </v-card-item>
                <div class="settings-card-body">
                  <v-divider></v-divider>
                  <span>{{ analysisSoundCount }}</span>/<span>{{ registSoundCount }}</span>
                </div>
              </v-card>
              </v-col>
              <v-col cols="12" sm="4">
              <v-card class="count-card h-100" style="background: inherit;">
                <v-card-item>
                  <v-card-title class="text-h6 font-weight-medium">Album Count</v-card-title>
                </v-card-item>
                <div class="settings-card-body">
                  <v-divider></v-divider>
                  {{ albumCount }}
                </div>
              </v-card>
              </v-col>
              <v-col cols="12" sm="4">
              <v-card class="count-card h-100" style="background: inherit;">
                <v-card-item>
                  <v-card-title class="text-h6 font-weight-medium">Artist Count</v-card-title>
                </v-card-item>
                <div class="settings-card-body">
                  <v-divider></v-divider>
                  {{ artistCount }}
                </div>
              </v-card>
              </v-col>
            </v-row>
          </v-card>
        </div>
    </v-card>
    
    <v-row class="settings-panels">
      <!-- DB -------------------------------------------------------->
      <v-col cols="12" md="3">
        <v-card class="box h-100" style="background: inherit;">
          <v-card-item>
            <v-card-title class="text-h6 font-weight-medium">DB</v-card-title>
          </v-card-item>
          <div class="settings-card-body">
            <v-divider></v-divider>
            <v-text-field class="settings-field" label="IP Address" v-model="ip" name="db_ip_address" variant="filled" density="comfortable" />
            <v-text-field class="settings-field" label="DB Name" v-model="dbName" name="db_name" variant="filled" density="comfortable" />
            <v-text-field class="settings-field" label="User" v-model="user" name="db_user" variant="filled" density="comfortable" />
            <v-text-field class="settings-field" label="Password" v-model="pass" name="db_pass" type="password" variant="filled" density="comfortable" />
          </div>
        </v-card>
      </v-col>
      <!-- Sound ----------------------------------------------------->
      <v-col cols="12" md="5">
        <v-card class="box h-100" style="background: inherit;">
          <v-card-item>
            <v-card-title class="text-h6 font-weight-medium">Sound</v-card-title>
          </v-card-item>
          <div class="settings-card-body">
            <v-divider></v-divider>
            <v-text-field class="settings-field" label="Sound Directory" v-model="sound" name="sound_directory" variant="filled" density="comfortable" />
            <v-textarea class="settings-field" label="Exclusion Paths" v-model="exclusionPaths" name="exclusionPaths" rows="4" auto-grow variant="filled" density="comfortable" />
          </div>
        </v-card>
      </v-col>
      <!-- WebSocket ------------------------------------------------->
      <v-col cols="12" md="4">
        <v-card class="box h-100" style="background: inherit;">
          <v-card-item>
            <v-card-title class="text-h6 font-weight-medium">WebSocket</v-card-title>
          </v-card-item>
          <div class="settings-card-body">
            <v-divider></v-divider>
            <v-text-field class="settings-field" label="Retry Count Limit" v-model.number="websocketRetryCount" name="websocket_retry_count" type="number" min="0" max="100" variant="filled" density="comfortable" />
            <v-text-field class="settings-field" label="Reconnection Interval (ms)" v-model.number="websocketRetryIntervalMs" name="websocket_retry_interval" type="number" min="0" max="999999" variant="filled" density="comfortable" />
          </div>
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

<style scoped>
.settings-form {
  padding: 16px;
}

.settings-form :deep(.v-card-item) {
  padding: 12px 16px;
}

.settings-form :deep(.v-card-title) {
  padding: 0;
}

.settings-card-body {
  padding: 0 16px 16px;
}

.settings-field {
  margin-top: 16px;
}

.settings-panels {
  margin-top: 48px;
}

.count-card {
  height: 100%;
}
</style>
