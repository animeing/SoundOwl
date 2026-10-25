const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

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

async function createEffect(fetchImplementation, decodeImplementation = async () => audioBuffer()) {
  const errors = [];
  const context = vm.createContext({
    fetch: fetchImplementation,
    console: { error: (...args) => errors.push(args) }
  });
  const source = new vm.SourceTextModule(effectSource, { context });
  await source.link(specifier => {
    if (specifier === '../../../utilization/path') {
      return new vm.SyntheticModule(['BASE'], function () {
        this.setExport('BASE', { HOME: 'https://example.test/' });
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
  effect.setAudioContext(audioContext);
  return { effect, errors };
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
  assert.equal(await loading, false);
  assert.equal(effect.fileName, '');
  assert.equal(effect.reverbNode.buffer, fallback);
});

