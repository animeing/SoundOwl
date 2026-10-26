const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { parse: parseVueSfc } = require('@vue/compiler-sfc');

const effectSource = readFileSync(
  path.join(__dirname, '../src/audio/effect/effect3d/ImpulseResponseEffect.js'),
  'utf8'
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function createEffect(fetchImplementation, decodeImplementation = async () => audioBuffer(), home = 'https://example.test/', initialize = true) {
  const errors = [];
  const context = vm.createContext({
    fetch: fetchImplementation,
    console: { error: (...args) => errors.push(args) }
  });
  const source = new vm.SourceTextModule(effectSource, { context });
  await source.link(specifier => {
    if (specifier === '../../../utilization/path') {
      return new vm.SyntheticModule(['BASE'], function () {
        this.setExport('BASE', { HOME: home });
      }, { context });
    }
    if (specifier === '../AudioComponent') {
      return new vm.SyntheticModule(['AudioComponent'], function () {
        this.setExport('AudioComponent', class {
          setAudioContext(audioContext) {
            this.audioContext = audioContext;
          }
        });
      }, { context });
    }
    throw new Error('Unexpected import: ' + specifier);
  });
  await source.evaluate();

  function node() {
    return {
      buffer: null,
      gain: { value: 1 },
      connect() {},
      disconnect() {}
    };
  }
  const audioContext = {
    sampleRate: 4,
    createGain: node,
    createConvolver: node,
    createBuffer(channels, length) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        getChannelData(channel) { return data[channel]; }
      };
    },
    decodeAudioData: decodeImplementation
  };
  const effect = new source.namespace.ImpulseResponseEffect();
  if (initialize) effect.setAudioContext(audioContext);
  return { effect, audioContext, errors };
}

function audioBuffer() {
  return { getChannelData: () => Float32Array.from([0.1, -0.1]) };
}

function response(status = 200) {
  return {
    ok: status === 200,
    status,
    arrayBuffer: async () => new ArrayBuffer(4)
  };
}

test('applies a decoded IR only after loading succeeds', async () => {
  const decoding = deferred();
  const decoded = audioBuffer();
  const { effect, errors } = await createEffect(
    async () => response(),
    () => decoding.promise
  );
  const fallback = effect.reverbNode.buffer;

  const loading = effect.applyEffect('room.wav');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(effect.fileName, null);
  assert.equal(effect.reverbNode.buffer, fallback);

  decoding.resolve(decoded);
  assert.equal(await loading, true);
  assert.equal(effect.fileName, 'room.wav');
  assert.equal(effect.reverbNode.buffer, decoded);
  assert.equal(effect.impulseResponseBuffer, decoded);
  assert.equal(errors.length, 0);
});

test('keeps the previous IR when the response is 404', async () => {
  let status = 200;
  const { effect, errors } = await createEffect(async () => response(status));
  assert.equal(await effect.applyEffect('old.wav'), true);
  const previous = effect.reverbNode.buffer;

  status = 404;
  assert.equal(await effect.applyEffect('missing.wav'), false);
  assert.equal(effect.fileName, 'old.wav');
  assert.equal(effect.reverbNode.buffer, previous);
  assert.equal(errors.length, 1);
});

test('keeps a usable fallback when the network fails', async () => {
  const { effect, errors } = await createEffect(async () => {
    throw new Error('Network failure');
  });
  const fallback = effect.reverbNode.buffer;

  assert.equal(await effect.applyEffect('room.wav'), false);
  assert.equal(effect.fileName, null);
  assert.equal(effect.reverbNode.buffer, fallback);
  assert.equal(errors.length, 1);
});

test('keeps the previous IR when decoding fails', async () => {
  let failDecode = false;
  const { effect, errors } = await createEffect(
    async () => response(),
    async () => {
      if (failDecode) throw new Error('Invalid audio');
      return audioBuffer();
    }
  );
  assert.equal(await effect.applyEffect('old.wav'), true);
  const previous = effect.reverbNode.buffer;

  failDecode = true;
  assert.equal(await effect.applyEffect('invalid.wav'), false);
  assert.equal(effect.fileName, 'old.wav');
  assert.equal(effect.reverbNode.buffer, previous);
  assert.equal(errors.length, 1);
});

test('clearing the selection prevents a pending load from applying', async () => {
  const decoding = deferred();
  const { effect } = await createEffect(
    async () => response(),
    () => decoding.promise
  );
  const loading = effect.applyEffect('room.wav');
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(await effect.applyEffect(''), true);
  const fallback = effect.reverbNode.buffer;
  decoding.resolve(audioBuffer());
  assert.equal(await loading, null);
  assert.equal(effect.fileName, '');
  assert.equal(effect.reverbNode.buffer, fallback);
});


const http = require('node:http');

async function createSettings(effect, savedNames, messages, storedSettings = null) {
  const audio = {
    inpulseResponseEffect: effect,
    exAudioEffect: { isUse: false },
    loudnessNormalize: { isUse: false },
    equalizer: { getGains: () => ({ left: [], right: [] }), applyEffect() {} },
    playList: { loopMode: 'off' },
    volume: 0.5,
    loadGiveUpTime: 1000
  };
  const componentFile = path.join(__dirname, '../src/layout/settings/contents/SettingEffectComponent.vue');
  const { descriptor, errors } = parseVueSfc(readFileSync(componentFile, 'utf8'), {
    filename: componentFile
  });
  assert.deepEqual(errors, []);
  const componentSource = descriptor.script.content;
  const registerSource = readFileSync(
    path.join(__dirname, '../src/utilization/register.js'),
    'utf8'
  );
  const context = vm.createContext({});
  const source = new vm.SourceTextModule(componentSource, { context });
  const registerModule = new vm.SourceTextModule(registerSource, { context });
  const dummyAction = class {};
  const base = {
    MessageWindow: class {
      constructor(...args) {
        assert.equal(args.length, 0, 'MessageWindow constructor does not accept a message');
        this.value = '';
      }
      open() { messages.push(this.value); }
    },
    BaseFrameWork: {
      Storage: {
        Application: {
          LocalStorageMap: class {
            set(key, value) {
              assert.equal(key, 'audioParam');
              savedNames.push(JSON.parse(value).audioIREffect);
            }
            get() { return storedSettings; }
          }
        }
      }
    }
  };
  const imports = {
    '../../../api/PulseDataListAction': { PulseDataListAction: dummyAction },
    '../../../api/PulseDataUploadAction': { PulseDataUploadAction: dummyAction },
    '../../../api/PulseDataDeleteAction': { PulseDataDeleteAction: dummyAction },
    '../../../audio/AudioPlayer': { default: audio },
    '../audio/AudioPlayer': { default: audio },
    '../../../base': base,
    '../base': base
  };
  const modules = new Map();
  await source.link(specifier => {
    if (specifier === '../../../utilization/register') return registerModule;
    const exports = imports[specifier];
    if (!exports) throw new Error('Unexpected import: ' + specifier);
    if (!modules.has(specifier)) {
      modules.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
      }, { context }));
    }
    return modules.get(specifier);
  });
  await source.evaluate();
  const component = source.namespace.default;
  const view = component.data();
  view.changeReverbEffect = component.methods.changeReverbEffect.bind(view);
  view.audioParamLoad = registerModule.namespace.audioParamLoad;
  return view;
}

test('rejects silent and empty decoded IR without changing audio gains', async () => {
  let decoded = audioBuffer();
  const { effect, errors } = await createEffect(async () => response(), async () => decoded);
  assert.equal(await effect.applyEffect('old.wav'), true);
  const previous = effect.reverbNode.buffer;
  const preGain = effect.preGainNode.gain.value;
  const postGain = effect.postGainNode.gain.value;

  for (const samples of [new Float32Array(2), new Float32Array(0)]) {
    decoded = { getChannelData: () => samples };
    assert.equal(await effect.applyEffect('invalid.wav'), false);
    assert.equal(effect.fileName, 'old.wav');
    assert.equal(effect.reverbNode.buffer, previous);
    assert.equal(effect.preGainNode.gain.value, preGain);
    assert.equal(effect.postGainNode.gain.value, postGain);
  }
  assert.equal(errors.length, 2);
});

test('clearing an IR resets both gain nodes to unity', async () => {
  const { effect } = await createEffect(
    async () => response(),
    async () => ({ getChannelData: () => Float32Array.from([0.5, -0.5]) })
  );
  assert.equal(await effect.applyEffect('room.wav'), true);
  assert.notEqual(effect.preGainNode.gain.value, 1);
  assert.notEqual(effect.postGainNode.gain.value, 1);
  assert.equal(await effect.applyEffect(''), true);
  assert.equal(effect.preGainNode.gain.value, 1);
  assert.equal(effect.postGainNode.gain.value, 1);
  assert.equal(effect.reverbNode.buffer, effect.impulseResponseBuffer);
});

test('integration: settings saves only after a decoded IR is applied', async () => {
  const decoding = deferred();
  const { effect } = await createEffect(async () => response(), () => decoding.promise);
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = 'room.wav';

  const applying = view.changeReverbEffect();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(savedNames, []);
  assert.equal(effect.fileName, null);

  decoding.resolve(audioBuffer());
  await applying;
  assert.deepEqual(savedNames, ['room.wav']);
  assert.equal(view.selectPreset, 'room.wav');
  assert.deepEqual(messages, []);
});

test('integration: settings restores the previous selection and reports a 404', async () => {
  let status = 200;
  const { effect } = await createEffect(async () => response(status));
  assert.equal(await effect.applyEffect('old.wav'), true);
  const previous = effect.reverbNode.buffer;
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = 'missing.wav';
  status = 404;

  await view.changeReverbEffect();
  assert.equal(view.selectPreset, 'old.wav');
  assert.equal(effect.reverbNode.buffer, previous);
  assert.deepEqual(savedNames, []);
  assert.deepEqual(messages, ['Failed to load impulse response.']);
});

test('integration: a late old selection cannot replace a newer selection', async () => {
  const firstDecode = deferred();
  const secondDecode = deferred();
  let calls = 0;
  const { effect } = await createEffect(async () => response(), () => {
    calls++;
    return calls === 1 ? firstDecode.promise : secondDecode.promise;
  });
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = 'first.wav';
  const first = view.changeReverbEffect();
  await new Promise(resolve => setImmediate(resolve));
  view.selectPreset = 'second.wav';
  const second = view.changeReverbEffect();
  await new Promise(resolve => setImmediate(resolve));

  const secondBuffer = audioBuffer();
  secondDecode.resolve(secondBuffer);
  await second;
  firstDecode.resolve(audioBuffer());
  await first;
  assert.equal(effect.fileName, 'second.wav');
  assert.equal(effect.reverbNode.buffer, secondBuffer);
  assert.equal(view.selectPreset, 'second.wav');
  assert.deepEqual(savedNames, ['second.wav']);
  assert.deepEqual(messages, []);
});

test('integration: clearing settings stores OFF and restores the fallback', async () => {
  const { effect } = await createEffect(async () => response());
  assert.equal(await effect.applyEffect('old.wav'), true);
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = null;

  await view.changeReverbEffect();
  assert.equal(view.selectPreset, 'OFF');
  assert.equal(effect.fileName, '');
  assert.equal(effect.reverbNode.buffer, effect.impulseResponseBuffer);
  assert.deepEqual(savedNames, ['']);
  assert.deepEqual(messages, []);
});

test('integration: HTTP 200 loads an IR and HTTP 404 preserves it', async (t) => {
  const requests = [];
  const server = http.createServer((request, responseStream) => {
    requests.push(request.url);
    if (request.url === '/audio_pulse/room%20%231.wav') {
      responseStream.writeHead(200, { 'content-type': 'audio/wav' });
      responseStream.end(Buffer.from([82, 73, 70, 70]));
    } else {
      responseStream.writeHead(404);
      responseStream.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.closeAllConnections();
    server.close(resolve);
  }));

  let bytes = 0;
  const home = 'http://127.0.0.1:' + server.address().port + '/';
  const { effect } = await createEffect(
    fetch,
    async data => {
      bytes = data.byteLength;
      return audioBuffer();
    },
    home
  );
  assert.equal(await effect.applyEffect('room #1.wav'), true);
  const previous = effect.reverbNode.buffer;
  assert.equal(bytes, 4);
  assert.equal(await effect.applyEffect('missing.wav'), false);
  assert.equal(effect.fileName, 'room #1.wav');
  assert.equal(effect.reverbNode.buffer, previous);
  assert.deepEqual(requests, ['/audio_pulse/room%20%231.wav', '/audio_pulse/missing.wav']);
});


test('reinitialization keeps the previous IR and gain when reloading fails', async () => {
  let status = 200;
  const original = { getChannelData: () => Float32Array.from([0.5, -0.5]) };
  const { effect, audioContext } = await createEffect(
    async () => response(status),
    async () => original
  );
  assert.equal(await effect.applyEffect('room.wav'), true);
  const preGain = effect.preGainNode.gain.value;
  const postGain = effect.postGainNode.gain.value;
  status = 404;

  effect.setAudioContext(audioContext);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(effect.fileName, 'room.wav');
  assert.equal(effect.reverbNode.buffer, original);
  assert.equal(effect.preGainNode.gain.value, preGain);
  assert.equal(effect.postGainNode.gain.value, postGain);
});


test('integration: selecting before playback stays pending until initialization succeeds', async () => {
  let fetchCount = 0;
  const { effect, audioContext } = await createEffect(
    async () => { fetchCount++; return response(); },
    async () => audioBuffer(),
    'https://example.test/',
    false
  );
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = 'room.wav';
  const applying = view.changeReverbEffect();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(effect.fileName, null);
  assert.equal(effect.pendingLoad.fileName, 'room.wav');
  assert.equal(fetchCount, 0);
  assert.deepEqual(savedNames, ['room.wav']);
  assert.deepEqual(messages, ['Impulse response will load when playback starts.']);

  effect.setAudioContext(audioContext);
  await applying;
  assert.equal(effect.fileName, 'room.wav');
  assert.equal(effect.pendingLoad, null);
  assert.equal(fetchCount, 1);
  assert.deepEqual(savedNames, ['room.wav', 'room.wav']);
});

test('integration: a pending IR failure restores the saved selection', async () => {
  const { effect, audioContext } = await createEffect(
    async () => response(404),
    async () => audioBuffer(),
    'https://example.test/',
    false
  );
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = 'missing.wav';
  const applying = view.changeReverbEffect();
  effect.setAudioContext(audioContext);
  await applying;

  assert.equal(effect.fileName, null);
  assert.equal(effect.pendingLoad, null);
  assert.equal(view.selectPreset, 'OFF');
  assert.deepEqual(savedNames, ['missing.wav', null]);
  assert.deepEqual(messages, [
    'Impulse response will load when playback starts.',
    'Failed to load impulse response.'
  ]);
});

test('integration: clearing before playback cancels the pending selection', async () => {
  const { effect } = await createEffect(
    async () => response(),
    async () => audioBuffer(),
    'https://example.test/',
    false
  );
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages);
  view.selectPreset = 'old.wav';
  const pending = view.changeReverbEffect();
  view.selectPreset = null;
  await view.changeReverbEffect();
  await pending;

  assert.equal(effect.fileName, '');
  assert.equal(effect.pendingLoad, null);
  assert.equal(view.selectPreset, 'OFF');
  assert.deepEqual(savedNames, ['old.wav', '']);
  assert.deepEqual(messages, ['Impulse response will load when playback starts.']);
});


test('integration: startup restore reports a saved IR that fails on playback', async () => {
  const { effect, audioContext } = await createEffect(
    async () => response(404),
    async () => audioBuffer(),
    'https://example.test/',
    false
  );
  const storedSettings = JSON.stringify({
    volume: 0.5,
    loopMode: 'off',
    loadGiveUpTime: 1000,
    equalizerGains: { left: [], right: [] },
    soundSculpt: false,
    audioLondnessNormalize: false,
    audioIREffect: 'missing.wav'
  });
  const savedNames = [];
  const messages = [];
  const view = await createSettings(effect, savedNames, messages, storedSettings);

  view.audioParamLoad();
  assert.equal(effect.pendingLoad.fileName, 'missing.wav');
  effect.setAudioContext(audioContext);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(effect.fileName, null);
  assert.deepEqual(messages, ['Failed to load saved impulse response.']);
  assert.deepEqual(savedNames, []);
});

test('integration: replacing a pending saved IR does not show a false failure', async () => {
  const { effect } = await createEffect(
    async () => response(404),
    async () => audioBuffer(),
    'https://example.test/',
    false
  );
  const storedSettings = JSON.stringify({
    volume: 0.5,
    loopMode: 'off',
    loadGiveUpTime: 1000,
    equalizerGains: { left: [], right: [] },
    soundSculpt: false,
    audioLondnessNormalize: false,
    audioIREffect: 'old.wav'
  });
  const messages = [];
  const view = await createSettings(effect, [], messages, storedSettings);
  view.audioParamLoad();
  await effect.applyEffect('');
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(effect.fileName, '');
  assert.equal(effect.pendingLoad, null);
  assert.deepEqual(messages, []);
});
