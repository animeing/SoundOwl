<template>
  <v-expansion-panels v-model="openPanel" rounded="md">
    <v-expansion-panel class="status-detail-panel">
      <v-expansion-panel-title class="status-detail-title">
        <span class="status-summary">
          <span class="status-summary-heading">Registration and analysis <v-chip size="small" :color="summaryColor">{{ summaryStatus }}</v-chip></span>
          <span class="status-summary-description">{{ summaryDescription }}</span>
        </span>
        <span class="status-summary-action">{{ openPanel === 0 ? 'Hide details' : 'View details' }}</span>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div class="registration-details" role="region" aria-label="Registration and analysis details">
          <div class="detail-sections" :class="{ 'has-two-sections': analysisGap > 0 && showFailureSection }">
            <section v-if="showFailureSection" class="failure-section" aria-labelledby="failure-heading">
              <h3 id="failure-heading" class="text-subtitle-1 font-weight-medium">Recorded file failures ({{ failureCount }})</h3>
              <template v-if="!loadError && failureCount > 0">
                <p class="text-body-2 failure-help">Step1 reads and saves files; Step2 analyzes volume.</p>
                <p class="text-body-2 failure-help">After fixing a file, run Sound Regist again or use its Update action.</p>
              </template>
              <div v-if="failureCount > 0 || loadError" class="failure-toolbar">
                <v-btn size="small" variant="tonal" :loading="loading" @click="refresh">Refresh failure records</v-btn>
              </div>
              <div v-if="!loadError && failureCount > 0" class="failure-filters" role="group" aria-label="Filter failures by step">
                <v-btn v-for="option in filters" :key="option.value" size="small" variant="outlined" :class="{ 'failure-filter-selected': selectedStep === option.value }" :aria-pressed="selectedStep === option.value" @click="selectStep(option.value)">
                  {{ option.label }} ({{ option.count }})
                </v-btn>
              </div>
              <p v-if="loading" role="status" class="failure-message text-body-2">Loading failure details…</p>
              <p v-else-if="loadError" role="alert" class="failure-message text-error">Could not load failure records. Check the backend connection and press Refresh failure records.</p>
              <p v-else-if="total === 0" role="status" class="failure-empty text-body-2">No unresolved failures {{ selectedStep === 'all' ? 'recorded' : `recorded for ${selectedStep === 'step1' ? 'Step1' : 'Step2'}` }}.</p>
              <div v-else class="failure-list" role="region" aria-label="Unresolved failure records" tabindex="0">
                <div v-for="failure in failures" :key="`${failure.step}:${failure.target}`" class="failure-row py-3">
                  <v-chip size="small" color="error">Step{{ failure.step }}</v-chip>
                  <div class="failure-details">
                    <strong class="failure-path">{{ failure.target }}</strong>
                    <div>{{ failure.reason }}</div>
                    <small v-if="failure.updatedAt">Last failed: {{ formatDate(failure.updatedAt) }}</small>
                  </div>
                </div>
              </div>
              <div v-if="!loadError && total > pageSize" class="failure-pagination">
                <v-btn size="small" variant="outlined" :disabled="offset === 0 || loading" @click="changePage(-1)">Previous</v-btn>
                <span>{{ offset + 1 }}–{{ Math.min(offset + pageSize, total) }} / {{ total }}</span>
                <v-btn size="small" variant="outlined" :disabled="offset + pageSize >= total || loading" @click="changePage(1)">Next</v-btn>
              </div>
            </section>
            <UnanalysedSoundList v-if="analysisGap > 0" ref="analysisList" />
          </div>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import { BASE } from '../../../utilization/path';
import UnanalysedSoundList from './UnanalysedSoundList.vue';

export default {
  name: 'RegistrationFailurePanel',
  components: { UnanalysedSoundList },
  props: {
    running: { type: Boolean, default: false },
    step1Running: { type: Boolean, default: false },
    step2Running: { type: Boolean, default: false },
    analysisGap: { type: Number, default: 0 }
  },
  data() {
    return {
      openPanel: null,
      selectedStep: 'all',
      pageSize: 25,
      offset: 0,
      counts: { step1: 0, step2: 0 },
      total: 0,
      failures: [],
      loading: false,
      loadError: false,
      failureStatusReady: false,
      requestNumber: 0,
      refreshAfterLoad: false
    };
  },
  computed: {
    failureCount() { return this.counts.step1 + this.counts.step2; },
    /** Combine active work, recorded failures, and the analysis count gap into one status. */
    summaryStatus() {
      if (this.running || this.step1Running || this.step2Running) return 'In progress';
      if (!this.failureStatusReady) return 'Checking';
      if (this.loadError) return 'Status unavailable';
      if (this.failureCount > 0) return 'Needs attention';
      return this.analysisGap > 0 ? 'Count differs' : 'Finished';
    },
    /** Use red for recorded failures and amber for running or uncertain states. */
    summaryColor() {
      if (!this.failureStatusReady && !this.running && !this.step1Running && !this.step2Running) return undefined;
      if (this.running || this.step1Running || this.step2Running) return 'warning';
      if (this.failureCount > 0 && !this.loadError) return 'error';
      if (this.loadError || this.analysisGap > 0) return 'warning';
      return 'success';
    },
    /** Explain a count difference without claiming that every uncounted sound failed. */
    summaryDescription() {
      if (this.step1Running && this.step2Running) return 'Step1 is saving files; Step2 is analyzing volume.';
      if (this.step1Running) return 'Step1 is reading and saving files.';
      if (this.step2Running) return 'Step2 is analyzing volume.';
      if (this.running) return 'Registration is running; counts may change.';
      if (!this.failureStatusReady) return 'Checking recorded file failures.';
      const details = [];
      if (this.loadError) details.push('Failed-file records could not be loaded');
      else if (this.failureCount > 0) details.push(`${this.failureCount} failed ${this.failureCount === 1 ? 'file' : 'files'} recorded`);
      if (this.analysisGap > 0) details.push(`${this.analysisGap} ${this.analysisGap === 1 ? 'sound' : 'sounds'} outside Analysis Count`);
      if (!this.loadError && this.failureCount === 0 && this.analysisGap > 0) details.push('no failed files recorded');
      return details.length ? `${details.join(' · ')}.` : 'No recorded file failures or analysis count differences.';
    },
    /** Keep an empty failure card out of the way when analysis is the only issue. */
    showFailureSection() {
      return !this.failureStatusReady || this.loadError || this.failureCount > 0 || this.analysisGap === 0;
    },
    filters() {
      return [
        { value: 'all', label: 'All', count: this.failureCount },
        { value: 'step1', label: 'Step1', count: this.counts.step1 },
        { value: 'step2', label: 'Step2', count: this.counts.step2 }
      ];
    }
  },
  watch: {
    openPanel(value) {
      if (value !== null && value !== undefined) {
        this.refresh();
        if (this.$refs.analysisList && !this.$refs.analysisList.loading) this.refreshAnalysisList();
        this.$nextTick(() => this.$el.closest('.current-status-card')?.scrollIntoView({ block: 'start' }));
      }
    },
    analysisGap(value, previous) {
      if (value > 0 && previous > 0 && value !== previous) this.refreshAnalysisList();
    }
  },
  mounted() { this.refresh(); },
  beforeUnmount() { this.refreshAfterLoad = false; },
  methods: {
    /** Reload the analysis list after the backend or registration state changes. */
    refreshAnalysisList() { return this.$refs.analysisList?.refresh(); },
    /** Check saved failures on idle status broadcasts, including jobs missed between broadcasts. */
    refreshOnStatusUpdate() {
      if (this.loading) {
        this.refreshAfterLoad = true;
        return;
      }
      return this.refresh();
    },
    /** Reload the current page and notify the parent of the total for its status cue. */
    async refresh() {
      const currentRequest = ++this.requestNumber;
      this.loading = true;
      this.loadError = false;
      try {
        const parameters = new URLSearchParams({ step: this.selectedStep, limit: String(this.pageSize), offset: String(this.offset) });
        const response = await fetch(`${BASE.API}registration_failures.php?${parameters}`);
        if (!response.ok) throw new Error('Failure list request failed.');
        const result = await response.json();
        if (!result || !result.counts || !Array.isArray(result.failures)) throw new Error('Invalid failure list response.');
        if (currentRequest !== this.requestNumber) return;
        if (result.total > 0 && this.offset >= result.total) {
          this.offset = Math.floor((result.total - 1) / this.pageSize) * this.pageSize;
          return this.refresh();
        }
        this.counts = result.counts;
        this.total = result.total;
        this.failures = result.failures;
        this.failureStatusReady = true;
        if (this.failureCount === 0) {
          this.selectedStep = 'all';
          this.offset = 0;
        }
      } catch {
        if (currentRequest !== this.requestNumber) return;
        this.counts = { step1: 0, step2: 0 };
        this.total = 0;
        this.failures = [];
        this.loadError = true;
        this.failureStatusReady = true;
      } finally {
        if (currentRequest === this.requestNumber) {
          this.loading = false;
          if (this.refreshAfterLoad) {
            this.refreshAfterLoad = false;
            this.refresh();
          }
        }
      }
    },
    /** Apply the selected stage and return to the first page. */
    selectStep(step) {
      this.selectedStep = step;
      this.offset = 0;
      this.refresh();
    },
    /** Move by one bounded page. */
    changePage(direction) {
      this.offset += direction * this.pageSize;
      this.refresh();
    },
    /** Format the failure time in the user's local timezone. */
    formatDate(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }
  }
};
</script>

<style scoped>
.status-detail-panel { border: 2px solid rgba(var(--v-theme-on-surface), 0.45); border-radius: 8px; overflow: hidden; scroll-margin-top: 64px; }
.status-detail-title { background: rgba(var(--v-theme-on-surface), 0.08); border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.3); gap: 12px; }
.status-summary { display: grid; gap: 4px; flex: 1 1 auto; min-width: 0; }
.status-summary-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 1rem; font-weight: 600; }
.status-summary-description { font-size: 0.875rem; line-height: 1.4; opacity: 0.9; overflow-wrap: anywhere; }
.status-summary-action { flex-shrink: 0; font-size: 0.875rem; text-decoration: underline; text-underline-offset: 2px; }
:deep(.status-detail-title .v-expansion-panel-title__icon) { margin-inline-start: 0; }
:deep(.status-detail-panel .v-expansion-panel-text__wrapper) { padding: 0; }
.registration-details { min-width: 0; padding: 16px; }
.detail-sections { display: grid; gap: 16px; }
.detail-sections.has-two-sections { grid-template-columns: minmax(340px, 0.65fr) minmax(0, 1fr); }
.detail-sections:not(.has-two-sections) .failure-section { max-width: 600px; }
.failure-section { display: grid; align-content: start; gap: 12px; min-width: 0; padding: 16px; border: 1px solid rgba(var(--v-theme-on-surface), 0.2); border-radius: 8px; }
.failure-toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
.failure-section h3, .failure-help, .failure-message, .failure-empty { margin: 0; }
.failure-filters, .failure-pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.failure-filter-selected { background: rgba(var(--v-theme-on-surface), 0.13); font-weight: 600; }
.failure-message { padding: 14px 16px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; }
.failure-row { display: flex; align-items: flex-start; gap: 12px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.failure-row :deep(.v-chip) { flex-shrink: 0; }
.failure-list { max-height: clamp(180px, 34vh, 360px); overflow-y: auto; overscroll-behavior: contain; scroll-margin-top: 64px; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: rgba(var(--v-theme-on-surface), 0.5) transparent; border: 1px solid rgba(var(--v-theme-on-surface), 0.16); border-radius: 6px; padding: 0 10px; }
.failure-list::-webkit-scrollbar { width: 8px; }
.failure-list::-webkit-scrollbar-track { background: transparent; }
.failure-list::-webkit-scrollbar-thumb { background: rgba(var(--v-theme-on-surface), 0.5); border: 2px solid transparent; border-radius: 8px; background-clip: padding-box; }
.failure-list:focus-visible { outline: 2px solid rgba(var(--v-theme-on-surface), 0.85); outline-offset: 2px; }
.failure-row:first-child { border-top: 0; }
.failure-details { min-width: 0; overflow-wrap: anywhere; }
.failure-path { display: block; }
@media (max-width: 900px) {
  .detail-sections.has-two-sections { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .status-detail-title { flex-wrap: wrap; }
  .status-summary { flex-basis: 100%; }
  .status-summary-action { margin-inline-start: 0; }
}
@media (max-width: 360px) {
  .failure-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .failure-filters > :first-child { grid-column: 1 / -1; }
  .failure-filters :deep(.v-btn) { min-width: 0; width: 100%; }
  .failure-row { display: grid; gap: 6px; }
  .failure-row :deep(.v-chip) { justify-self: start; }
}
</style>
