<template>
  <section class="analysis-gap" aria-labelledby="analysis-gap-heading">
    <v-divider />
    <div class="analysis-heading">
      <h3 id="analysis-gap-heading" class="text-subtitle-1 font-weight-medium">Not counted as analyzed{{ !loading && !loadError ? ` (${total})` : '' }}</h3>
      <v-btn size="small" color="primary" variant="tonal" :loading="loading" @click="refresh">Refresh analysis list</v-btn>
    </div>
    <p class="text-body-2 analysis-help">Analysis Count includes sounds with a saved non-zero volume value. These sounds have no non-zero value, which may be from an unfinished job, an older unrecorded failure, or a valid 0 dB result. This list does not identify a current failure.</p>
    <p v-if="loading" role="status" class="analysis-message text-body-2">Loading sounds…</p>
    <p v-else-if="loadError" role="alert" class="analysis-message text-error">Could not load sounds without an analysis count. Check the backend connection and press Refresh analysis list.</p>
    <p v-else-if="total === 0" role="status" class="analysis-message text-body-2">All registered sounds are counted as analyzed.</p>
    <div v-else class="analysis-list">
      <div v-for="sound in sounds" :key="sound.hash" class="analysis-row">
        <strong>{{ sound.title }}</strong>
        <small>{{ sound.path }}</small>
      </div>
    </div>
    <div v-if="!loadError && total > pageSize" class="analysis-pagination">
      <v-btn size="small" variant="outlined" :disabled="offset === 0 || loading" @click="changePage(-1)">Previous</v-btn>
      <span>{{ offset + 1 }}–{{ Math.min(offset + pageSize, total) }} / {{ total }}</span>
      <v-btn size="small" variant="outlined" :disabled="offset + pageSize >= total || loading" @click="changePage(1)">Next</v-btn>
    </div>
  </section>
</template>

<script>
import { BASE } from '../../../utilization/path';

export default {
  name: 'UnanalysedSoundList',
  data() {
    return {
      pageSize: 25,
      offset: 0,
      total: 0,
      sounds: [],
      loading: false,
      loadError: false,
      requestNumber: 0
    };
  },
  mounted() { this.refresh(); },
  beforeUnmount() { this.requestNumber += 1; },
  methods: {
    /** Reload the bounded page of sounds excluded from Analysis Count. */
    async refresh() {
      const currentRequest = ++this.requestNumber;
      this.loading = true;
      this.loadError = false;
      try {
        const parameters = new URLSearchParams({ limit: String(this.pageSize), offset: String(this.offset) });
        const response = await fetch(`${BASE.API}unanalysed_sounds.php?${parameters}`);
        if (!response.ok) throw new Error('Analysis list request failed.');
        const result = await response.json();
        if (!result || !Number.isSafeInteger(result.total) || result.total < 0 || !Array.isArray(result.sounds)) {
          throw new Error('Invalid analysis list response.');
        }
        if (currentRequest !== this.requestNumber) return;
        if (result.total > 0 && this.offset >= result.total) {
          this.offset = Math.floor((result.total - 1) / this.pageSize) * this.pageSize;
          return this.refresh();
        }
        this.total = result.total;
        this.sounds = result.sounds;
      } catch {
        if (currentRequest !== this.requestNumber) return;
        this.total = 0;
        this.sounds = [];
        this.loadError = true;
      } finally {
        if (currentRequest === this.requestNumber) this.loading = false;
      }
    },
    /** Move by one bounded page. */
    changePage(direction) {
      this.offset += direction * this.pageSize;
      this.refresh();
    }
  }
};
</script>

<style scoped>
.analysis-gap { display: grid; gap: 12px; min-width: 0; }
.analysis-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.analysis-heading h3, .analysis-help, .analysis-message { margin: 0; }
.analysis-message { padding: 14px 16px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; }
.analysis-row { display: grid; gap: 4px; min-width: 0; padding-block: 12px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); overflow-wrap: anywhere; }
.analysis-row small { opacity: 0.8; }
.analysis-pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
</style>
