<template>
  <section ref="analysisSection" class="analysis-gap" aria-labelledby="analysis-gap-heading">
    <h3 id="analysis-gap-heading" class="text-subtitle-1 font-weight-medium">{{ headingText }}</h3>
    <p class="text-body-2 analysis-help">These sounds have no saved non-zero volume value. They may be unfinished, older failures, or valid 0 dB results.</p>
    <form v-if="total > pageSize || activeSearch" class="analysis-search" role="search" @submit.prevent="applySearch">
      <label class="analysis-search-input">
        <span>Search title or file path</span>
        <input v-model="searchInput" type="text" maxlength="200" autocomplete="off" />
      </label>
      <v-btn type="submit" color="fixed-dark-surface" class="analysis-search-button">Search all</v-btn>
      <v-btn v-if="searchInput || activeSearch" variant="outlined" @click="clearSearch">Clear search</v-btn>
    </form>
    <p v-if="loading" role="status" class="analysis-message text-body-2">Loading sounds…</p>
    <p v-else-if="loadError" role="alert" class="analysis-message text-error">Could not load sounds outside Analysis Count. Check the backend connection and refresh.</p>
    <p v-else-if="total === 0" role="status" class="analysis-message text-body-2">{{ activeSearch ? 'No songs match this search. Try another title or path, or clear the search.' : 'Analysis Count differs, but no matching sounds were returned. Refresh the results.' }}</p>
    <v-btn v-if="loadError || (!loading && total === 0 && !activeSearch)" size="small" variant="tonal" class="analysis-retry" @click="refresh">Refresh results</v-btn>
    <p v-if="!loading && !loadError && total > 0" class="analysis-count text-body-2">Showing {{ offset + 1 }}–{{ Math.min(offset + pageSize, total) }} of {{ total }} · newest first</p>
    <div v-if="!loading && !loadError && total > 0" class="analysis-list" role="region" aria-label="Sounds outside Analysis Count" tabindex="0">
      <div v-for="sound in sounds" :key="sound.hash" class="analysis-row">
        <strong>{{ sound.title }}</strong>
        <small :title="sound.path">{{ sound.path }}</small>
      </div>
    </div>
    <div v-if="!loadError && total > pageSize" class="analysis-pagination">
      <v-btn size="small" variant="outlined" aria-label="Previous page" :disabled="offset === 0 || loading" @click="changePage(-1)">Previous</v-btn>
      <span>Page {{ Math.floor(offset / pageSize) + 1 }} / {{ Math.ceil(total / pageSize) }}</span>
      <v-btn size="small" variant="outlined" aria-label="Next page" :disabled="offset + pageSize >= total || loading" @click="changePage(1)">Next</v-btn>
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
      if (this.loading || this.loadError || (!this.activeSearch && this.total === 0)) return 'Outside Analysis Count';
      const matchingLabel = this.activeSearch ? ` ${this.total === 1 ? 'match' : 'matches'}` : '';
      return `Outside Analysis Count (${this.total}${matchingLabel})`;
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
.analysis-gap { display: grid; align-content: start; gap: 12px; min-width: 0; padding: 16px; border: 1px solid rgba(var(--v-theme-on-surface), 0.2); border-radius: 8px; }
.analysis-gap h3, .analysis-help, .analysis-message, .analysis-count { margin: 0; }
.analysis-help { max-width: 85ch; line-height: 1.5; }
.analysis-search { display: flex; align-items: end; flex-wrap: wrap; gap: 8px; }
.analysis-search-input { display: grid; gap: 4px; flex: 1 1 280px; width: 100%; max-width: 440px; min-width: 0; }
.analysis-search-input input { width: 100%; padding: 8px 12px; color: inherit; background: transparent; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 6px; font: inherit; }
.analysis-search-input input:focus-visible { outline: 2px solid rgba(var(--v-theme-on-surface), 0.85); outline-offset: 2px; }
.analysis-search-button { color: rgb(var(--v-theme-on-fixed-dark-surface)); }
.analysis-retry { justify-self: start; }
.analysis-message { padding: 14px 16px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; }
.analysis-list { max-height: clamp(180px, 34vh, 360px); overflow-y: auto; overscroll-behavior: contain; scroll-margin-top: 64px; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: rgba(var(--v-theme-on-surface), 0.5) transparent; border: 1px solid rgba(var(--v-theme-on-surface), 0.16); border-radius: 6px; padding: 0 10px; }
.analysis-list::-webkit-scrollbar { width: 8px; }
.analysis-list::-webkit-scrollbar-track { background: transparent; }
.analysis-list::-webkit-scrollbar-thumb { background: rgba(var(--v-theme-on-surface), 0.5); border: 2px solid transparent; border-radius: 8px; background-clip: padding-box; }
.analysis-list:focus-visible { outline: 2px solid rgba(var(--v-theme-on-surface), 0.85); outline-offset: 2px; }
.analysis-row { display: grid; gap: 4px; min-width: 0; padding-block: 12px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); overflow-wrap: anywhere; }
.analysis-row:first-child { border-top: 0; }
.analysis-row strong { font-size: 1rem; }
.analysis-row small { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; line-height: 1.4; opacity: 0.9; }
.analysis-pagination { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; white-space: nowrap; }
.analysis-pagination > :last-child { justify-self: end; }
@media (max-width: 360px) {
  .analysis-pagination { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analysis-pagination > span { grid-column: 1 / -1; grid-row: 1; justify-self: center; }
  .analysis-pagination > :first-child { grid-column: 1; grid-row: 2; justify-self: start; }
  .analysis-pagination > :last-child { grid-column: 2; grid-row: 2; }
}
</style>
