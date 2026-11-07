<template>
  <div class="file-path-display">
    <div ref="preview" class="file-path-preview" :title="path">{{ path }}</div>
    <button
      v-if="truncated"
      type="button"
      class="file-path-toggle"
      @click="showFullPath = true"
    >Show full path</button>
    <v-dialog v-model="showFullPath" aria-label="Full file path" max-width="720">
      <v-card>
        <v-card-title>Full file path</v-card-title>
        <v-card-text class="file-path-full">{{ path }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showFullPath = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
export default {
  name: 'FilePathDisplay',
  props: { path: { type: String, required: true } },
  data() {
    return { truncated: false, showFullPath: false, resizeObserver: null };
  },
  mounted() {
    this.measureOverflow();
    this.resizeObserver = new ResizeObserver(this.measureOverflow);
    this.resizeObserver.observe(this.$refs.preview);
  },
  beforeUnmount() { this.resizeObserver?.disconnect(); },
  watch: {
    path() {
      this.showFullPath = false;
      this.$nextTick(this.measureOverflow);
    }
  },
  methods: {
    /** Offer the full-path control only when the one-line preview is visibly clipped. */
    measureOverflow() {
      const preview = this.$refs.preview;
      this.truncated = Boolean(preview && preview.scrollWidth > preview.clientWidth + 1);
    }
  }
};
</script>

<style scoped>
.file-path-display { min-width: 0; }
.file-path-preview { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; line-height: 1.4; opacity: 0.9; }
.file-path-toggle { display: block; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: 0.75rem; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.file-path-toggle:focus-visible { outline: 2px solid rgba(var(--v-theme-on-surface), 0.85); outline-offset: 2px; }
.file-path-full { max-height: 50vh; overflow-y: auto; overflow-wrap: anywhere; font-family: monospace; font-size: 0.875rem; scrollbar-width: thin; }
</style>
