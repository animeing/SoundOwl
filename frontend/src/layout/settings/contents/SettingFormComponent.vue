<template>
  <v-container class="settings-form" fluid>
    <v-card class="box status-card" style="background: inherit;">
      <v-card-title class="section-title">Current Status</v-card-title>
        <v-divider></v-divider>
        <div>
          <v-card style="background: inherit;">
            <v-card-title class="regist-title">
              <v-chip class="status-chip" color="red" v-if="registStatus">Action</v-chip>
              <v-chip class="status-chip" color="green" v-else>Finished</v-chip>
              <span>Regist Status</span>
            </v-card-title>
            <v-card-text>
              <v-expansion-panels>
                <v-expansion-panel>
                  <v-expansion-panel-title>Detail</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <p>Regist Step1: 
                      <v-chip class="status-chip" color="red" v-if="registStatusStep1">
                        Action
                      </v-chip>
                      <v-chip class="status-chip" color="green" v-else>
                        Finished
                      </v-chip>
                    </p>
                    <p>Regist Step2: 
                      <v-chip class="status-chip" color="red" v-if="registStatusStep2">
                        Action
                      </v-chip>
                      <v-chip class="status-chip" color="green" v-else>
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
                <v-card-title class="metric-title">Analysis/Sound Count</v-card-title>
                <v-card-text>
                  <v-divider></v-divider>
                  <span>{{ analysisSoundCount }}</span>/<span>{{ registSoundCount }}</span>
                </v-card-text>
              </v-card>
              <v-card class="count-card" style="flex-shrink: 1; flex-grow: 1;background: inherit;">
                <v-card-title class="metric-title">Album Count</v-card-title>
                <v-card-text>
                  <v-divider></v-divider>
                  {{ albumCount }}
                </v-card-text>
              </v-card>
              <v-card class="count-card" style="flex-shrink: 1; flex-grow: 1;background: inherit;">
                <v-card-title class="metric-title">Artist Count</v-card-title>
                <v-card-text>
                  <v-divider></v-divider>
                  {{ artistCount }}
                </v-card-text>
              </v-card>
            </div>
          </v-card>
        </div>
    </v-card>
    
    <div class="settings-grid">
      <!-- DB -------------------------------------------------------->
      <v-card class="box settings-card" style="background: inherit;">
        <v-card-title class="section-title">DB</v-card-title>
        <v-card-text>
          <v-divider></v-divider>
          <v-text-field class="settings-field" label="IP Address" v-model="ip" name="db_ip_address" />
          <v-text-field class="settings-field" label="DB Name" v-model="dbName" name="db_name" />
          <v-text-field class="settings-field" label="User" v-model="user" name="db_user" />
          <v-text-field class="settings-field" label="Password" v-model="pass" name="db_pass" type="password" />
        </v-card-text>
      </v-card>
      <!-- Sound ----------------------------------------------------->
      <v-card class="box settings-card" style="background: inherit;">
        <v-card-title class="section-title">Sound</v-card-title>
        <v-card-text>
          <v-divider></v-divider>
          <v-text-field class="settings-field" label="Sound Directory" v-model="sound" name="sound_directory" />
          <v-textarea class="settings-field" label="Exclusion Paths" v-model="exclusionPaths" name="exclusionPaths" rows="4" auto-grow />
        </v-card-text>
      </v-card>
      <!-- WebSocket ------------------------------------------------->
      <v-card class="box settings-card" style="background: inherit;">
        <v-card-title class="section-title">WebSocket</v-card-title>
        <v-card-text>
          <v-divider></v-divider>
          <v-text-field class="settings-field" label="Retry Count Limit" v-model.number="websocketRetryCount" name="websocket_retry_count" type="number" min="0" max="100" />
          <v-text-field class="settings-field" label="Reconnection Interval (ms)" v-model.number="websocketRetryIntervalMs" name="websocket_retry_interval" type="number" min="0" max="999999" />
        </v-card-text>
      </v-card>
    </div>
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
  padding: 18px 14px 20px;
}

.status-card {
  margin-bottom: 48px;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 500;
  line-height: 1.35;
  padding: 14px 16px;
}

.regist-title {
  align-items: center;
  display: flex;
  gap: 10px;
  padding: 10px 16px 8px;
}

.status-chip {
  min-width: 82px;
  justify-content: center;
  padding-inline: 14px;
}

.metric-title {
  font-size: 1.3rem;
  font-weight: 500;
  padding: 10px 16px 6px;
}

.count-card :deep(.v-card-text) {
  padding: 0 16px 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(360px, 1.2fr) minmax(300px, 1fr);
  gap: 0;
}

.settings-card {
  min-width: 0;
}

.settings-card :deep(.v-card-text) {
  padding: 0 16px 24px;
}

.settings-field {
  margin-top: 16px;
}

.settings-field :deep(.v-field) {
  background: rgba(255, 255, 255, 0.035);
  padding-inline: 16px;
}

.settings-field :deep(.v-label) {
  font-family: "Lucida Grande", "Lucida Sans Unicode", "Hiragino Kaku Gothic Pro", "Meiryo", Helvetica, Arial, Verdana, sans-serif;
  font-size: 0.8rem;
}

.settings-field :deep(.v-field__input) {
  min-height: 56px;
  padding-top: 20px;
  padding-bottom: 8px;
}

@media screen and (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
