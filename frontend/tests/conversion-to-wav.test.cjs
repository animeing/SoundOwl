const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sourceText = readFileSync(path.join(__dirname, '../src/audio/conversionToWav.js'), 'utf8');

async function createConversion({ load = async () => {}, fetchFile = async () => new Uint8Array([1]) } = {}) {
  const instances = [];
  const assetRequests = [];
  const sourceRequests = [];
  const objectUrls = [];
  class LimitedList extends Array {
    constructor() { super(); }
    addEventListener() {}
    add(value) { this.push(value); }
  }
  class FFmpeg {
    constructor() { this.terminated = false; this.files = new Map(); instances.push(this); }
    async load(options) { this.loadOptions = options; return load(this); }
    terminate() { this.terminated = true; }
    async writeFile(name, contents) { this.files.set(name, contents); }
    async exec() { return 0; }
    async readFile() { return new Uint8Array([82, 73, 70, 70]); }
    async deleteFile(name) { this.files.delete(name); }
  }
  const context = vm.createContext({
    Blob,
    URL: {
      createObjectURL() { const url = `blob:output-${objectUrls.length}`; objectUrls.push(url); return url; },
      revokeObjectURL() {}
    },
    console
  });
  const module = new vm.SourceTextModule(sourceText, { context });
  await module.link(specifier => {
    const exports = {
      '@ffmpeg/ffmpeg': { FFmpeg },
      '@ffmpeg/util': {
        toBlobURL: async (url) => { assetRequests.push(url); return `blob:${url}`; },
        fetchFile: async (url) => { sourceRequests.push(url); return fetchFile(url); }
      },
      '../utilization/path': { BASE: { FRONT_HOME: 'https://frontend.test/' } },
      '../base': { BaseFrameWork: { LimitedList } }
    }[specifier];
    if (!exports) throw new Error(`Unexpected import: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return { conversion: module.namespace, instances, assetRequests, sourceRequests, objectUrls };
}

test('import and native playback never construct FFmpeg or request its assets', async () => {
  const state = await createConversion();
  assert.equal(state.instances.length, 0);
  assert.deepEqual(state.assetRequests, []);
  assert.deepEqual(state.sourceRequests, []);
});

test('concurrent conversions share one FFmpeg initialization and cache the result', async () => {
  let releaseLoad;
  const loadGate = new Promise(resolve => { releaseLoad = resolve; });
  const state = await createConversion({ load: () => loadGate });
  const first = state.conversion.conversionToWav('https://backend.test/sound_create/a.mp3');
  const second = state.conversion.conversionToWav('https://backend.test/sound_create/b.mp3');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.instances.length, 1);
  assert.equal(state.instances[0].loadOptions.coreURL, 'blob:https://frontend.test/js/ffmpeg-core.js');
  assert.equal(state.instances[0].loadOptions.wasmURL, 'blob:https://frontend.test/js/ffmpeg-core.wasm');
  releaseLoad();
  assert.deepEqual(await Promise.all([first, second]), ['blob:output-0', 'blob:output-1']);
  assert.deepEqual(state.assetRequests, [
    'https://frontend.test/js/ffmpeg-core.js',
    'https://frontend.test/js/ffmpeg-core.wasm'
  ]);
  assert.equal(await state.conversion.conversionToWav('https://backend.test/sound_create/a.mp3'), 'blob:output-0');
  assert.equal(state.sourceRequests.length, 2);
});

test('failed asset load terminates worker and the next conversion retries', async () => {
  let loadAttempts = 0;
  const state = await createConversion({ load: async () => {
    loadAttempts += 1;
    if (loadAttempts === 1) throw new Error('asset unavailable');
  } });
  await assert.rejects(state.conversion.conversionToWav('https://backend.test/sound_create/a.mp3'), /asset unavailable/);
  assert.equal(state.instances.length, 1);
  assert.equal(state.instances[0].terminated, true);
  assert.equal(await state.conversion.conversionToWav('https://backend.test/sound_create/a.mp3'), 'blob:output-0');
  assert.equal(state.instances.length, 2);
  assert.equal(loadAttempts, 2);
});

test('source fetch failure does not fetch FFmpeg assets', async () => {
  const state = await createConversion({ fetchFile: async () => { throw new Error('source unavailable'); } });
  await assert.rejects(state.conversion.conversionToWav('https://backend.test/sound_create/a.mp3'), /source unavailable/);
  assert.equal(state.instances.length, 0);
  assert.deepEqual(state.assetRequests, []);
});
