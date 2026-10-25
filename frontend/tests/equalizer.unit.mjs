import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AudioEqualizerComponent } from '../src/audio/effect/equalizer/AudioEqualizerComponent.js';
import { StereoAudioEqualizerComposite } from '../src/audio/effect/equalizer/StereoAudioEqualizerComposite.js';

// Keep the real effect classes; replace only the Web Audio API boundary.
function audioContext() {
  const node = () => ({ connect() {}, disconnect() {} });
  return {
    createBiquadFilter: () => ({ ...node(), frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } }),
    createChannelSplitter: node,
    createChannelMerger: node,
  };
}

function assertFlat(equalizer) {
  for (const filter of Object.values(equalizer.filters)) {
    assert.equal(filter.gain.value, 0);
  }
}

test('EQ can be toggled before initialization and retains saved gains', () => {
  for (const enabled of [true, false]) {
    const equalizer = new AudioEqualizerComponent();
    equalizer.setGain(125, 6);
    equalizer.isUse = !enabled;
    equalizer.isUse = enabled;
    equalizer.setAudioContext(audioContext());
    equalizer.initializeNodes();
    assert.equal(equalizer.isUse, enabled);
    assert.equal(equalizer.filters[125].gain.value, enabled ? 6 : 0);
    assert.equal(equalizer.gains.find(gain => gain.hz === 125).gain, 6);
  }
});

test('disabling EQ flattens every band and re-enabling restores every gain', () => {
  const equalizer = new AudioEqualizerComponent();
  const settings = equalizer.gains.map(({ hz }, index) => ({ hz, gain: index - 6 }));
  equalizer.applyEffect(settings);
  equalizer.setAudioContext(audioContext());
  equalizer.initializeNodes();
  // The default remains active before the first explicit toggle.
  for (const { hz, gain } of settings) assert.equal(equalizer.filters[hz].gain.value, gain);
  for (let cycle = 0; cycle < 2; cycle++) {
    equalizer.isUse = false;
    equalizer.isUse = false;
    assertFlat(equalizer);
    assert.deepEqual(equalizer.gains, settings);
    equalizer.isUse = true;
    equalizer.isUse = true;
    for (const { hz, gain } of settings) assert.equal(equalizer.filters[hz].gain.value, gain);
  }
});

test('editing gains while disabled stays flat and restores the latest settings', () => {
  const equalizer = new AudioEqualizerComponent();
  equalizer.setAudioContext(audioContext());
  equalizer.initializeNodes();
  equalizer.isUse = false;
  equalizer.setGain(125, 7);
  equalizer.applyEffect([{ hz: 1000, gain: -4 }]);
  assertFlat(equalizer);
  equalizer.isUse = true;
  assert.equal(equalizer.filters[125].gain.value, 7);
  assert.equal(equalizer.filters[1000].gain.value, -4);
});

test('reinitializing disabled EQ keeps it flat without losing settings', () => {
  const equalizer = new AudioEqualizerComponent();
  equalizer.setAudioContext(audioContext());
  equalizer.initializeNodes();
  equalizer.setGain(125, 5);
  equalizer.isUse = false;
  equalizer.setAudioContext(audioContext());
  equalizer.initializeNodes();
  assertFlat(equalizer);
  equalizer.isUse = true;
  assert.equal(equalizer.filters[125].gain.value, 5);
});

test('stereo EQ tracks its state and restores distinct gains on both channels', () => {
  const stereo = new StereoAudioEqualizerComposite();
  stereo.applyEffect({ left: [{ hz: 125, gain: 6 }], right: [{ hz: 125, gain: -3 }] });
  stereo.isUse = true;
  assert.equal(stereo.isUse, true);
  stereo.setAudioContext(audioContext());
  const settings = structuredClone(stereo.getGains());
  for (let cycle = 0; cycle < 2; cycle++) {
    stereo.isUse = false;
    assert.equal(stereo.isUse, false);
    assert.equal(stereo.leftEqualizer.isUse, false);
    assert.equal(stereo.rightEqualizer.isUse, false);
    assertFlat(stereo.leftEqualizer);
    assertFlat(stereo.rightEqualizer);
    assert.deepEqual(stereo.getGains(), settings);
    stereo.isUse = true;
    assert.equal(stereo.isUse, true);
    assert.equal(stereo.leftEqualizer.filters[125].gain.value, 6);
    assert.equal(stereo.rightEqualizer.filters[125].gain.value, -3);
  }
});

test('stereo EQ can initialize disabled and apply independent edits while bypassed', () => {
  const stereo = new StereoAudioEqualizerComposite();
  stereo.isUse = false;
  stereo.setAudioContext(audioContext());
  stereo.applyHzGain({ left: { hz: 1000, gain: 4 }, right: { hz: 1000, gain: -2 } });
  assertFlat(stereo.leftEqualizer);
  assertFlat(stereo.rightEqualizer);
  stereo.isUse = true;
  assert.equal(stereo.leftEqualizer.filters[1000].gain.value, 4);
  assert.equal(stereo.rightEqualizer.filters[1000].gain.value, -2);
});
