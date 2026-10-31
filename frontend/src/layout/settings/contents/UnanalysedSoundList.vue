<template>
  <section ref="analysisSection" class="analysis-gap" aria-labelledby="analysis-gap-heading">
    <v-divider />
    <div class="analysis-heading">
      <h3 id="analysis-gap-heading" class="text-subtitle-1 font-weight-medium">{{ headingText }}</h3>
      <v-btn size="small" color="primary" variant="tonal" :loading="loading" @click="refresh">Reload list</v-btn>
    </div>
    <p class="text-body-2 analysis-help">These sounds have no saved non-zero volume value; they may be unfinished, older failures, or valid 0 dB results. Reload only fetches this list; it does not retry analysis.</p>
    <form class="analysis-search" role="search" @submit.prevent="applySearch">
      <label class="analysis-search-input">
        <span>Search title or file path</span>
        <input v-model="searchInput" type="text" maxlength="200" autocomplete="off" />
      </label>
      <v-btn type="submit" color="primary" variant="tonal">Search all pages</v-btn>
      <v-btn v-if="searchInput || activeSearch" variant="outlined" @click="clearSearch">Clear search</v-btn>
    </form>
    <p v-if="loading" role="status" class="analysis-message text-body-2">Loading sounds…</p>
    <p v-else-if="loadError" role="alert" class="analysis-message text-error">Could not load this list. Check the backend connection and press Reload list.</p>
    <p v-else-if="total === 0" role="status" class="analysis-message text-body-2">{{ activeSearch ? 'No songs match this search. Try another title or path, or clear the search.' : 'All registered sounds are counted as analyzed.' }}</p>
    <p v-if="!loading && !loadError && total > 0" class="analysis-count text-body-2">Showing {{ offset + 1 }}–{{ Math.min(offset + pageSize, total) }} of {{ total }} · newest added first{{ total > pageSize ? ' · page controls below' : '' }}</p>
    <div v-if="!loading && !loadError && total > 0" class="analysis-list">
      <div v-for="sound in sounds" :key="sound.hash" class="analysis-row">
        <strong>{{ sound.title }}</strong>
        <small>{{ sound.path }}</small>
      </div>
    </div>
    <div v-if="!loadError && total > pageSize" class="analysis-pagination">
      <v-btn size="small" variant="outlined" :disabled="offset === 0 || loading" @click="changePage(-1)">Previous page</v-btn>
      <span>Page {{ Math.floor(offset / pageSize) + 1 }} of {{ Math.ceil(total / pageSize) }}</span>
      <v-btn size="small" variant="outlined" :disabled="offset + pageSize >= total || loading" @click="changePage(1)">Next page</v-btn>
    </div>
  </section>
</template>

<script>
import { BASE } from '../../../utilization/path';

export default {
  name: 'UnanalysedSoundList',
  data() {
    return {
      pageSize: 10,
      offset: 0,
      searchInput: '',
      activeSearch: '',
      total: 0,
      sounds: [],
      loading: false,
      loadError: false,
      requestNumber: 0
    };
  },
  computed: {
    headingText() {
      if (this.loading || this.loadError) return 'Not counted as analyzed';
      const matchingLabel = this.activeSearch ? ` ${this.total === 1 ? 'match' : 'matches'}` : '';
      return `Not counted as analyzed (${this.total}${matchingLabel})`;
    }
  },
  mounted() { this.refresh(); },
  beforeUnmount() { this.requestNumber += 1; },
  methods: {
    /** Reload the current bounded page and full-library search result without starting analysis. */
    async refresh() {
      const currentRequest = ++this.requestNumber;
      this.loading = true;
      this.loadError = false;
      try {
        const parameters = new URLSearchParams({ limit: String(this.pageSize), offset: String(this.offset) });
        if (this.activeSearch) parameters.set('search', this.activeSearch);
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
    /** Search all excluded sounds and restart from the first page. */
    applySearch() {
      this.activeSearch = String(this.searchInput ?? '').trim();
      this.offset = 0;
      this.refresh();
    },
    /** Remove the search and show the first page again. */
    clearSearch() {
      this.searchInput = '';
      this.activeSearch = '';
      this.offset = 0;
      this.refresh();
    },
    /** Move by one bounded page and show its first row. */
    async changePage(direction) {
      const nextOffset = this.offset + direction * this.pageSize;
      if (nextOffset < 0 || nextOffset >= this.total) return;
      this.offset = nextOffset;
      await this.refresh();
      this.$refs.analysisSection?.scrollIntoView({ block: 'start' });
    }
  }
};
</script>

<style scoped>
.analysis-gap { display: grid; gap: 12px; min-width: 0; }
.analysis-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.analysis-heading h3, .analysis-help, .analysis-message, .analysis-count { margin: 0; }
.analysis-search { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.analysis-search-input { display: grid; gap: 4px; flex: 1 1 280px; width: 100%; max-width: 520px; min-width: 0; }
.analysis-search-input input { width: 100%; padding: 8px 12px; color: inherit; background: transparent; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 6px; font: inherit; }
.analysis-search-input input:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.analysis-message { padding: 14px 16px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; }
.analysis-row { display: grid; gap: 4px; min-width: 0; padding-block: 12px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); overflow-wrap: anywhere; }
.analysis-row small { opacity: 0.8; }
.analysis-pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
</style>
