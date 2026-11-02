<template>
  <v-container class="settings-form" fluid>
    <v-card class="backend-card box mb-6" style="background: inherit;">
      <v-card-item>
        <v-card-title class="text-h6 font-weight-medium">Backend</v-card-title>
      </v-card-item>
      <div class="settings-card-body">
        <v-divider></v-divider>
        <v-text-field class="settings-field" label="Backend Server" v-model="backendServer" name="backend_server" variant="filled" :disabled="backendSaving" />
        <v-btn
          color="fixed-dark-surface"
          style="color: rgb(var(--v-theme-on-fixed-dark-surface));"
          class="ma-2 pa-2"
          :loading="backendSaving"
          :disabled="backendSaving"
          @click="$emit('backend-update')"
        >backend update</v-btn>
      </div>
    </v-card>

    <v-card class="box mb-12 current-status-card" style="background: inherit;">
      <v-card-title class="current-status-title">Current Status</v-card-title>
      <v-divider />
      <div class="current-status-body">
        <RegistrationFailurePanel
          ref="failurePanel"
          :running="registStatus"
          :step1-running="registStatusStep1"
          :step2-running="registStatusStep2"
          :analysis-gap="analysisGap"
        />
        <div class="status-metrics">
          <v-card class="status-metric" style="background: inherit;">
            <v-card-title>Analysis/Sound Count</v-card-title>
            <v-card-text><v-divider /><span>{{ analysisSoundCount }}</span>/<span>{{ registSoundCount }}</span></v-card-text>
          </v-card>
          <v-card class="status-metric" style="background: inherit;">
            <v-card-title>Album Count</v-card-title>
            <v-card-text><v-divider />{{ albumCount }}</v-card-text>
          </v-card>
          <v-card class="status-metric" style="background: inherit;">
            <v-card-title>Artist Count</v-card-title>
            <v-card-text><v-divider />{{ artistCount }}</v-card-text>
          </v-card>
        </div>
      </div>
    </v-card>
    
    <div class="settings-columns d-flex flex-wrap align-content-space-around">
      <!-- DB -------------------------------------------------------->
        <v-card class="settings-panel box flex-grow-1 flex-shrink-1" style="background: inherit;">
          <v-card-title>DB</v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-text-field class="settings-field" label="IP Address" v-model="ip" name="db_ip_address" variant="filled" :disabled="settingsLocked" />
            <v-text-field class="settings-field" label="DB Name" v-model="dbName" name="db_name" variant="filled" :disabled="settingsLocked" />
            <v-text-field class="settings-field" label="User" v-model="user" name="db_user" variant="filled" :disabled="settingsLocked" />
            <v-text-field class="settings-field" label="Password" v-model="pass" name="db_pass" type="password" variant="filled" :disabled="settingsLocked" />
          </v-card-text>
        </v-card>
      <!-- Sound ----------------------------------------------------->
        <v-card class="settings-panel box flex-grow-1 flex-shrink-1" style="background: inherit;">
          <v-card-title>Sound</v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-text-field class="settings-field" label="Sound Directory" v-model="sound" name="sound_directory" variant="filled" :disabled="settingsLocked || soundDirectorySource === 'environment'" />
            <p v-if="soundDirectorySource === 'environment'" class="text-caption">SOUND_PATH or SOUND_DIRECTORY fixes this path in the backend. Change that environment variable to use another directory.</p>
            <p v-else-if="soundDirectorySource === 'default'" class="text-caption">Using the backend default. Save another directory here to change the scan path.</p>
            <p v-else-if="soundDirectorySource === 'unconfigured'" class="text-caption">Set an absolute directory inside the backend container before registering sounds.</p>
            <v-textarea class="settings-field" label="Exclusion Paths" v-model="exclusionPaths" name="exclusionPaths" rows="2" auto-grow variant="filled" :disabled="settingsLocked" />
          </v-card-text>
        </v-card>
      <!-- WebSocket ------------------------------------------------->
        <v-card class="settings-panel box flex-grow-1 flex-shrink-1" style="background: inherit;">
          <v-card-title>WebSocket</v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-text-field class="settings-field" label="Retry Count Limit" v-model.number="websocketRetryCount" name="websocket_retry_count" type="number" min="0" max="100" variant="filled" :disabled="settingsLocked" />
            <v-text-field class="settings-field" label="Reconnection Interval (ms)" v-model.number="websocketRetryIntervalMs" name="websocket_retry_interval" type="number" min="0" max="999999" variant="filled" :disabled="settingsLocked" />
          </v-card-text>
        </v-card>
    </div>
  </v-container>
</template>
<script>
import { SoundOwlProperty } from '../../../websocket';
import { GetSetting } from '../../../page';
import { BaseFrameWork } from '../../../base';
import { getBackendServer } from '../../../utilization/path';
import RegistrationFailurePanel from './RegistrationFailurePanel.vue';
export default {
  components: { RegistrationFailurePanel },
  emits: ['backend-update'],
  props: {
    backendSaving: {
      type: Boolean,
      default: false
    },
    settingsLocked: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      ip:'',
      backendServer:getBackendServer(),
      dbName:'',
      user:'',
      pass:'',
      sound:'',
      savedSoundDirectory:'',
      soundDirectorySource:'unconfigured',
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
  computed: {
    analysisGap() {
      return Math.max(0, Number(this.registSoundCount || 0) - Number(this.analysisSoundCount || 0));
    }
  },
  mounted() {
    this.reloadBackendSettings();
    SoundOwlProperty.WebSocket.EventTarget.addEventListener('update',this.updateCurrentStatus);
  },
  beforeUnmount() {
    SoundOwlProperty.WebSocket.EventTarget.removeEventListener('update', this.updateCurrentStatus);
  },
  methods:{
    /** Reload both detail lists after a backend change or registration action. */
    refreshRegistrationDetails() {
      const panel = this.$refs.failurePanel;
      return Promise.all([panel?.refresh(), panel?.refreshAnalysisList()]);
    },
    reloadBackendSettings() {
      return new Promise((resolve) => {
        let getSettingAction = new GetSetting;
        getSettingAction.httpRequestor.addEventListener('success', event=>{
          this.applyBackendSettings(event.detail.response);
          resolve(event.detail.response);
        });
        getSettingAction.execute();
      });
    },
    /**
     * バックエンドが返した保存値と実際の走査先を別々に保持する。
     * @param {Record<string, unknown>} settings 設定 API の応答。
     * @returns {void} 入力欄と保存用状態を更新する。
     */
    applyBackendSettings(settings) {
      this.ip = settings.db_ip_address;
      this.backendServer = getBackendServer();
      this.dbName = settings.db_name;
      this.user = settings.db_user;
      this.pass = settings.db_pass;
      this.savedSoundDirectory = settings.sound_directory || '';
      this.soundDirectorySource = settings.sound_directory_source || 'settings';
      this.sound = settings.effective_sound_directory ?? this.savedSoundDirectory;
      this.exclusionPaths = this.toExclusionText(settings.exclusionPaths);
      this.websocketRetryCount = settings.websocket_retry_count;
      this.websocketRetryIntervalMs = settings.websocket_retry_interval;
    },
    getBackendServer() {
      return this.backendServer;
    },
    /**
     * 環境変数で固定中は表示用パスを保存値へ上書きせず、他の設定を送る。
     * @returns {Record<string, unknown>} 設定保存 API へ送るフォーム値。
     */
    getFormData() {
      return {
        db_ip_address: this.ip,
        db_name: this.dbName,
        db_user: this.user,
        db_pass: this.pass,
        sound_directory: this.soundDirectorySource === 'environment' ? this.savedSoundDirectory : this.sound,
        exclusionPaths: this.toExclusionArray(this.exclusionPaths),
        websocket_retry_count: this.websocketRetryCount,
        websocket_retry_interval: this.websocketRetryIntervalMs
      };
    },
    toExclusionText(value) {
      if (Array.isArray(value)) {
        return value.join('\n');
      }
      return String(value || '').replaceAll('|','\n');
    },
    toExclusionArray(value) {
      return BaseFrameWork.removeEmptyLines(value)
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    },
    updateCurrentStatus(){
      const wasRegistering = this.registStatusStep1 || this.registStatusStep2;
      this.registStatus=SoundOwlProperty.SoundRegist.registStatus;
      this.registStatusStep1=SoundOwlProperty.SoundRegist.registStatusStep1;
      this.registStatusStep2=SoundOwlProperty.SoundRegist.registStatusStep2;
      if (wasRegistering && !this.registStatusStep1 && !this.registStatusStep2) {
        this.refreshRegistrationDetails();
      }

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
  max-width: 1232px;
  margin-inline: auto;
}

.settings-form :deep(.v-card-title) {
  padding: 8px 16px;
  font-size: 20px;
  line-height: 32px;
}

.settings-form :deep(.v-card-text) {
  padding: 0 16px 16px;
}

.backend-card :deep(.v-card-item) {
  padding: 12px 16px;
}

.backend-card :deep(.v-card-title) {
  padding: 0;
}

.backend-card .settings-card-body {
  padding: 0 16px 16px;
}

.backend-card .settings-field {
  margin-top: 16px;
}

.settings-field :deep(.v-field--variant-filled.v-field--active .v-field__input) {
  padding-top: 24px;
}

.current-status-body {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.current-status-card { scroll-margin-top: 64px; }

.status-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.status-metric { min-width: 0; }
.status-metric :deep(.v-card-title) { white-space: normal; text-overflow: clip; }
.status-metric :deep(.v-divider) { margin-bottom: 8px; }

@media (max-width: 600px) {
  .status-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .status-metric:first-child { grid-column: 1 / -1; }
}

.settings-panel {
  min-width: min(300px, 100%);
  max-width: 100%;
}
</style>
