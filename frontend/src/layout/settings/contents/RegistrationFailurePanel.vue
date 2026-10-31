<template>
  <v-expansion-panels v-model="openPanel" rounded="md">
    <v-expansion-panel>
      <v-expansion-panel-title>Detail</v-expansion-panel-title>
      <v-expansion-panel-text>
        <div class="registration-details">
          <div class="step-status" aria-label="Registration steps">
            <span class="step-status-item">Regist Step1: <v-chip :color="step1Running || counts.step1 ? 'red' : 'green'">{{ step1Running ? 'Action' : counts.step1 ? 'Needs attention' : 'Finished' }}</v-chip></span>
            <span class="step-status-item">Regist Step2: <v-chip :color="step2Running || counts.step2 ? 'red' : 'green'">{{ step2Running ? 'Action' : counts.step2 ? 'Needs attention' : 'Finished' }}</v-chip></span>
          </div>
          <v-divider />
          <section class="failure-section" aria-labelledby="failure-heading">
            <div class="failure-heading">
              <h3 id="failure-heading" class="text-subtitle-1 font-weight-medium">Unresolved failures</h3>
              <v-btn size="small" color="primary" variant="tonal" :loading="loading" @click="refresh">Refresh</v-btn>
            </div>
            <template v-if="!loadError && failureCount > 0">
              <p class="text-body-2 failure-help">Step1 reads and saves files; Step2 analyzes their volume. A successful retry clears the matching failure.</p>
              <p class="text-body-2 failure-help">After fixing a file, run Sound Regist again. For a file already in the library, use its Update action.</p>
              <div class="failure-filters" role="group" aria-label="Filter failures by step">
                <v-btn v-for="option in filters" :key="option.value" size="small" :variant="selectedStep === option.value ? 'flat' : 'outlined'" :color="selectedStep === option.value ? 'primary' : undefined" :aria-pressed="selectedStep === option.value" @click="selectStep(option.value)">
                  {{ option.label }} ({{ option.count }})
                </v-btn>
              </div>
            </template>
            <p v-if="loading" role="status" class="failure-message text-body-2">Loading failure details…</p>
            <p v-else-if="loadError" role="alert" class="failure-message text-error">Could not load failure details. Check the backend connection and press Refresh.</p>
            <p v-else-if="total === 0" role="status" class="failure-message text-body-2">No unresolved failures {{ selectedStep === 'all' ? 'recorded' : `recorded for ${selectedStep === 'step1' ? 'Step1' : 'Step2'}` }}.</p>
            <div v-else class="failure-list">
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
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import { BASE } from '../../../utilization/path';

export default {
  name: 'RegistrationFailurePanel',
  props: {
    step1Running: { type: Boolean, default: false },
    step2Running: { type: Boolean, default: false }
  },
  emits: ['count-change'],
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
      requestNumber: 0
    };
  },
  computed: {
    failureCount() { return this.counts.step1 + this.counts.step2; },
    filters() {
      return [
        { value: 'all', label: 'All', count: this.failureCount },
        { value: 'step1', label: 'Step1', count: this.counts.step1 },
        { value: 'step2', label: 'Step2', count: this.counts.step2 }
      ];
    }
  },
  watch: {
    openPanel(value) { if (value === 0) this.refresh(); }
  },
  mounted() { this.refresh(); },
  methods: {
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
        if (this.failureCount === 0) {
          this.selectedStep = 'all';
          this.offset = 0;
        }
        this.$emit('count-change', { count: this.failureCount, error: false });
      } catch {
        if (currentRequest !== this.requestNumber) return;
        this.counts = { step1: 0, step2: 0 };
        this.total = 0;
        this.failures = [];
        this.loadError = true;
        this.$emit('count-change', { count: null, error: true });
      } finally {
        if (currentRequest === this.requestNumber) this.loading = false;
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
.registration-details { display: grid; gap: 20px; padding-block: 4px 8px; }
.step-status { display: flex; flex-wrap: wrap; gap: 12px 24px; }
.step-status-item { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.failure-section { display: grid; gap: 12px; min-width: 0; }
.failure-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.failure-heading h3, .failure-help, .failure-message { margin: 0; }
.failure-filters, .failure-pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.failure-message { padding: 14px 16px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; }
.failure-row { display: flex; align-items: flex-start; gap: 12px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.failure-details { min-width: 0; overflow-wrap: anywhere; }
.failure-path { display: block; }
</style>
